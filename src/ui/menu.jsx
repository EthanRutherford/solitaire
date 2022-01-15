import {useRouter} from "./shared/app-router";
import styles from "./menu.css";

export function Menu() {
	const {go} = useRouter();
	return (
		<div className={styles.menu}>
			<div className={styles.title}>Solitaire</div>
			<button className={styles.button} onClick={() => go("/klondike")}>klondike</button>
			<button className={styles.button} onClick={() => go("/spider")}>spider</button>
			<button className={styles.button} onClick={() => go("/free-cell")}>free cell</button>
			<div className={styles.version}>v0.1</div>
		</div>
	);
}
