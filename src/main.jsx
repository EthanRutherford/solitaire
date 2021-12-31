import {render} from "react-dom";
import {Board} from "./ui/klondike/board";
import styles from "./main.css";

// register service worker
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/dist/service-worker.js");
	}, {once: true});
}

function App() {
	return (
		<div className={styles.app}>
			<Board />
		</div>
	);
}

render(<App />, document.getElementById("react-root"));
