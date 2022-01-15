import {useRef} from "react";

export function useValueChanged(...values) {
	const store = useRef(values);
	if (
		values.length !== store.current.length ||
		values.some((v, i) => v !== store.current[i])
	) {
		store.current = values;
		return true;
	}

	return false;
}
