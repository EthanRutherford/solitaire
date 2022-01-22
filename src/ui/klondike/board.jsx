import {useCallback, useEffect, useMemo} from "react";
import Undo from "../../../images/undo";
import Spade from "../../../images/spade";
import Diamond from "../../../images/diamond";
import Club from "../../../images/club";
import Heart from "../../../images/heart";
import {suits} from "../../logic/deck";
import {Game} from "../../logic/klondike/game";
import {UndoStack} from "../../logic/undo-stack";
import {get, put, remove, saveGameTable} from "../../logic/game-db";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
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
		key: "klondike",
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
			const save = await get(saveGameTable, "klondike");
			if (save != null) {
				Game.deserialize(save.game, game);
				UndoStack.deserialize(save.undoStack, undoStack);
				rerender();
			} else {
				newGame.openModal();
			}
		})();
	}, []);

	const tryFinish = useCallback(() => {
		if (game.hasWon()) {
			undoStack.reset();
			enqueueAction.reset();
			remove(saveGameTable, "klondike");
			return true;
		}

		return false;
	});

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
				}

				return;
			}
		}
	});

	const doMoveCards = enqueueAction(function*(card, targetContext) {
		card.meta.elem.blur();
		const commit = undoStack.record(game);
		const originDeck = card.meta.context;
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

	const onDrop = useCallback((pointer, targetContext) => {
		if (game.canMoveCards(pointer.card, targetContext)) {
			doMoveCards(pointer.card, targetContext);
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

	const drawPileTap = enqueueAction(function*(pointer) {
		document.activeElement.blur();
		if (pointer.card === pointer.card.meta.context.fromTop()) {
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
			const target = game.tryGetMoveTarget(pointer.dragCards[0].card);
			if (game.canMoveCards(pointer.dragCards[0].card, target)) {
				doMoveCards(pointer.dragCards[0].card, target);
			}
		}
	});

	const foundationTap = useCallback((pointer) => {
		targetTap(pointer.card.meta.context);
	}, []);

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

export function Board() {
	const {
		game,
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
		<Sizerator cardsAcross={7} cardsTall={5}>
			<div className={styles.board}>
				<EmptyZone slot={{x: 0, y: 0}} context={game.drawPile} onTap={flipDiscard}>
					<Undo />
				</EmptyZone>
				<EmptyZone
					slot={{x: 3, y: 0}}
					context={game.foundations[suits.spades]}
					onTap={targetTap}
				>
					<Spade />
				</EmptyZone>
				<EmptyZone
					slot={{x: 4, y: 0}}
					context={game.foundations[suits.diamonds]}
					onTap={targetTap}
				>
					<Diamond />
				</EmptyZone>
				<EmptyZone
					slot={{x: 5, y: 0}}
					context={game.foundations[suits.clubs]}
					onTap={targetTap}
				>
					<Club />
				</EmptyZone>
				<EmptyZone
					slot={{x: 6, y: 0}}
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
				<CardRenderer onDrop={onDrop}>
					{renderPile({x: 0, y: 0}, game.drawPile, {
						onTap: drawPileTap,
					})}
					{renderPile({x: 1, y: 0}, game.discardPile, {
						onTap: playableTap,
						onDoubleTap: playableDoubleTap,
						getDragCards: playableGetCards,
					}, game.drawCount)}
					{renderPile({x: 3, y: 0}, game.foundations[suits.spades], {
						onTap: foundationTap,
					})}
					{renderPile({x: 4, y: 0}, game.foundations[suits.diamonds], {
						onTap: foundationTap,
					})}
					{renderPile({x: 5, y: 0}, game.foundations[suits.clubs], {
						onTap: foundationTap,
					})}
					{renderPile({x: 6, y: 0}, game.foundations[suits.hearts], {
						onTap: foundationTap,
					})}
					{game.tableau.map((deck, i) => renderStack({x: i, y: 1}, deck, {
						onTap: playableTap,
						onDoubleTap: playableDoubleTap,
						getDragCards: playableGetCards,
					}))}
				</CardRenderer>
			</div>
			<ControlBar newGame={newGame.openModal} undo={undo} redo={redo} />
			{newGame.showModal && (
				<NewgameModal {...newGame} />
			)}
		</Sizerator>
	);
}
