import { EFFECT_LEVELS, type EffectLevel } from '@/services/SettingsService';

/**
 * How much spectacle a device and a player get (specification § 3.5). The
 * level is the player's choice; `prefers-reduced-motion` then removes every
 * effect that moves the whole screen: shaking, slow motion and distortion.
 */
export class EffectProfile {
  private constructor(
    readonly level: EffectLevel,
    readonly reducedMotion: boolean,
    /** Glass shards thrown by each destroyed ball. */
    readonly shardsPerBall: number,
    /** Light streaks thrown by each destroyed ball. */
    readonly sparksPerBall: number,
    /** Electric arcs between the balls of a group while they crack. */
    readonly lightning: boolean,
    /** Additive halo of light where a ball bursts. */
    readonly glow: boolean,
    /** Largest screen shake, in board units (0 = none). */
    readonly shake: number,
    readonly slowMotion: boolean,
    /** Shock waves that bend the picture (WebGL2). */
    readonly distortion: boolean,
    /** Upper bound of live particles, to protect modest phones. */
    readonly maxParticles: number,
  ) {}

  static for(level: EffectLevel, reducedMotion: boolean): EffectProfile {
    const base = EffectProfile.LEVELS[level];
    if (!reducedMotion) return base;
    return new EffectProfile(
      base.level,
      true,
      base.shardsPerBall,
      base.sparksPerBall,
      base.lightning,
      base.glow,
      0,
      false,
      false,
      base.maxParticles,
    );
  }

  /** The next level down, used when the frame rate drops; null at the bottom. */
  lowered(): EffectProfile | null {
    const index = EFFECT_LEVELS.indexOf(this.level);
    const lower = EFFECT_LEVELS[index + 1];
    return lower ? EffectProfile.for(lower, this.reducedMotion) : null;
  }

  private static readonly LEVELS: Record<EffectLevel, EffectProfile> = {
    spectacular: new EffectProfile('spectacular', false, 12, 10, true, true, 16, true, true, 900),
    balanced: new EffectProfile('balanced', false, 7, 5, true, true, 9, true, false, 400),
    subtle: new EffectProfile('subtle', false, 4, 0, false, false, 0, false, false, 150),
  };
}
