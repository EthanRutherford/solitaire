import {TupleOf} from "../../util/tupleof";
import {Card, Deck, Suit, SerializedDeck} from "../deck";
import {validatedDelta} from "../undo-stack";
import {randomShuffle, reverseGame} from "./generator";

export interface SerializedGame {
	dc: number,
	dr: SerializedDeck,
	di: SerializedDeck,
	t: SerializedDeck[],
	f: Record<string, SerializedDeck>,
}

export interface Settings {
	generator: 0|1,
	drawCount: 1|3,
}

export class Game {
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
	setContext(context: Deck<Card>) {
		for (const card of context) {
			card.meta.context = context;
		}
	}
	moveCards(cards: Array<Card>, target: Deck<Card>) {
		for (const card of cards) {
			target.push(card);
			card.meta.context = target;
		}
	}
	drawCards(count: number) {
		const cards = this.drawPile.draw(count).reverse();
		this.moveCards(cards, this.discardPile);
		for (const card of cards) {
			card.faceUp = true;
		}
	}
	undrawCards(count: number) {
		const cards = this.discardPile.draw(count).reverse();
		this.moveCards(cards, this.drawPile);
		for (const card of cards) {
			card.faceUp = false;
		}
	}
	getMovableCards(card: Card) {
		if (card.meta.context === this.discardPile) {
			return [this.discardPile.fromTop()];
		}

		if (card.faceUp) {
			const context = card.meta.context as Deck<Card>;
			const index = context.indexOf(card);
			return context.slice(index);
		}

		return null;
	}
	canMoveToFoundation(card: Card, target: Deck<Card>) {
		const context = card.meta.context as Deck<Card>;

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
	canMoveStack(card: Card, target: Deck<Card>) {
		const topCard = target.fromTop();
		if (topCard == null ? card.value !== 13 :
			card.color === topCard.color ||
			card.value + 1 !== topCard.value
		) {
			return false;
		}

		return true;
	}
	canMoveCards(card: Card, target: Deck<Card>) {
		if (Object.values(this.foundations).includes(target)) {
			return this.canMoveToFoundation(card, target);
		} else if (this.tableau.includes(target)) {
			return this.canMoveStack(card, target);
		}

		return false;
	}
	transferCards(card: Card, target: Deck<Card>) {
		if (Object.values(this.foundations).includes(target)) {
			const originDeck = card.meta.context as Deck<Card>;
			this.moveCards(originDeck.draw(1), target);
		} else if (this.tableau.includes(target)) {
			const context = card.meta.context as Deck<Card>;
			const index = context.indexOf(card);
			this.moveCards(context.draw(context.length - index), target);
		}
	}
	tryGetMoveTarget(card: Card) {
		const context = card.meta.context as Deck<Card>;
		if (card === context.fromTop()) {
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
	tryFlipCard(deck: Deck<Card>) {
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
	serialize(): SerializedGame {
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
	static deserialize = validatedDelta((input: SerializedGame, game: Game|null) => {
		game ??= new Game();

		game.drawCount = input.dc ?? game.drawCount;
		game.drawPile = Deck.deserialize(input.dr, game.drawPile);
		game.discardPile = Deck.deserialize(input.di, game.discardPile);
		const tableau = game.tableau;
		for (let i = 0; i < 7; i++) {
			tableau[i] = Deck.deserialize(input.t?.[i], tableau[i]);
		}

		const foundations = game.foundations;
		for (const k of [Suit.Spades, Suit.Diamonds, Suit.Clubs, Suit.Hearts]) {
			foundations[k] = Deck.deserialize(input.f?.[k], foundations[k]);
		}

		return game.setContexts();
	});
	static fromScratch(game: Game, settings: Settings) {
		const generator = [randomShuffle, reverseGame][settings.generator];
		return generator(game, settings.drawCount);
	}
	drawCount = 1;
	drawPile = new Deck<Card>();
	discardPile = new Deck<Card>();
	tableau: TupleOf<Deck<Card>, 7> = [
		new Deck<Card>(), new Deck<Card>(), new Deck<Card>(), new Deck<Card>(),
		new Deck<Card>(), new Deck<Card>(), new Deck<Card>(),
	];
	foundations = {
		[Suit.Spades]: new Deck<Card>(),
		[Suit.Diamonds]: new Deck<Card>(),
		[Suit.Clubs]: new Deck<Card>(),
		[Suit.Hearts]: new Deck<Card>(),
	};
}
