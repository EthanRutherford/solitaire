import {useCallback} from "react";
import Spade from "../../../images/spade.svg";
import Diamond from "../../../images/diamond.svg";
import Club from "../../../images/club.svg";
import Heart from "../../../images/heart.svg";
import {Card, Deck, Suit} from "../../logic/deck";
import {Game} from "../../logic/free-cell/game";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {sizerated} from "../shared/sizerator";
import {BoardCore, useGameCore} from "../shared/board";
import {Pointer} from "../shared/pointer-manager";
import {CardRingAnimation} from "../animations/card-ring";

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

	const doMoveCards = enqueueAction(function*(card: Card, targetContext: Deck<Card>) {
		card.meta.elem?.blur();
		const commit = undoStack.record(game);
		game.transferCards(card, targetContext);
		rerender();
		commit();
		saveGame();

		yield 100;
		tryAutoComplete();
	});

	const onDrop = useCallback((pointer: Pointer, targetContext: unknown) => {
		if (game.canMoveCards(pointer.card, targetContext as Deck<Card>)) {
			doMoveCards(pointer.card, targetContext as Deck<Card>);
		}
	}, []);

	const targetTap = useCallback((targetContext: Deck<Card>) => {
		const activeElement = document.activeElement as HTMLElement;
		const activeCard = getCard(activeElement);
		if (activeCard != null && game.canMoveCards(activeCard, targetContext)) {
			doMoveCards(activeCard, targetContext);
			return true;
		}

		activeElement.blur();
		return false;
	}, []);

	const playableTap = useCallback((pointer: Pointer) => {
		const targetContext = pointer.card.meta.context as Deck<Card>;
		if (targetTap(targetContext)) {
			return;
		}

		if (pointer.dragCards != null) {
			pointer.card.meta.elem?.focus();
		}
	}, []);

	const playableDoubleTap = useCallback((pointer: Pointer) => {
		if (pointer.dragCards != null) {
			const target = game.tryGetMoveTarget(pointer.card)!;
			if (game.canMoveCards(pointer.card, target)) {
				doMoveCards(pointer.card, target);
			}
		}
	}, []);

	const foundationTap = useCallback((pointer: Pointer) => {
		targetTap(pointer.card.meta.context as Deck<Card>);
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
					context={game.foundations[Suit.Spades]}
					onTap={targetTap}
				>
					<Spade />
				</EmptyZone>
				<EmptyZone
					slot={{x: 5, y: 0}}
					context={game.foundations[Suit.Diamonds]}
					onTap={targetTap}
				>
					<Diamond />
				</EmptyZone>
				<EmptyZone
					slot={{x: 6, y: 0}}
					context={game.foundations[Suit.Clubs]}
					onTap={targetTap}
				>
					<Club />
				</EmptyZone>
				<EmptyZone
					slot={{x: 7, y: 0}}
					context={game.foundations[Suit.Hearts]}
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
				{renderPile({x: 4, y: 0}, game.foundations[Suit.Spades], {
					onTap: foundationTap,
				})}
				{renderPile({x: 5, y: 0}, game.foundations[Suit.Diamonds], {
					onTap: foundationTap,
				})}
				{renderPile({x: 6, y: 0}, game.foundations[Suit.Clubs], {
					onTap: foundationTap,
				})}
				{renderPile({x: 7, y: 0}, game.foundations[Suit.Hearts], {
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
