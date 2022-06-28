import {useCallback, useState} from "react";

export function useRerender() {
	const [, toggle] = useState(false);
	const toggler = (t: boolean) => !t;
	return useCallback(() => toggle(toggler), []);
}
