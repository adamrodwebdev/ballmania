import type { RandomSource } from '../core/Random';

/** The three kinds of weather (specification § 3.9). */
export type WeatherKind = 'solar' | 'cold' | 'wind';

export interface WeatherSetup {
  /** Kinds of weather the level knows, taken in turn. */
  readonly kinds: readonly WeatherKind[];
  /** Seconds of calm between two episodes, on average. */
  readonly every: number;
  /** Seconds an episode lasts. */
  readonly duration: number;
  /** How marked the effects are (1 = reference; the difficulty scales it). */
  readonly strength: number;
}

/** The hazards of a level: they change the board while the player plays (§ 3.9). */
export interface HazardSetup {
  /** Seconds between two balls falling from the sky, on average. */
  readonly meteors?: number;
  /** The chain speeds up and slows down by irregular cycles. */
  readonly arrhythmia?: { readonly amplitude: number; readonly period: number };
  readonly weather?: WeatherSetup;
}

/**
 * Arrhythmia: the chain's pace swings above and below normal by irregular
 * cycles (two waves of unrelated periods), which no rule of thumb can follow.
 */
export class Arrhythmia {
  constructor(readonly setup: { readonly amplitude: number; readonly period: number }) {}

  /** Speed factor of the chain at this moment. */
  pace(elapsed: number): number {
    const { amplitude, period } = this.setup;
    const wave =
      0.65 * Math.sin((elapsed / period) * Math.PI * 2) +
      0.35 * Math.sin((elapsed / (period * 0.37)) * Math.PI * 2 + 1.3);
    return Math.max(0.2, 1 + amplitude * wave);
  }
}

/** Seconds between the shadow of a falling ball and its landing. */
export const METEOR_WARNING = 1;

/** Decides when the next ball falls from the sky: every few seconds, never quite regularly. */
export class MeteorShower {
  private wait: number;

  constructor(
    private readonly every: number,
    private readonly random: RandomSource,
  ) {
    this.wait = this.next();
  }

  /** True when it is time for a ball to start falling. */
  update(dt: number): boolean {
    this.wait -= dt;
    if (this.wait > 0) return false;
    this.wait = this.next();
    return true;
  }

  private next(): number {
    return this.every * (0.7 + 0.6 * this.random.next());
  }
}

/** The weather now: its kind, the seconds left, and the wind's direction (−1 or 1). */
export interface WeatherEpisode {
  readonly kind: WeatherKind;
  readonly duration: number;
  left: number;
  readonly direction: 1 | -1;
  /** A massive gust swaps balls when it starts. */
  readonly massive: boolean;
}

/**
 * The weather of a level: calm, then an episode of one of its kinds, in
 * turn, then calm again. Pure timing: the game applies the effects.
 */
export class Weather {
  private calm: number;
  private turn = 0;
  private episode: WeatherEpisode | null = null;

  constructor(
    readonly setup: WeatherSetup,
    private readonly random: RandomSource,
  ) {
    this.calm = this.setup.every * (0.8 + 0.4 * this.random.next());
  }

  get current(): WeatherEpisode | null {
    return this.episode;
  }

  /** Advances the weather; returns the episode that started or ended this step, if any. */
  update(
    dt: number,
    durationFactor = 1,
  ): { readonly started?: WeatherEpisode; readonly ended?: WeatherEpisode } {
    if (this.episode) {
      this.episode.left -= dt;
      if (this.episode.left > 0) return {};
      const ended = this.episode;
      this.episode = null;
      this.calm = this.setup.every * (0.8 + 0.4 * this.random.next());
      return { ended };
    }
    this.calm -= dt;
    if (this.calm > 0 || this.setup.kinds.length === 0) return {};
    const kind = this.setup.kinds[this.turn++ % this.setup.kinds.length]!;
    const duration = this.setup.duration * durationFactor;
    this.episode = {
      kind,
      duration,
      left: duration,
      direction: this.random.next() < 0.5 ? -1 : 1,
      massive: kind === 'wind' && this.random.next() < 0.3 * this.setup.strength,
    };
    return { started: this.episode };
  }
}
