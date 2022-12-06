import {FC} from "react";
import {Card} from "./card";
import {EmptyZone} from "./empty-zone";

type ExtractPropTypes<F> = F extends FC<infer P> ? P : never;

interface Fiber<T extends FC<P>, P = ExtractPropTypes<T>> {
	type: T;
	return: Fiber<FC<unknown>> | null;
	memoizedProps: P;
}

function getComponentFiber<T extends FC<any>[]>(elem: Element, acceptTypes: T) {
	let fiber = Object.entries(elem).find(([k]) => k.startsWith("__reactFiber$"))?.[1] as Fiber<FC<unknown>> | null;
	while (fiber != null) {
		if (acceptTypes.includes(fiber.type)) {
			return fiber as Fiber<T[number], ExtractPropTypes<T[number]>>;
		}

		fiber = fiber.return;
	}

	return null;
}

export function getCard(elem: Element) {
	const fiber = getComponentFiber(elem, [Card]);
	if (fiber != null) {
		return fiber.memoizedProps.card;
	}

	return null;
}

export function getContextAndCard(elem: Element) {
	const fiber = getComponentFiber(elem, [Card, EmptyZone]);
	if (fiber?.type === Card) {
		const props = fiber.memoizedProps as ExtractPropTypes<typeof Card>;
		return [props.card.meta.context, props.card] as const;
	}
	if (fiber?.type === EmptyZone) {
		const props = fiber.memoizedProps as ExtractPropTypes<typeof EmptyZone>;
		return [props.context] as const;
	}

	return [] as const;
}
