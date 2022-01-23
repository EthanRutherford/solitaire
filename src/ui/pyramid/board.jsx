import {useCallback, useEffect, useMemo} from "react";
import Draw from "../../../images/draw.svg";
import {Game} from "../../logic/pyramid/game";
import {UndoStack} from "../../logic/undo-stack";
import {get, put, remove, saveGameTable} from "../../logic/game-db";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {CardRenderer, renderPile} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {ControlBar} from "../shared/control-bar";
import {Sizerator} from "../shared/sizerator";
import {NewgameModal, useNewGame} from "./newgame-modal";
import styles from "./board.css";

function useGame() {
	const game = useMemo(() => new Game(), []);
	const undoStack = useMemo(() => new UndoStack());
	const enqueueAction = useActionQueue();
	const rerender = useRerender();
	const saveGame = useCallback(() => put(saveGameTable, {
		key: "pyramid",
		game: game.serialize(),
		undoStack: undoStack.serialize(),
	}), []);
	const newGame = useNewGame("klondike", (settings) => {
		Game.fromScratch(game, settings);
		undoStack.reset();
		enqueueAction.reset();
		saveGame();
		rerender();
	});

	useEffect(() => {
		(async () => {
			const save = await get(saveGameTable, "pyramid");
			if (save != null) {
				Game.deserialize(save.game, game);
				UndoStack.deserialize(save.undoStack, undoStack);
				rerender();
			} else {
				newGame.openModal();
			}
		})();
	}, []);

	const finishCards = enqueueAction(function*(...cards) {
		for (const card of cards.reverse()) {
			game.clearCard(card);
			rerender();
			yield 100;
		}
	});

	const tryFinish = useCallback(() => {
		if (game.hasWon()) {
			undoStack.reset();
			enqueueAction.reset();
			finishCards(...game.drawPile, ...game.discardPile);
			remove(saveGameTable, "pyramid");
			return true;
		}

		return false;
	});

	const doClearCards = enqueueAction(function*(...cards) {
		const commit = undoStack.record(game);
		for (const card of cards) {
			game.clearCard(card);
		}

		rerender();
		commit();
		yield 100;

		if (!tryFinish()) {
			saveGame();
		}
	}, []);

	const onDrop = useCallback((pointer, _, targetCard) => {
		if (targetCard != null && game.canClearCards(pointer.card, targetCard)) {
			doClearCards(pointer.card, targetCard);
		}
	}, []);

	const flipDiscard = enqueueAction(function*() {
		if (game.drawPile.length > 0 || game.remainingFlips === 0) {
			return;
		}

		const commit = undoStack.record(game);
		game.remainingFlips--;
		while (game.discardPile.length > 0) {
			game.undrawCard();
			rerender();
			commit();
			yield 10;
		}

		saveGame();
	});

	const drawPileDraw = enqueueAction(function*() {
		document.activeElement.blur();
		const commit = undoStack.record(game);
		if (game.drawPile.length > 0) {
			game.drawCard();
			rerender();
			commit();
			saveGame();
			yield 100;
		} else {
			flipDiscard();
		}
	});

	const playableGetCards = useCallback((card) => game.getMovableCards(card), []);

	const playableTap = useCallback((pointer) => {
		const activeCard = getCard(document.activeElement);
		if (activeCard != null && game.canClearCards(activeCard, pointer.card)) {
			doClearCards(activeCard, pointer.card);
			return;
		}

		document.activeElement.blur();
		if (pointer.dragCards != null) {
			pointer.card.meta.elem.focus();
		}
	}, []);

	const playableDoubleTap = useCallback((pointer) => {
		if (game.canClearCards(pointer.card, pointer.card)) {
			doClearCards(pointer.card);
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

		saveGame();
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

		saveGame();
		undoStack.lock = false;
	});

	return {
		game,
		newGame,
		onDrop,
		flipDiscard,
		drawPileDraw,
		playableGetCards,
		playableTap,
		playableDoubleTap,
		undo,
		redo,
	};
}

export const renderPyramid = (cards, handlers) => () => {
	const results = [];
	for (let i = 0, j = 0; j < cards.length; i++, j += i) {
		const rowSize = i + 1;
		const startX = 3 - (i / 2);
		for (let k = 0; k < rowSize; k++) {
			const card = cards[j + k];
			if (card != null) {
				results.push({
					card: cards[j + k],
					slot: {x: startX + k, y: i / 2},
					offsetZ: i,
					handlers,
				});
			}
		}
	}

	return results;
};

export function Board() {
	const {
		game,
		newGame,
		onDrop,
		flipDiscard,
		drawPileDraw,
		playableGetCards,
		playableTap,
		playableDoubleTap,
		undo,
		redo,
	} = useGame();

	return (
		<Sizerator cardsAcross={7} cardsTall={5}>
			<div className={styles.board}>
				<EmptyZone slot={{x: 2, y: 4}} onClick={flipDiscard}>
					{game.remainingFlips}
				</EmptyZone>
				<EmptyZone slot={{x: 4, y: 4}} />
				<button className={styles.drawButton} onClick={drawPileDraw}>
					<Draw />
				</button>
				<CardRenderer onDrop={onDrop}>
					{renderPyramid(game.tree, {
						onTap: playableTap,
						onDoubleTap: playableDoubleTap,
						getDragCards: playableGetCards,
					})}
					{renderPile({x: 2, y: 4}, game.drawPile, {
						onTap: playableTap,
						onDoubleTap: playableDoubleTap,
						getDragCards: playableGetCards,
					})}
					{renderPile({x: 4, y: 4}, game.discardPile, {
						onTap: playableTap,
						onDoubleTap: playableDoubleTap,
						getDragCards: playableGetCards,
					})}
					{renderPile({x: 6, y: 4}, game.completed)}
				</CardRenderer>
			</div>
			<ControlBar newGame={newGame.openModal} undo={undo} redo={redo} />
			{newGame.showModal && (
				<NewgameModal {...newGame} />
			)}
		</Sizerator>
	);
}
