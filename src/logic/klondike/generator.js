import {Deck, suits} from "../deck";

export function randomShuffle(game, drawCount) {
	game.drawCount = drawCount;
	game.drawPile.splice(0, game.drawPile.length, ...Deck.full().shuffle());
	game.discardPile.splice(0, game.discardPile.length);
	game.tableau.splice(0, game.tableau.length);
	for (let i = 0; i < 7; i++) {
		game.tableau.push(game.drawPile.draw(i + 1));
	}
	for (const k of Object.values(suits)) {
		game.foundations[k] = new Deck();
	}

	for (const deck of game.tableau) {
		deck.fromTop().faceUp = true;
	}

	return game.setContexts();
}

// builds a game backward from solution
export function reverseGame(game, drawCount) {
	// clear and initialize the game
	game.drawCount = drawCount;
	game.drawPile.splice(0, game.drawPile.length);
	game.discardPile.splice(0, game.discardPile.length);
	game.tableau.splice(0, game.tableau.length);
	for (let i = 0; i < 7; i++) {
		game.tableau.push(new Deck());
	}
	for (const k of Object.values(suits)) {
		game.foundations[k] = new Deck();
	}

	// build a "completed" game
	const completeSuits = [];
	for (let i = 0; i < 4; i++) {
		completeSuits[i] = Deck.ofSuit(i).reverse();
	}

	const completeStacks = [new Deck(), new Deck(), new Deck(), new Deck()];
	for (let i = 0; i < 13; i++) {
		const sets = [[0, 2], [1, 3]];
		if (i % 2 === 1) {
			sets.reverse();
		}
		if (Math.random() < .5) {
			sets[0].reverse();
		}
		if (Math.random() < .5) {
			sets[1].reverse();
		}

		const plan = [sets[0][0], sets[1][0], sets[0][1], sets[1][1]];
		for (let j = 0; j < 4; j++) {
			completeStacks[j].push(completeSuits[plan[j]].pop());
		}
	}

	// move cards from our completed state into the game decks
	const notFullTableauDecks = [0, 1, 2, 3, 4, 5, 6];
	while (completeStacks.length > 0) {
		const stackIndex = Math.floor(Math.random() * completeStacks.length);
		const card = completeStacks[stackIndex].pop();
		if (completeStacks[stackIndex].length === 0) {
			completeStacks.splice(stackIndex, 1);
		}

		if (notFullTableauDecks.length > 0 && Math.random() < .5) {
			// move the card to an available spot in the tableau
			const notFullIndex = Math.floor(Math.random() * notFullTableauDecks.length);
			const tableauIndex = notFullTableauDecks[notFullIndex];
			game.tableau[tableauIndex].push(card);
			if (game.tableau[tableauIndex].length === tableauIndex + 1) {
				notFullTableauDecks.splice(notFullIndex, 1);
			}
		} else {
			// move the card to foundation or drawPile
			const foundation = game.foundations[card.suit];
			if (foundation.length === 0 || card.value === foundation.fromTop().value + 1) {
				foundation.push(card);
			} else {
				game.drawPile.push(card);
			}
		}
	}

	for (const foundation of Object.values(game.foundations)) {
		while (foundation.length > 0) {
			const card = foundation.pop();
			if (notFullTableauDecks.length > 0) {
				const notFullIndex = Math.floor(Math.random() * notFullTableauDecks.length);
				const tableauIndex = notFullTableauDecks[notFullIndex];
				game.tableau[tableauIndex].push(card);
				if (game.tableau[tableauIndex].length === tableauIndex + 1) {
					notFullTableauDecks.splice(notFullIndex, 1);
				}
			} else {
				game.drawPile.push(card);
			}
		}
	}

	game.drawPile.shuffle();
	while (notFullTableauDecks.length > 0) {
		const notFullIndex = Math.floor(Math.random() * notFullTableauDecks.length);
		const tableauIndex = notFullTableauDecks[notFullIndex];
		game.tableau[tableauIndex].push(game.drawPile.pop());
		if (game.tableau[tableauIndex].length === tableauIndex + 1) {
			notFullTableauDecks.splice(notFullIndex, 1);
		}
	}

	for (const deck of game.tableau) {
		deck.fromTop().faceUp = true;
	}

	return game.setContexts();
}
