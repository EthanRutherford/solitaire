import {Deck} from "../deck";

export function randomShuffle(game) {
	game.tableau.splice(0, game.tableau.length);
	game.completed.splice(0, game.completed.length);

	const deck = Deck.full().shuffle().filter((c) => c.value < 2 || c.value > 6);
	for (let i = 0; i < 8; i++) {
		game.tableau.push(deck.draw(4));
		game.tableau[i].fromTop().faceUp = true;
	}

	return game.setContexts();
}

export function reverseGame(game) {
	game.tableau.splice(0, game.tableau.length);
	game.completed.splice(0, game.completed.length);
	for (let i = 0; i < 8; i++) {
		game.tableau.push(new Deck());
	}

	// pair-off all cards in a shuffled deck
	const deck = Deck.full().shuffle().filter((c) => c.value < 2 || c.value > 6);
	const pairs = new Deck();
	while (deck.length > 0) {
		const cardA = deck.pop();
		const index = deck.findIndex((c) => c.value === cardA.value);
		const cardB = deck.splice(index, 1)[0];
		pairs.push([cardA, cardB]);
	}

	pairs.shuffle();

	while (pairs.length > 0) {
		const pair = pairs.pop();
		const decks = game.tableau.filter((d) => d.length < 4);
		const deckA = decks.splice(Math.random() * decks.length, 1)[0];
		const deckB = decks.splice(Math.random() * decks.length, 1)[0];
		deckA.push(pair[0]);
		deckB.push(pair[1]);
	}

	for (const deck of game.tableau) {
		deck.fromTop().faceUp = true;
	}

	return game.setContexts();
}
