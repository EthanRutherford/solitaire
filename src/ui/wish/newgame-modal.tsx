import {useCallback, useState} from "react";
import {get, put, settingsTable} from "../../logic/game-db";
import {Settings} from "../../logic/wish/game";
import {Modal, ModalButton, ModalFooter, ModalHeader, ModalLabel, ModalRadio} from "../shared/modal";

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

interface NewgameModalProps {
	initialSettings: Settings | null;
	onStart: (data: Settings) => void;
	onCancel: () => void;
}

export function NewgameModal({initialSettings, onStart, onCancel}: NewgameModalProps) {
	const [generator, setGenerator] = useState(initialSettings?.generator ?? 1);

	return (
		<Modal>
			<ModalHeader>Wish Solitaire</ModalHeader>
			<ModalLabel>Game mode</ModalLabel>
			<ModalRadio
				options={[
					{label: "Solvable", key: 1},
					{label: "Random", key: 0},
				]}
				selected={generator}
				onSelection={setGenerator}
			/>
			<ModalFooter>
				<ModalButton onClick={onCancel}>Cancel</ModalButton>
				<ModalButton onClick={() => onStart({generator})}>Start</ModalButton>
			</ModalFooter>
		</Modal>
	);
}
