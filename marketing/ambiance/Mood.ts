import type { MusicThemeId } from '@/audio/score';

/**
 * A mood of the ambience factory (specification § 3.18): what a long video
 * sounds and looks like, as data. `Mood.parse()` checks every field before
 * any render and names the one at fault.
 */

export const USES = ['sleep', 'study', 'focus'] as const;
export const ARCS = ['steady', 'descending', 'breathing'] as const;
export const VOICES = ['pad', 'drone', 'glass', 'bell', 'bass'] as const;
export const WORLDS = ['nebula', 'neon', 'abyss', 'jewel', 'volcano', 'singularity'] as const;
const THEME_IDS: readonly MusicThemeId[] = [
  'title',
  'nebula',
  'neon',
  'abyss',
  'jewel',
  'volcano',
  'singularity',
];

export type MoodUse = (typeof USES)[number];
/** How the energy runs over the video: steady, calming down (to sleep) or in slow waves. */
export type MoodArc = (typeof ARCS)[number];
export type VoiceId = (typeof VOICES)[number];
export type WorldId = (typeof WORLDS)[number];

export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface MoodFields {
  readonly id: string;
  readonly name: { readonly en: string; readonly fr: string };
  readonly use: MoodUse;
  readonly theme: MusicThemeId;
  readonly bpm: number;
  readonly intensity: number;
  readonly arc: MoodArc;
  /** Seconds a section lasts, from `min` to `max`. */
  readonly sections: Range;
  readonly voices: readonly VoiceId[];
  /** Hertz: the cut-off of the pads' low-pass filter. */
  readonly brightness: Range;
  /** Seconds of reverberation. */
  readonly reverb: number;
  /** Integrated loudness aimed at, in LUFS. */
  readonly loudness: number;
  readonly fade: { readonly in: number; readonly out: number };
  readonly world: WorldId;
  readonly particles: number;
  readonly light: number;
  readonly motion: number;
  readonly caption: boolean;
}

/** A field that does not hold: its path and what was wrong. */
export class InvalidMood extends Error {
  constructor(
    readonly field: string,
    reason: string,
  ) {
    super(`Mood field "${field}": ${reason}`);
    this.name = 'InvalidMood';
  }
}

type Json = Record<string, unknown>;

const KEYS = [
  'id',
  'name',
  'use',
  'theme',
  'bpm',
  'intensity',
  'arc',
  'sections',
  'voices',
  'brightness',
  'reverb',
  'loudness',
  'fade',
  'world',
  'particles',
  'light',
  'motion',
  'caption',
] as const;

/** Reads the fields of one JSON object, each checked against its bounds. */
class FieldReader {
  constructor(
    private readonly data: Json,
    private readonly prefix: string,
  ) {}

  object(key: string, keys: readonly string[]): FieldReader {
    const value = this.data[key];
    const path = this.path(key);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new InvalidMood(path, 'must be an object');
    }
    const reader = new FieldReader(value as Json, `${path}.`);
    reader.exactly(keys);
    return reader;
  }

  exactly(keys: readonly string[]): void {
    for (const key of keys) {
      if (!(key in this.data)) throw new InvalidMood(this.path(key), 'is missing');
    }
    for (const key of Object.keys(this.data)) {
      if (!keys.includes(key)) throw new InvalidMood(this.path(key), 'is unknown');
    }
  }

  number(key: string, range: Range): number {
    const value = this.data[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new InvalidMood(this.path(key), 'must be a number');
    }
    if (value < range.min || value > range.max) {
      throw new InvalidMood(this.path(key), `must be between ${range.min} and ${range.max}`);
    }
    return value;
  }

  range(key: string, bounds: Range): Range {
    const reader = this.object(key, ['min', 'max']);
    const min = reader.number('min', bounds);
    const max = reader.number('max', bounds);
    if (min > max) throw new InvalidMood(this.path(key), 'min must not exceed max');
    return { min, max };
  }

  text(key: string, pattern: RegExp): string {
    const value = this.data[key];
    if (typeof value !== 'string' || !pattern.test(value)) {
      throw new InvalidMood(this.path(key), `must match ${String(pattern)}`);
    }
    return value;
  }

  choice<T extends string>(key: string, choices: readonly T[]): T {
    const value = this.data[key];
    if (typeof value !== 'string' || !(choices as readonly string[]).includes(value)) {
      throw new InvalidMood(this.path(key), `must be one of ${choices.join(', ')}`);
    }
    return value as T;
  }

  choices<T extends string>(key: string, choices: readonly T[]): readonly T[] {
    const value = this.data[key];
    if (!Array.isArray(value) || value.length === 0) {
      throw new InvalidMood(this.path(key), 'must be a non-empty list');
    }
    const picked = value.map((item: unknown, index) => {
      if (typeof item !== 'string' || !(choices as readonly string[]).includes(item)) {
        throw new InvalidMood(
          `${this.path(key)}[${index}]`,
          `must be one of ${choices.join(', ')}`,
        );
      }
      return item as T;
    });
    if (new Set(picked).size !== picked.length) {
      throw new InvalidMood(this.path(key), 'must not repeat a value');
    }
    return picked;
  }

  flag(key: string): boolean {
    const value = this.data[key];
    if (typeof value !== 'boolean') throw new InvalidMood(this.path(key), 'must be true or false');
    return value;
  }

  private path(key: string): string {
    return `${this.prefix}${key}`;
  }
}

export class Mood implements MoodFields {
  readonly id: string;
  readonly name: { readonly en: string; readonly fr: string };
  readonly use: MoodUse;
  readonly theme: MusicThemeId;
  readonly bpm: number;
  readonly intensity: number;
  readonly arc: MoodArc;
  readonly sections: Range;
  readonly voices: readonly VoiceId[];
  readonly brightness: Range;
  readonly reverb: number;
  readonly loudness: number;
  readonly fade: { readonly in: number; readonly out: number };
  readonly world: WorldId;
  readonly particles: number;
  readonly light: number;
  readonly motion: number;
  readonly caption: boolean;

  private constructor(fields: MoodFields) {
    this.id = fields.id;
    this.name = fields.name;
    this.use = fields.use;
    this.theme = fields.theme;
    this.bpm = fields.bpm;
    this.intensity = fields.intensity;
    this.arc = fields.arc;
    this.sections = fields.sections;
    this.voices = fields.voices;
    this.brightness = fields.brightness;
    this.reverb = fields.reverb;
    this.loudness = fields.loudness;
    this.fade = fields.fade;
    this.world = fields.world;
    this.particles = fields.particles;
    this.light = fields.light;
    this.motion = fields.motion;
    this.caption = fields.caption;
  }

  /** A mood from its JSON, every field checked; throws `InvalidMood` naming the field. */
  static parse(data: unknown, at = ''): Mood {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new InvalidMood(at || '(mood)', 'must be an object');
    }
    const read = new FieldReader(data as Json, at);
    read.exactly(KEYS);
    const name = read.object('name', ['en', 'fr']);
    const fade = read.object('fade', ['in', 'out']);
    const voices = read.choices('voices', VOICES);
    if (!voices.includes('pad')) throw new InvalidMood(`${at}voices`, 'must include pad');
    return new Mood({
      id: read.text('id', /^[a-z0-9-]+$/),
      name: { en: name.text('en', /\S/), fr: name.text('fr', /\S/) },
      use: read.choice('use', USES),
      theme: read.choice('theme', THEME_IDS),
      bpm: read.number('bpm', { min: 56, max: 80 }),
      intensity: read.number('intensity', { min: 0, max: 1 }),
      arc: read.choice('arc', ARCS),
      sections: read.range('sections', { min: 120, max: 300 }),
      voices,
      brightness: read.range('brightness', { min: 400, max: 3000 }),
      reverb: read.number('reverb', { min: 2, max: 8 }),
      loudness: read.number('loudness', { min: -20, max: -14 }),
      fade: {
        in: fade.number('in', { min: 5, max: 60 }),
        out: fade.number('out', { min: 5, max: 60 }),
      },
      world: read.choice('world', WORLDS),
      particles: read.number('particles', { min: 0, max: 1 }),
      light: read.number('light', { min: 0, max: 1 }),
      motion: read.number('motion', { min: 0, max: 1 }),
      caption: read.flag('caption'),
    });
  }

  /** Every mood of a file, ids unique. */
  static parseAll(data: unknown): readonly Mood[] {
    if (!Array.isArray(data) || data.length === 0) {
      throw new InvalidMood('(moods)', 'must be a non-empty list');
    }
    const moods = data.map((item: unknown, index) => Mood.parse(item, `[${index}].`));
    const ids = new Set<string>();
    moods.forEach((mood, index) => {
      if (ids.has(mood.id)) throw new InvalidMood(`[${index}].id`, `"${mood.id}" is used twice`);
      ids.add(mood.id);
    });
    return moods;
  }
}
