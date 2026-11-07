import { SeededRandom } from '@/engine/core/Random';
import type { Chord, Plan, Section, Voicing } from './Composer';
import type { VoiceId } from './Mood';

/**
 * The notes of an ambience, section by section (specification § 3.18). A
 * section's notes depend only on the plan, the seed and the section's index,
 * so any section can be rendered (or checked) on its own. Pure.
 */

export interface Note {
  readonly voice: VoiceId;
  /** Seconds from the start of the video. */
  readonly at: number;
  readonly seconds: number;
  readonly frequency: number;
  /** Peak level, 0 to 1, before the mix is brought to its loudness. */
  readonly level: number;
  /** −1 (left) to 1 (right). */
  readonly pan: number;
  /** Seconds the note takes to rise: never a sharp attack. */
  readonly attack: number;
}

/** The shortest attack of any note: 40 ms (the game's glass plucks take 8). */
export const MIN_ATTACK = 0.04;

const pitch = (root: number, semitones: number) => root * 2 ** (semitones / 12);

const voice = (chord: Chord, voicing: Voicing): Chord => {
  switch (voicing) {
    case 'close':
      return chord;
    case 'open':
      return chord.map((s, i) => (i % 2 === 1 ? s + 12 : s));
    case 'octave':
      return [...chord, chord[0]! + 12];
  }
};

/** A seed of its own for each section, so sections are independent. */
const sectionSeed = (seed: number, index: number) =>
  (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(index + 1, 0xc2b2ae35)) >>> 0;

/** Seconds a section's notes keep starting after its end: half the next cross-fade. */
const overrun = (plan: Plan, section: Section) => {
  const next = plan.sections[section.index + 1];
  return next ? next.crossfade / 2 : 0;
};

/** The notes that start in section `index` (and in the first half of the next cross-fade). */
export function sectionNotes(plan: Plan, index: number): readonly Note[] {
  const section = plan.sections[index];
  if (!section) throw new RangeError(`No section ${index}`);
  const random = new SeededRandom(sectionSeed(plan.seed, index));
  const bar = plan.barSeconds;
  const beat = bar / 4;
  const root = pitch(plan.root, section.shift);
  const end = section.start + section.seconds + overrun(plan, section);
  const loud = 0.6 + 0.4 * section.energy;
  const has = (v: VoiceId) => section.voices.includes(v);
  const notes: Note[] = [];
  const add = (note: Note) => {
    if (note.at < end && note.at < plan.seconds) notes.push(note);
  };
  for (let b = 0; ; b++) {
    const at = section.start + b * bar;
    if (at >= end) break;
    const chord = section.chords[b % section.chords.length]!;
    const voiced = voice(chord, section.voicing);
    // The pads: the chord, held over into the next bar, rising slowly.
    voiced.forEach((s, i) => {
      add({
        voice: 'pad',
        at,
        seconds: bar * 1.6,
        frequency: pitch(root, s),
        level: (0.5 * loud) / voiced.length,
        pan: voiced.length > 1 ? -0.35 + (0.7 * i) / (voiced.length - 1) : 0,
        attack: Math.min(2.5, Math.max(1.5, bar * 0.45)),
      });
    });
    // The drone: the key's root, an octave down, one long breath every four bars.
    if (has('drone') && b % 4 === 0) {
      add({
        voice: 'drone',
        at,
        seconds: bar * 6,
        frequency: root / 2,
        level: 0.32 * loud,
        pan: 0,
        attack: 4,
      });
    }
    if (has('bass') && random.next() < 0.7) {
      add({
        voice: 'bass',
        at,
        seconds: bar * 0.9,
        frequency: pitch(root / 2, chord[0]!),
        level: 0.4 * loud,
        pan: 0,
        attack: 0.3,
      });
    }
    // Glass and bells: rare, on the chord's notes, wherever the beat falls.
    if (has('glass') && random.next() < section.density * 0.5) {
      add({
        voice: 'glass',
        at: at + beat * random.nextInt(4),
        seconds: 3,
        frequency: pitch(root, chord[random.nextInt(chord.length)]! + 24),
        level: 0.16 * loud,
        pan: (random.next() - 0.5) * 1.2,
        attack: MIN_ATTACK,
      });
    }
    if (has('bell') && random.next() < section.density * 0.3) {
      add({
        voice: 'bell',
        at: at + beat * (random.nextInt(4) + 0.5 * random.nextInt(2)),
        seconds: 5,
        frequency: pitch(root, chord[random.nextInt(chord.length)]! + 12),
        level: 0.14 * loud,
        pan: (random.next() - 0.5) * 0.8,
        attack: 0.05,
      });
    }
  }
  return notes;
}

/** Every note of the video, section after section. */
export function allNotes(plan: Plan): readonly Note[] {
  return plan.sections.flatMap((section) => sectionNotes(plan, section.index));
}

/** One line per note, to the millisecond: the text the plan's fingerprint is taken from. */
export function serialize(notes: readonly Note[]): string {
  return notes
    .map(
      (n) =>
        `${n.voice} ${n.at.toFixed(3)} ${n.seconds.toFixed(3)} ${n.frequency.toFixed(3)} ` +
        `${n.level.toFixed(4)} ${n.pan.toFixed(3)} ${n.attack.toFixed(3)}`,
    )
    .join('\n');
}

/**
 * The notes of each window of `seconds`, starting at every bar, written
 * relative to the window's start: two equal strings mean the music repeats.
 */
export function windowSignatures(
  notes: readonly Note[],
  plan: Plan,
  seconds: number,
): readonly string[] {
  const sorted = [...notes].sort((a, b) => a.at - b.at);
  const out: string[] = [];
  let from = 0;
  for (let start = 0; start + seconds <= plan.seconds; start += plan.barSeconds) {
    while (from < sorted.length && sorted[from]!.at < start - 1e-6) from++;
    const parts: string[] = [];
    for (let i = from; i < sorted.length && sorted[i]!.at < start + seconds; i++) {
      const n = sorted[i]!;
      parts.push(`${n.voice}${(n.at - start).toFixed(3)}:${n.frequency.toFixed(2)}`);
    }
    out.push(parts.join(','));
  }
  return out;
}

/** Glass and bell notes: the picture lights a glow under each. */
export const isSparkle = (note: Note): boolean => note.voice === 'glass' || note.voice === 'bell';
