import {Card as CardType} from "../../logic/deck";
import {Card} from "./card";
import {EmptyZone} from "./empty-zone";

function getComponentFiber(elem: Element, acceptTypes: unknown[]) {
	let fiber = Object.entries(elem).find(([k]) => k.startsWith("__reactFiber$"))?.[1];
	while (fiber != null) {
		if (acceptTypes.includes(fiber.type)) {
			return fiber;
		}

		fiber = fiber.return;
	}

	return null;
}

export function getCard(elem: Element) {
	const fiber = getComponentFiber(elem, [Card]);
	if (fiber != null) {
		return fiber.memoizedProps.card as CardType;
	}

	return null;
}

export function getContextAndCard(elem: Element) {
	const fiber = getComponentFiber(elem, [Card, EmptyZone]);
	if (fiber?.type === Card) {
		return [fiber.memoizedProps.card.meta.context, fiber.memoizedProps.card] as const;
	}
	if (fiber?.type === EmptyZone) {
		return [fiber.memoizedProps.context] as const;
	}

	return [] as const;
}
