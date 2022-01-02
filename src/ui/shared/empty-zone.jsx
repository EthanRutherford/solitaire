import {useCallback} from "react/cjs/react.development";
import styles from "./empty-zone.css";

export function EmptyZone({context, pos, onTap, children}) {
	const onMouseDown = useCallback((event) => event.preventDefault(), []);
	const onClick = useCallback(() => onTap(context), []);

	const style = {left: pos.x, top: pos.y};
	return (
		<div className={styles.emptyZone} style={style} onMouseDown={onMouseDown} onClick={onClick}>
			{children}
		</div>
	);
}
