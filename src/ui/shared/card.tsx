import {useMemo, useCallback, useState} from "react";
import Brown from "../../../images/backs/brown";
import Spade from "../../../images/spade";
import Diamond from "../../../images/diamond";
import Club from "../../../images/club";
import Heart from "../../../images/heart";
import {useValueChanged} from "../../util/use-value-changed";
import {useRerender} from "../../util/use-rerender";
import {suits} from "../../logic/deck";
import {usePointers} from "./pointer-manager";
import styles from "./card.css";
import {CardFace} from "./card-face";

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

const trueMod = (v, m) => ((v % m) + m) % m;
function usePosition(card, pos) {
	const moved = useValueChanged(card.meta.context);
	const [moving, setMoving] = useState(false);

	if (moved) {
		setMoving(true);
	}

	const style = useMemo(() => {
		const styles = {};
		if (card.meta.dragPos != null) {
			styles.left = card.meta.dragPos.x;
			styles.top = card.meta.dragPos.y;
			styles.pointerEvents = "none";
			styles.transition = "unset";
			styles.zIndex = 10000 + trueMod(pos.z, 1000);
		} else {
			styles.left = pos.x;
			styles.top = pos.y;
		}

		return styles;
	}, [card.meta.dragPos, pos.x, pos.y, pos.z]);

	const onTransitionEnd = useCallback((event) => {
		if (event.propertyName === "left" || event.propertyName === "top") {
			setMoving(false);
		}
	}, []);

	return {style, moving: moved || moving, onTransitionEnd};
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
				z: 1000 - trueMod(pos.z, 1000),
				animationEnd: () => setState({
					flipClass: card.faceUp ? styles.flipLtrB : styles.flipRtlB,
					faceUp: card.faceUp,
					z: trueMod(pos.z, 1000),
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
	const {style, moving, ...positionProps} = usePosition(card, pos);
	const {flipClass, faceUp, z, animationEnd} = useFlip(card, pos);
	const shadowClass = useDropShadow(card);
	const zIndex = style.zIndex ?? ((z ?? pos.z) + (moving ? 2000 : 0));

	if (!faceUp) {
		const className = cns(styles.cardBack, flipClass, shadowClass);
		return (
			<div
				className={className}
				onPointerDown={onPointerDown}
				onAnimationEnd={animationEnd}
				{...positionProps}
				style={{...style, zIndex}}
				ref={(elem) => card.meta.elem = elem}
			>
				<Brown />
			</div>
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
			style={{...style, zIndex}}
			tabIndex={-1}
			ref={(elem) => card.meta.elem = elem}
		>
			<div className={styles.topCorner}>
				<div>{card.label}</div>
				<SuitSvg className={styles.suit} />
			</div>
			<CardFace Icon={SuitSvg} value={card.value} />
			<div className={styles.bottomCorner}>
				<div>{card.label}</div>
				<SuitSvg className={styles.suit} />
			</div>
		</div>
	);
}
