import {useCallback, useMemo} from "react";
import Undo from "../../../images/undo";
import Spade from "../../../images/spade";
import Diamond from "../../../images/diamond";
import Club from "../../../images/club";
import Heart from "../../../images/heart";
import {suits} from "../../logic/deck";
import {Game} from "../../logic/klondike/game";
import {UndoStack} from "../../logic/undo-stack";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {
	CardRenderer,
	renderPile,
	renderFoundation,
	renderStack,
} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import styles from "./board.css";

function useGame() {
	const game = useMemo(() => Game.fromScratch(), []);
	const undoStack = useMemo(() => new UndoStack());
	const enqueueAction = useActionQueue();

	const rerender = useRerender();
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

		tryAutoComplete();
	});

	const drawPileTap = enqueueAction(function*(pointer) {
		document.activeElement.blur();
		if (pointer.card === pointer.card.meta.context.fromTop()) {
			const commit = undoStack.record(game);
			game.drawCards(1);
			rerender();
			commit();

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

		if (playableGetCards(pointer.card) != null) {
			pointer.card.meta.elem.focus();
		}
	}, []);

	const playableDoubleTap = useCallback((pointer) => {
		const target = game.tryGetMoveTarget(pointer.card);
		if (game.canMoveCards(pointer.card, target)) {
			doMoveCards(pointer.card, target);
		}
	});

	const foundationTap = useCallback((pointer) => {
		targetTap(pointer.elem.meta.context);
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
		<div className={styles.board}>
			<EmptyZone pos={{x: 10, y: 10}} context={game.drawPile} onTap={flipDiscard}>
				<Undo width="50px" color="hsla(0, 0%, 0%, .1)" />
			</EmptyZone>
			<EmptyZone
				pos={{x: 340, y: 10}}
				context={game.foundations[suits.spades]}
				onTap={targetTap}
			>
				<Spade width="50px" color="hsla(0, 0%, 0%, .1)" />
			</EmptyZone>
			<EmptyZone
				pos={{x: 450, y: 10}}
				context={game.foundations[suits.diamonds]}
				onTap={targetTap}
			>
				<Diamond width="50px" color="hsla(0, 0%, 0%, .1)" />
			</EmptyZone>
			<EmptyZone
				pos={{x: 560, y: 10}}
				context={game.foundations[suits.clubs]}
				onTap={targetTap}
			>
				<Club width="50px" color="hsla(0, 0%, 0%, .1)" />
			</EmptyZone>
			<EmptyZone
				pos={{x: 670, y: 10}}
				context={game.foundations[suits.hearts]}
				onTap={targetTap}
			>
				<Heart width="50px" color="hsla(0, 0%, 0%, .1)" />
			</EmptyZone>
			{game.tableau.map((stack, i) => (
				<EmptyZone
					pos={{x: 10 + i * 110, y: 170}}
					context={stack}
					onTap={targetTap}
					key={i}
				/>
			))}
			<CardRenderer onDrop={onDrop}>
				{renderPile({x: 10, y: 10}, game.drawPile, {
					onTap: drawPileTap,
				})}
				{renderPile({x: 120, y: 10}, game.discardPile, {
					onTap: playableTap,
					onDoubleTap: playableDoubleTap,
					getDragCards: playableGetCards,
				})}
				{renderFoundation({x: 340, y: 10}, game.foundations[suits.spades], {
					onTap: foundationTap,
				})}
				{renderFoundation({x: 450, y: 10}, game.foundations[suits.diamonds], {
					onTap: foundationTap,
				})}
				{renderFoundation({x: 560, y: 10}, game.foundations[suits.clubs], {
					onTap: foundationTap,
				})}
				{renderFoundation({x: 670, y: 10}, game.foundations[suits.hearts], {
					onTap: foundationTap,
				})}
				{game.tableau.map((stack, i) => renderStack({x: 10 + i * 110, y: 170}, stack, {
					onTap: playableTap,
					onDoubleTap: playableDoubleTap,
					getDragCards: playableGetCards,
				}))}
			</CardRenderer>
			<div style={{position: "absolute", left: 1000}}>
				<button onClick={undo}>undo</button>
				<button onClick={redo}>redo</button>
			</div>
		</div>
	);
}
