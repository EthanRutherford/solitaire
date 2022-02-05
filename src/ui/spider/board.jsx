import {useCallback, useEffect, useMemo} from "react";
import {Deck} from "../../logic/deck";
import {Game} from "../../logic/spider/game";
import {UndoStack} from "../../logic/undo-stack";
import {get, put, remove, saveGameTable} from "../../logic/game-db";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {ControlBar} from "../shared/control-bar";
import {sizerated} from "../shared/sizerator";
import {useAnimator} from "../animations/animator";
import {CardRingAnimation} from "../animations/card-ring";
import {NewgameModal, useNewGame} from "./newgame-modal";
import styles from "./board.css";

function useGame() {
	const [isAnimating, setAnimation] = useAnimator();
	const game = useMemo(() => new Game(), []);
	const undoStack = useMemo(() => new UndoStack());
	const enqueueAction = useActionQueue();
	const rerender = useRerender();
	const saveGame = useCallback(() => put(saveGameTable, {
		key: "spider",
		game: game.serialize(),
		undoStack: undoStack.serialize(),
	}), []);
	const newGame = useNewGame("spider", (settings) => {
		setAnimation(null);
		Game.fromScratch(game, settings.suitCount);
		undoStack.reset();
		enqueueAction.reset();
		saveGame();
		rerender();
	});

	useEffect(() => {
		(async () => {
			const save = await get(saveGameTable, "spider");
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
			remove(saveGameTable, "spider");
			setAnimation(new CardRingAnimation(...game.foundation));
			rerender();
			return true;
		}

		return false;
	});

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
		<>
			<div className={styles.board}>
				{game.tableau.map((stack, i) => (
					<EmptyZone
						slot={{x: i, y: 0}}
						context={stack}
						onTap={targetTap}
						key={i}
					/>
				))}
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
			</div>
			<ControlBar newGame={newGame.openModal} undo={undo} redo={redo} />
			{newGame.showModal && (
				<NewgameModal {...newGame} />
			)}
		</>
	);
});
