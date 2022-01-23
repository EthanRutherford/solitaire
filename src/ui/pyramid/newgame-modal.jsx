import {useCallback, useState} from "react";
import {get, put, settingsTable} from "../../logic/game-db";
import {Modal, ModalButton, ModalDisclaimer, ModalFooter, ModalHeader, ModalLabel, ModalRadio} from "../shared/modal";

export function useNewGame(key, onStart) {
	const [showModal, setShowModal] = useState(false);
	const [initialSettings, setSettings] = useState(null);
	const openModal = useCallback(async () => {
		setSettings(await get(settingsTable, key));
		setShowModal(true);
	}, []);
	const cancel = useCallback(() => setShowModal(false), []);
	const start = useCallback((data) => {
		onStart(data);
		setShowModal(false);
		put(settingsTable, {key, ...data});
	}, []);

	return {showModal, openModal, initialSettings, onStart: start, onCancel: cancel};
}

export function NewgameModal({initialSettings, onStart, onCancel}) {
	const [generator, setGenerator] = useState(initialSettings?.generator ?? 1);

	return (
		<Modal>
			<ModalHeader>Pyramid Solitaire</ModalHeader>
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
				<ModalButton onClick={() => onStart({generator})}>Start</ModalButton>
			</ModalFooter>
		</Modal>
	);
}
