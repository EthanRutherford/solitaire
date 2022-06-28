import {useCallback, useEffect, useMemo} from "react";
import {UndoStack} from "../../logic/undo-stack";
import {get, put, remove, saveGameTable} from "../../logic/game-db";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {useAnimator} from "../animations/animator";
import {ControlBar} from "./control-bar";
import styles from "./board.css";

export function useGameCore(Game, key) {
	const [isAnimating, setAnimation] = useAnimator();
	const game = useMemo(() => new Game(), []);
	const undoStack = useMemo(() => new UndoStack());
	const enqueueAction = useActionQueue();
	const rerender = useRerender();
	const saveGame = useCallback(() => put(saveGameTable, {
		key: key,
		game: game.serialize(),
		undoStack: undoStack.serialize(),
	}), []);
	const newGame = useCallback((...args) => {
		setAnimation(null);
		Game.fromScratch(game, ...args);
		undoStack.reset();
		enqueueAction.reset();
		rerender();
		saveGame();
	}, []);

	const useSetup = useCallback((start) => useEffect(() => (async () => {
		const save = await get(saveGameTable, key);
		if (save != null) {
			Game.deserialize(save.game, game);
			UndoStack.deserialize(save.undoStack, undoStack);
			rerender();
		} else {
			start();
		}
	})(), []), []);

	const tryFinish = useCallback(() => {
		if (game.hasWon()) {
			undoStack.reset();
			enqueueAction.reset();
			remove(saveGameTable, key);
			return true;
		}

		return false;
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
	};
}

export function BoardCore({newGame, undo, redo, children}) {
	const [background, foreground, ...rest] = children;
	return (
		<>
			<div className={styles.board}>
				{background}
				{foreground}
			</div>
			<ControlBar newGame={newGame} undo={undo} redo={redo} />
			{rest}
		</>
	);
}

BoardCore.Background = function({children}) {
	return children;
};
