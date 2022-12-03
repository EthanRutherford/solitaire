import {useCallback, ReactNode, MouseEvent} from "react";
import {Card, Deck} from "../../logic/deck";
import styles from "./empty-zone.css";
import {useSizes} from "./sizerator";

interface EmptyZonePropTypes {
	context?: Deck<Card>,
	slot: {x: number, y: number},
	onTap?: (deck: Deck<Card>) => void,
	children?: ReactNode,
}

export function EmptyZone({context, slot, onTap, children}: EmptyZonePropTypes) {
	const {margins, cardOffsetX, cardOffsetY} = useSizes();
	const onMouseDown = useCallback(
		(event: MouseEvent) => event.preventDefault(),
		[],
	);

	const onClick = useCallback(() => onTap?.(context!), []);

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
