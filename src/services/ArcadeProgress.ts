import { reactive, readonly } from 'vue';
import type { DuelDifficulty } from '@/levels/arcade/duel';
import type { SongId } from '@/levels/arcade/rhythm';
import { readJson, type KeyValueStorage } from './KeyValueStorage';

export const ARCADE_KEY = 'ballmania:arcade';
/** Format version of the saved records; bump it with a migration when it changes. */
export const ARCADE_VERSION = 1;

export interface PuzzleRecord {
  readonly stars: number;
  /** Fewest shots it was solved with. */
  readonly shots: number;
}

/** A best score, and whether the game that was just recorded set it. */
export interface ScoreRecord {
  readonly best: number;
  readonly newBest: boolean;
}

interface State {
  endless: number;
  puzzles: Record<string, PuzzleRecord>;
  /** Puzzles of the day (YYYYMMDD): the first attempt counts. */
  dailyPuzzles: Record<string, { readonly won: boolean; readonly shots: number }>;
  songs: Partial<Record<SongId, number>>;
  duels: Partial<Record<DuelDifficulty, number>>;
}

/**
 * The player's Arcade records (specification § 3.2): best Endless score,
 * solved puzzles, best score of each song, duels won by difficulty.
 * Validated when read; a corrupt or unknown save starts afresh.
 */
export class ArcadeProgress {
  private readonly state: State;
  /** Read-only, reactive view for the interface. */
  readonly view: Readonly<State>;

  constructor(private readonly storage: KeyValueStorage) {
    this.state = reactive(ArcadeProgress.parse(readJson(storage, ARCADE_KEY)));
    this.view = readonly(this.state);
  }

  recordEndless(score: number): ScoreRecord {
    const newBest = score > this.state.endless;
    if (newBest) this.state.endless = score;
    this.save();
    return { best: this.state.endless, newBest };
  }

  puzzle(id: string): PuzzleRecord | undefined {
    return this.state.puzzles[id];
  }

  /** Puzzles are opened one after the other; the first one always is. */
  isPuzzleOpen(ids: readonly string[], id: string): boolean {
    const index = ids.indexOf(id);
    if (index <= 0) return index === 0;
    return this.state.puzzles[ids[index - 1]!] !== undefined;
  }

  get puzzlesSolved(): number {
    return Object.keys(this.state.puzzles).length;
  }

  /** Saves a solved puzzle, keeping the best stars and the fewest shots; true if first solved. */
  recordPuzzle(id: string, stars: number, shots: number): boolean {
    const previous = this.state.puzzles[id];
    this.state.puzzles[id] = {
      stars: Math.max(previous?.stars ?? 0, stars),
      shots: Math.min(previous?.shots ?? Infinity, shots),
    };
    this.save();
    return previous === undefined;
  }

  dailyPuzzle(day: string): { readonly won: boolean; readonly shots: number } | undefined {
    return this.state.dailyPuzzles[day];
  }

  /** Saves the first attempt at the puzzle of the day; true if it was the first. */
  recordDailyPuzzle(day: string, won: boolean, shots: number): boolean {
    if (this.state.dailyPuzzles[day]) return false;
    this.state.dailyPuzzles[day] = { won, shots };
    this.save();
    return true;
  }

  song(id: SongId): number | undefined {
    return this.state.songs[id];
  }

  recordSong(id: SongId, score: number): ScoreRecord {
    const previous = this.state.songs[id];
    const newBest = previous !== undefined && score > previous;
    this.state.songs[id] = Math.max(previous ?? 0, score);
    this.save();
    return { best: this.state.songs[id], newBest };
  }

  duelsWon(difficulty: DuelDifficulty): number {
    return this.state.duels[difficulty] ?? 0;
  }

  /** Counts a duel won; returns the wins at this difficulty. */
  recordDuel(difficulty: DuelDifficulty): number {
    this.state.duels[difficulty] = this.duelsWon(difficulty) + 1;
    this.save();
    return this.state.duels[difficulty];
  }

  private save(): void {
    this.storage.set(ARCADE_KEY, JSON.stringify({ version: ARCADE_VERSION, ...this.state }));
  }

  private static parse(value: unknown): State {
    const fresh: State = { endless: 0, puzzles: {}, dailyPuzzles: {}, songs: {}, duels: {} };
    if (typeof value !== 'object' || value === null) return fresh;
    const saved = value as Partial<Record<keyof State | 'version', unknown>>;
    if (saved.version !== ARCADE_VERSION) return fresh;
    const count = (raw: unknown) =>
      typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
    const record = (raw: unknown) =>
      typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    fresh.endless = count(saved.endless);
    for (const [id, raw] of Object.entries(record(saved.puzzles))) {
      const entry = record(raw);
      const stars = count(entry.stars);
      if (!/^puzzle-\d{2}$/.test(id) || stars < 1 || stars > 3) continue;
      fresh.puzzles[id] = { stars, shots: count(entry.shots) };
    }
    for (const [day, raw] of Object.entries(record(saved.dailyPuzzles))) {
      const entry = record(raw);
      if (!/^\d{8}$/.test(day) || typeof entry.won !== 'boolean') continue;
      fresh.dailyPuzzles[day] = { won: entry.won, shots: count(entry.shots) };
    }
    const songs = record(saved.songs);
    for (const id of ['pulse', 'drive', 'rush'] as const) {
      if (songs[id] !== undefined) fresh.songs[id] = count(songs[id]);
    }
    const duels = record(saved.duels);
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      if (count(duels[difficulty]) > 0) fresh.duels[difficulty] = count(duels[difficulty]);
    }
    return fresh;
  }
}
