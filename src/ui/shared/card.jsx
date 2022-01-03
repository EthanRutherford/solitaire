import {useMemo, useCallback, useState, useEffect} from "react";
import Spade from "../../../images/spade";
import Diamond from "../../../images/diamond";
import Club from "../../../images/club";
import Heart from "../../../images/heart";
import {useValueChanged} from "../../util/use-value-changed";
import {useRerender} from "../../util/use-rerender";
import {suits} from "../../logic/deck";
import {usePointers} from "./pointer-manager";
import styles from "./card.css";

const suitSvgs = {
	[suits.spades]: Spade,
	[suits.diamonds]: Diamond,
	[suits.clubs]: Club,
	[suits.hearts]: Heart,
};

const suitColors = {
	[suits.spades]: styles.black,
	[suits.diamonds]: styles.red,
	[suits.clubs]: styles.black,
	[suits.hearts]: styles.red,
};

function usePosition(card, pos) {
	const moved = useValueChanged(pos.x, pos.y, pos.z);
	const [moving, setMoving] = useState(false);
	const style = useMemo(() => {
		const styles = {};
		if (card.meta.dragPos != null) {
			styles.left = card.meta.dragPos.x;
			styles.top = card.meta.dragPos.y;
			styles.pointerEvents = "none";
			styles.transition = "unset";
			styles.zIndex = 400 + pos.z % 100;
		} else {
			styles.left = pos.x;
			styles.top = pos.y;
			styles.zIndex = pos.z;
		}

		if (moving || moved) {
			styles.pointerEvents = "none";
			styles.zIndex += 300 % 100;
		}

		return styles;
	}, [card.meta.dragPos, moving, moved, pos.x, pos.y, pos.z]);

	useEffect(() => {
		card.meta.elem.addEventListener("transitionstart", (event) => {
			if (event.propertyName === "left" || event.propertyName === "top") {
				setMoving(true);
			}
		});
	}, []);

	const onTransitionEnd = useCallback((event) => {
		if (event.propertyName === "left" || event.propertyName === "top") {
			setMoving(false);
		}
	}, []);

	return {style, onTransitionEnd};
}

function useFlip(card, pos) {
	const flipped = useValueChanged(card.faceUp);
	const [state, setState] = useState({faceUp: card.faceUp});

	if (flipped) {
		if (card.faceUp === state.faceUp) {
			setState({faceUp: card.faceUp});
		} else {
			setState({
				flipClass: state.faceUp ? styles.flipRtlA : styles.flipLtrA,
				faceUp: state.faceUp,
				zIndex: 200 - pos.z % 100,
				animationEnd: () => setState({
					flipClass: card.faceUp ? styles.flipLtrB : styles.flipRtlB,
					faceUp: card.faceUp,
					zIndex: 200 + pos.z % 100,
					animationEnd: () => setState({faceUp: card.faceUp}),
				}),
			});
		}
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
	const SuitSvg = suitSvgs[card.suit];
	return (
		<div
			className={className}
			onPointerDown={onPointerDown}
			onAnimationEnd={animationEnd}
			{...positionProps}
			style={{...style, zIndex: zIndex ?? style.zIndex}}
			tabIndex={-1}
			ref={(elem) => card.meta.elem = elem}
		>
			<div className={styles.topCorner}>
				{card.label}<br />
				<SuitSvg className={styles.suit} />
			</div>
			<div className={styles.bottomCorner}>
				{card.label}<br />
				<SuitSvg className={styles.suit} />
			</div>
		</div>
	);
}
