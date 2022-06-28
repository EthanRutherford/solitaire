import Back from "../../../images/back";
import Plus from "../../../images/plus";
import Undo from "../../../images/undo";
import Redo from "../../../images/redo";
import styles from "./control-bar.css";
import {useRouter} from "./app-router";

export function ControlBar({newGame, undo, redo}) {
	const {home} = useRouter();

	return (
		<div className={styles.controlBar}>
			<div className={styles.content}>
				<div className={styles.buttons}>
					<button className={styles.button} onClick={home}>
						<Back />
					</button>
					<button className={styles.button} onClick={newGame}>
						<Plus />
					</button>
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
