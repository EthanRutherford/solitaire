import {Deck} from "../deck";
import {validatedDelta} from "../undo-stack";
import {randomShuffle, reverseGame} from "./generator";

export class Game {
	constructor() {
		this.tableau = new Array(8).fill(0).map(() => new Deck());
		this.completed = new Deck();
	}
	setContexts() {
		const contexts = [
			...this.tableau,
			this.completed,
		];
		for (const context of contexts) {
			this.setContext(context);
		}

		return this;
	}
	setContext(context) {
		for (const card of context) {
			if (card != null) {
				card.meta.context = context;
			}
		}
	}
	getMovableCards(card) {
		if (this.isPlayable(card)) {
			return [card];
		}

		return null;
	}
	clearCard(card) {
		if (card.meta.context === this.completed) {
			return;
		}

		const formerContext = card.meta.context;
		formerContext.splice(formerContext.indexOf(card), 1);
		this.completed.push(card);
		card.meta.context = this.completed;
		if (formerContext.length > 0) {
			formerContext.fromTop().faceUp = true;
		}
	}
	isPlayable(card) {
		if (card.meta.context === this.completed) {
			return false;
		}

		return card === card.meta.context.fromTop();
	}
	canClearCards(cardA, cardB) {
		if (cardA === cardB || cardA.value !== cardB.value) {
			return false;
		}

		return this.isPlayable(cardA) && this.isPlayable(cardB);
	}
	hasWon() {
		return this.completed.length === 32;
	}
	serialize() {
		return {
			t: this.tableau.map((d) => d.serialize()),
			c: this.completed.serialize(),
		};
	}
	static deserialize = validatedDelta((input, game) => {
		game ??= new Game();

		const tableau = game.tableau;
		for (let i = 0; i < 8; i++) {
			tableau[i] = Deck.deserialize(input.t?.[i], tableau[i]);
		}

		game.completed = Deck.deserialize(input.c, game.completed);
		return game.setContexts();
	});
	static fromScratch(game, settings) {
		const generator = [randomShuffle, reverseGame][settings.generator];
		return generator(game);
	}
}
