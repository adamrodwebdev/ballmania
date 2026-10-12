import type { RandomSource } from '../core/Random';
import type { Tone } from './Ball';

export interface ChainRecipe {
  readonly length: number;
  /** Number of colours used, from the first ones of the palette. */
  readonly tones: number;
  /** Chance that a ball repeats the colour of the previous one, in [0, 1). */
  readonly repeatChance: number;
  /** The colours to draw from, instead of the first `tones` ones (Jewel world). */
  readonly palette?: readonly Tone[];
  /**
   * Colours that always come as a pair (Jewel world: mixed colours, so that one
   * fusion next to them completes a group of three).
   */
  readonly paired?: readonly Tone[];
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
    const palette = recipe.palette ?? Array.from({ length: recipe.tones }, (_, tone) => tone);
    if (palette.length < 2) throw new RangeError('A chain needs at least two colours');
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
        const tone = this.other(previous, palette);
        tones.push(tone);
        run = 1;
        if (recipe.paired?.includes(tone) && this.minMatch > 2 && i + 1 < recipe.length) {
          tones.push(tone);
          run = 2;
          i++;
        }
      }
    }
    return tones;
  }

  /** A colour of the palette different from `previous` (any colour when there is none). */
  private other(previous: Tone | undefined, palette: readonly Tone[]): Tone {
    const choices = palette.filter((tone) => tone !== previous);
    return choices[this.random.nextInt(choices.length)]!;
  }
}
