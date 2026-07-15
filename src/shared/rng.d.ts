export type Rng = () => number;

export function createSeededRng(seed: unknown): Rng;
export function randomInt(rng: Rng, max: number): number;
export function shuffleWithRng<T>(items: readonly T[], rng: Rng): T[];
