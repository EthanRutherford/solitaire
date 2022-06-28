import {Deck, suits} from "../deck";
import {validatedDelta} from "../undo-stack";

function getOneSuitDeck() {
	const deck = new Deck();
	for (let i = 0; i < 8; i++) {
		deck.push(...Deck.ofSuit(suits.spades));
	}

	return deck;
}

function getTwoSuitDeck() {
	const deck = new Deck();
	for (let i = 0; i < 4; i++) {
		deck.push(...Deck.ofSuit(suits.spades));
		deck.push(...Deck.ofSuit(suits.hearts));
	}

	return deck;
}

function getFourSuitDeck() {
	return Deck.full().concat(Deck.full());
}

function getDeck(suitCount) {
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
}

export class Game {
	constructor() {
		this.drawPile = new Deck();
		this.tableau = new Array(10).fill(0).map(() => new Deck());
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

		if (target?.fromTop().value - 1 === card.value) {
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
		const possibleTargets = this.tableau.filter((deck) => this.canMoveCards(card, deck));
		const ranked = possibleTargets.map((deck) => {
			if (deck.length === 0) {
				return {deck, sameSuitSize: 0, differentSuitSize: 0};
			}

			let sameSuitSize = 0;
			let value = card.value + 1;
			while (
				deck.fromTop(sameSuitSize)?.suit === card.suit &&
				deck.fromTop(sameSuitSize)?.value === value
			) {
				sameSuitSize++;
				value++;
			}

			let differentSuitSize = sameSuitSize;
			while (deck.fromTop(differentSuitSize)?.value === value) {
				differentSuitSize++;
				value++;
			}

			return {deck, sameSuitSize, differentSuitSize};
		}).sort((a, b) => {
			const sameDiff = b.sameSuitSize - a.sameSuitSize;
			return sameDiff !== 0 ? sameDiff : b.differentSuitSize - a.differentSuitSize;
		});

		return ranked[0]?.deck ?? null;
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
	hasWon() {
		return this.foundation.length === 8;
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
	static fromScratch(game, settings) {
		game.drawPile.splice(0, game.drawPile.length, ...getDeck(settings.suitCount).shuffle());
		game.foundation.splice(0, game.foundation.length);
		game.tableau.splice(0, game.tableau.length);
		for (let i = 0; i < 4; i++) {
			game.tableau.push(game.drawPile.draw(5));
		}
		for (let i = 0; i < 6; i++) {
			game.tableau.push(game.drawPile.draw(4));
		}
		for (const deck of game.tableau) {
			deck.fromTop().faceUp = true;
		}

		return game.setContexts();
	}
}
