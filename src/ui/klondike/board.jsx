import {useCallback, useMemo} from "react";
import {suits} from "../../logic/deck";
import {Game} from "../../logic/klondike/game";
import {useRerender} from "../../hooks/use-rerender";
import {UndoStack} from "../../logic/undo-stack";
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

	const rerender = useRerender();
	const onDrop = useCallback((pointer, targetContext) => {
		const cards = pointer.dragCards;
		const commit = undoStack.record(game);
		if (Object.values(game.foundations).includes(targetContext) && cards.length === 1) {
			if (game.tryMoveToFoundation(cards[0].card, targetContext)) {
				rerender();
				commit();
			}
		} else if (game.tableau.includes(targetContext)) {
			if (game.tryTransferStack(cards[0].card, targetContext)) {
				rerender();
				commit();
			}
		}
	}, []);

	const flipDiscard = useCallback(() => {
		if (game.drawPile.length > 0) {
			return;
		}

		const commit = undoStack.record(game);
		function flipOne() {
			game.undrawCards(1);
			rerender();
			if (game.discardPile.length > 0) {
				setTimeout(flipOne, 20);
			} else {
				commit();
			}
		}

		flipOne();
	}, []);

	const drawPileTap = useCallback((pointer) => {
		if (pointer.card === pointer.card.meta.context.fromTop()) {
			const commit = undoStack.record(game);
			game.drawCards(1);
			rerender();
			commit();
		}
	}, []);

	const playableDoubleTap = useCallback((pointer) => {
		const commit = undoStack.record(game);
		if (game.tryMoveToFoundation(pointer.card)) {
			rerender();
			commit();
		}
	}, []);

	const undo = useCallback(() => {
		const delta = undoStack.undo();
		if (delta != null) {
			Game.deserialize(delta, game);
			rerender();
		}
	}, []);

	const redo = useCallback(() => {
		const delta = undoStack.redo();
		if (delta != null) {
			Game.deserialize(delta, game);
			rerender();
		}
	}, []);

	const discardGetCards = useCallback((card) => [card.meta.context.fromTop()]);

	const tableauGetCards = useCallback((card) => {
		const context = card.meta.context;
		const index = context.indexOf(card);
		return context.slice(index);
	});

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
