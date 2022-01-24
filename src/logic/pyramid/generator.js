import {Deck} from "../deck";
import {getChildIndices} from "./game";

// shuffles a deck and deals cards onto the pyramid
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

function isAncestorOf(indexA, indexB) {
	if (indexA > indexB) {
		return false;
	}

	const children = getChildIndices(indexA);
	for (const index of children) {
		if (index === indexB || isAncestorOf(index, indexB)) {
			return true;
		}
	}

	return false;
}

function without(set, ...items) {
	const copy = new Set(set);
	for (const item of items) {
		copy.delete(item);
	}

	return copy;
}

function microsolve(cards, value, remainingValue, remainingOther) {
	if (cards.length === 0) {
		return true;
	}

	// there may be a faster (non-exhaustive) way to check for solvability,
	// but this is *probably* fast enough
	const leaves = cards.filter((x) => x.blockedBy.length === 0);
	for (let i = 0; i < leaves.length; i++) {
		for (let j = i + 1; j < leaves.length; j++) {
			if (leaves[i].value !== leaves[j].value) {
				const copy = cards.filter((c) => c !== leaves[i] && c !== leaves[j]).map((c) => ({
					...c,
					blockedBy: without(c.blockedBy, leaves[i], leaves[j]),
				}));
				if (microsolve(copy, value, remainingValue, remainingOther)) {
					return true;
				}
			}
		}

		let rv = remainingValue;
		let ro = remainingOther;
		const isValue = leaves[i].value === value;
		if (isValue && rv > 0) {
			rv--;
		} else if (!isValue && ro > 0) {
			ro--;
		} else {
			continue;
		}

		const copy = cards.filter((c) => c !== leaves[i]).map((c) => ({
			...c,
			blockedBy: without(c.blockedBy, leaves[i]),
		}));

		if (microsolve(copy, value, rv, ro)) {
			return true;
		}
	}

	return false;
}

function canPlace(game, index, value) {
	// kings are free
	if (value === 13) {
		return true;
	}

	// gather relevant cards already in the pyramid
	const otherValue = 13 - value;
	const relevantCards = [];
	let remainingValue = 3;
	let remainingOther = 4;

	for (let i = 0; i < game.tree.length; i++) {
		if (game.tree[i].value === value || game.tree[i].value === otherValue) {
			relevantCards.push({i, value: game.tree[i].value, blockedBy: new Set()});
			if (game.tree[i].value === value) {
				remainingValue--;
			} else {
				remainingOther--;
			}
		}
	}

	relevantCards.push({i: index, value, blockedBy: new Set()});

	// if half or more of both values are in the drawPile, we know for sure they can be cleared
	if (remainingValue >= 2 && remainingOther >= 2) {
		return true;
	}

	// map out dependency graph
	for (let i = 0; i < relevantCards.length; i++) {
		for (let j = i + 1; j < relevantCards.length; j++) {
			if (isAncestorOf(i, j)) {
				relevantCards[i].blockedBy.add(relevantCards[j]);
			}
		}
	}

	// check if this arrangement of cards can be cleared
	return microsolve(relevantCards, value, remainingValue, remainingOther);
}

// shuffles a deck, but only places cards on the pyramid which do not cause an impossible game
export function validatedShuffle(game) {
	// clear and initialize the game
	game.drawPile.splice(0, game.drawPile.length, ...Deck.full().shuffle());
	game.discardPile.splice(0, game.discardPile.length);
	game.completed.splice(0, game.completed.length);
	game.tree.splice(0, game.tree.length);
	game.remainingFlips = 2;
	for (const card of game.drawPile) {
		card.faceUp = true;
	}

	// put cards onto the pyramid, so long as they don't block completion
	while (game.tree.length < 28) {
		const card = game.drawPile.pop();
		if (canPlace(game, game.tree.length, card)) {
			game.tree.push(card);
		} else {
			game.drawPile.unshift(card);
		}
	}

	return game.setContexts();
}