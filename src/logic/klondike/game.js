import {Deck, suits} from "../deck";
import {validatedDelta} from "../undo-stack";

export class Game {
	constructor() {
		this.drawPile = null;
		this.discardPile = null;
		this.tableau = [];
		this.foundations = {};
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
	moveCards(cards, destination) {
		for (const card of cards) {
			destination.push(card);
			card.meta.context = destination;
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
	tryMoveToFoundation(card, destination = this.foundations[card.suit]) {
		const context = card.meta.context;

		// only cards on top can be sent to foundation
		if (card !== context.fromTop()) {
			return false;
		}

		// cards can only be sent to matching foundation
		if (destination !== this.foundations[card.suit]) {
			return false;
		}

		// card must be the next card for the foundation
		if ((destination.fromTop()?.value ?? 0) !== card.value - 1) {
			return false;
		}

		this.moveCards(context.draw(1), destination);
		return true;
	}
	tryTransferStack(card, destination) {
		const topCard = destination.fromTop();
		if (topCard == null ? card.value !== 13 :
			(card.suit + topCard.suit) % 2 === 0 ||
			card.value + 1 !== topCard.value
		) {
			return false;
		}

		const context = card.meta.context;
		const index = context.indexOf(card);
		const cards = context.draw(context.length - index);
		this.moveCards(cards, destination);
		return true;
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
		const state = {
			dr: this.drawPile.serialize(),
			di: this.discardPile.serialize(),
		};

		for (let i = 0; i < this.tableau.length; i++) {
			state[`t${i}`] = this.tableau[i].serialize();
		}

		for (const [k, v] of Object.entries(this.foundations)) {
			state[`f${k}`] = v.serialize();
		}

		return state;
	}
	static deserialize = validatedDelta((input, game) => {
		game ??= new Game();

		game.drawPile = Deck.deserialize(input.dr, game.drawPile);
		game.discardPile = Deck.deserialize(input.di, game.discardPile);
		const tableau = game.tableau;
		for (let i = 0; i < 7; i++) {
			tableau[i] = Deck.deserialize(input[`t${i}`], tableau[i]);
		}

		const foundations = game.foundations;
		for (const k of Object.values(suits)) {
			foundations[k] = Deck.deserialize(input[`f${k}`], foundations[k]);
		}

		return game.setContexts();
	});
	static fromScratch() {
		const deck = Deck.full().shuffle();
		const game = new Game();
		game.drawPile = deck;
		game.discardPile = new Deck();
		for (let i = 0; i < 7; i++) {
			game.tableau.push(deck.draw(i + 1));
		}
		for (const k of Object.values(suits)) {
			game.foundations[k] = new Deck();
		}

		for (const deck of game.tableau) {
			deck.fromTop().faceUp = true;
		}

		return game.setContexts();
	}
}
