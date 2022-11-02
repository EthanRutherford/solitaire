import {MutableRefObject, useCallback, useMemo, useRef} from "react";

type Action = (...args: unknown[]) => Generator<number>;
type ActionRecord = [Action, unknown[], symbol];

export function useActionQueue() {
	const queue: ActionRecord[] = useMemo(() => [], []);
	const working: MutableRefObject<symbol|null> = useRef(null);

	const enqueuedAction = useMemo(() => {
		function begin() {
			if (queue.length > 0) {
				const [func, args, token] = queue.shift()!;
				working.current = token;
				perform(func(...args), token);
			} else {
				working.current = null;
			}
		}

		function perform(gen: Generator<number>, token: symbol) {
			if (working.current !== token) return;
			const result = gen.next();
			if (working.current !== token) return;

			if (result.done) {
				setTimeout(() => begin(), result.value);
				return;
			}

			setTimeout(() => perform(gen, token), result.value);
		}

		const make = (generatorFunc: Action) => useCallback((...args: unknown[]) => {
			queue.push([generatorFunc, args, Symbol("unique token")]);
			if (!working.current) {
				begin();
			}
		}, []);

		make.reset = () => {
			queue.splice(0, queue.length);
			working.current = null;
		};

		return make;
	}, []);

	return enqueuedAction;
}
