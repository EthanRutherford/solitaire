import {useCallback, useState} from "react";

export function useRerender() {
	const [, toggle] = useState(false);
	const toggler = (t) => !t;
	return useCallback(() => toggle(toggler), []);
}
