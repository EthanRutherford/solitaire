import {Deck, suits} from "../deck";
import {validatedDelta} from "../undo-stack";

export class Game {
	constructor() {
		this.tableau = new Array(8).fill(0).map(() => new Deck());
		this.freeCells = new Array(4).fill(0).map(() => new Deck());
		this.foundations = {
			[suits.spades]: new Deck(),
			[suits.diamonds]: new Deck(),
			[suits.clubs]: new Deck(),
			[suits.hearts]: new Deck(),
		};
	}
	setContexts() {
		const contexts = [
			...this.tableau,
			...this.freeCells,
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
	getMovableCards(card) {
		const context = card.meta.context;
		const index = context.indexOf(card);
		const cards = context.slice(index);
		for (let i = 1; i < cards.length; i++) {
			const prev = cards[i - 1];
			const cur = cards[i];
			if (
				prev.color === cur.color ||
				prev.value - 1 !== cur.value
			) {
				return null;
			}
		}

		return cards;
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
		if (
			topCard != null &&
			(
				card.color === topCard.color ||
				card.value + 1 !== topCard.value
			)
		) {
			return false;
		}

		const freeCellCount = this.freeCells.filter((c) => c.length === 0).length;
		const freeTableauCount = this.tableau.filter((t) => t !== target && t.length === 0).length;
		const maxStackSize = (freeCellCount + 1) * (freeTableauCount + 1);
		if (card.meta.context.length - card.meta.context.indexOf(card) > maxStackSize) {
			return false;
		}

		return true;
	}
	canMoveCards(card, target) {
		if (Object.values(this.foundations).includes(target)) {
			return this.canMoveToFoundation(card, target);
		} else if (this.tableau.includes(target)) {
			return this.canMoveStack(card, target);
		} else if (this.freeCells.includes(target)) {
			return card === card.meta.context.fromTop() && target.length === 0;
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
		} else if (this.freeCells.includes(target)) {
			const originDeck = card.meta.context;
			this.moveCards(originDeck.draw(1), target);
		}
	}
	tryGetMoveTarget(card) {
		if (card === card.meta.context.fromTop()) {
			const foundation = this.foundations[card.suit];
			if (this.canMoveToFoundation(card, foundation)) {
				return foundation;
			}
		}

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

		for (const cell of this.freeCells) {
			if (cell.length === 0) {
				return cell;
			}
		}

		return null;
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

		const usableDecks = this.tableau.concat(this.freeCells);
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
	hasWon() {
		return Object.values(this.foundations).every((d) => d.length === 13);
	}
	serialize() {
		return {
			t: this.tableau.map((d) => d.serialize()),
			c: this.freeCells.map((c) => c.serialize()),
			f: Object.fromEntries(Object.entries(this.foundations).map(
				([k, v]) => [k, v.serialize()],
			)),
		};
	}
	static deserialize = validatedDelta((input, game) => {
		game ??= new Game();

		const tableau = game.tableau;
		for (let i = 0; i < 8; i++) {
			tableau[i] = Deck.deserialize(input.t?.[i], tableau[i]);
		}

		const freeCells = game.freeCells;
		for (let i = 0; i < 4; i++) {
			freeCells[i] = Deck.deserialize(input.c?.[i], freeCells[i]);
		}

		const foundations = game.foundations;
		for (const k of Object.values(suits)) {
			foundations[k] = Deck.deserialize(input.f?.[k], foundations[k]);
		}

		return game.setContexts();
	});
	static fromScratch(game) {
		const deck = Deck.full().shuffle();
		game.tableau.splice(0, game.tableau.length);
		game.freeCells.splice(0, game.freeCells.length);
		for (let i = 0; i < 8; i++) {
			game.tableau.push(new Deck());
		}

		for (let i = 0; i < 4; i++) {
			game.freeCells.push(new Deck());
		}

		for (const k of Object.values(suits)) {
			game.foundations[k] = new Deck();
		}

		for (let i = 0; i < deck.length; i++) {
			deck[i].faceUp = true;
			game.tableau[i % 8].push(deck[i]);
		}

		return game.setContexts();
	}
}
