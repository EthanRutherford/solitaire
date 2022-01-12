class Delta {
	constructor(from, to) {
		this.from = from;
		this.to = to;
	}
	serialize() {
		return {f: this.from, t: this.to};
	}
	static deserialize(input) {
		return new Delta(input.f, input.t);
	}
	static compute(prevState, nextState) {
		const from = prevState == null ? null : {};
		const to = nextState == null ? null : {};

		const allKeys = new Set(
			Object.getOwnPropertyNames(prevState ?? {})
				.concat(Object.getOwnPropertyNames(nextState ?? {})),
		);

		for (const key of allKeys) {
			const prev = prevState?.[key] ?? null;
			const next = nextState?.[key] ?? null;

			if (prev === next) {
				continue;
			}

			if (typeof (prev ?? next) !== "object") {
				from != null && (from[key] = prev);
				to != null && (to[key] = next);
				continue;
			}

			const result = Delta.compute(prev, next);
			if (result != null) {
				from != null && (from[key] = result.from);
				to != null && (to[key] = result.to);
			}
		}

		if (Object.keys(from ?? {}).length + Object.keys(to ?? {}).length === 0) {
			return null;
		}

		return new Delta(from, to);
	}
}

export function validatedDelta(action) {
	return function(delta, object = null) {
		if (delta == null) {
			return object;
		}

		return action(delta, object);
	};
}

export class UndoStack {
	constructor(undo = [], redo = []) {
		this.reset(undo, redo);
	}
	record(object) {
		let start = object.serialize();
		let deltas;
		return () => {
			const end = object.serialize();
			const diff = Delta.compute(start, end);
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

		const deltas = this.undoStack.pop();
		const result = deltas.map((d) => d.from);
		this.redoStack.push(deltas.reverse());
		return result;
	}
	redo() {
		if (this.redoStack.length === 0 || this.lock) {
			return null;
		}

		const deltas = this.redoStack.pop();
		const result = deltas.map((d) => d.to);
		this.undoStack.push(deltas.reverse());
		return result;
	}
	reset(undo = [], redo = []) {
		this.undoStack = undo;
		this.redoStack = redo;
		this.lock = false;
	}
	serialize() {
		return {
			u: this.undoStack.map((ds) => ds.map((d) => d.serialize())),
			r: this.redoStack.map((ds) => ds.map((d) => d.serialize())),
		};
	}
	static deserialize = validatedDelta((input, undoStack) => {
		undoStack ??= new UndoStack();

		if (input.u != null) {
			const {length, ...rest} = input.u;
			const stack = undoStack.undoStack;
			stack.length = length ?? stack.length;
			for (const [key, value] of Object.entries(rest)) {
				if (key < stack.length) {
					stack[key] = value.map((d) => Delta.deserialize(d));
				}
			}
		}

		if (input.r != null) {
			const {length, ...rest} = input.r;
			const stack = undoStack.redoStack;
			stack.length = length ?? stack.length;
			for (const [key, value] of Object.entries(rest)) {
				if (key < stack.length) {
					stack[key] = value.map((d) => Delta.deserialize(d));
				}
			}
		}

		return undoStack;
	});
}
