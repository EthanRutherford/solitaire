import {Card} from "./card.jsx";
import {PointerManager} from "./pointer-manager.jsx";
import {useSizes} from "./sizerator.jsx";

// in order for css animations and transitions to work, the cards
// must stay within the same parent. Additionally, for react to match up
// the card element to the previous render, it needs them all in the same array.
// so, to keep things moderately react-y, we have to fiddle around with how
// we render the various parts of the board, using "subcomponents", aka functions
// which return arrays of elements, which we concat together and render.
export function CardRenderer({onDrop, children}) {
	const {margins, cardOffsetX, cardOffsetY} = useSizes();
	const defs = children.flat(2).sort((a, b) => a.card.id - b.card.id);

	return (
		<PointerManager onDrop={onDrop}>
			{defs.map(({card, slot, offsetX, offsetY, offsetZ, handlers}) => (
				<Card
					card={card}
					pos={{
						x: margins + slot.x * cardOffsetX + offsetX,
						y: margins + slot.y * cardOffsetY + offsetY,
						z: offsetZ,
					}}
					{...handlers}
					key={card.id}
				/>
			))}
		</PointerManager>
	);
}

// common board layout components

export function renderPile(slot, cards, handlers) {
	return cards.map((card, i) => ({
		card,
		slot,
		offsetX: Math.floor(i * .1) * 2,
		offsetY: 0,
		offsetZ: (slot.z ?? 0) + i,
		handlers,
	}));
}

export function renderStack(slot, cards, handlers) {
	let acc = 0;
	return cards.map((card, i) => {
		const offsetY = acc;
		acc += card.faceUp ? 32 : 10;

		return {
			card,
			slot,
			offsetX: 0,
			offsetY,
			offsetZ: (slot.z ?? 0) + i,
			handlers,
		};
	});
}
