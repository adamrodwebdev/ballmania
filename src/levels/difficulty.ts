/** The three difficulties of the campaign (specification § 3.9). */
export type Difficulty = 'explorer' | 'pilot' | 'legend';

export const DIFFICULTIES: readonly Difficulty[] = ['explorer', 'pilot', 'legend'];

export interface DifficultyRule {
  /** Factor of the chain's speed. */
  readonly speed: number;
  /** Factor of every hazard: frequency of falling balls and weather, strength of their effects. */
  readonly hazards: number;
  /** Factor of the points: the stars reward daring. */
  readonly score: number;
  /** The chain slows near the hole, the danger cues playing (the grace zone, v1.8.0). */
  readonly grace: boolean;
}

export const DIFFICULTY_RULES: Readonly<Record<Difficulty, DifficultyRule>> = {
  explorer: { speed: 0.85, hazards: 0.6, score: 0.8, grace: true },
  pilot: { speed: 1, hazards: 1, score: 1, grace: true },
  legend: { speed: 1.15, hazards: 1.5, score: 1.3, grace: false },
};

export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
