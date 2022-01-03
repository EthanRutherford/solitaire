import {Deck, suits} from "../deck";
import {validatedDelta} from "../undo-stack";

function getOneSuitDeck() {
	const deck = new Deck();
	for (let i = 0; i < 8; i++) {
		deck.push(...Deck.full().filter((c) => c.suit === suits.spades));
	}

	return deck;
}

function getTwoSuitDeck() {
	const suits = [suits.spades, suits.hearts];
	const deck = new Deck();
	for (let i = 0; i < 4; i++) {
		deck.push(...Deck.full().filter((c) => suits.contains(c.suit)));
	}

	return deck;
}

function getFourSuitDeck() {
	return Deck.full().concat(Deck.full());
}

export class Game {
	constructor() {
		this.drawPile = null;
		this.tableau = [];
		this.foundation = [];
	}
	setContexts() {
		const contexts = [
			this.drawPile,
			...this.tableau,
			...this.foundation,
		];
		for (const context of contexts) {
			this.setContext(context);
		}

		return this;
	}
	setContext(context) {
		for (const card of context) {
			card.meta.context = context;
		}
	}
	moveCards(cards, target) {
		for (const card of cards) {
			target.push(card);
			card.meta.context = target;
		}
	}
	getMovableCards(card) {
		if (!card.faceUp) {
			return null;
		}

		const context = card.meta.context;
		const index = context.indexOf(card);
		const cards = context.slice(index);
		for (let i = 1; i < cards.length; i++) {
			const prev = cards[i - 1];
			const cur = cards[i];
			if (prev.suit !== cur.suit || prev.value - 1 !== cur.value) {
				return null;
			}
		}

		return cards;
	}
	canMoveCards(card, target) {
		if (target?.length === 0) {
			return true;
		}

		if (
			target?.fromTop().suit === card.suit &&
			target?.fromTop().value - 1 === card.value
		) {
			return true;
		}

		return false;
	}
	canCompleteStack(deck) {
		const suit = deck.fromTop().suit;
		for (let i = 12; i >= 0; i--) {
			const card = deck.fromTop(i);
			if (card?.suit !== suit || card.value !== i + 1) {
				return false;
			}
		}

		return true;
	}
	transferCards(card, target) {
		const context = card.meta.context;
		const index = context.indexOf(card);
		this.moveCards(context.draw(context.length - index), target);
	}
	tryGetMoveTarget(card) {
		const [empty, nonEmpty] = this.tableau.reduce((partitions, deck) => {
			partitions[deck.length === 0 ? 0 : 1].push(deck);
			return partitions;
		}, [[], []]);

		for (const deck of nonEmpty) {
			if (this.canMoveCards(card, deck)) {
				return deck;
			}
		}

		for (const deck of empty) {
			if (this.canMoveCards(card, deck)) {
				return deck;
			}
		}

		return null;
	}
	tryFlipCard(deck) {
		if (this.tableau.includes(deck)) {
			const top = deck.fromTop();
			if (!(top?.faceUp ?? true)) {
				top.faceUp = true;
				return true;
			}
		}

		return false;
	}
	serialize() {
		return {
			d: this.drawPile.serialize(),
			t: this.tableau.map((d) => d.serialize()),
			f: this.foundation.map((d) => d.serialize()),
		};
	}
	static deserialize = validatedDelta((input, game) => {
		game ??= new Game();

		game.drawPile = Deck.deserialize(input.d, game.drawPile);
		const tableau = game.tableau;
		for (let i = 0; i < 10; i++) {
			tableau[i] = Deck.deserialize(input.t?.[i], tableau[i]);
		}

		if (input.f != null) {
			const {length, ...rest} = input.f;
			const foundation = game.foundation;
			foundation.length = length ?? foundation.length;
			for (const [key, value] of Object.entries(rest)) {
				if (key < foundation.length) {
					foundation[key] = Deck.deserialize(value, foundation[key]);
				}
			}
		}

		return game.setContexts();
	});
	static fromScratch(suitCount) {
		const deck = (() => {
			if (suitCount === 1) {
				return getOneSuitDeck();
			}

			if (suitCount === 2) {
				return getTwoSuitDeck();
			}

			if (suitCount === 4) {
				return getFourSuitDeck();
			}

			throw new Error("invalid suitCount");
		})();

		const game = new Game();
		game.drawPile = deck.shuffle();
		for (let i = 0; i < 4; i++) {
			game.tableau.push(deck.draw(5));
		}
		for (let i = 0; i < 6; i++) {
			game.tableau.push(deck.draw(4));
		}
		for (const deck of game.tableau) {
			deck.fromTop().faceUp = true;
		}

		return game.setContexts();
	}
}
