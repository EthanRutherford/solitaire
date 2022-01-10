import {useCallback, useEffect, useMemo} from "react";
import {Deck} from "../../logic/deck";
import {Game} from "../../logic/spider/game";
import {UndoStack} from "../../logic/undo-stack";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {ControlBar} from "../shared/control-bar";
import {Sizerator} from "../shared/sizerator";
import styles from "./board.css";

function useGame() {
	const game = useMemo(() => new Game(), []);
	const undoStack = useMemo(() => new UndoStack());
	const enqueueAction = useActionQueue();
	const rerender = useRerender();
	const newGame = useCallback(() => {
		Game.fromScratch(game, 1);
		undoStack.reset();
		enqueueAction.reset();
		rerender();
	}, []);

	useEffect(() => {
		newGame();
	}, []);

	const tryCompleteStack = enqueueAction(function*(deck, commit) {
		if (game.canCompleteStack(deck)) {
			const foundation = new Deck();
			game.foundation.push(foundation);
			for (let i = 0; i < 13; i++) {
				game.moveCards(deck.draw(1), foundation);
				rerender();
				commit();
				yield 10;
			}

			if (game.tryFlipCard(deck)) {
				rerender();
				commit();
			}

			yield 100;
		}
	});

	const doMoveCards = enqueueAction(function*(card, targetContext) {
		card.meta.elem.blur();
		const commit = undoStack.record(game);
		const originDeck = card.meta.context;
		game.transferCards(card, targetContext);
		rerender();
		commit();

		if (game.tryFlipCard(originDeck)) {
			yield 10;
			rerender();
			commit();
		}

		tryCompleteStack(targetContext, commit);

		yield 100;
	});

	const onDrop = useCallback((pointer, targetContext) => {
		if (game.canMoveCards(pointer.card, targetContext)) {
			doMoveCards(pointer.card, targetContext);
		}
	}, []);

	const drawPileTap = enqueueAction(function*() {
		document.activeElement.blur();
		const commit = undoStack.record(game);
		for (let i = 0; i < 10; i++) {
			game.moveCards(game.drawPile.draw(1), game.tableau[i]);
			game.tableau[i].fromTop().faceUp = true;
			rerender();
			commit();
			yield 10;

			tryCompleteStack(game.tableau[i], commit);
		}

		yield 100;
	});

	const playableGetCards = useCallback((card) => game.getMovableCards(card), []);

	const targetTap = useCallback((targetContext) => {
		const activeCard = getCard(document.activeElement);
		if (activeCard != null && game.canMoveCards(activeCard, targetContext)) {
			doMoveCards(activeCard, targetContext);
			return true;
		}

		document.activeElement.blur();
		return false;
	});

	const playableTap = useCallback((pointer) => {
		const targetContext = pointer.card.meta.context;
		if (targetTap(targetContext)) {
			return;
		}

		if (pointer.dragCards != null) {
			pointer.card.meta.elem.focus();
		}
	}, []);

	const playableDoubleTap = useCallback((pointer) => {
		if (pointer.dragCards != null) {
			const target = game.tryGetMoveTarget(pointer.card);
			if (game.canMoveCards(pointer.card, target)) {
				doMoveCards(pointer.card, target);
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

	return {
		game,
		newGame,
		onDrop,
		drawPileTap,
		playableGetCards,
		targetTap,
		playableTap,
		playableDoubleTap,
		undo,
		redo,
	};
}

export function Board() {
	const {
		game,
		newGame,
		onDrop,
		drawPileTap,
		playableGetCards,
		targetTap,
		playableTap,
		playableDoubleTap,
		undo,
		redo,
	} = useGame();

	return (
		<Sizerator cardsAcross={10} cardsTall={5}>
			<div className={styles.board}>
				{game.tableau.map((stack, i) => (
					<EmptyZone
						slot={{x: i, y: 0}}
						context={stack}
						onTap={targetTap}
						key={i}
					/>
				))}
				<CardRenderer onDrop={onDrop}>
					{renderPile({x: 9, y: 4}, game.drawPile, {
						onTap: drawPileTap,
					})}
					{game.tableau.map((deck, i) => renderStack({x: i, y: 0}, deck, {
						onTap: playableTap,
						onDoubleTap: playableDoubleTap,
						getDragCards: playableGetCards,
					}))}
					{game.foundation.map((deck, i) => renderPile({
						x: i * .1, y: 4, z: -1000 + i * 100,
					}, deck, {}))}
				</CardRenderer>
			</div>
			<ControlBar newGame={newGame} undo={undo} redo={redo} />
		</Sizerator>
	);
}
