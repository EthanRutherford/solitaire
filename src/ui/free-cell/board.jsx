import {useCallback, useMemo} from "react";
import Spade from "../../../images/spade";
import Diamond from "../../../images/diamond";
import Club from "../../../images/club";
import Heart from "../../../images/heart";
import {suits} from "../../logic/deck";
import {Game} from "../../logic/free-cell/game";
import {UndoStack} from "../../logic/undo-stack";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {CardRenderer, renderPile, renderStack} from "../shared/card-renderer";
import {EmptyZone} from "../shared/empty-zone";
import {getCard} from "../shared/get-context";
import {ControlBar} from "../shared/control-bar";
import {Sizerator} from "../shared/sizerator";
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

				yield 100;
			} else {
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
		targetTap,
		playableTap,
		playableDoubleTap,
		foundationTap,
		undo,
		redo,
	} = useGame();

	return (
		<Sizerator cardsAcross={8} cardsTall={5}>
			<div className={styles.board}>
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
					<Spade width="50px" color="hsla(0, 0%, 0%, .1)" />
				</EmptyZone>
				<EmptyZone
					slot={{x: 5, y: 0}}
					context={game.foundations[suits.diamonds]}
					onTap={targetTap}
				>
					<Diamond width="50px" color="hsla(0, 0%, 0%, .1)" />
				</EmptyZone>
				<EmptyZone
					slot={{x: 6, y: 0}}
					context={game.foundations[suits.clubs]}
					onTap={targetTap}
				>
					<Club width="50px" color="hsla(0, 0%, 0%, .1)" />
				</EmptyZone>
				<EmptyZone
					slot={{x: 7, y: 0}}
					context={game.foundations[suits.hearts]}
					onTap={targetTap}
				>
					<Heart width="50px" color="hsla(0, 0%, 0%, .1)" />
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
			</div>
			<ControlBar undo={undo} redo={redo} />
		</Sizerator>
	);
}