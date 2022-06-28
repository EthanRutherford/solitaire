import {Delayed, Eased, Loop, Parallel, Sequence} from "./animation-step";

function getTransform(z, degrees, radius) {
	const out = `translateY(-${radius * 150}%)`;
	const rotate = `rotate(${degrees}deg)`;
	return `translate(-50%, -50%) translateZ(${z}px) ${rotate} ${out} rotateY(2deg)`;
}

const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
function getCoprimeAround(value, desired) {
	if (gcd(value, desired) === 1) {
		return desired;
	}

	for (let i = 0; i < 100; i++) {
		if (gcd(value, desired - i) === 1) {
			return desired - i;
		}
		if (gcd(value, desired + i) === 1) {
			return desired + i;
		}
	}

	throw new Error("This should *definitely* not happen");
}

export class CardRingAnimation {
	constructor(...decks) {
		this.cards = decks.flatMap((d) => [...d]);
		this.totalCards = this.cards.length;
		this.coprime = getCoprimeAround(this.totalCards, this.totalCards / 4);

		for (const card of this.cards) {
			const box = card.meta.elem.getBoundingClientRect();
			card.meta.anim = {
				left: Number.parseInt(card.meta.elem.style.left, 10) + box.width / 2,
				top: Number.parseInt(card.meta.elem.style.top, 10) + box.height / 2,
				easeProgress: 0,
			};
		}

		const rps = .5;
		this.baseAngle = 0;
		this.spinAnimation = new Loop(() => (progress) => {
			this.baseRotation = (progress * rps) % 1;
		});

		this.radius = 1.1;
		this.sequence = new Sequence([
			new Parallel([
				// pulse
				new Loop(() => new Sequence([
					new Eased((progress) => {
						const offset = (progress - .5) * .2;
						this.radius = 1 - offset;
					}, 1),
					new Eased((progress) => {
						const offset = (progress - .5) * .2;
						this.radius = 1 + offset;
					}, 1),
				]), () => this.cards.every((card) => card.meta.anim.easeProgress === 1)),
				// move cards into ring
				...this.cards.map((card, i) => new Delayed(new Eased((progress) => {
					card.meta.anim.easeProgress = progress;
				}, .25), i * .1)),
			]),
			// shrink
			new Eased((progress) => {
				this.radius = 1.1 - progress * .6;
			}, 1),
			// fly out
			() => {
				this.radius += this.radius * .05;
			},
		]);
	}
	advance(delta, sizes) {
		this.spinAnimation.advance(delta);
		this.sequence.advance(delta);

		const left = sizes.boardWidth / 2;
		const top = sizes.boardHeight / 2;
		for (let i = 0; i < this.cards.filter((c) => c.meta.anim.easeProgress > 0).length; i++) {
			const card = this.cards[i];
			const style = card.meta.elem.style;

			const cardOffset = ((i * this.coprime) % this.totalCards) / this.totalCards;
			const degrees = (this.baseRotation + cardOffset) * 360;

			style.transition = "unset";
			if (card.meta.anim.easeProgress !== 1) {
				const diffLeft = left - card.meta.anim.left;
				const diffTop = top - card.meta.anim.top;

				const fraction = card.meta.anim.easeProgress;
				style.left = `${card.meta.anim.left + diffLeft * fraction}px`;
				style.top = `${card.meta.anim.top + diffTop * fraction}px`;
				style.transform = getTransform(2000, degrees * fraction, this.radius * fraction * fraction);
			} else {
				style.left = `${left}px`;
				style.top = `${top}px`;
				style.transform = getTransform(1000, degrees, this.radius);
			}
		}
	}
}
