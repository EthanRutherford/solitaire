// crazy logarithmic tuple-of-length recursive conditional type

type GetPow2Arrays<N extends number, R extends never[][]> =
	R[0][N] extends never ? R : GetPow2Arrays<N, [[...R[0], ...R[0]], ...R]>;

type ConcatArrays<N extends number, R extends never[][], B extends never[]> =
	B["length"] extends N ? B : [...R[0], ...B][N] extends never
		? ConcatArrays<
			N,
			R extends [R[0], ...infer U] ? U extends never[][] ? U : never : never,
			B
		>
		: ConcatArrays<
			N,
			R extends [R[0], ...infer U] ? U extends never[][] ? U : never : never,
			[...R[0], ...B]
		>;

type Replace<R extends unknown[], T> = {[K in keyof R]: T};

type MakeTuple<T, N extends number> = {
	[K in N]:
	GetPow2Arrays<K, [[never]]> extends infer U ? U extends never[][]
		? Replace<ConcatArrays<K, U, []>, T> : never : never;
}[N];

export type TupleOf<T, N extends number> = number extends N ? T[] : MakeTuple<T, N>;
