import {useCallback, useRef} from "react";

export function useValueChanged(...values) {
	const changed = useRef(false);
	const store = useRef(values);
	if (
		values.length !== store.current.length ||
		values.some((v, i) => v !== store.current[i])
	) {
		changed.current = true;
		store.current = values;
	}

	return [changed.current, useCallback(() => changed.current = false, [])];
}
