import {useCallback, useMemo, useRef} from "react";

export function useActionQueue() {
	const queue = useMemo(() => [], []);
	const working = useRef(null);

	const enqueuedAction = useMemo(() => {
		function begin() {
			const [func, args, token] = queue.shift();
			working.current = token;
			perform(func(...args), token);
		}

		function perform(gen, token) {
			if (working.current !== token) return;
			const result = gen.next();
			if (working.current !== token) return;

			if (result.done) {
				setTimeout(() => {
					if (queue.length === 0) {
						working.current = null;
					} else {
						begin();
					}
				}, result.value);

				return;
			}

			setTimeout(() => perform(gen, token), result.value);
		}

		const make = (generatorFunc) => useCallback((...args) => {
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
