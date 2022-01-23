import {Deck} from "../deck";
import {validatedDelta} from "../undo-stack";
import {randomShuffle, validatedShuffle} from "./generator";

const treeRows = [0, 1, 3, 6, 10, 15, 21];
export function getChildIndices(index) {
	if (index >= treeRows[treeRows.length - 1]) {
		return [];
	}

	const [curRow, nextRow] = treeRows.slice(
		treeRows.findIndex((r, i) => index >= r && index < treeRows[i + 1]),
	);

	const rowOffset = index - curRow;
	return [nextRow + rowOffset, nextRow + rowOffset + 1];
}

export class Game {
	constructor() {
		this.tree = new Deck();
		this.drawPile = new Deck();
		this.discardPile = new Deck();
		this.completed = new Deck();
		this.remainingFlips = 0;
	}
	setContexts() {
		const contexts = [
			this.tree,
			this.drawPile,
			this.discardPile,
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
	getChildrenOf(index) {
		if (index === -1) {
			return null;
		}

		return getChildIndices(index).map((i) => this.tree[i]).filter((c) => c != null);
	}
	drawCard() {
		const card = this.drawPile.draw(1)[0];
		this.discardPile.push(card);
		card.meta.context = this.discardPile;
	}
	undrawCard() {
		const card = this.discardPile.draw(1)[0];
		this.drawPile.push(card);
		card.meta.context = this.drawPile;
	}
	getMovableCards(card) {
		if (card.meta.context === this.drawPile) {
			return [this.drawPile.fromTop()];
		}
		if (card.meta.context === this.discardPile) {
			return [this.discardPile.fromTop()];
		}
		if (this.isPlayable(card)) {
			return [card];
		}

		return null;
	}
	clearCard(card) {
		if (card.meta.context === this.tree) {
			const index = this.tree.indexOf(card);
			this.tree[index] = null;
		} else if (card.meta.context !== this.completed) {
			card.meta.context.splice(card.meta.context.indexOf(card), 1);
		} else {
			return;
		}

		this.completed.push(card);
		card.meta.context = this.completed;
		card.faceUp = false;
	}
	isPlayable(card) {
		if (card.meta.context === this.completed) {
			return false;
		}

		const children = this.getChildrenOf(this.tree.indexOf(card));
		if (children != null && children.length > 0) {
			return false;
		}

		return true;
	}
	canClearCards(cardA, cardB) {
		if ((cardA.value + cardB.value) % 13 !== 0) {
			return false;
		}

		return this.isPlayable(cardA) && this.isPlayable(cardB);
	}
	hasWon() {
		return this.tree[0] == null;
	}
	serialize() {
		return {
			t: this.tree.serialize(),
			dr: this.drawPile.serialize(),
			di: this.discardPile.serialize(),
			c: this.completed.serialize(),
			r: this.remainingFlips,
		};
	}
	static deserialize = validatedDelta((input, game) => {
		game ??= new Game();
		game.tree = Deck.deserialize(input.t, game.tree);
		game.drawPile = Deck.deserialize(input.dr, game.drawPile);
		game.discardPile = Deck.deserialize(input.di, game.discardPile);
		game.drawPile = Deck.deserialize(input.dr, game.drawPile);
		game.completed = Deck.deserialize(input.c, game.completed);
		game.remainingFlips = input.r ?? game.remainingFlips;
		return game.setContexts();
	});
	static fromScratch(game, settings) {
		const generator = [randomShuffle, validatedShuffle][settings.generator];
		return generator(game);
	}
}
