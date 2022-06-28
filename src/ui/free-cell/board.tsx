import {useCallback} from "react";
import Spade from "../../../images/spade";
import Diamond from "../../../images/diamond";
import Club from "../../../images/club";
import Heart from "../../../images/heart";
import {suits} from "../../logic/deck";
import {Game} from "../../logic/free-cell/game";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {sizerated} from "../shared/sizerator";
import {CardRingAnimation} from "../animations/card-ring";
import {BoardCore, useGameCore} from "../shared/board";

function useGame() {
	const {
		game,
		undoStack,
		enqueueAction,
		isAnimating,
		setAnimation,
		useSetup,
		rerender,
		newGame,
		saveGame,
		tryFinish,
		undo,
		redo,
	} = useGameCore(Game, "free-cell");
	useSetup(newGame);

	const tryAutoComplete = enqueueAction(function*() {
		while (true) {
			const commit = undoStack.record(game);
			const movedFromDeck = game.tryAutoCompleteOne();
			if (movedFromDeck != null) {
				rerender();
				commit();

				yield 100;
			} else {
				if (!tryFinish()) {
					saveGame();
				} else {
					setAnimation(new CardRingAnimation(...Object.values(game.foundations)));
					rerender();
				}

				return;
			}
		}
	});

	const doMoveCards = enqueueAction(function*(card, targetContext) {
		card.meta.elem.blur();
		const commit = undoStack.record(game);
		game.transferCards(card, targetContext);
		rerender();
		commit();
		saveGame();

		yield 100;
		tryAutoComplete();
	});

	const onDrop = useCallback((pointer, targetContext) => {
		if (game.canMoveCards(pointer.card, targetContext)) {
			doMoveCards(pointer.card, targetContext);
		}
	}, []);

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

	const foundationTap = useCallback((pointer) => {
		targetTap(pointer.card.meta.context);
	}, []);

	return {
		game,
		isAnimating,
		newGame,
		onDrop,
		targetTap,
		playableTap,
		playableDoubleTap,
		foundationTap,
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
		targetTap,
		playableTap,
		playableDoubleTap,
		foundationTap,
		undo,
		redo,
	} = useGame();

	return (
		<BoardCore newGame={newGame} undo={undo} redo={redo}>
			<BoardCore.Background>
				{game.freeCells.map((cell, i) => (
					<EmptyZone
						slot={{x: i, y: 0}}
						context={cell}
						onTap={targetTap}
						key={i}
					/>
				))}
				<EmptyZone
					slot={{x: 4, y: 0}}
					context={game.foundations[suits.spades]}
					onTap={targetTap}
				>
					<Spade />
				</EmptyZone>
				<EmptyZone
					slot={{x: 5, y: 0}}
					context={game.foundations[suits.diamonds]}
					onTap={targetTap}
				>
					<Diamond />
				</EmptyZone>
				<EmptyZone
					slot={{x: 6, y: 0}}
					context={game.foundations[suits.clubs]}
					onTap={targetTap}
				>
					<Club />
				</EmptyZone>
				<EmptyZone
					slot={{x: 7, y: 0}}
					context={game.foundations[suits.hearts]}
					onTap={targetTap}
				>
					<Heart />
				</EmptyZone>
				{game.tableau.map((stack, i) => (
					<EmptyZone
						slot={{x: i, y: 1}}
						context={stack}
						onTap={targetTap}
						key={i}
					/>
				))}
			</BoardCore.Background>
			<CardRenderer onDrop={onDrop} isAnimating={isAnimating}>
				{game.freeCells.map((deck, i) => renderStack({x: i, y: 0}, deck, {
					onTap: playableTap,
					onDoubleTap: playableDoubleTap,
					getDragCards: game.getMovableCards,
				}))}
				{renderPile({x: 4, y: 0}, game.foundations[suits.spades], {
					onTap: foundationTap,
				})}
				{renderPile({x: 5, y: 0}, game.foundations[suits.diamonds], {
					onTap: foundationTap,
				})}
				{renderPile({x: 6, y: 0}, game.foundations[suits.clubs], {
					onTap: foundationTap,
				})}
				{renderPile({x: 7, y: 0}, game.foundations[suits.hearts], {
					onTap: foundationTap,
				})}
				{game.tableau.map((deck, i) => renderStack({x: i, y: 1}, deck, {
					onTap: playableTap,
					onDoubleTap: playableDoubleTap,
					getDragCards: game.getMovableCards,
				}))}
			</CardRenderer>
		</BoardCore>
	);
});
