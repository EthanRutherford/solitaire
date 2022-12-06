import {useCallback, useEffect, useState} from "react";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	readonly userChoice: Promise<{outcome: "accepted" | "dismissed"}>;
}
declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}

const listeners = new Set<(success: boolean) => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener("beforeinstallprompt", (event: BeforeInstallPromptEvent) => {
	event.preventDefault();
	deferredPrompt = event;

	for (const listener of listeners) {
		listener(true);
	}
});

export function useInstallPrompt() {
	const [canPrompt, setCanPrompt] = useState(false);
	useEffect(() => {
		listeners.add(setCanPrompt);
		return () => {listeners.delete(setCanPrompt);};
	}, []);

	const promptForInstall = useCallback(() => {
		void deferredPrompt?.prompt();
		void deferredPrompt?.userChoice.then((choiceResult) => {
			deferredPrompt = null;
			for (const listener of listeners) {
				listener(false);
			}

			return choiceResult.outcome === "accepted";
		});
	}, [deferredPrompt]);

	return {canPrompt, promptForInstall};
}
