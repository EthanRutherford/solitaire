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
	const [suitCount, setSuitCount] = useState(1);

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
