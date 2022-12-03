import {useCallback} from "react";
import {Deck} from "../../logic/deck";
import {Game} from "../../logic/spider/game";
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
	} = useGameCore(Game, "spider");
	const newGame = useNewGame("spider", newGameCore);
	useSetup(newGame.openModal);

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

			if (!tryFinish()) {
				saveGame();
			} else {
				setAnimation(new CardRingAnimation(...game.foundation));
				rerender();
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

		saveGame();
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

		if (game.tableau.every((d) => d.length > 0)) {
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
		}
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

	return {
		game,
		isAnimating,
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

export const Board = sizerated(10, 5, function Board() {
	const {
		game,
		isAnimating,
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
		<BoardCore newGame={newGame.openModal} undo={undo} redo={redo}>
			<BoardCore.Background>
				{game.tableau.map((stack, i) => (
					<EmptyZone
						slot={{x: i, y: 0}}
						context={stack}
						onTap={targetTap}
						key={i}
					/>
				))}
			</BoardCore.Background>
			<CardRenderer onDrop={onDrop} isAnimating={isAnimating}>
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
			{newGame.showModal && (
				<NewgameModal {...newGame} />
			)}
		</BoardCore>
	);
});
