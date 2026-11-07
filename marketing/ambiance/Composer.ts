import { THEMES, type MusicTheme } from '@/audio/score';
import { SeededRandom, type RandomSource } from '@/engine/core/Random';
import type { Mood, MoodArc, VoiceId } from './Mood';

/**
 * The plan of an ambience (specification § 3.18): from a mood and a seed,
 * the sections of the video, each with its chords, voices, density,
 * brightness, energy and camera shot. Pure: the same mood and seed always
 * give the same plan, and nothing here makes a sound.
 */

export type Voicing = 'close' | 'open' | 'octave';
export const VOICINGS: readonly Voicing[] = ['close', 'open', 'octave'];
/** What a section feels like: it picks the colour grade of the picture. */
export type SectionKind = 'calm' | 'bright' | 'deep';
/** The camera move of a section's shot (the picture's cut follows the music's). */
export type Shot = 'wide' | 'push' | 'travel' | 'rise' | 'dive' | 'orbit';
export const SHOTS: readonly Shot[] = ['wide', 'push', 'travel', 'rise', 'dive', 'orbit'];

export type Chord = readonly number[];

export interface Section {
  readonly index: number;
  /** Seconds from the start of the video. */
  readonly start: number;
  readonly seconds: number;
  readonly bars: number;
  /** Seconds this section takes to cross-fade from the one before (none for the first). */
  readonly crossfade: number;
  readonly progression: string;
  readonly chords: readonly Chord[];
  /** Semitones the whole section is moved by, from the theme's key. */
  readonly shift: number;
  readonly voicing: Voicing;
  readonly voices: readonly VoiceId[];
  readonly density: number;
  /** Hertz: the pads' low-pass cut-off. */
  readonly brightness: number;
  /** 0 to 1: how rich the music and the picture are. */
  readonly energy: number;
  readonly kind: SectionKind;
  readonly shot: Shot;
}

export interface Plan {
  readonly mood: string;
  readonly seed: number;
  readonly seconds: number;
  readonly bpm: number;
  readonly barSeconds: number;
  /** The theme's key, in hertz. */
  readonly root: number;
  readonly sections: readonly Section[];
}

/** The minutes at the start that must hold the viewer: the richest. */
export const OPENING = 180;
/** Cross-fade between sections, in seconds. */
const CROSSFADE = { min: 8, max: 15 } as const;

const MINOR_IV: Chord = [5, 8, 12, 15];
const MAJOR_IV: Chord = [5, 9, 12, 16];
const FLAT_SIX: Chord = [-4, 0, 3, 7];

/** The progressions a section may play, from the theme's own four chords. */
export function progressions(theme: MusicTheme): ReadonlyMap<string, readonly Chord[]> {
  const base = theme.chords;
  const rotate = (by: number) => base.map((_, i) => base[(i + by) % base.length]!);
  const replace = (at: number, chord: Chord) => base.map((c, i) => (i === at ? chord : c));
  const minor = base[0]?.[1] === 3;
  return new Map<string, readonly Chord[]>([
    ['base', base],
    ['rotate-1', rotate(1)],
    ['rotate-2', rotate(2)],
    ['rotate-3', rotate(3)],
    ['back', [...base].reverse()],
    ['borrowed-iv', replace(2, minor ? MINOR_IV : MAJOR_IV)],
    ['borrowed-bvi', replace(1, FLAT_SIX)],
    ['pedal', [base[0]!, base[1]!, base[0]!, base[2]!]],
  ]);
}

/** The energy the arc asks for at `t` seconds of a video lasting `total`. */
export function arcEnergy(arc: MoodArc, t: number, total: number): number {
  switch (arc) {
    case 'steady':
      return 0.8;
    case 'breathing':
      return 0.65 + 0.25 * Math.cos((2 * Math.PI * t) / 750);
    case 'descending': {
      if (t <= OPENING) return 1;
      const floor = Math.max(OPENING + 1, total / 2);
      if (t >= floor) return 0.5;
      return 1 - (0.5 * (t - OPENING)) / (floor - OPENING);
    }
  }
}

const kindOf = (energy: number): SectionKind =>
  energy >= 0.78 ? 'bright' : energy <= 0.55 ? 'deep' : 'calm';

const pitchClasses = (chord: Chord, shift: number) =>
  new Set(chord.map((s) => (((s + shift) % 12) + 12) % 12));

const shareTone = (a: Chord, aShift: number, b: Chord, bShift: number) => {
  const left = pitchClasses(a, aShift);
  return [...pitchClasses(b, bShift)].some((pc) => left.has(pc));
};

/** Section lengths in whole bars, summing to the video's length. */
function lengths(mood: Mood, total: number, bar: number, random: RandomSource): readonly number[] {
  const { min, max } = mood.sections;
  if (total <= min) return [total];
  const most = Math.max(1, Math.floor(total / min));
  const least = Math.min(most, Math.ceil(total / max));
  const count = Math.min(most, Math.max(least, Math.round(total / ((min + max) / 2))));
  const weights = Array.from({ length: count }, () => 0.75 + 0.5 * random.next());
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => Math.min(max, Math.max(min, (w / sum) * total)));
  const out: number[] = [];
  let used = 0;
  raw.forEach((seconds, i) => {
    if (i === raw.length - 1) {
      out.push(total - used);
    } else {
      const whole = Math.max(bar, Math.round(seconds / bar) * bar);
      out.push(whole);
      used += whole;
    }
  });
  return out;
}

interface Choice {
  readonly progression: string;
  readonly shift: number;
  readonly voicing: Voicing;
  readonly voices: readonly VoiceId[];
  readonly density: number;
  readonly brightness: number;
}

const differences = (a: Choice, b: Choice): number =>
  Number(a.progression !== b.progression || a.shift !== b.shift) +
  Number(a.voicing !== b.voicing) +
  Number(a.voices.join() !== b.voices.join()) +
  Number(Math.round(a.density * 4) !== Math.round(b.density * 4)) +
  Number(Math.round(a.brightness / 250) !== Math.round(b.brightness / 250));

const SHIFTS = [0, 0, 0, 5, -5, 7, -2, 2, 3, -3];

/** The composer: turns a mood and a seed into a plan. */
export class Composer {
  private readonly theme: MusicTheme;
  private readonly progressions: ReadonlyMap<string, readonly Chord[]>;

  constructor(private readonly mood: Mood) {
    this.theme = THEMES[mood.theme];
    this.progressions = progressions(this.theme);
  }

  plan(seconds: number, seed: number): Plan {
    const random = new SeededRandom(seed);
    const barSeconds = (4 * 60) / this.mood.bpm;
    const sizes = lengths(this.mood, seconds, barSeconds, random);
    const sections: Section[] = [];
    let start = 0;
    let previous: Choice | null = null;
    let first: Choice | null = null;
    sizes.forEach((size, index) => {
      const middle = start + size / 2;
      const energy = Math.min(
        1,
        Math.max(0.3, arcEnergy(this.mood.arc, middle, seconds) + (random.next() - 0.5) * 0.12),
      );
      const last = index === sizes.length - 1 && index > 0;
      const choice: Choice =
        first && last ? first : this.choose(random, energy, previous, index === 0);
      first ??= choice;
      const shot = this.shot(random, sections[sections.length - 1]?.shot);
      sections.push({
        index,
        start,
        seconds: size,
        bars: Math.max(1, Math.round(size / barSeconds)),
        crossfade:
          index === 0 ? 0 : CROSSFADE.min + random.next() * (CROSSFADE.max - CROSSFADE.min),
        progression: choice.progression,
        chords: this.progressions.get(choice.progression)!,
        shift: choice.shift,
        voicing: choice.voicing,
        voices: choice.voices,
        density: choice.density,
        brightness: choice.brightness,
        energy,
        kind: kindOf(energy),
        shot,
      });
      previous = choice;
      start += size;
    });
    return {
      mood: this.mood.id,
      seed,
      seconds,
      bpm: this.mood.bpm,
      barSeconds,
      root: this.theme.root,
      sections,
    };
  }

  private choose(
    random: RandomSource,
    energy: number,
    previous: Choice | null,
    opening: boolean,
  ): Choice {
    const ids = [...this.progressions.keys()];
    let best: Choice | null = null;
    for (let attempt = 0; attempt < 24; attempt++) {
      const progression = opening ? 'base' : ids[random.nextInt(ids.length)]!;
      const shift = opening ? 0 : this.shift(random, progression, previous);
      const candidate: Choice = {
        progression,
        shift,
        voicing: VOICINGS[random.nextInt(VOICINGS.length)]!,
        voices: this.voices(random, energy, opening),
        density: this.mood.intensity * (0.45 + 0.55 * energy) * (0.85 + 0.3 * random.next()),
        brightness:
          this.mood.brightness.min +
          (this.mood.brightness.max - this.mood.brightness.min) *
            Math.min(1, energy * (0.8 + 0.3 * random.next())),
      };
      if (!previous || differences(candidate, previous) >= 2) return candidate;
      best = candidate;
    }
    // Twenty-four draws alike: force two changes.
    const forced = best!;
    return {
      ...forced,
      voicing: VOICINGS[(VOICINGS.indexOf(previous!.voicing) + 1) % VOICINGS.length]!,
      progression: previous!.progression === 'rotate-1' ? 'rotate-2' : 'rotate-1',
    };
  }

  /** A key move that keeps a note in common between the two sections' meeting chords. */
  private shift(random: RandomSource, progression: string, previous: Choice | null): number {
    if (!previous) return 0;
    const before = this.progressions.get(previous.progression)!;
    const meeting = before[before.length - 1]!;
    const next = this.progressions.get(progression)![0]!;
    for (let attempt = 0; attempt < 8; attempt++) {
      const shift = SHIFTS[random.nextInt(SHIFTS.length)]!;
      if (
        Math.abs(shift - previous.shift) <= 7 &&
        shareTone(meeting, previous.shift, next, shift)
      ) {
        return shift;
      }
    }
    return previous.shift;
  }

  private voices(random: RandomSource, energy: number, opening: boolean): readonly VoiceId[] {
    return this.mood.voices.filter((voice) => {
      if (voice === 'pad') return true;
      if (opening) return true;
      if (voice === 'drone') return random.next() < 0.8;
      if (voice === 'bass') return random.next() < 0.7;
      return random.next() < 0.35 + 0.5 * energy;
    });
  }

  private shot(random: RandomSource, before: Shot | undefined): Shot {
    const choices = SHOTS.filter((shot) => shot !== before);
    return choices[random.nextInt(choices.length)]!;
  }
}
