import type { RandomSource } from '@/engine/core/Random';

export interface NoiseOptions {
  /** Lattice cells across the longer side, for the first octave. */
  readonly cells: number;
  /** Octaves added, each twice as fine and half as strong as the one before. */
  readonly octaves: number;
  readonly random: RandomSource;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Fractal value noise on a small grid: the soft texture of the nebula's wisps
 * (specification § 3.5), painted once, then stretched over the screen.
 * `width × height` values in [0, 1], row by row; the same source gives the
 * same clouds.
 */
export function fractalNoise(width: number, height: number, options: NoiseOptions): Float32Array {
  const values = new Float32Array(width * height);
  const long = Math.max(width, height);
  let amplitude = 1;
  let total = 0;
  for (let octave = 0; octave < options.octaves; octave++) {
    const cells = options.cells * 2 ** octave;
    const step = long / cells;
    const columns = Math.ceil(width / step) + 2;
    const rows = Math.ceil(height / step) + 2;
    const lattice = Float32Array.from({ length: columns * rows }, () => options.random.next());
    for (let y = 0; y < height; y++) {
      const gy = y / step;
      const row = Math.floor(gy);
      const ty = smooth(gy - row);
      for (let x = 0; x < width; x++) {
        const gx = x / step;
        const column = Math.floor(gx);
        const tx = smooth(gx - column);
        const at = row * columns + column;
        const top = lattice[at]! + (lattice[at + 1]! - lattice[at]!) * tx;
        const bottom =
          lattice[at + columns]! + (lattice[at + columns + 1]! - lattice[at + columns]!) * tx;
        values[y * width + x]! += (top + (bottom - top) * ty) * amplitude;
      }
    }
    total += amplitude;
    amplitude /= 2;
  }
  for (let i = 0; i < values.length; i++) values[i] = values[i]! / total;
  return values;
}
