import {useInstallPrompt} from "../util/install-prompt";
import {useRouter} from "./shared/app-router";
import styles from "./menu.css";

export function Menu() {
	const {go} = useRouter();
	const {canPrompt, promptForInstall} = useInstallPrompt();

	return (
		<div className={styles.menu}>
			<div className={styles.title}>Solitaire</div>
			<button className={styles.button} onClick={() => go("/klondike")}>klondike</button>
			<button className={styles.button} onClick={() => go("/spider")}>spider</button>
			<button className={styles.button} onClick={() => go("/free-cell")}>free cell</button>
			{canPrompt && (
				<button className={styles.button} onClick={promptForInstall}>
					add to homescreen
				</button>
			)}
			<div className={styles.version}>v0.1</div>
		</div>
	);
}
