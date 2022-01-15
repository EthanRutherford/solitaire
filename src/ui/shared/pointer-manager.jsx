import {createContext, useCallback, useContext, useLayoutEffect, useMemo} from "react";
import {getContext} from "./get-context";

function getContextAtPoint(pointer) {
	const {left, top, width, height} = pointer.card.meta.elem.getBoundingClientRect();
	const elem = document.elementFromPoint(left + width / 2, top + height / 2);
	return getContext(elem);
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

			const {current, previous} = pointers;
			pointers.current = null;
			pointers.previous = null;

			if (current.dragging) {
				const target = getContextAtPoint(current, event);
				onDrop(current, target);

				for (const dragCard of current.dragCards) {
					dragCard.card.meta.dragPos = null;
					dragCard.card.meta.rerender();
				}

				return;
			}

			if (event.timeStamp - current.timeStamp < 250) {
				if (current.onDoubleTap != null) {
					if (
						current.card === previous?.card &&
						current.timeStamp - previous.timeStamp < 500
					) {
						current.onDoubleTap(current);
						return;
					}

					pointers.previous = current;
				}

				if (current.onTap != null) {
					current.onTap(current);
				}
			}
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
				dragCards: getDragCards?.(card)?.map((card) => ({
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
