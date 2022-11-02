import {Card, Deck} from "../deck";
import {Game} from "./game";

export function randomShuffle(game: Game) {
	game.tableau.splice(0, game.tableau.length);
	game.completed.splice(0, game.completed.length);

	const deck = Deck.full().shuffle().filter((c) => c.value < 2 || c.value > 6);
	for (let i = 0; i < 8; i++) {
		game.tableau.push(deck.draw(4));
		game.tableau[i].fromTop().faceUp = true;
	}

	return game.setContexts();
}

export function reverseGame(game: Game) {
	game.tableau.splice(0, game.tableau.length);
	game.completed.splice(0, game.completed.length);
	for (let i = 0; i < 8; i++) {
		game.tableau.push(new Deck());
	}

	// pair-off all cards in a shuffled deck
	const deck = Deck.full().shuffle().filter((c) => c.value < 2 || c.value > 6);
	const pairs = new Deck<Card[]>();
	while (deck.length > 0) {
		const cardA = deck.pop()!;
		const index = deck.findIndex((c) => c.value === cardA.value);
		const cardB = deck.splice(index, 1)[0];
		pairs.push([cardA, cardB]);
	}

	pairs.shuffle();

	/* rules:
		1. do not reduce to 1 deck before last pair
			this would cause and unsolvable game, since the last pair is placed one atop the other
		2. do not reduce to two or fewer decks before second to last pair
			this would cause the last few pairs to be placed on the same decks, which is unsatisfying
		3. do remove empty decks before third to last pair
			an empty deck on third to last would be 0 3 3, (or 0 2) which forces us to break rule 2
	*/
	while (pairs.length > 0) {
		const pair = pairs.pop()!;
		const illegalDeckCount = pairs.length > 1 ? 2 : pairs.length > 0 ? 1 : -1;

		const decks = game.tableau.filter((d) => d.length < 4);
		let deckCount = decks.length;
		while (true) {
			const deckA = decks.splice(Math.random() * decks.length, 1)[0];
			const completedDecks = deckA.length === 3 ? 1 : 0;
			const remainingDecks = deckCount - completedDecks;
			if (pairs.length > 4 || remainingDecks > illegalDeckCount) {
				deckA.push(pair[0]);
				deckCount -= completedDecks;
				break;
			}
		}

		while (true) {
			const deckB = decks.splice(Math.random() * decks.length, 1)[0];
			if (pairs.length === 3 && decks.some((d) => d.length === 0)) {
				continue;
			}

			const completedDecks = deckB.length === 3 ? 1 : 0;
			const remainingDecks = deckCount - completedDecks;
			if (pairs.length > 4 || remainingDecks > illegalDeckCount) {
				deckB.push(pair[1]);
				break;
			}
		}
	}

	for (const deck of game.tableau) {
		deck.fromTop().faceUp = true;
	}

	return game.setContexts();
}
