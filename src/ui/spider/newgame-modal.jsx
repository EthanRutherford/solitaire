import {useCallback, useState} from "react";
import {get, put, settingsTable} from "../../logic/game-db";
import {Modal, ModalButton, ModalFooter, ModalHeader, ModalLabel, ModalRadio} from "../shared/modal";

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
	const [suitCount, setSuitCount] = useState(initialSettings?.suitCount ?? 1);

	return (
		<Modal>
			<ModalHeader>Spider Solitaire</ModalHeader>
			<ModalLabel>Suits</ModalLabel>
			<ModalRadio
				options={[
					{label: "1 suit", key: 1},
					{label: "2 suits", key: 2},
					{label: "4 suits", key: 4},
				]}
				selected={suitCount}
				onSelection={setSuitCount}
			/>
			<ModalFooter>
				<ModalButton onClick={onCancel}>Cancel</ModalButton>
				<ModalButton onClick={() => onStart({suitCount})}>Start</ModalButton>
			</ModalFooter>
		</Modal>
	);
}
