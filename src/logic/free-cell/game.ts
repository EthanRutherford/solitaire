import {TupleOf} from "../../util/tupleof";
import {Card, Deck, Suit, SerializedDeck} from "../deck";
import {SerializedArray, validatedDelta} from "../undo-stack";

export type SerializedGame = {
	t?: SerializedArray<SerializedDeck>;
	c?: SerializedArray<SerializedDeck>;
	f?: Record<string, SerializedDeck>;
};

export class Game {
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
	setContext(context: Deck<Card>) {
		for (const card of context) {
			card.meta.context = context;
		}
	}
	moveCards(cards: Card[], target: Deck<Card>) {
		for (const card of cards) {
			target.push(card);
			card.meta.context = target;
		}
	}
	getMovableCards(this: void, card: Card) {
		const context = card.meta.context as Deck<Card>;
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
		const context = card.meta.context as Deck<Card>;
		if (context.length - context.indexOf(card) > maxStackSize) {
			return false;
		}

		return true;
	}
	canMoveCards(card: Card, target: Deck<Card>) {
		if (Object.values(this.foundations).includes(target)) {
			return this.canMoveToFoundation(card, target);
		} else if (this.tableau.includes(target)) {
			return this.canMoveStack(card, target);
		} else if (this.freeCells.includes(target)) {
			const context = card.meta.context as Deck<Card>;
			return card === context.fromTop() && target.length === 0;
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
		} else if (this.freeCells.includes(target)) {
			const originDeck = card.meta.context as Deck<Card>;
			this.moveCards(originDeck.draw(1), target);
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

		const [empty, nonEmpty] = this.tableau.reduce<[Deck<Card>[], Deck<Card>[]]>((partitions, deck) => {
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
				maxValue = Math.min(deck.fromTop()!.value + 1, maxValue);
			} else {
				maxValue = 0;
			}
		}

		const usableDecks = this.tableau.concat(this.freeCells);
		for (const deck of usableDecks) {
			const top = deck.fromTop();
			if (top != null) {
				const foundation = this.foundations[top.suit];
				if (top.value <= maxValue && this.canMoveToFoundation(top, foundation)) {
					this.transferCards(top, foundation);
					return deck;
				}
			}
		}

		return null;
	}
	hasWon() {
		return Object.values(this.foundations).every((d) => d.length === 13);
	}
	serialize(): SerializedGame {
		return {
			t: this.tableau.map((d) => d.serialize()),
			c: this.freeCells.map((c) => c.serialize()),
			f: Object.fromEntries(Object.entries(this.foundations).map(
				([k, v]) => [k, v.serialize()],
			)),
		};
	}
	tableau: TupleOf<Deck<Card>, 8> = [
		new Deck<Card>(), new Deck<Card>(), new Deck<Card>(), new Deck<Card>(),
		new Deck<Card>(), new Deck<Card>(), new Deck<Card>(), new Deck<Card>(),
	];
	freeCells: TupleOf<Deck<Card>, 4> = [
		new Deck<Card>(), new Deck<Card>(), new Deck<Card>(), new Deck<Card>(),
	];
	foundations = {
		[Suit.Spades]: new Deck<Card>(),
		[Suit.Diamonds]: new Deck<Card>(),
		[Suit.Clubs]: new Deck<Card>(),
		[Suit.Hearts]: new Deck<Card>(),
	};

	static fromScratch(game: Game) {
		const deck = Deck.full().shuffle();
		game.tableau.splice(0, game.tableau.length);
		game.freeCells.splice(0, game.freeCells.length);
		for (let i = 0; i < 8; i++) {
			game.tableau.push(new Deck());
		}

		for (let i = 0; i < 4; i++) {
			game.freeCells.push(new Deck());
		}

		for (const k of [Suit.Spades, Suit.Diamonds, Suit.Clubs, Suit.Hearts]) {
			game.foundations[k] = new Deck();
		}

		for (let i = 0; i < deck.length; i++) {
			deck[i].faceUp = true;
			game.tableau[i % 8].push(deck[i]);
		}

		return game.setContexts();
	}
	static deserialize = validatedDelta((input: SerializedGame, game: Game | null) => {
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
		for (const k of [Suit.Spades, Suit.Diamonds, Suit.Clubs, Suit.Hearts]) {
			foundations[k] = Deck.deserialize(input.f?.[k], foundations[k]);
		}

		return game.setContexts();
	});
}
