class Delta {
	constructor(from, to) {
		this.from = from;
		this.to = to;
	}
	serialize() {
		return {f: this.f, t: this.t};
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

		if (Object.keys(from ?? {}).length + Object.keys(to ?? {}).length > 0) {
			return new Delta(from, to);
		}

		return null;
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
	constructor(undo = []) {
		this.undoStack = undo;
		this.redoStack = [];
	}
	record(object) {
		const start = object.serialize();
		return () => {
			const end = object.serialize();
			const diff = Delta.compute(start, end);
			if (diff != null) {
				this.undoStack.push(diff);
				this.redoStack = [];
			}
		};
	}
	undo() {
		if (this.undoStack.length === 0) {
			return null;
		}

		const delta = this.undoStack.pop();
		this.redoStack.push(delta);
		return delta.from;
	}
	redo() {
		if (this.redoStack.length === 0) {
			return null;
		}

		const delta = this.redoStack.pop();
		this.undoStack.push(delta);
		return delta.to;
	}
}
