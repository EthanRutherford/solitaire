import {TupleOf} from "../../util/tupleof";
import {Card, Deck, SerializedDeck} from "../deck";
import {SerializedArray, validatedDelta} from "../undo-stack";
import {randomShuffle, reverseGame} from "./generator";

export type SerializedGame = {
	t?: SerializedArray<SerializedDeck>;
	c?: SerializedDeck;
};

export enum GameGenerator {
	Random,
	Solveable,
}

export interface Settings {
	generator: GameGenerator;
}

export class Game {
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
	setContext(context: Deck<Card | nullish>) {
		for (const card of context) {
			if (card != null) {
				card.meta.context = context;
			}
		}
	}
	getMovableCards(card: Card) {
		if (this.isPlayable(card)) {
			return [card];
		}

		return null;
	}
	clearCard(card: Card) {
		if (card.meta.context === this.completed) {
			return;
		}

		const formerContext = card.meta.context as Deck<Card>;
		formerContext.splice(formerContext.indexOf(card), 1);
		this.completed.push(card);
		card.meta.context = this.completed;
		if (formerContext.length > 0) {
			formerContext.fromTop()!.faceUp = true;
		}
	}
	isPlayable(card: Card) {
		if (card.meta.context === this.completed) {
			return false;
		}

		const context = card.meta.context as Deck<Card>;
		return card === context.fromTop();
	}
	canClearCards(cardA: Card, cardB: Card) {
		if (cardA === cardB || cardA.value !== cardB.value) {
			return false;
		}

		return this.isPlayable(cardA) && this.isPlayable(cardB);
	}
	hasWon() {
		return this.completed.length === 32;
	}
	serialize(): SerializedGame {
		return {
			t: this.tableau.map((d) => d.serialize()),
			c: this.completed.serialize(),
		};
	}
	tableau: TupleOf<Deck<Card>, 8> = [
		new Deck<Card>(), new Deck<Card>(), new Deck<Card>(), new Deck<Card>(),
		new Deck<Card>(), new Deck<Card>(), new Deck<Card>(), new Deck<Card>(),
	];
	completed = new Deck<Card>();

	static fromScratch(game: Game, settings: Settings) {
		const generator = [randomShuffle, reverseGame][settings.generator];
		return generator(game);
	}
	static deserialize = validatedDelta((input: SerializedGame, game: Game | null) => {
		game ??= new Game();

		const tableau = game.tableau;
		for (let i = 0; i < 8; i++) {
			tableau[i] = Deck.deserialize(input.t?.[i], tableau[i]);
		}

		game.completed = Deck.deserialize(input.c, game.completed);
		return game.setContexts();
	});
}
