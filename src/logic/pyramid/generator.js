import {Deck} from "../deck";

export function randomShuffle(game) {
	game.drawPile.splice(0, game.drawPile.length, ...Deck.full().shuffle());
	for (const card of game.drawPile) {
		card.faceUp = true;
	}

	game.discardPile.splice(0, game.discardPile.length);
	game.completed.splice(0, game.completed.length);
	game.tree.splice(0, game.tree.length, ...game.drawPile.draw(28));
	game.remainingFlips = 2;
	return game.setContexts();
}

// builds a game backward from solution
export function reverseGame(game) {
	// clear and initialize the game
	game.drawPile.splice(0, game.drawPile.length);
	game.discardPile.splice(0, game.discardPile.length);
	game.completed.splice(0, game.completed.length);
	game.tree.splice(0, game.tree.length);
	game.remainingFlips = 2;

	// pair off matched cards from a random shuffle
	const deck = Deck.full().shuffle();
	for (const card of deck) {
		card.faceUp = true;
	}

	const matchedPairs = [];
	while (deck.length > 0) {
		const card = deck.pop();
		if (card.value === 13) {
			matchedPairs.push([card]);
		} else {
			const matchIndex = deck.findIndex((c) => c.value + card.value === 13);
			matchedPairs.push(deck.splice(matchIndex, 1).concat(card));
		}
	}

	// move cards from our completed state into the pyramid
	for (let i = 0; i < 28; i++) {
		const pairIndex = Math.floor(Math.random() * matchedPairs.length);
		game.tree.push(matchedPairs[pairIndex].pop());
		if (matchedPairs[pairIndex].length === 0) {
			matchedPairs.splice(pairIndex, 1);
		}
	}

	// place remaining cards in draw pile, and shuffle
	for (const pair of matchedPairs) {
		game.drawPile.push(...pair);
	}

	game.drawPile.shuffle();
	return game.setContexts();
}
