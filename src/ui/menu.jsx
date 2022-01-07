import {useRouter} from "./shared/app-router";
import styles from "./menu.css";

export function Menu() {
	const {go} = useRouter();
	return (
		<div className={styles.menu}>
			<button className={styles.button} onClick={() => go("/klondike")}>klondike</button>
			<button className={styles.button} onClick={() => go("/spider")}>spider</button>
		</div>
	);
}
