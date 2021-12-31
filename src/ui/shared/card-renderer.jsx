import {Card} from "./card.jsx";
import {PointerManager} from "./pointer-manager.jsx";

// in order for css animations and transitions to work, the cards
// must stay within the same parent. Additionally, for react to match up
// the card element to the previous render, it needs them all in the same array.
// so, to keep things moderately react-y, we have to fiddle around with how
// we render the various parts of the board, using "subcomponents", aka functions
// which return arrays of elements, which we concat together and render.
export function CardRenderer({onDrop, children}) {
	return (
		<PointerManager onDrop={onDrop}>
			{children.flat(2).sort((a, b) => a.key.localeCompare(b.key))}
		</PointerManager>
	);
}

// common board layout components

export function renderPile(pos, cards, handlers) {
	return cards.map((c, i) => (
		<Card
			card={c}
			pos={{x: pos.x + Math.floor(i * .1) * 2, y: pos.y, z: i}}
			{...handlers}
			key={c.id}
		/>
	));
}

export function renderFoundation(pos, cards, handlers) {
	return cards.map((c, i) => (
		<Card
			card={c}
			pos={{x: pos.x, y: pos.y, z: i}}
			{...handlers}
			key={c.id}
		/>
	));
}

export function renderStack(pos, cards, handlers) {
	let posY = pos.y;
	return cards.map((c, i) => (
		<Card
			card={c}
			pos={{x: pos.x, y: posY, z: i}}
			{...handlers}
			key={c.id}
			_={posY += c.faceUp ? 32 : 10}
		/>
	));
}
