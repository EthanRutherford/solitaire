import {useCallback, useState} from "react";
import {Settings} from "../../logic/klondike/game";
import {get, put, settingsTable} from "../../logic/game-db";
import {Modal, ModalButton, ModalDisclaimer, ModalFooter, ModalHeader, ModalLabel, ModalRadio} from "../shared/modal";

export function useNewGame(key: string, onStart: (data: Settings) => void) {
	const [showModal, setShowModal] = useState(false);
	const [initialSettings, setSettings] = useState<Settings | null>(null);
	const openModal = useCallback(async () => {
		setSettings(await get(settingsTable, key));
		setShowModal(true);
	}, []);
	const cancel = useCallback(() => setShowModal(false), []);
	const start = useCallback((data: Settings) => {
		onStart(data);
		setShowModal(false);
		void put(settingsTable, {key, ...data});
	}, []);

	return {showModal, openModal, initialSettings, onStart: start, onCancel: cancel};
}

interface NewGameModalProps {
	initialSettings: Settings | null;
	onStart: (data: Settings) => void;
	onCancel: () => void;
}

export function NewgameModal({initialSettings, onStart, onCancel}: NewGameModalProps) {
	const [drawCount, setDrawCount] = useState(initialSettings?.drawCount ?? 1);
	const [generator, setGenerator] = useState(initialSettings?.generator ?? 1);

	return (
		<Modal>
			<ModalHeader>Klondike Solitaire</ModalHeader>
			<ModalLabel>Draw count</ModalLabel>
			<ModalRadio
				options={[
					{label: "Draw 1", key: 1},
					{label: "Draw 3", key: 3},
				]}
				selected={drawCount}
				onSelection={setDrawCount}
			/>
			<ModalLabel>Game mode</ModalLabel>
			<ModalRadio
				options={[
					{label: "Solvable", key: 1},
					{label: "Random", key: 0},
				]}
				selected={generator}
				onSelection={setGenerator}
			/>
			<ModalDisclaimer>solvable puzzle generator is experimental</ModalDisclaimer>
			<ModalFooter>
				<ModalButton onClick={onCancel}>Cancel</ModalButton>
				<ModalButton onClick={() => onStart({drawCount, generator})}>Start</ModalButton>
			</ModalFooter>
		</Modal>
	);
}
