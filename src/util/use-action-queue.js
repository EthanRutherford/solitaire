import {useCallback, useMemo, useRef} from "react";

export function useActionQueue() {
	const queue = useMemo(() => [], []);
	const working = useRef(false);

	const push = useMemo(() => {
		function begin() {
			const [func, args] = queue.shift();
			perform(func(...args));
		}

		function perform(gen) {
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

		return (generatorFunc) => useCallback((...args) => {
			queue.push([generatorFunc, args]);
			if (!working.current) {
				working.current = true;
				begin();
			}
		}, []);
	}, []);

	return push;
}
