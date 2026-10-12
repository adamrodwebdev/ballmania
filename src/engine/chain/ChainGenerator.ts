import type { RandomSource } from '../core/Random';
import type { Tone } from './Ball';

export interface ChainRecipe {
  readonly length: number;
  /** Number of colours used, from the first ones of the palette. */
  readonly tones: number;
  /** Chance that a ball repeats the colour of the previous one, in [0, 1). */
  readonly repeatChance: number;
}

/**
 * Draws the colours of a new chain. Runs are capped at `minMatch - 1` balls,
 * so that every explosion is the player's doing, never a leftover of the draw.
 */
export class ChainGenerator {
  constructor(
    private readonly random: RandomSource,
    private readonly minMatch: number,
  ) {}

  tones(recipe: ChainRecipe): Tone[] {
    if (recipe.tones < 2) throw new RangeError('A chain needs at least two colours');
    const tones: Tone[] = [];
    let run = 0;
    for (let i = 0; i < recipe.length; i++) {
      const previous = tones[i - 1];
      const repeat =
        previous !== undefined &&
        run < this.minMatch - 1 &&
        this.random.next() < recipe.repeatChance;
      if (repeat) {
        tones.push(previous);
        run++;
      } else {
        tones.push(this.other(previous, recipe.tones));
        run = 1;
      }
    }
    return tones;
  }

  /** A colour different from `previous` (any colour when there is none). */
  private other(previous: Tone | undefined, count: number): Tone {
    if (previous === undefined) return this.random.nextInt(count);
    const tone = this.random.nextInt(count - 1);
    return tone >= previous ? tone + 1 : tone;
  }
}
