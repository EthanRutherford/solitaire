import {useCallback, useMemo, useRef} from "react";

export function useActionQueue() {
	const queue = useMemo(() => [], []);
	const working = useRef(false);

	const enqueuedAction = useMemo(() => {
		function begin() {
			const [func, args] = queue.shift();
			perform(func(...args));
		}

		function perform(gen) {
			if (!working.current) return;

			const result = gen.next();
			if (result.done) {
				setTimeout(() => {
					if (queue.length === 0) {
						working.current = false;
					} else {
						begin();
					}
				}, result.value);

				return;
			}

			setTimeout(() => perform(gen), result.value);
		}

		const make = (generatorFunc) => useCallback((...args) => {
			queue.push([generatorFunc, args]);
			if (!working.current) {
				working.current = true;
				begin();
			}
		}, []);

		make.reset = () => {
			queue.splice(0, queue.length);
			working.current = false;
		};

		return make;
	}, []);

	return enqueuedAction;
}
