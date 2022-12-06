import {useMemo, useCallback, useState, CSSProperties, TransitionEvent} from "react";
import Brown from "../../../images/backs/brown.svg";
import Spade from "../../../images/spade.svg";
import Diamond from "../../../images/diamond.svg";
import Club from "../../../images/club.svg";
import Heart from "../../../images/heart.svg";
import {useValueChanged} from "../../util/use-value-changed";
import {useRerender} from "../../util/use-rerender";
import {Card as CardType, Suit} from "../../logic/deck";
import {usePointers, Pointer} from "./pointer-manager";
import {CardFace} from "./card-face";
import styles from "./card.css";

const suitSvgs = {
	[Suit.Spades]: Spade,
	[Suit.Diamonds]: Diamond,
	[Suit.Clubs]: Club,
	[Suit.Hearts]: Heart,
};

const suitColors = {
	[Suit.Spades]: styles.black,
	[Suit.Diamonds]: styles.red,
	[Suit.Clubs]: styles.black,
	[Suit.Hearts]: styles.red,
};

interface Position {x: number; y: number; z: number}

const trueMod = (v: number, m: number) => ((v % m) + m) % m;
function usePosition(card: CardType, pos: Position) {
	const moved = useValueChanged(card.meta.context);
	const [moving, setMoving] = useState(false);

	if (moved) {
		setMoving(true);
	}

	const style = useMemo(() => {
		const styles: CSSProperties = {};

		if (card.meta.dragPos != null) {
			const dragPos = card.meta.dragPos as {x: number; y: number};
			styles.left = dragPos.x;
			styles.top = dragPos.y;
			styles.pointerEvents = "none";
			styles.transition = "unset";
			styles.zIndex = 10000 + trueMod(pos.z, 1000);
		} else {
			styles.left = pos.x;
			styles.top = pos.y;
		}

		return styles;
	}, [card.meta.dragPos, pos.x, pos.y, pos.z]);

	const onTransitionEnd = useCallback((event: TransitionEvent) => {
		if (event.propertyName === "left" || event.propertyName === "top") {
			setMoving(false);
		}
	}, []);

	return {style, moving: moved || moving, onTransitionEnd};
}

interface FlipState {
	faceUp: boolean;
	flipClass?: string;
	z?: number;
	animationEnd?: () => void;
}

function useFlip(card: CardType, pos: Position) {
	const flipped = useValueChanged(card.faceUp);
	const [state, setState] = useState<FlipState>({faceUp: card.faceUp});

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

function useDropShadow(card: CardType) {
	if (card.meta.grabPos != null) {
		return styles.dropShadow;
	}

	return null;
}

interface CardPropTypes {
	card: CardType;
	pos: Position;
	onTap?: (pointer: Pointer) => void;
	onDoubleTap?: (pointer: Pointer) => void;
	getDragCards?: (card: CardType) => CardType[];
}

const cns = (...names: (string | nullish)[]) => names.filter((x) => x).join(" ");
export function Card({card, pos, onTap, onDoubleTap, getDragCards}: CardPropTypes) {
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
