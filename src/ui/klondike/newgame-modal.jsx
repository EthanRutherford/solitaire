import {useCallback, useState} from "react";
import {Modal, ModalButton, ModalFooter, ModalHeader, ModalLabel, ModalRadio} from "../shared/modal";

export function useNewGame(onStart) {
	const [showModal, setShowModal] = useState(false);
	const openModal = useCallback(() => setShowModal(true), []);
	const cancel = useCallback(() => setShowModal(false), []);
	const start = useCallback((data) => {
		onStart(data);
		setShowModal(false);
	}, []);

	return {showModal, openModal, onStart: start, onCancel: cancel};
}

export function NewgameModal({onStart, onCancel}) {
	const [drawCount, setDrawCount] = useState(1);

	return (
		<Modal>
			<ModalHeader>Klondike Solitaire</ModalHeader>
			<ModalLabel>Draw count</ModalLabel>
			<ModalRadio
				options={[
					{label: "draw 1", key: 1},
					{label: "draw 3", key: 3},
				]}
				selected={drawCount}
				onSelection={setDrawCount}
			/>
			<ModalFooter>
				<ModalButton onClick={onCancel}>Cancel</ModalButton>
				<ModalButton onClick={() => onStart({drawCount})}>Start</ModalButton>
			</ModalFooter>
		</Modal>
	);
}
