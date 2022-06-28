export class AnimationStep {
	advance(delta) {
		this.progress += delta;
		this.step(delta);
	}
	step() {}
	progress = 0;
}

class Action extends AnimationStep {
	constructor(func) {
		super();
		this.func = func;
	}
	step(delta) {
		this.done = this.func(this.progress, delta) ?? false;
	}
}

function wrapStep(step) {
	if (step instanceof AnimationStep) {
		return step;
	}

	return new Action(step);
}

export class Sequence extends AnimationStep {
	constructor(steps) {
		super();
		this.steps = steps.map(wrapStep);
		this.stepIndex = 0;
	}
	step(delta) {
		this.steps[this.stepIndex].advance(delta);
		if (this.steps[this.stepIndex].done) {
			this.stepIndex++;
		}
	}
	get done() {
		return this.stepIndex === this.steps.length;
	}
}

export class Parallel extends AnimationStep {
	constructor(steps, race = false) {
		super();
		this.steps = steps.map(wrapStep);
		this.race = race;
	}
	step(delta) {
		for (const step of this.steps.filter((s) => !s.done)) {
			step.advance(delta);
		}
	}
	get done() {
		if (this.race) {
			return this.steps.some((s) => s.done);
		}

		return this.steps.every((s) => s.done);
	}
	static asRace(steps) {
		return new Parallel(steps, true);
	}
}

export class Loop extends AnimationStep {
	constructor(createStep, until = () => false) {
		super();
		this.create = () => wrapStep(createStep());
		this.curStep = this.create();
		this.until = until;
	}
	step(delta) {
		this.curStep.advance(delta);
		if (this.curStep.done) {
			if (this.until()) {
				this.curStep = null;
			} else {
				this.curStep = this.create();
			}
		}
	}
	get done() {
		return this.curStep == null;
	}
}

export class Delayed extends AnimationStep {
	constructor(step, delay) {
		super();
		this.substep = wrapStep(step);
		this.delay = delay;
	}
	step(delta) {
		if (this.progress >= this.delay) {
			this.substep.advance(delta);
		}
	}
	get done() {
		return this.substep.done;
	}
}

export class Eased extends AnimationStep {
	constructor(step, duration) {
		super();
		this.duration = duration;
		this.substep = wrapStep(step);
	}
	advance(delta) {
		if (this.progress > this.duration) {
			throw "WTF";
		}


		const prevProgress = this.progress;
		this.progress += delta;

		const prevFraction = Math.min(prevProgress / this.duration);
		const fraction = Math.min(this.progress / this.duration, 1);

		const prevEased = Eased.easeInOut(prevFraction);
		const eased = Eased.easeInOut(fraction);

		this.substep.advance(eased - prevEased);
	}
	get done() {
		return this.progress >= this.duration;
	}
	static easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
