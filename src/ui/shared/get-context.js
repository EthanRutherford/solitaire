import {Card} from "./card";
import {EmptyZone} from "./empty-zone";

function getComponentFiber(elem, acceptTypes) {
	let fiber = Object.entries(elem).find(([k]) => k.startsWith("__reactFiber$"))?.[1];
	while (fiber != null) {
		if (acceptTypes.includes(fiber.type)) {
			return fiber;
		}

		fiber = fiber.return;
	}

	return null;
}

export function getCard(elem) {
	const fiber = getComponentFiber(elem, [Card]);
	if (fiber != null) {
		return fiber.memoizedProps.card;
	}

	return null;
}

export function getContext(elem) {
	const fiber = getComponentFiber(elem, [Card, EmptyZone]);
	if (fiber?.type === Card) {
		return fiber.memoizedProps.card.meta.context;
	}
	if (fiber?.type === EmptyZone) {
		return fiber.memoizedProps.context;
	}

	return null;
}
