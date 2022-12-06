import {MutableRefObject, useCallback, useMemo, useRef} from "react";

type Action<T extends unknown[]> = (...args: T) => Generator<number, void>;
type ActionRecord<T extends unknown[]> = [Action<T>, T, symbol];

export function useActionQueue() {
	const queue: ActionRecord<any>[] = useMemo(() => [], []);
	const working: MutableRefObject<symbol | null> = useRef(null);

	const enqueuedAction = useMemo(() => {
		function begin() {
			if (queue.length > 0) {
				const [func, args, token] = queue.shift() as ActionRecord<unknown[]>;
				working.current = token;
				perform(func(...args), token);
			} else {
				working.current = null;
			}
		}

		function perform(gen: Generator<number, void>, token: symbol) {
			if (working.current !== token) return;
			const result = gen.next();
			if (working.current !== token) return;

			if (result.done ?? false) {
				setTimeout(() => begin(), result.value as number | undefined);
				return;
			}

			setTimeout(() => perform(gen, token), result.value);
		}

		const make = <T extends unknown[]>(generatorFunc: Action<T>) => useCallback((...args: T) => {
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
