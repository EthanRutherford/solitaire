import {MutableRefObject, useCallback, useMemo, useRef} from "react";

type Action<T extends unknown[]> = (...args: T) => Generator<number, void>;
type ActionRecord = [Action<[]>, symbol];

export function useActionQueue() {
	const queue: ActionRecord[] = useMemo(() => [], []);
	const working: MutableRefObject<symbol | null> = useRef(null);

	const enqueuedAction = useMemo(() => {
		function begin() {
			const action = queue.shift();
			if (action != null) {
				const [func, token] = action;
				working.current = token;
				perform(func(), token);
			} else {
				working.current = null;
			}
		}

		function perform(gen: Generator<number, void>, token: symbol) {
			if (working.current !== token) return;
			const result = gen.next();
			if (working.current !== token) return;

			if (result.done ?? false) {
				setTimeout(() => begin(), result.value != null ? result.value : 0);
				return;
			}

			setTimeout(() => perform(gen, token), result.value);
		}

		const make = <T extends unknown[]>(generatorFunc: Action<T>) => useCallback((...args: T) => {
			const func = () => generatorFunc(...args);
			queue.push([func, Symbol("unique token")]);
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
