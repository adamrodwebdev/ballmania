type Vibrate = (pattern: number | number[]) => boolean;

/** Vibration patterns (milliseconds): they grow with the event, like the visuals. */
export const PATTERNS = {
  explosion: (depth: number): number[] => [Math.min(15 + 10 * (depth - 1), 60)],
  reaction: (depth: number): number[] => (depth >= 3 ? [25, 30, 40, 30, 60] : [25, 30, 40]),
  shot: [8],
  powerShot: [18, 20, 30],
  win: [30, 40, 30, 40, 140],
  lose: [90, 60, 220],
  /** A launcher bought and worn (v1.8.0): the tap, then the ring. */
  equip: [12, 300, 30],
} as const;

/**
 * Vibrations on phones that support them, when the player allows them.
 * Browsers without the Vibration API (iOS Safari, desktops) do nothing.
 */
export class Haptics {
  private enabled: boolean;

  constructor(
    enabled: boolean,
    private readonly vibrate: Vibrate | null = typeof navigator !== 'undefined' &&
    'vibrate' in navigator
      ? (pattern) => navigator.vibrate(pattern)
      : null,
  ) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  explosion(depth: number): void {
    this.play(depth >= 2 ? PATTERNS.reaction(depth) : PATTERNS.explosion(depth));
  }

  /** A light tap on every shot, a stronger one for a powered shot. */
  shot(powered: boolean): void {
    this.play([...(powered ? PATTERNS.powerShot : PATTERNS.shot)]);
  }

  win(): void {
    this.play([...PATTERNS.win]);
  }

  lose(): void {
    this.play([...PATTERNS.lose]);
  }

  equip(): void {
    this.play([...PATTERNS.equip]);
  }

  private play(pattern: number[]): void {
    if (!this.enabled || !this.vibrate) return;
    try {
      this.vibrate(pattern);
    } catch {
      // Some browsers refuse vibrations outside a gesture: never mind.
    }
  }
}
