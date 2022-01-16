import {useCallback, useEffect, useState} from "react";

const listeners = new Set();

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();
	deferredPrompt = event;

	for (const listener of listeners) {
		listener(true);
	}
});

export function useInstallPrompt() {
	const [canPrompt, setCanPrompt] = useState(null);
	useEffect(() => {
		listeners.add(setCanPrompt);
		return () => listeners.delete(setCanPrompt);
	}, []);

	const promptForInstall = useCallback(() => {
		deferredPrompt.prompt();
		return deferredPrompt.userChoice.then((choiceResult) => {
			deferredPrompt = null;
			for (const listener of listeners) {
				listener(false);
			}

			return choiceResult.outcome === "accepted";
		});
	}, [deferredPrompt]);

	return {canPrompt, promptForInstall};
}
