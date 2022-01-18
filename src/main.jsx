import {render} from "react-dom";
import {AppRouter, Route} from "./ui/shared/app-router";
import {Board as Klondike} from "./ui/klondike/board";
import {Board as Spider} from "./ui/spider/board";
import {Board as FreeCell} from "./ui/free-cell/board";
import {Board as Pyramid} from "./ui/pyramid/board";
import styles from "./main.css";
import {Menu} from "./ui/menu";

// register service worker
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/service-worker.js");
	}, {once: true});
}

function App() {
	return (
		<div className={styles.app}>
			<AppRouter>
				<Route path="/" exact Component={Menu} />
				<Route path="/klondike" Component={Klondike} />
				<Route path="/spider" Component={Spider} />
				<Route path="/free-cell" Component={FreeCell} />
				<Route path="/pyramid" Component={Pyramid} />
			</AppRouter>
		</div>
	);
}

render(<App />, document.getElementById("react-root"));
