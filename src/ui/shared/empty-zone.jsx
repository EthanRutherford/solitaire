import {useCallback} from "react/cjs/react.development";
import styles from "./empty-zone.css";
import {useSizes} from "./sizerator";

export function EmptyZone({context, slot, onTap, children}) {
	const {margins, cardOffsetX, cardOffsetY} = useSizes();
	const onMouseDown = useCallback((event) => event.preventDefault(), []);
	const onClick = useCallback(() => onTap(context), []);

	const style = {
		left: margins + slot.x * cardOffsetX,
		top: margins + slot.y * cardOffsetY,
	};

	return (
		<div className={styles.emptyZone} style={style} onMouseDown={onMouseDown} onClick={onClick}>
			{children}
		</div>
	);
}
