import {validatedDelta} from "./undo-stack";

export const suits = {
	spades: 0,
	diamonds: 1,
	clubs: 2,
	hearts: 3,
};

const faces = [
	"NIL",
	"A",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"J",
	"Q",
	"K",
];

export class Card {
	constructor(suit, value, faceUp = false) {
		this.suit = suit;
		this.value = value;
		this.faceUp = faceUp;
		this.meta = {};
	}
	get label() {
		return faces[this.value];
	}
	get id() {
		return `${this.suit}-${this.value}`;
	}
	serialize() {
		return {s: this.suit, v: this.value, f: this.faceUp};
	}
	static deserialize = validatedDelta((input, card) => {
		card ??= new Card();
		card.suit = input.s ?? card.suit;
		card.value = input.v ?? card.value;
		card.faceUp = input.f ?? card.faceUp;
		return card;
	});
}

export class Deck extends Array {
	shuffle() {
		const copy = [...this];
		for (let i = 0; i < this.length; i++) {
			const card = Math.floor(Math.random() * copy.length);
			this[i] = copy.splice(card, 1)[0];
		}

		return this;
	}
	draw(count) {
		return this.splice(-count, count);
	}
	fromTop(number = 0) {
		return this[this.length - number - 1];
	}
	serialize() {
		return this.map((c) => c.serialize());
	}
	static deserialize = validatedDelta((input, deck) => {
		const {length, ...rest} = input;
		deck ??= new Deck();
		deck.length = length;
		for (const [key, value] of Object.entries(rest)) {
			if (key < length) {
				deck[key] = Card.deserialize(value, deck[key]);
			}
		}

		return deck;
	});
	static full() {
		const deck = new Deck(52);
		let i = 0;
		for (const suit of [suits.spades, suits.diamonds]) {
			for (let v = 1; v <= 13; v++) {
				deck[i++] = new Card(suit, v);
			}
		}
		for (const suit of [suits.clubs, suits.hearts]) {
			for (let v = 13; v > 0; v--) {
				deck[i++] = new Card(suit, v);
			}
		}

		return deck;
	}
}
