import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@/engine/core/Random';
import { fractalNoise } from '@/play/themes/noise';

const texture = (seed: number) =>
  fractalNoise(64, 36, { cells: 4, octaves: 4, random: new SeededRandom(seed) });

describe('fractalNoise', () => {
  it('fills the grid with values between 0 and 1, the same for the same seed', () => {
    const noise = texture(7);
    expect(noise).toHaveLength(64 * 36);
    for (const value of noise) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(texture(7)).toEqual(noise);
    expect(texture(8)).not.toEqual(noise);
  });

  it('is soft: clouds, not static', () => {
    const noise = texture(7);
    const mean = noise.reduce((sum, value) => sum + value, 0) / noise.length;
    const spread = Math.sqrt(noise.reduce((sum, v) => sum + (v - mean) ** 2, 0) / noise.length);
    expect(spread).toBeGreaterThan(0.05);
    let jump = 0;
    for (let y = 0; y < 36; y++) {
      for (let x = 1; x < 64; x++) {
        jump = Math.max(jump, Math.abs(noise[y * 64 + x]! - noise[y * 64 + x - 1]!));
      }
    }
    expect(jump).toBeLessThan(0.25);
  });
});
