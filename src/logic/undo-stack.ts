interface SerializedDelta {f?: unknown; t?: unknown}
type Collection = Partial<Record<string, unknown>> | unknown[];

class Delta<T> {
	constructor(public from: T, public to: T) {}
	serialize(): SerializedDelta {
		return {f: this.from, t: this.to};
	}
	static deserialize(input: SerializedDelta) {
		return new Delta(input.f, input.t);
	}
	static compute(prevState: Collection | null, nextState: Collection | null) {
		const from: Collection | null = prevState == null ? null : {};
		const to: Collection | null = nextState == null ? null : {};

		// cast to record so typescript doesn't complain about string indexes
		const prevRecord = prevState as Record<string, unknown> | null;
		const nextRecord = nextState as Record<string, unknown> | null;
		const allKeys = new Set(
			Object.getOwnPropertyNames(prevState ?? {})
				.concat(Object.getOwnPropertyNames(nextState ?? {})),
		);

		for (const key of allKeys) {
			const prev = prevRecord?.[key] ?? null;
			const next = nextRecord?.[key] ?? null;

			if (prev === next) {
				continue;
			}

			if (typeof prev === "object" && typeof next === "object") {
				const result = Delta.compute(prev, next);
				if (result != null) {
					from != null && (from[key] = result.from);
					to != null && (to[key] = result.to);
				}

				continue;
			}

			from != null && (from[key] = prev);
			to != null && (to[key] = next);
		}

		if (Object.keys(from ?? {}).length + Object.keys(to ?? {}).length === 0) {
			return null;
		}

		return new Delta(from, to);
	}
}

export function validatedDelta<T, U>(action: (delta: T, object: U | null) => U) {
	function validator(delta: T, object: U | null): U;
	function validator(delta?: T | nullish, object?: U | null): U | null;
	function validator(delta?: T | nullish, object: U | null = null): U | null {
		if (delta == null) {
			return delta === undefined ? object : null;
		}

		return action(delta, object);
	}

	return validator;
}

export interface SerializedArray<T> {
	length?: number;
	[i: number]: T;
}

export interface SerializedUndoStack {
	u?: SerializedArray<SerializedDelta[]>;
	r?: SerializedArray<SerializedDelta[]>;
}

export class UndoStack<DeltaType> {
	constructor(undo = [], redo = []) {
		this.reset(undo, redo);
	}
	record(object: {serialize: () => Collection}) {
		let start: Collection = object.serialize();
		let deltas: Delta<DeltaType>[] | null;
		return () => {
			const end = object.serialize();
			const diff = Delta.compute(start, end) as Delta<DeltaType> | null;
			if (diff != null) {
				if (deltas == null) {
					deltas = [];
					this.undoStack.push(deltas);
					this.redoStack = [];
				}

				deltas.push(diff);
				start = end;
			}
		};
	}
	undo() {
		if (this.undoStack.length === 0 || this.lock) {
			return null;
		}

		const deltas = this.undoStack.pop()!;
		const result = deltas.map((d) => d.from);
		this.redoStack.push(deltas.reverse());
		return result;
	}
	redo() {
		if (this.redoStack.length === 0 || this.lock) {
			return null;
		}

		const deltas = this.redoStack.pop()!;
		const result = deltas.map((d) => d.to);
		this.undoStack.push(deltas.reverse());
		return result;
	}
	reset(undo: Delta<DeltaType>[][] = [], redo: Delta<DeltaType>[][] = []) {
		this.undoStack = undo;
		this.redoStack = redo;
		this.lock = false;
	}
	serialize(): SerializedUndoStack {
		return {
			u: this.undoStack.map((ds) => ds.map((d) => d.serialize())),
			r: this.redoStack.map((ds) => ds.map((d) => d.serialize())),
		};
	}
	undoStack: Delta<DeltaType>[][] = [];
	redoStack: Delta<DeltaType>[][] = [];
	lock = false;

	static deserialize = <DeltaType>(input: SerializedUndoStack, undoStack: UndoStack<DeltaType> | null) => {
		// stupid workaround to function wrappers not being able to use generic types
		// with function wrappers
		return validatedDelta((input: SerializedUndoStack, undoStack: UndoStack<DeltaType> | null) => {
			undoStack ??= new UndoStack<DeltaType>();

			if (input.u != null) {
				const {length, ...rest} = input.u;
				const stack = undoStack.undoStack;
				stack.length = length ?? stack.length;
				for (const key of Object.keys(rest)) {
					const index = Number.parseInt(key, 10);
					if (index < stack.length) {
						stack[index] = rest[index].map((d) => Delta.deserialize(d) as Delta<DeltaType>);
					}
				}
			}

			if (input.r != null) {
				const {length, ...rest} = input.r;
				const stack = undoStack.redoStack;
				stack.length = length ?? stack.length;
				for (const key of Object.keys(rest)) {
					const index = Number.parseInt(key, 10);
					if (index < stack.length) {
						stack[index] = rest[index].map((d) => Delta.deserialize(d) as Delta<DeltaType>);
					}
				}
			}

			return undoStack;
		})(input, undoStack);
	};
}
