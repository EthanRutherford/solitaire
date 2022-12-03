import {useCallback} from "react";
import {Game} from "../../logic/wish/game";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {sizerated} from "../shared/sizerator";
import {BoardCore, useGameCore} from "../shared/board";
import {CardRingAnimation} from "../animations/card-ring";
import {NewgameModal, useNewGame} from "./newgame-modal";

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
	} = useGameCore(Game, "wish");
	const newGame = useNewGame("wish", newGameCore);
	useSetup(newGame.openModal);

	const doClearCards = enqueueAction(function*(...cards) {
		const commit = undoStack.record(game);
		for (const card of cards) {
			game.clearCard(card);
			card.meta.elem.blur();
		}

		rerender();
		commit();
		yield 100;

		if (!tryFinish()) {
			saveGame();
		} else {
			setAnimation(new CardRingAnimation(game.completed));
			rerender();
		}
	}, []);

	const onDrop = useCallback((pointer, _, targetCard) => {
		if (targetCard != null && game.canClearCards(pointer.card, targetCard)) {
			doClearCards(pointer.card, targetCard);
		}
	}, []);

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

	return {
		game,
		isAnimating,
		newGame,
		onDrop,
		playableGetCards,
		playableTap,
		undo,
		redo,
	};
}

export const Board = sizerated(8, 5, function Board() {
	const {
		game,
		isAnimating,
		newGame,
		onDrop,
		playableGetCards,
		playableTap,
		undo,
		redo,
	} = useGame();

	return (
		<BoardCore newGame={newGame.openModal} undo={undo} redo={redo}>
			<BoardCore.Background>
				{game.tableau.map((stack, i) => (
					<EmptyZone
						slot={{x: i, y: 0}}
						context={stack}
						key={i}
					/>
				))}
			</BoardCore.Background>
			<CardRenderer onDrop={onDrop} isAnimating={isAnimating}>
				{game.tableau.map((deck, i) => renderStack({x: i, y: 0}, deck, {
					onTap: playableTap,
					getDragCards: playableGetCards,
				}))}
				{renderPile({x: 3.5, y: 4}, game.completed)}
			</CardRenderer>
			{newGame.showModal && (
				<NewgameModal {...newGame} />
			)}
		</BoardCore>
	);
});
