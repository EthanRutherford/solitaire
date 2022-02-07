import {useCallback} from "react";
import Draw from "../../../images/draw.svg";
import {Game} from "../../logic/pyramid/game";
import {CardRenderer, renderPile} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {sizerated} from "../shared/sizerator";
import {BoardCore, useGameCore} from "../shared/board";
import {CardRingAnimation} from "../animations/card-ring";
import {NewgameModal, useNewGame} from "./newgame-modal";
import styles from "./board.css";

function useGame() {
	const {
		game,
		undoStack,
		enqueueAction,
		isAnimating,
		setAnimation,
		useSetup,
		rerender,
		newGame: newGameCore,
		saveGame,
		tryFinish,
		undo,
		redo,
	} = useGameCore(Game, "pyramid");
	const newGame = useNewGame("pyramid", newGameCore);
	useSetup(newGame.openModal);

	const finishCards = enqueueAction(function*(...cards) {
		for (const card of cards.reverse()) {
			game.clearCard(card);
			rerender();
			yield 10;
		}

		setAnimation(new CardRingAnimation(game.completed));
		rerender();
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
		} else {
			finishCards(...game.drawPile, ...game.discardPile);
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

	return {
		game,
		isAnimating,
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

export const Board = sizerated(7, 5, function Board() {
	const {
		game,
		isAnimating,
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
		<BoardCore newGame={newGame.openModal} undo={undo} redo={redo}>
			<BoardCore.Background>
				<EmptyZone slot={{x: 2, y: 4}} onClick={flipDiscard}>
					{game.remainingFlips}
				</EmptyZone>
				<EmptyZone slot={{x: 4, y: 4}} />
				<button className={styles.drawButton} onClick={drawPileDraw}>
					<Draw />
				</button>
			</BoardCore.Background>
			<CardRenderer onDrop={onDrop} isAnimating={isAnimating}>
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
			{newGame.showModal && (
				<NewgameModal {...newGame} />
			)}
		</BoardCore>
	);
});
