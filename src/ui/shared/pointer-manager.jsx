import {createContext, useCallback, useContext, useLayoutEffect, useMemo} from "react";
import {Card} from "./card";
import {EmptyZone} from "./empty-zone";

function getCard(elem) {
	let fiber = Object.entries(elem).find(([k]) => k.startsWith("__reactFiber$"))?.[1];
	while (fiber != null) {
		if (fiber.type === Card) {
			return fiber.memoizedProps.card.meta.context;
		}

		if (fiber.type === EmptyZone) {
			return fiber.memoizedProps.context;
		}

		fiber = fiber.return;
	}

	return null;
}

const pointerContext = createContext([]);

export function PointerManager({onDrag, onDrop, children}) {
	const pointers = useMemo(() => ({current: null, previous: null}), []);

	useLayoutEffect(() => {
		const pointerMove = (event) => {
			event.preventDefault();
			if (event.pointerId !== pointers.current?.id || pointers.current.dragCards == null) {
				return;
			}

			const timeSince = event.timeStamp - pointers.current.timeStamp;
			for (const dragCard of pointers.current.dragCards) {
				const origin = dragCard.origin;
				const newPos = {
					x: event.pageX - dragCard.offset.x,
					y: event.pageY - dragCard.offset.y,
				};

				const distSqr = (newPos.x - origin.x) ** 2 + (newPos.y - origin.y) ** 2;
				if (distSqr > 25 ** 2 || timeSince > 250) {
					pointers.current.dragging = true;
					dragCard.card.meta.dragPos = newPos;
					dragCard.card.meta.rerender();
				}
			}
		};

		document.addEventListener("pointermove", pointerMove);
		return () => document.removeEventListener("pointermove", pointerMove);
	}, [onDrag]);

	useLayoutEffect(() => {
		const pointerUp = (event) => {
			event.preventDefault();
			if (event.pointerId !== pointers.current?.id) {
				return;
			}

			if (pointers.current.dragging) {
				const target = getCard(event.target);
				onDrop(pointers.current, target);

				for (const dragCard of pointers.current.dragCards) {
					dragCard.card.meta.dragPos = null;
					dragCard.card.meta.rerender();
				}
			} else if (event.timeStamp - pointers.current.timeStamp < 250) {
				if (
					event.pointerId === pointers.previous?.id &&
					pointers.current.timeStamp - pointers.previous.timeStamp < 500 &&
					pointers.current.onDoubleTap != null
				) {
					pointers.current.onDoubleTap(pointers.current);
				} else if (pointers.current.onTap != null) {
					pointers.current.onTap(pointers.current);
				}
			}

			pointers.previous = pointers.current;
			pointers.current = null;
		};

		document.addEventListener("pointerup", pointerUp);
		document.addEventListener("pointercancel", pointerUp);
		return () => {
			document.removeEventListener("pointerup", pointerUp);
			document.removeEventListener("pointercancel", pointerUp);
		};
	}, [onDrop]);

	return (
		<pointerContext.Provider value={pointers}>
			{children}
		</pointerContext.Provider>
	);
}

export function usePointers(card, onTap, onDoubleTap, getDragCards) {
	const pointers = useContext(pointerContext);

	return useCallback((event) => {
		event.preventDefault();
		if (pointers.current == null) {
			pointers.current = {
				id: event.pointerId,
				timeStamp: event.timeStamp,
				card,
				onTap,
				onDoubleTap,
				dragCards: getDragCards?.(card).map((card) => ({
					card,
					origin: {
						x: card.meta.elem.offsetLeft,
						y: card.meta.elem.offsetTop,
					},
					offset: {
						x: event.pageX - card.meta.elem.offsetLeft,
						y: event.pageY - card.meta.elem.offsetTop,
					},
				})),
			};
		}
	}, [card, onTap, onDoubleTap, getDragCards]);
}
