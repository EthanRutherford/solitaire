import {Deck, suits} from "../deck";
import {validatedDelta} from "../undo-stack";
import {randomShuffle, reverseGame} from "./generator";

export class Game {
	constructor() {
		this.drawCount = 1;
		this.drawPile = new Deck();
		this.discardPile = new Deck();
		this.tableau = new Array(7).fill(0).map(() => new Deck());
		this.foundations = {
			[suits.spades]: new Deck(),
			[suits.diamonds]: new Deck(),
			[suits.clubs]: new Deck(),
			[suits.hearts]: new Deck(),
		};
	}
	setContexts() {
		const contexts = [
			this.drawPile,
			this.discardPile,
			...this.tableau,
			...Object.values(this.foundations),
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
	drawCards(count) {
		const cards = this.drawPile.draw(count).reverse();
		this.moveCards(cards, this.discardPile);
		for (const card of cards) {
			card.faceUp = true;
		}
	}
	undrawCards(count) {
		const cards = this.discardPile.draw(count).reverse();
		this.moveCards(cards, this.drawPile);
		for (const card of cards) {
			card.faceUp = false;
		}
	}
	getMovableCards(card) {
		if (card.meta.context === this.discardPile) {
			return [this.discardPile.fromTop()];
		}

		if (card.faceUp) {
			const context = card.meta.context;
			const index = context.indexOf(card);
			return context.slice(index);
		}

		return null;
	}
	canMoveToFoundation(card, target) {
		const context = card.meta.context;

		// only cards on top can be sent to foundation
		if (card !== context.fromTop()) {
			return false;
		}

		// cards can only be sent to matching foundation
		if (target !== this.foundations[card.suit]) {
			return false;
		}

		// card must be the next card for the foundation
		if ((target.fromTop()?.value ?? 0) !== card.value - 1) {
			return false;
		}

		return true;
	}
	canMoveStack(card, target) {
		const topCard = target.fromTop();
		if (topCard == null ? card.value !== 13 :
			card.color === topCard.color ||
			card.value + 1 !== topCard.value
		) {
			return false;
		}

		return true;
	}
	canMoveCards(card, target) {
		if (Object.values(this.foundations).includes(target)) {
			return this.canMoveToFoundation(card, target);
		} else if (this.tableau.includes(target)) {
			return this.canMoveStack(card, target);
		}

		return false;
	}
	transferCards(card, target) {
		if (Object.values(this.foundations).includes(target)) {
			const originDeck = card.meta.context;
			this.moveCards(originDeck.draw(1), target);
		} else if (this.tableau.includes(target)) {
			const context = card.meta.context;
			const index = context.indexOf(card);
			this.moveCards(context.draw(context.length - index), target);
		}
	}
	tryGetMoveTarget(card) {
		if (card === card.meta.context.fromTop()) {
			const foundation = this.foundations[card.suit];
			if (this.canMoveToFoundation(card, foundation)) {
				return foundation;
			}
		}

		for (const deck of this.tableau) {
			if (this.canMoveStack(card, deck)) {
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
	tryAutoCompleteOne() {
		let maxValue = 15;
		for (const deck of Object.values(this.foundations)) {
			if (deck.length > 0) {
				maxValue = Math.min(deck.fromTop().value + 1, maxValue);
			} else {
				maxValue = 0;
			}
		}

		const usableDecks = this.tableau.concat([this.discardPile]);
		for (const deck of usableDecks) {
			const top = deck.fromTop();
			const foundation = this.foundations[top?.suit];
			if (top?.value <= maxValue && this.canMoveToFoundation(top, foundation)) {
				this.transferCards(top, foundation);
				return deck;
			}
		}

		return null;
	}
	serialize() {
		return {
			dc: this.drawCount,
			dr: this.drawPile.serialize(),
			di: this.discardPile.serialize(),
			t: this.tableau.map((d) => d.serialize()),
			f: Object.fromEntries(Object.entries(this.foundations).map(
				([k, v]) => [k, v.serialize()],
			)),
		};
	}
	hasWon() {
		return Object.values(this.foundations).every((d) => d.length === 13);
	}
	static deserialize = validatedDelta((input, game) => {
		game ??= new Game();

		game.drawCount = input.dc ?? game.drawCount;
		game.drawPile = Deck.deserialize(input.dr, game.drawPile);
		game.discardPile = Deck.deserialize(input.di, game.discardPile);
		const tableau = game.tableau;
		for (let i = 0; i < 7; i++) {
			tableau[i] = Deck.deserialize(input.t?.[i], tableau[i]);
		}

		const foundations = game.foundations;
		for (const k of Object.values(suits)) {
			foundations[k] = Deck.deserialize(input.f?.[k], foundations[k]);
		}

		return game.setContexts();
	});
	static fromScratch(game, settings) {
		const generator = [randomShuffle, reverseGame][settings.generator];
		return generator(game, settings.drawCount);
	}
}
