// https://github.com/bryc/code/blob/master/jshash/PRNGs.md

function xmur3(str: string) {
	let h = 1779033703 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
		h = h << 13 | h >>> 19;
	}

	return () => {
		h = Math.imul(h ^ h >>> 16, 2246822507);
		h = Math.imul(h ^ h >>> 13, 3266489909);
		return (h ^= h >>> 16) >>> 0;
	};
}

function sfc32(a: number, b: number, c: number, d: number) {
	return function() {
		a |= 0; b |= 0; c |= 0; d |= 0;
		const t = (a + b | 0) + d | 0;
		d = d + 1 | 0;
		a = b ^ b >>> 9;
		b = c + (c << 3) | 0;
		c = c << 21 | c >>> 11;
		c = c + t | 0;
		return (t >>> 0) / 4294967296;
	};
}

function makeSeeded(seed: string) {
	const hash = xmur3(seed);
	return sfc32(hash(), hash(), hash(), hash());
}

// if randomUUID isn't available, fallback to current datetime
const defaultSeed = "crypto" in globalThis && "randomUUID" in crypto ?
	crypto.randomUUID() :
	Date.now().toString();
let prng = makeSeeded(defaultSeed);

export const seedRandom = (seed: string) => {prng = makeSeeded(seed);};
export const random = () => prng();
random.float = random;
random.integer = (min: number, max: number) => Math.floor(min + (prng() * (max - min)));
random.chance = (n: number) => prng() > n;
random.index = <T>(a: T[]) => random.integer(0, a.length);
random.item = <T>(a: T[]) => a[random.index(a)];
random.takeItem = <T>(a: T[]) => a.splice(random.index(a), 1)[0];
