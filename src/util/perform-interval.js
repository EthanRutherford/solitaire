export const performInterval = (func) => performCore(func());

function performCore(gen) {
	if (gen.next().done) {
		return;
	}

	setTimeout(() => performCore(gen), 20);
}
