import styles from "./empty-zone.css";

export function EmptyZone({context, pos, onClick, children}) {
	if (context == null) {
		throw new Error("zone missing context");
	}

	const style = {left: pos.x, top: pos.y};
	return (
		<div className={styles.emptyZone} style={style} onClick={onClick}>
			{children}
		</div>
	);
}
