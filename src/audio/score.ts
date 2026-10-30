/**
 * The music of the game as data (specification § 3.5): one theme per world
 * and one for the menus, each a short loop of chords with a bass line, an
 * arpeggio and drums, written on a grid of sixteen steps per bar. `eventsAt`
 * turns a step into the notes to play; the player (MusicPlayer) renders them
 * with Web Audio. Pure, so it can be tested without a sound card.
 */

export type MusicThemeId =
  'title' | 'nebula' | 'neon' | 'abyss' | 'jewel' | 'volcano' | 'singularity';

/** One bar's pattern: sixteen steps, 0 = rest; otherwise how loud (0 to 1). */
type Pattern = readonly number[];

export interface MusicTheme {
  readonly bpm: number;
  /** Key, in hertz (the bass plays it an octave down). */
  readonly root: number;
  /** One chord per bar, as semitones above the root; the loop repeats them. */
  readonly chords: readonly (readonly number[])[];
  readonly pad: { readonly wave: OscillatorType; readonly level: number; readonly bright: number };
  readonly bass: {
    readonly wave: OscillatorType;
    readonly pattern: Pattern;
    readonly level: number;
  };
  /** The arpeggio climbs the chord, `octave` octaves above the pad. */
  readonly arp: {
    readonly pattern: Pattern;
    readonly octave: number;
    readonly level: number;
    readonly glass: boolean;
  };
  readonly kick: Pattern;
  readonly snare: Pattern;
  readonly hat: Pattern;
  /** Toms (Volcano). */
  readonly tom?: Pattern;
}

const _ = 0;
const x = 1;
const o = 0.6;
const s = 0.35;

/** Patterns written out, one character per step, for readability below. */
const p = (...steps: readonly number[]): Pattern => {
  if (steps.length !== 16) throw new Error('A bar has sixteen steps');
  return steps;
};

export const THEMES: Readonly<Record<MusicThemeId, MusicTheme>> = {
  // The menus: slow and wide, a dream of space.
  title: {
    bpm: 76,
    root: 146.83,
    chords: [
      [0, 3, 7, 10],
      [-4, 0, 3, 7],
      [3, 7, 10, 14],
      [-2, 2, 5, 9],
    ],
    pad: { wave: 'triangle', level: 0.16, bright: 1400 },
    bass: { wave: 'sine', pattern: p(x, _, _, _, _, _, _, _, o, _, _, _, _, _, _, _), level: 0.3 },
    arp: {
      pattern: p(o, _, s, _, o, _, s, _, o, _, s, _, o, _, s, _),
      octave: 2,
      level: 0.07,
      glass: true,
    },
    kick: p(o, _, _, _, _, _, _, _, s, _, _, _, _, _, _, _),
    snare: p(_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _),
    hat: p(_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _),
  },
  // Nebula: dreamy and luminous, a soft pulse.
  nebula: {
    bpm: 92,
    root: 146.83,
    chords: [
      [0, 3, 7, 10],
      [5, 8, 12, 15],
      [-4, 0, 3, 7],
      [-2, 2, 5, 9],
    ],
    pad: { wave: 'triangle', level: 0.13, bright: 1800 },
    bass: { wave: 'sine', pattern: p(x, _, _, _, _, _, o, _, x, _, _, _, _, _, o, _), level: 0.3 },
    arp: {
      pattern: p(o, s, o, s, o, s, o, s, o, s, o, s, o, s, o, s),
      octave: 2,
      level: 0.06,
      glass: true,
    },
    kick: p(x, _, _, _, _, _, _, _, x, _, _, _, _, _, _, _),
    snare: p(_, _, _, _, s, _, _, _, _, _, _, _, s, _, _, _),
    hat: p(_, _, s, _, _, _, s, _, _, _, s, _, _, _, s, _),
  },
  // Neon: synthwave, four on the floor.
  neon: {
    bpm: 112,
    root: 110,
    chords: [
      [0, 3, 7, 12],
      [-4, 0, 3, 8],
      [3, 7, 10, 15],
      [-2, 2, 5, 10],
    ],
    pad: { wave: 'sawtooth', level: 0.07, bright: 1600 },
    bass: {
      wave: 'sawtooth',
      pattern: p(x, _, o, _, x, _, o, _, x, _, o, _, x, _, o, _),
      level: 0.18,
    },
    arp: {
      pattern: p(o, _, o, s, _, o, _, s, o, _, o, s, _, o, _, s),
      octave: 1,
      level: 0.06,
      glass: false,
    },
    kick: p(x, _, _, _, x, _, _, _, x, _, _, _, x, _, _, _),
    snare: p(_, _, _, _, x, _, _, _, _, _, _, _, x, _, _, _),
    hat: p(_, _, o, _, _, _, o, _, _, _, o, _, _, _, o, _),
  },
  // Abyss: deep and slow, sonar pings, no drums.
  abyss: {
    bpm: 64,
    root: 130.81,
    chords: [
      [0, 3, 7, 14],
      [-4, 0, 3, 7],
      [3, 7, 10, 14],
      [-2, 2, 5, 10],
    ],
    pad: { wave: 'sine', level: 0.2, bright: 900 },
    bass: { wave: 'sine', pattern: p(x, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _), level: 0.32 },
    arp: {
      pattern: p(o, _, _, _, _, _, _, _, _, _, s, _, _, _, _, _),
      octave: 2,
      level: 0.09,
      glass: true,
    },
    kick: p(_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _),
    snare: p(_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _),
    hat: p(_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _),
  },
  // Jewel: bright and glassy, lydian.
  jewel: {
    bpm: 96,
    root: 164.81,
    chords: [
      [0, 4, 7, 11],
      [2, 6, 9, 13],
      [-3, 0, 4, 7],
      [5, 9, 12, 16],
    ],
    pad: { wave: 'triangle', level: 0.11, bright: 2400 },
    bass: {
      wave: 'triangle',
      pattern: p(x, _, _, _, _, _, _, o, _, _, x, _, _, _, _, _),
      level: 0.26,
    },
    arp: {
      pattern: p(o, s, s, o, s, s, o, s, o, s, s, o, s, s, o, s),
      octave: 2,
      level: 0.06,
      glass: true,
    },
    kick: p(x, _, _, _, _, _, _, _, _, _, x, _, _, _, _, _),
    snare: p(_, _, _, _, s, _, _, _, _, _, _, _, s, _, _, _),
    hat: p(s, _, s, _, s, _, s, _, s, _, s, _, s, _, s, _),
  },
  // Volcano: heavy, toms and a driving bass.
  volcano: {
    bpm: 100,
    root: 82.41,
    chords: [
      [0, 3, 7, 12],
      [-4, -1, 3, 8],
      [-2, 2, 5, 10],
      [-5, -1, 2, 7],
    ],
    pad: { wave: 'sawtooth', level: 0.06, bright: 1100 },
    bass: {
      wave: 'sawtooth',
      pattern: p(x, _, x, _, o, _, x, _, x, _, x, _, o, _, x, _),
      level: 0.16,
    },
    arp: {
      pattern: p(o, _, _, s, _, _, o, _, _, s, _, _, o, _, s, _),
      octave: 2,
      level: 0.05,
      glass: false,
    },
    kick: p(x, _, _, _, _, _, x, _, x, _, _, _, _, _, _, _),
    snare: p(_, _, _, _, x, _, _, _, _, _, _, _, x, _, _, _),
    hat: p(_, _, s, _, _, _, s, _, _, _, s, _, _, _, s, _),
    tom: p(_, _, _, o, _, _, _, _, _, _, o, _, _, o, _, o),
  },
  // Singularity: vast, slow-breathing pads around a heartbeat kick.
  singularity: {
    bpm: 84,
    root: 92.5,
    chords: [
      [0, 3, 7, 10, 14],
      [-4, 0, 3, 7, 10],
      [3, 7, 10, 15],
      [-2, 2, 5, 9],
    ],
    pad: { wave: 'sawtooth', level: 0.07, bright: 1300 },
    bass: { wave: 'sine', pattern: p(x, _, _, _, _, _, _, _, x, _, _, o, _, _, _, _), level: 0.34 },
    arp: {
      pattern: p(o, _, s, _, _, _, o, _, s, _, _, _, o, _, s, _),
      octave: 2,
      level: 0.06,
      glass: true,
    },
    kick: p(x, _, _, o, _, _, _, _, x, _, _, o, _, _, _, _),
    snare: p(_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _),
    hat: p(_, _, _, _, s, _, _, _, _, _, _, _, s, _, _, _),
  },
};

/** What one step of a theme plays. Frequencies in hertz, loudness 0 to 1. */
export interface StepEvents {
  /** A new chord starts (first step of a bar): the pad notes and the bar's length. */
  readonly pad: { readonly notes: readonly number[]; readonly seconds: number } | null;
  readonly bass: { readonly note: number; readonly level: number } | null;
  readonly arp: { readonly note: number; readonly level: number } | null;
  readonly kick: number;
  readonly snare: number;
  readonly hat: number;
  readonly tom: number;
}

export const STEPS_PER_BAR = 16;

/** Seconds of one step (a sixteenth note). */
export const stepSeconds = (theme: MusicTheme): number => 60 / theme.bpm / 4;

const pitch = (root: number, semitones: number) => root * 2 ** (semitones / 12);

/** A note of a motif: when it starts (seconds from the motif's start), its pitch, how long it rings. */
export interface MotifNote {
  readonly at: number;
  readonly frequency: number;
  readonly seconds: number;
}

/** A theme in a minor key (all but the lydian Jewel): its first chord has a minor third. */
export const isMinor = (theme: MusicTheme): boolean => theme.chords[0]?.[1] === 3;

/** The lowest root of a defeat's motif: it sings in the middle of the keyboard. */
const MOTIF_FLOOR = 280;
/** Seconds between the notes of a defeat's motif, and how long its last one rings. */
const FALL_GAP = 0.2;
const FALL_LAST = 0.95;

/**
 * A defeat's motif (v1.8.1, spec § 3.17): four notes falling to the root of
 * the key, from the fifth through the third (minor or major, as the world's
 * theme) and the second; an octave between 280 and 560 Hz, whatever the
 * theme's own; the last note rings on.
 */
export function defeatMotif(root: number, minor = true): readonly MotifNote[] {
  let tonic = root;
  while (tonic < MOTIF_FLOOR) tonic *= 2;
  while (tonic >= MOTIF_FLOOR * 2) tonic /= 2;
  const steps = [7, minor ? 3 : 4, 2, 0];
  return steps.map((step, index) => ({
    at: index * FALL_GAP,
    frequency: pitch(tonic, step),
    seconds: index === steps.length - 1 ? FALL_LAST : FALL_GAP * 1.6,
  }));
}

/**
 * The notes of step `step` (counted from the start of the loop; the loop
 * repeats). `intensity` (0 to 1) brings in the drums of calmer themes when
 * the chain nears the hole.
 */
export function eventsAt(theme: MusicTheme, step: number, intensity = 0): StepEvents {
  const inBar = ((step % STEPS_PER_BAR) + STEPS_PER_BAR) % STEPS_PER_BAR;
  const bar = Math.floor(step / STEPS_PER_BAR);
  const chord =
    theme.chords[((bar % theme.chords.length) + theme.chords.length) % theme.chords.length]!;
  const bassLevel = theme.bass.pattern[inBar] ?? 0;
  const arpLevel = theme.arp.pattern[inBar] ?? 0;
  // The arpeggio climbs the chord tones, one per step it plays.
  const arpIndex = theme.arp.pattern.slice(0, inBar).filter((level) => level > 0).length;
  const tension = Math.max(0, Math.min(1, intensity));
  return {
    pad:
      inBar === 0
        ? {
            notes: chord.map((semitones) => pitch(theme.root, semitones)),
            seconds: stepSeconds(theme) * STEPS_PER_BAR,
          }
        : null,
    bass: bassLevel > 0 ? { note: pitch(theme.root / 2, chord[0]!), level: bassLevel } : null,
    arp:
      arpLevel > 0
        ? {
            note: pitch(theme.root * 2 ** theme.arp.octave, chord[arpIndex % chord.length]!),
            level: arpLevel,
          }
        : null,
    kick: Math.max(theme.kick[inBar] ?? 0, tension > 0.5 && inBar % 4 === 0 ? tension * 0.7 : 0),
    snare: theme.snare[inBar] ?? 0,
    hat: Math.max(theme.hat[inBar] ?? 0, tension > 0 && inBar % 2 === 1 ? tension * 0.4 : 0),
    tom: theme.tom?.[inBar] ?? 0,
  };
}
