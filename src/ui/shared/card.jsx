import {useMemo, useCallback, useState} from "react";
import {useValueChanged} from "../../util/use-value-changed";
import {useRerender} from "../../util/use-rerender";
import {suits} from "../../logic/deck";
import styles from "./card.css";
import {usePointers} from "./pointer-manager";

const suitChars = {
	[suits.spades]: "♠️",
	[suits.diamonds]: "♦️",
	[suits.clubs]: "♣️",
	[suits.hearts]: "♥️",
};

const suitColors = {
	[suits.spades]: styles.black,
	[suits.diamonds]: styles.red,
	[suits.clubs]: styles.black,
	[suits.hearts]: styles.red,
};

function usePosition(card, pos) {
	const [moving, endMoving] = useValueChanged(pos.x, pos.y, pos.z);
	const style = useMemo(() => {
		const styles = {};
		if (card.meta.dragPos != null) {
			styles.left = card.meta.dragPos.x;
			styles.top = card.meta.dragPos.y;
			styles.pointerEvents = "none";
			styles.transition = "unset";
			styles.zIndex = 400 + pos.z;
		} else {
			styles.left = pos.x;
			styles.top = pos.y;
			styles.zIndex = pos.z;
		}

		if (moving) {
			styles.pointerEvents = "none";
			styles.zIndex += 300;
		}

		return styles;
	}, [card.meta.dragPos, moving]);
	const onTransitionEnd = useCallback((event) => {
		if (event.propertyName === "left" || event.propertyName === "top") {
			endMoving();
			card.meta.rerender();
		}
	}, []);
	return {style, onTransitionEnd};
}

function useFlip(card, pos) {
	const [flipped, resetFlipped] = useValueChanged(card.faceUp);
	const [state, setState] = useState({faceUp: card.faceUp});

	if (flipped) {
		resetFlipped();
		setState({
			flipClass: state.faceUp ? styles.flipRtlA : styles.flipLtrA,
			faceUp: state.faceUp,
			zIndex: 200 - pos.z,
			animationEnd: () => setState({
				flipClass: card.faceUp ? styles.flipLtrB : styles.flipRtlB,
				faceUp: card.faceUp,
				zIndex: 200 + pos.z,
				animationEnd: () => setState({faceUp: card.faceUp}),
			}),
		});
	}

	return state;
}

function useDropShadow(card) {
	if (card.meta.grabPos != null) {
		return styles.dropShadow;
	}

	return null;
}

const cns = (...names) => names.filter((x) => x).join(" ");
export function Card({card, pos, onTap, onDoubleTap, getDragCards}) {
	card.meta.rerender = useRerender();

	const onPointerDown = usePointers(card, onTap, onDoubleTap, getDragCards);
	const {style, ...positionProps} = usePosition(card, pos);
	const {flipClass, faceUp, zIndex, animationEnd} = useFlip(card, pos);
	const shadowClass = useDropShadow(card);

	if (!faceUp) {
		const className = cns(styles.cardBack, flipClass, shadowClass);
		return (
			<div
				className={className}
				onPointerDown={onPointerDown}
				onAnimationEnd={animationEnd}
				{...positionProps}
				style={{...style, zIndex: zIndex ?? style.zIndex}}
				ref={(elem) => card.meta.elem = elem}
			/>
		);
	}

	const className = cns(styles.cardFront, suitColors[card.suit], flipClass, shadowClass);
	return (
		<div
			className={className}
			onPointerDown={onPointerDown}
			onAnimationEnd={animationEnd}
			{...positionProps}
			style={{...style, zIndex: zIndex ?? style.zIndex}}
			ref={(elem) => card.meta.elem = elem}
		>
			<div className={styles.topCorner}>
				{card.label}
				<div className={styles.suit}>
					{suitChars[card.suit]}
				</div>
			</div>
			<div className={styles.bottomCorner}>
				{card.label}
				<div className={styles.suit}>
					{suitChars[card.suit]}
				</div>
			</div>
		</div>
	);
}
