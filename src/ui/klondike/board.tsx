import {useCallback} from "react";
import Undo from "../../../images/undo.svg";
import Spade from "../../../images/spade.svg";
import Diamond from "../../../images/diamond.svg";
import Club from "../../../images/club.svg";
import Heart from "../../../images/heart.svg";
import {Card, Deck, Suit} from "../../logic/deck";
import {Game} from "../../logic/klondike/game";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {sizerated} from "../shared/sizerator";
import {BoardCore, useGameCore} from "../shared/board";
import {Pointer} from "../shared/pointer-manager";
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
	} = useGameCore(Game, "klondike");
	const newGame = useNewGame("klondike", newGameCore);
	useSetup(newGame.openModal);

	const tryAutoComplete = enqueueAction(function*() {
		while (true) {
			const commit = undoStack.record(game);
			const movedFromDeck = game.tryAutoCompleteOne();
			if (movedFromDeck != null) {
				rerender();
				commit();
				if (game.tryFlipCard(movedFromDeck)) {
					yield 10;
					rerender();
					commit();
				}

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
		const originDeck = card.meta.context as Deck<Card>;
		game.transferCards(card, targetContext);
		rerender();
		commit();
		saveGame();

		if (game.tryFlipCard(originDeck)) {
			yield 10;
			rerender();
			commit();
		}

		yield 100;
		tryAutoComplete();
	});

	const onDrop = useCallback((pointer: Pointer, targetContext: unknown) => {
		if (game.canMoveCards(pointer.card, targetContext as Deck<Card>)) {
			doMoveCards(pointer.card, targetContext as Deck<Card>);
		}
	}, []);

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
	});

	const drawPileTap = enqueueAction(function*(pointer: Pointer) {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}

		const context = pointer.card.meta.context as Deck<Card>;
		if (pointer.card === context.fromTop()) {
			const commit = undoStack.record(game);
			for (let i = 0; i < game.drawCount; i++) {
				game.drawCards(1);
				rerender();
				commit();
				yield 10;
			}

			yield 100;
			tryAutoComplete();
		}
	});

	const playableGetCards = useCallback((card: Card) => game.getMovableCards(card), []);

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
			const target = game.tryGetMoveTarget(pointer.dragCards[0].card)!;
			if (game.canMoveCards(pointer.dragCards[0].card, target)) {
				doMoveCards(pointer.dragCards[0].card, target);
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
		flipDiscard,
		drawPileTap,
		playableGetCards,
		targetTap,
		playableTap,
		playableDoubleTap,
		foundationTap,
		undo,
		redo,
	};
}

export const Board = sizerated(7, 5, function Board() {
	const {
		game,
		isAnimating,
		newGame,
		onDrop,
		flipDiscard,
		drawPileTap,
		playableGetCards,
		targetTap,
		playableTap,
		playableDoubleTap,
		foundationTap,
		undo,
		redo,
	} = useGame();

	return (
		<BoardCore newGame={newGame.openModal} undo={undo} redo={redo}>
			<BoardCore.Background>
				<EmptyZone slot={{x: 0, y: 0}} context={game.drawPile} onTap={flipDiscard}>
					<Undo />
				</EmptyZone>
				<EmptyZone
					slot={{x: 3, y: 0}}
					context={game.foundations[Suit.Spades]}
					onTap={targetTap}
				>
					<Spade />
				</EmptyZone>
				<EmptyZone
					slot={{x: 4, y: 0}}
					context={game.foundations[Suit.Diamonds]}
					onTap={targetTap}
				>
					<Diamond />
				</EmptyZone>
				<EmptyZone
					slot={{x: 5, y: 0}}
					context={game.foundations[Suit.Clubs]}
					onTap={targetTap}
				>
					<Club />
				</EmptyZone>
				<EmptyZone
					slot={{x: 6, y: 0}}
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
				{renderPile({x: 0, y: 0}, game.drawPile, {
					onTap: drawPileTap,
				})}
				{renderPile({x: 1, y: 0}, game.discardPile, {
					onTap: playableTap,
					onDoubleTap: playableDoubleTap,
					getDragCards: playableGetCards,
				}, game.drawCount)}
				{renderPile({x: 3, y: 0}, game.foundations[Suit.Spades], {
					onTap: foundationTap,
				})}
				{renderPile({x: 4, y: 0}, game.foundations[Suit.Diamonds], {
					onTap: foundationTap,
				})}
				{renderPile({x: 5, y: 0}, game.foundations[Suit.Clubs], {
					onTap: foundationTap,
				})}
				{renderPile({x: 6, y: 0}, game.foundations[Suit.Hearts], {
					onTap: foundationTap,
				})}
				{game.tableau.map((deck, i) => renderStack({x: i, y: 1}, deck, {
					onTap: playableTap,
					onDoubleTap: playableDoubleTap,
					getDragCards: playableGetCards,
				}))}
			</CardRenderer>
			{newGame.showModal && (
				<NewgameModal {...newGame} />
			)}
		</BoardCore>
	);
});
