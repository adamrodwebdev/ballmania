export interface RhythmSetup {
  /** Beats per minute of the music. */
  readonly bpm: number;
  /** A shot this close to a beat (in beats, on either side) is on the beat. */
  readonly window: number;
}

/** Highest groove multiplier. */
export const MAX_GROOVE = 4;

/** Speed factor of the chain right after a beat, and between beats. */
const PULSE_PEAK = 2;
const PULSE_FLOOR = 0.25;
/** Share of the beat the surge lasts. */
const PULSE_SPAN = 0.4;
/** Average of the raw pulse over a beat, so the chain keeps its nominal speed. */
const PULSE_AVERAGE = PULSE_FLOOR + ((PULSE_PEAK - PULSE_FLOOR) * PULSE_SPAN) / 2;

/**
 * The music's clock (Rhythm mode): the chain surges forward on every beat and
 * nearly stops before the next one, and shots fired on the beat feed the
 * groove. Everything derives from the game's elapsed time, so the
 * simulation stays reproducible.
 */
export class Tempo {
  constructor(readonly setup: RhythmSetup) {}

  /** Seconds per beat. */
  get beat(): number {
    return 60 / this.setup.bpm;
  }

  /** Beats since the start, with the fraction of the current one. */
  beats(elapsed: number): number {
    return elapsed / this.beat;
  }

  /** How far into the current beat, from 0 (on it) to 1. */
  phase(elapsed: number): number {
    const beats = this.beats(elapsed);
    return beats - Math.floor(beats);
  }

  /** Speed factor of the chain at this moment; it averages 1 over a beat. */
  pulse(elapsed: number): number {
    const surge = Math.max(0, 1 - this.phase(elapsed) / PULSE_SPAN);
    return (PULSE_FLOOR + (PULSE_PEAK - PULSE_FLOOR) * surge) / PULSE_AVERAGE;
  }

  /** True if a shot now lands on the beat, early or late within the window. */
  onBeat(elapsed: number): boolean {
    const phase = this.phase(elapsed);
    return Math.min(phase, 1 - phase) <= this.setup.window;
  }
}

/**
 * The groove multiplier: every two shots in a row on the beat raise it by
 * one, up to ×4; a shot off the beat brings it back to ×1.
 */
export class Groove {
  private streak = 0;

  get multiplier(): number {
    return 1 + Math.min(MAX_GROOVE - 1, Math.floor(this.streak / 2));
  }

  shot(onBeat: boolean): void {
    this.streak = onBeat ? this.streak + 1 : 0;
  }
}
