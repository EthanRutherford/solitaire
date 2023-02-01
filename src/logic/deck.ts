import {random} from "../util/random";
import {SerializedArray, validatedDelta} from "./undo-stack";

export enum Suit {
	Spades = 0,
	Diamonds = 1,
	Clubs = 2,
	Hearts = 3,
}

export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

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

export interface SerializedCard {
	s?: Suit;
	v?: CardValue;
	f?: boolean;
	i?: number;
}

let nextId = 0;
export class Card {
	constructor(public suit: Suit, public value: CardValue, public faceUp = false) {
		this.id = nextId++;
	}
	serialize(): SerializedCard {
		return {s: this.suit, v: this.value, f: this.faceUp, i: this.id};
	}
	get label() {
		return faces[this.value];
	}
	get color() {
		return this.suit % 2;
	}
	id: number;
	meta: Record<string, unknown> & {
		elem?: HTMLElement | null;
		rerender?: () => void;
	} = {};

	static deserialize = validatedDelta((input: SerializedCard, card: Card | null) => {
		card ??= new Card(0, 1);
		card.suit = input.s ?? card.suit;
		card.value = input.v ?? card.value;
		card.faceUp = input.f ?? card.faceUp;
		card.id = input.i ?? card.id;
		return card;
	});
}

export type SerializedDeck = SerializedCard[];
export type SerializedNullableDeck = (SerializedCard | null)[];

const coreDeckDeserialize = validatedDelta((input: SerializedArray<SerializedCard | null>, deck: Deck<Card | null> | null) => {
	const {length, ...rest} = input;
	deck ??= new Deck();
	deck.length = length ?? deck.length;
	for (const key of Object.keys(rest)) {
		const index = Number.parseInt(key, 10);
		if (index < deck.length) {
			deck[index] = Card.deserialize(rest[index], deck[index])!;
		}
	}

	return deck;
});

export class Deck<T> extends Array<T> {
	shuffle() {
		const copy = [...this];
		for (let i = 0; i < this.length; i++) {
			this[i] = random.takeItem(copy);
		}

		return this;
	}
	draw(count: number) {
		return this.splice(-count, count) as this;
	}
	fromTop(number = 0): T | undefined {
		return this[this.length - number - 1];
	}
	map<O>(mapper: (input: T, index: number, array: T[]) => O): Deck<O> {
		return super.map(mapper) as Deck<O>;
	}
	filter(mapper: (input: T, index: number, array: T[]) => boolean): this {
		return super.filter(mapper) as this;
	}
	concat(other: this): this {
		return super.concat(other) as this;
	}
	reverse(): this {
		return super.reverse() as this;
	}
	serialize(this: Deck<Card>): SerializedDeck;
	serialize(this: Deck<Card | null>): SerializedNullableDeck;
	serialize(this: Deck<Card | null>): SerializedNullableDeck {
		return this.map((c) => c?.serialize() ?? null);
	}
	static deserialize(input: SerializedDeck, deck: Deck<Card>): Deck<Card>;
	static deserialize(input?: SerializedDeck | nullish, deck?: Deck<Card> | nullish): Deck<Card>;
	static deserialize(input: SerializedNullableDeck, deck: Deck<Card | null>): Deck<Card | null>;
	static deserialize(input?: SerializedNullableDeck | nullish, deck?: Deck<Card | null> | nullish): Deck<Card | null>;
	static deserialize(input?: SerializedNullableDeck | nullish, deck?: Deck<Card | null> | nullish) {
		return coreDeckDeserialize(input, deck);
	}
	static full() {
		const deck = new Deck<Card>(52);
		let i = 0;
		for (const suit of [Suit.Spades, Suit.Diamonds]) {
			for (let v = 1; v <= 13; v++) {
				deck[i++] = new Card(suit, v as CardValue);
			}
		}
		for (const suit of [Suit.Clubs, Suit.Hearts]) {
			for (let v = 13; v > 0; v--) {
				deck[i++] = new Card(suit, v as CardValue);
			}
		}

		return deck;
	}
	static ofSuit(suit: Suit) {
		const deck = new Deck<Card>(13);
		for (let v = 1; v <= 13; v++) {
			deck[v - 1] = new Card(suit, v as CardValue);
		}

		return deck;
	}
}
