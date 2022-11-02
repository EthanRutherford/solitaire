import {useCallback, useState} from "react";
import {get, put, settingsTable} from "../../logic/game-db";
import { Settings } from "../../logic/spider/game";
import {Modal, ModalButton, ModalFooter, ModalHeader, ModalLabel, ModalRadio} from "../shared/modal";

export function useNewGame(key: string, onStart: (data: Settings) => void) {
	const [showModal, setShowModal] = useState(false);
	const [initialSettings, setSettings] = useState<Settings|null>(null);
	const openModal = useCallback(async () => {
		setSettings(await get(settingsTable, key));
		setShowModal(true);
	}, []);
	const cancel = useCallback(() => setShowModal(false), []);
	const start = useCallback((data: Settings) => {
		onStart(data);
		setShowModal(false);
		put(settingsTable, {key, ...data});
	}, []);

	return {showModal, openModal, initialSettings, onStart: start, onCancel: cancel};
}

interface NewgameModalProps {
	initialSettings: Settings|null;
	onStart: (data: Settings) => void;
	onCancel: () => void;
}

export function NewgameModal({initialSettings, onStart, onCancel}: NewgameModalProps) {
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
