export abstract class AnimationStep {
	advance(delta: number) {
		this.progress += delta;
		this.step(delta);
	}
	step(delta: number): void|never {
		throw new Error(`you shouldn't be here ${delta}`);
	}
	progress = 0;
	abstract done: boolean;
}

type ActionFunc = (progress: number, delta: number) => boolean|void;
class Action extends AnimationStep {
	constructor(public func: ActionFunc) {
		super();
	}
	step(delta: number) {
		this.done = this.func(this.progress, delta) ?? false;
	}
	done = false;
}

type AnimationSteplike = AnimationStep|ActionFunc;
function wrapStep(step: AnimationSteplike) {
	if (step instanceof AnimationStep) {
		return step;
	}

	return new Action(step);
}

export class Sequence extends AnimationStep {
	constructor(steps: AnimationSteplike[]) {
		super();
		this.steps = steps.map(wrapStep);
	}
	step(delta: number) {
		this.steps[this.stepIndex].advance(delta);
		if (this.steps[this.stepIndex].done) {
			this.stepIndex++;
		}
	}
	override get done() {
		return this.stepIndex === this.steps.length;
	}
	steps: AnimationStep[];
	stepIndex = 0;
}

export class Parallel extends AnimationStep {
	constructor(steps: AnimationSteplike[], public race = false) {
		super();
		this.steps = steps.map(wrapStep);
	}
	step(delta: number) {
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
	static asRace(steps: AnimationSteplike[]) {
		return new Parallel(steps, true);
	}
	steps: AnimationStep[];
}

export class Loop extends AnimationStep {
	constructor(createStep: () => AnimationSteplike, public until = () => false) {
		super();
		this.create = () => wrapStep(createStep());
		this.curStep = this.create();
	}
	step(delta: number) {
		this.curStep?.advance(delta);
		if (this.curStep?.done) {
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
	create: () => AnimationStep;
	curStep: AnimationStep|null;
}

export class Delayed extends AnimationStep {
	constructor(step: AnimationSteplike, public delay: number) {
		super();
		this.substep = wrapStep(step);
	}
	step(delta: number) {
		if (this.progress >= this.delay) {
			this.substep.advance(delta);
		}
	}
	get done() {
		return this.substep.done;
	}
	substep: AnimationStep;
}

export class Eased extends AnimationStep {
	constructor(step: AnimationSteplike, public duration: number) {
		super();
		this.substep = wrapStep(step);
	}
	advance(delta: number) {
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

	substep: AnimationStep;

	static easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
