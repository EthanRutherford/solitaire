import {Card as CardType} from "../../logic/deck";
import {Card} from "./card";
import {PointerManager} from "./pointer-manager";
import {useSizes} from "./sizerator";

// in order for css animations and transitions to work, the cards
// must stay within the same parent. Additionally, for react to match up
// the card element to the previous render, it needs them all in the same array.
// so, to keep things moderately react-y, we have to fiddle around with how
// we render the various parts of the board, using "subcomponents", aka functions
// which return arrays of elements, which we concat together and render.

type Sizes = ReturnType<typeof useSizes>;
interface SlotPosition {x: number, y: number, z: number}
interface CardRendererSlot {
	card: CardType,
	slot: SlotPosition,
	offsetX: number,
	offsetY: number,
	offsetZ: number,
	handlers: Record<string, unknown>,
}

interface CardRendererProps {
	onDrop: () => void,
	isAnimating: boolean,
	children: ((sizes: Sizes) => CardRendererSlot)[],
}
export function CardRenderer({onDrop, isAnimating, children}: CardRendererProps) {
	const sizes = useSizes();
	const {margins, cardOffsetX, cardOffsetY} = sizes;
	const functions = (children instanceof Array ? children : [children]).flat(2);
	const defs = functions.flatMap((f) => f(sizes)).sort((a, b) => a.card.id - b.card.id);

	return (
		<PointerManager onDrop={onDrop}>
			<div style={isAnimating ? {transformStyle: "preserve-3d"} : undefined}>
				{defs.map(({card, slot, offsetX, offsetY, offsetZ, handlers}) => (
					<Card
						card={card}
						pos={{
							x: margins + slot.x * cardOffsetX + (offsetX ?? 0),
							y: margins + slot.y * cardOffsetY + (offsetY ?? 0),
							z: offsetZ,
						}}
						{...handlers}
						key={card.id}
					/>
				))}
			</div>
		</PointerManager>
	);
}

// common board layout components

function showOffset(showCount: number, cardCount: number, i: number) {
	return Math.max(Math.min(showCount, cardCount) - (cardCount - i), 0);
}
export const renderPile = (
	slot: SlotPosition,
	cards: CardType[],
	handlers: Record<string, unknown>,
	showCount = 1,
) => ({cardWidth}: {cardWidth: number}) => cards.map((card, i) => ({
	card,
	slot,
	offsetX: Math.floor(i * .1) * 2 + showOffset(showCount, cards.length, i) * cardWidth * .2,
	offsetZ: (slot.z ?? 0) + i,
	handlers,
}));

export const renderStack = (
	slot: SlotPosition,
	cards: CardType[],
	handlers: Record<string, unknown>,
) => (sizes: Sizes) => {
	const {margins, cardWidth, cardHeight} = sizes;

	let acc = 0;
	const result = cards.map((card, i) => {
		const offsetY = acc;
		acc += card.faceUp ? Math.max(26, cardWidth * .34) : cardWidth * .1;

		return {
			card,
			slot,
			offsetY,
			offsetZ: (slot.z ?? 0) + i,
			handlers,
		};
	});

	const maxHeight = (cardHeight + margins) * 3;
	const endHeight = result[result.length - 1]?.offsetY;

	if (endHeight > maxHeight) {
		const factor = maxHeight / endHeight;
		for (const def of result) {
			def.offsetY *= factor;
		}
	}

	return result;
};
