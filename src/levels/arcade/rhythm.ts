import type { LevelDefinition } from '../LevelDefinition';
import { resolveLevel } from '../resolveLevel';
import type { Frame, TrackRecipe } from '../tracks';

export type SongId = 'pulse' | 'drive' | 'rush';

/** A song of Rhythm mode: its tempo, its key, and the level played to it. */
export interface Song {
  readonly id: SongId;
  readonly bpm: number;
  /** Root note of the bass line, in hertz. */
  readonly root: number;
  readonly track: TrackRecipe;
  readonly length: number;
  readonly tones: number;
  readonly speed: number;
}

/** Shots within this share of a beat, before or after it, are on the beat. */
export const BEAT_WINDOW = 0.15;

export const SONGS: readonly Song[] = [
  {
    id: 'pulse',
    bpm: 96,
    root: 55,
    track: { kind: 'spiral', turns: 1.4, outer: 0.88, inner: 0.42, start: 0.75, clockwise: true },
    length: 36,
    tones: 4,
    speed: 32,
  },
  {
    id: 'drive',
    bpm: 112,
    root: 61.74,
    track: { kind: 'serpentine', rows: 3 },
    length: 40,
    tones: 4,
    speed: 38,
  },
  {
    id: 'rush',
    bpm: 128,
    root: 49,
    track: {
      kind: 'spiral',
      turns: 1.6,
      outer: 0.86,
      inner: 0.4,
      start: 0.25,
      clockwise: false,
      squareness: 2,
    },
    length: 46,
    tones: 5,
    speed: 44,
  },
];

export function findSong(id: SongId): Song {
  return SONGS.find((song) => song.id === id)!;
}

/** Rhythm mode: clear the track while the chain moves to the music (specification § 3.2). */
export function rhythmLevel(song: Song, frame: Frame): LevelDefinition {
  const level = resolveLevel(
    {
      id: `rhythm-${song.id}`,
      world: 'neon',
      number: 1,
      track: song.track,
      length: song.length,
      tones: song.tones,
      repeatChance: 0.42,
      speed: song.speed,
    },
    frame,
  );
  return { ...level, rhythm: { bpm: song.bpm, window: BEAT_WINDOW } };
}
