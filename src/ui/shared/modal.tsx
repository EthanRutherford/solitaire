import styles from "./modal.css";

function takeWhere(array, predicate) {
	const index = array.findIndex(predicate);
	return index >= 0 ? array.splice(index, 1)[0] : null;
}

export function Modal({children}) {
	children = [...children];
	const header = takeWhere(children, (c) => c.type === ModalHeader);
	const footer = takeWhere(children, (c) => c.type === ModalFooter);

	return (
		<div className={styles.modalBackdrop}>
			<div className={styles.modal}>
				{header}
				<div className={styles.body}>{children}</div>
				{footer}
			</div>
		</div>
	);
}

export function ModalHeader({children}) {
	return (
		<div className={styles.header}>
			{children}
		</div>
	);
}

export function ModalFooter({children}) {
	return (
		<div className={styles.footer}>
			{children}
		</div>
	);
}

export function ModalLabel({children}) {
	return (
		<div className={styles.label}>
			{children}
		</div>
	);
}

export function ModalButton(props) {
	return (
		<button className={styles.button} {...props} />
	);
}

function RadioButton({label, isSelected, onClick}) {
	return (
		<button className={styles.radioButton} onClick={onClick}>
			<div className={`${styles.radioCircle} ${isSelected ? styles.selected : ""}`} />
			{label}
		</button>
	);
}

export function ModalRadio({options, selected, onSelection}) {
	return options.map(({label, key}) => (
		<RadioButton
			label={label}
			isSelected={key === selected}
			onClick={() => onSelection(key)}
			key={key}
		/>
	));
}

export function ModalDisclaimer({children}) {
	return <div className={styles.disclaimer}>* {children}</div>;
}
