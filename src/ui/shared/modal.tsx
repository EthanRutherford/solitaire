import {ReactNode, MouseEventHandler, ReactElement, FC} from "react";
import styles from "./modal.css";

function takeWhere<T>(array: T[], predicate: (x: T) => boolean) {
	const index = array.findIndex(predicate);
	return index >= 0 ? array.splice(index, 1)[0] : null;
}

function typeIs(node: ReactNode, Type: FC<any>) {
	return (node as {type?: FC} | null)?.type === Type;
}

export function Modal({children}: {children: ReactNode}) {
	const wrapped = children instanceof Array ? [...children as ReactNode[]] : [children];
	const header = takeWhere(wrapped, (c) => typeIs(c, ModalHeader));
	const footer = takeWhere(wrapped, (c) => typeIs(c, ModalFooter));

	return (
		<div className={styles.modalBackdrop}>
			<div className={styles.modal}>
				{header}
				<div className={styles.body}>{wrapped}</div>
				{footer}
			</div>
		</div>
	);
}

export function ModalHeader({children}: {children: ReactNode}) {
	return (
		<div className={styles.header}>
			{children}
		</div>
	);
}

export function ModalFooter({children}: {children: ReactNode}) {
	return (
		<div className={styles.footer}>
			{children}
		</div>
	);
}

export function ModalLabel({children}: {children: ReactNode}) {
	return (
		<div className={styles.label}>
			{children}
		</div>
	);
}

export function ModalButton(props: Record<string, unknown>) {
	return (
		<button className={styles.button} {...props} />
	);
}

interface RadioButtonProps {
	label: ReactNode;
	isSelected: boolean;
	onClick: MouseEventHandler;
}
function RadioButton({label, isSelected, onClick}: RadioButtonProps) {
	return (
		<button className={styles.radioButton} onClick={onClick}>
			<div className={`${styles.radioCircle} ${isSelected ? styles.selected : ""}`} />
			{label}
		</button>
	);
}

interface ModalRadioProps<KeyType> {
	options: {label: string; key: KeyType}[];
	selected: KeyType;
	onSelection: (key: KeyType) => void;
}
export function ModalRadio<KeyType extends string | number>({options, selected, onSelection}: ModalRadioProps<KeyType>) {
	return options.map(({label, key}) => (
		<RadioButton
			label={label}
			isSelected={key === selected}
			onClick={() => onSelection(key)}
			key={`${key}`}
		/>
	// the type system does not seem to know that this is ok
	)) as unknown as ReactElement;
}

export function ModalDisclaimer({children}: {children: ReactNode}) {
	return <div className={styles.disclaimer}>* {children}</div>;
}
