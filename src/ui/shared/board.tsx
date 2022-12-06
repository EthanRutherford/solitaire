import {ReactElement, ReactFragment, ReactNode, useCallback, useEffect, useMemo} from "react";
import {SerializedUndoStack, UndoStack, validatedDelta} from "../../logic/undo-stack";
import {get, put, remove, saveGameTable} from "../../logic/game-db";
import {useRerender} from "../../util/use-rerender";
import {useActionQueue} from "../../util/use-action-queue";
import {useAnimator} from "../animations/animator";
import {ControlBar} from "./control-bar";
import styles from "./board.css";

interface Gamelike<Serialized> {
	hasWon: () => boolean;
	serialize: () => Serialized;
}
interface StaticGame<T extends Gamelike<S>, S, P extends unknown[]> {
	new(): T;
	deserialize: ReturnType<typeof validatedDelta<S, T>>;
	fromScratch: (game: T, ...args: P) => T;
}
interface SaveGame<Serialized> {
	key: IDBValidKey;
	game: Serialized;
	undoStack: SerializedUndoStack;
}

export function useGameCore<
	GameType extends Gamelike<Serialized>,
	GameArgs extends unknown[],
	Serialized,
>(Game: StaticGame<GameType, Serialized, GameArgs>, key: IDBValidKey) {
	const [isAnimating, setAnimation] = useAnimator();
	const game = useMemo(() => new Game(), []);
	const undoStack = useMemo(() => new UndoStack<Serialized>(), []);
	const enqueueAction = useActionQueue();
	const rerender = useRerender();
	const saveGame = useCallback(() => void put(saveGameTable, {
		key,
		game: game.serialize(),
		undoStack: undoStack.serialize(),
	}), []);
	const newGame = useCallback((...args: GameArgs) => {
		setAnimation(null);
		Game.fromScratch(game, ...args);
		undoStack.reset();
		enqueueAction.reset();
		rerender();
		saveGame();
	}, []);

	const useSetup = useCallback((start: () => void | Promise<unknown>) => useEffect(() => {
		void (async () => {
			const save = await get<SaveGame<Serialized>>(saveGameTable, key);
			if (save != null) {
				Game.deserialize(save.game, game);
				UndoStack.deserialize<Serialized>(save.undoStack, undoStack);
				rerender();
			} else {
				void start();
			}
		})();
	}, []), []);

	const tryFinish = useCallback(() => {
		if (game.hasWon()) {
			undoStack.reset();
			enqueueAction.reset();
			void remove(saveGameTable, key);
			return true;
		}

		return false;
	}, []);

	const undo = enqueueAction(function*() {
		const deltas = undoStack.undo();
		if (deltas == null) {
			return;
		}

		undoStack.lock = true;
		while (deltas.length > 0) {
			Game.deserialize(deltas.pop()!, game);
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
			Game.deserialize(deltas.pop()!, game);
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

interface BoardCoreProps {
	newGame: () => void | Promise<void>;
	undo: () => void;
	redo: () => void;
	children: ReactFragment;
}
export function BoardCore({newGame, undo, redo, children}: BoardCoreProps) {
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

BoardCore.Background = function({children}: {children: ReactNode}) {
	// the type system does not seem to know that this is ok
	return children as unknown as ReactElement;
};
