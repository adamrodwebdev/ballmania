/** Source of randomness, injected so that a seed replays the exact same game. */
export interface RandomSource {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, max). */
  nextInt(max: number): number;
}

/** Mulberry32: tiny, fast and good enough for drawing ball colours. */
export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  static fromString(text: string): SeededRandom {
    // FNV-1a: stable string hash, so a date string always gives the same seed.
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return new SeededRandom(hash);
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}
