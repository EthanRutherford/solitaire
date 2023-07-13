import {random} from "../../util/random";
import {Card, Deck, Suit} from "../deck";
import {error} from "../logger";
import {Game} from "./game";

// random shuffle and deal, may result in unsolvable games
export function randomShuffle(game: Game, drawCount: 1 | 3) {
	// reset game state to default, shuffle draw pile
	game.drawCount = drawCount;
	game.drawPile.splice(0, game.drawPile.length, ...Deck.full().shuffle());
	game.discardPile.splice(0, game.discardPile.length);
	game.tableau.splice(0, game.tableau.length);
	for (const k of [Suit.Spades, Suit.Diamonds, Suit.Clubs, Suit.Hearts]) {
		game.foundations[k] = new Deck<Card>();
	}

	// deal out cards into the tableau
	for (let i = 0; i < 7; i++) {
		game.tableau.push(game.drawPile.draw(i + 1));
	}

	// flip up top cards
	for (const deck of game.tableau) {
		deck.fromTop()!.faceUp = true;
	}

	return game.setContexts();
}

// builds a game backward from solution
export function reverseGame(game: Game, drawCount: 1 | 3) {
	// get the current random seed, in case we need to log it
	const randomSeed = random.getSeed();

	// clear and initialize the game
	game.drawCount = drawCount;
	game.drawPile.splice(0, game.drawPile.length);
	game.discardPile.splice(0, game.discardPile.length);
	game.tableau.splice(0, game.tableau.length);
	for (let i = 0; i < 7; i++) {
		game.tableau.push(new Deck<Card>());
	}
	for (const k of [Suit.Spades, Suit.Diamonds, Suit.Clubs, Suit.Hearts]) {
		game.foundations[k] = new Deck<Card>();
	}

	// build a "completed" game
	const completeSuits: Deck<Card>[] = [];
	for (let i = 0; i < 4; i++) {
		completeSuits[i] = Deck.ofSuit(i).reverse();
	}

	// deal suits into complete stacks of alternating color, king to ace
	const completeStacks = [new Deck<Card>(), new Deck<Card>(), new Deck<Card>(), new Deck<Card>()];
	for (let i = 0; i < 13; i++) {
		// randomize which card goes on which stack
		const sets = [[0, 2], [1, 3]];
		if (i % 2 === 1) {
			sets.reverse();
		}
		if (random.chance(.5)) {
			sets[0].reverse();
		}
		if (random.chance(.5)) {
			sets[1].reverse();
		}

		// draw cards from each suit to place onto stacks
		const plan = [sets[0][0], sets[1][0], sets[0][1], sets[1][1]];
		for (let j = 0; j < 4; j++) {
			completeStacks[j].push(completeSuits[plan[j]].pop()!);
		}
	}

	// move cards from our "completed" state into the game decks
	const notFullTableauDecks = [0, 1, 2, 3, 4, 5, 6];
	while (completeStacks.length > 0) {
		// pull a random card from a random deck
		const stackIndex = random.index(completeStacks);
		const card = completeStacks[stackIndex].pop()!;
		if (completeStacks[stackIndex].length === 0) {
			completeStacks.splice(stackIndex, 1);
		}

		// determine whether to move a card to the tableau or draw pile
		if (notFullTableauDecks.length > 0 && random.chance(.5)) {
			// move the card to an available spot in the tableau
			const notFullIndex = random.index(notFullTableauDecks);
			const tableauIndex = notFullTableauDecks[notFullIndex];
			game.tableau[tableauIndex].push(card);
			if (game.tableau[tableauIndex].length === tableauIndex + 1) {
				notFullTableauDecks.splice(notFullIndex, 1);
			}
		} else {
			// move the card to foundation or drawPile
			const foundation = game.foundations[card.suit];
			if (foundation.length === 0 || card.value === foundation.fromTop()!.value + 1) {
				foundation.push(card);
			} else {
				game.drawPile.push(card);
			}
		}
	}

	// place cards moved into foundations into tableau slots or draw pile
	for (const foundation of Object.values(game.foundations)) {
		while (foundation.length > 0) {
			const card = foundation.pop()!;
			if (notFullTableauDecks.length > 0) {
				const notFullIndex = random.index(notFullTableauDecks);
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

	// shuffle the draw pile, and deal out cards until tableau is full
	game.drawPile.shuffle();
	while (notFullTableauDecks.length > 0) {
		const notFullIndex = random.index(notFullTableauDecks);
		const tableauIndex = notFullTableauDecks[notFullIndex];
		game.tableau[tableauIndex].push(game.drawPile.pop()!);
		if (game.tableau[tableauIndex].length === tableauIndex + 1) {
			notFullTableauDecks.splice(notFullIndex, 1);
		}
	}

	// set the top card on each tableau deck to face up
	for (const deck of game.tableau) {
		deck.fromTop()!.faceUp = true;
	}

	const cardsInGame = game.drawPile.length + 28;
	if (cardsInGame !== 52) {
		void error({
			msg: `Klondike reverseGame generator finished with only ${cardsInGame} cards in the game`,
			seed: randomSeed,
		});
	}

	return game.setContexts();
}
