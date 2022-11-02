import Back from "../../../images/back.svg";
import Plus from "../../../images/plus.svg";
import Undo from "../../../images/undo.svg";
import Redo from "../../../images/redo.svg";
import styles from "./control-bar.css";
import {useRouter} from "./app-router";

interface ControlBarProps {newGame: () => void, undo: () => void, redo: () => void}
export function ControlBar({newGame, undo, redo}: ControlBarProps) {
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
