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
			<button className={styles.button} onClick={() => go("/pyramid")}>pyramid</button>
			<button className={styles.button} onClick={() => go("/wish")}>wish</button>
			{canPrompt && (
				<button className={styles.button} onClick={promptForInstall}>
					add to homescreen
				</button>
			)}
			<a
				className={styles.version}
				href="https://github.com/EthanRutherford/solitaire/projects/1"
				target="_blank" rel="noreferrer"
			>
				v0.3
			</a>
		</div>
	);
}
