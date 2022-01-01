import {useCallback, useMemo} from "react";
import {suits} from "../../logic/deck";
import {Game} from "../../logic/klondike/game";
import {UndoStack} from "../../logic/undo-stack";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {
	CardRenderer,
	renderPile,
	renderFoundation,
	renderStack,
} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import styles from "./board.css";

function useGame() {
	const game = useMemo(() => Game.fromScratch(), []);
	const undoStack = useMemo(() => new UndoStack());
	const enqueueAction = useActionQueue();

	const rerender = useRerender();
	const tryAutoComplete = enqueueAction(function*() {
		let movedFromDeck = {};
		while (movedFromDeck != null) {
			const commit = undoStack.record(game);
			movedFromDeck = game.tryAutoCompleteOne();
			if (movedFromDeck != null) {
				rerender();
				commit();
				if (game.tryFlipCard(movedFromDeck)) {
					yield 10;
					rerender();
					commit();
				}

				yield 100;
			}
		}
	});

	const onDrop = enqueueAction(function*(pointer, targetContext) {
		const cards = pointer.dragCards;
		if (Object.values(game.foundations).includes(targetContext) && cards.length === 1) {
			const commit = undoStack.record(game);
			const originDeck = cards[0].card.meta.context;
			if (game.tryMoveToFoundation(cards[0].card, targetContext)) {
				rerender();
				commit();
				yield 10;

				tryAutoComplete();
				if (game.tryFlipCard(originDeck)) {
					rerender();
					commit();
				}
			}
		} else if (game.tableau.includes(targetContext)) {
			const commit = undoStack.record(game);
			const originDeck = cards[0].card.meta.context;
			if (game.tryTransferStack(cards[0].card, targetContext)) {
				rerender();
				commit();
				yield 10;

				tryAutoComplete();
				if (game.tryFlipCard(originDeck)) {
					rerender();
					commit();
				}
			}
		}
	});

	const flipDiscard = enqueueAction(function*() {
		if (game.drawPile.length > 0) {
			return;
		}

		const commit = undoStack.record(game);
		while (game.discardPile.length > 0) {
			game.undrawCards(1);
			rerender();
			commit();
			yield 10;
		}

		tryAutoComplete();
	});

	const drawPileTap = enqueueAction(function*(pointer) {
		if (pointer.card === pointer.card.meta.context.fromTop()) {
			const commit = undoStack.record(game);
			game.drawCards(1);
			rerender();
			commit();
			tryAutoComplete();
			yield 10;
		}
	});

	const playableDoubleTap = enqueueAction(function*(pointer) {
		const commit = undoStack.record(game);
		const originDeck = pointer.card.meta.context;

		if (game.tryMoveToFoundation(pointer.card)) {
			rerender();
			commit();
			yield 10;

			tryAutoComplete();
			if (game.tryFlipCard(originDeck)) {
				rerender();
				commit();
			}
		}
	});

	const undo = enqueueAction(function*() {
		const deltas = undoStack.undo();
		if (deltas == null) {
			return;
		}

		undoStack.lock = true;
		while (deltas.length > 0) {
			Game.deserialize(deltas.pop(), game);
			rerender();
			yield 10;
		}

		undoStack.lock = false;
	});

	const redo = enqueueAction(function*() {
		const deltas = undoStack.redo();
		if (deltas == null) {
			return;
		}

		undoStack.lock = true;
		while (deltas.length > 0) {
			Game.deserialize(deltas.pop(), game);
			rerender();
			yield 10;
		}

		undoStack.lock = false;
	});

	const discardGetCards = useCallback((card) => [card.meta.context.fromTop()], []);

	const tableauGetCards = useCallback((card) => {
		const context = card.meta.context;
		const index = context.indexOf(card);
		return context.slice(index);
	}, []);

	return {
		game,
		onDrop,
		flipDiscard,
		drawPileTap,
		playableDoubleTap,
		undo,
		redo,
		discardGetCards,
		tableauGetCards,
	};
}

export function Board() {
	const {
		game,
		onDrop,
		flipDiscard,
		drawPileTap,
		playableDoubleTap,
		undo,
		redo,
		discardGetCards,
		tableauGetCards,
	} = useGame();

	return (
		<div className={styles.board}>
			<EmptyZone pos={{x: 10, y: 10}} context={game.drawPile} onClick={flipDiscard} />
			<EmptyZone pos={{x: 340, y: 10}} context={game.foundations[suits.spades]} />
			<EmptyZone pos={{x: 450, y: 10}} context={game.foundations[suits.diamonds]} />
			<EmptyZone pos={{x: 560, y: 10}} context={game.foundations[suits.clubs]} />
			<EmptyZone pos={{x: 670, y: 10}} context={game.foundations[suits.hearts]} />
			{game.tableau.map((stack, i) => (
				<EmptyZone pos={{x: 10 + i * 110, y: 170}} context={stack} key={i} />
			))}
			<CardRenderer onDrop={onDrop}>
				{renderPile({x: 10, y: 10}, game.drawPile, {
					onTap: drawPileTap,
				})}
				{renderPile({x: 120, y: 10}, game.discardPile, {
					onDoubleTap: playableDoubleTap,
					getDragCards: discardGetCards,
				})}
				{renderFoundation({x: 340, y: 10}, game.foundations[suits.spades])}
				{renderFoundation({x: 450, y: 10}, game.foundations[suits.diamonds])}
				{renderFoundation({x: 560, y: 10}, game.foundations[suits.clubs])}
				{renderFoundation({x: 670, y: 10}, game.foundations[suits.hearts])}
				{game.tableau.map((stack, i) => renderStack({x: 10 + i * 110, y: 170}, stack, {
					onDoubleTap: playableDoubleTap,
					getDragCards: tableauGetCards,
				}))}
			</CardRenderer>
			<div style={{position: "absolute", left: 1000}}>
				<button onClick={undo}>undo</button>
				<button onClick={redo}>redo</button>
			</div>
		</div>
	);
}
