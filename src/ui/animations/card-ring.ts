import {Card, Deck} from "../../logic/deck";
import {useSizes} from "../shared/sizerator";
import {Delayed, Eased, Loop, Parallel, Sequence} from "./animation-step";

interface AnimationMetadata {
	left: number;
	top: number;
	easeProgress: number;
}

function getTransform(z: number, degrees: number, radius: number) {
	const out = `translateY(-${radius * 150}%)`;
	const rotate = `rotate(${degrees}deg)`;
	return `translate(-50%, -50%) translateZ(${z}px) ${rotate} ${out} rotateY(2deg)`;
}

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
function getCoprimeAround(value: number, desired: number) {
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

const getAnimMeta = (card: Card) => card.meta.anim as AnimationMetadata;

export class CardRingAnimation {
	constructor(...decks: Deck<Card>[]) {
		this.cards = decks.flatMap((d) => [...d]);
		this.totalCards = this.cards.length;
		this.coprime = getCoprimeAround(this.totalCards, this.totalCards / 4);

		for (const card of this.cards) {
			const box = card.meta.elem!.getBoundingClientRect();
			card.meta.anim = {
				left: Number.parseInt(card.meta.elem!.style.left, 10) + box.width / 2,
				top: Number.parseInt(card.meta.elem!.style.top, 10) + box.height / 2,
				easeProgress: 0,
			};
		}

		const rps = .5;
		this.spinAnimation = new Loop(() => (progress: number) => {
			this.baseRotation = (progress * rps) % 1;
		});

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
				]), () => this.cards.every((card) => getAnimMeta(card).easeProgress === 1)),
				// move cards into ring
				...this.cards.map((card, i) => new Delayed(new Eased((progress) => {
					getAnimMeta(card).easeProgress = progress;
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
	advance(delta: number, sizes: ReturnType<typeof useSizes>) {
		this.spinAnimation.advance(delta);
		this.sequence.advance(delta);

		const left = sizes.boardWidth / 2;
		const top = sizes.boardHeight / 2;
		for (let i = 0; i < this.cards.filter((c) => getAnimMeta(c).easeProgress > 0).length; i++) {
			const card = this.cards[i];
			const style = card.meta.elem!.style;

			const cardOffset = ((i * this.coprime) % this.totalCards) / this.totalCards;
			const degrees = (this.baseRotation + cardOffset) * 360;

			style.transition = "unset";
			if (getAnimMeta(card).easeProgress !== 1) {
				const diffLeft = left - getAnimMeta(card).left;
				const diffTop = top - getAnimMeta(card).top;

				const fraction = getAnimMeta(card).easeProgress;
				style.left = `${getAnimMeta(card).left + diffLeft * fraction}px`;
				style.top = `${getAnimMeta(card).top + diffTop * fraction}px`;
				style.transform = getTransform(2000, degrees * fraction, this.radius * fraction * fraction);
			} else {
				style.left = `${left}px`;
				style.top = `${top}px`;
				style.transform = getTransform(1000, degrees, this.radius);
			}
		}
	}
	cards: Card[];
	totalCards: number;
	coprime: number;
	baseRotation = 0;
	radius = 1.1;
	spinAnimation: Loop;
	sequence: Sequence;
}
