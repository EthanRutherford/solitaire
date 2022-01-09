import Undo from "../../../images/undo";
import Redo from "../../../images/redo";
import styles from "./control-bar.css";

export function ControlBar({undo, redo, children}) {
	return (
		<div className={styles.controlBar}>
			<div className={styles.content}>
				<div>
					{children}
				</div>
				<div className={styles.buttons}>
					<button className={styles.button} onClick={undo}>
						<Undo />
					</button>
					<button className={styles.button} onClick={redo}>
						<Redo />
					</button>
				</div>
			</div>
		</div>
	);
}
