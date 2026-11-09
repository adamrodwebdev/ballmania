import { reactive, readonly } from 'vue';
import type { DuelDifficulty } from '@/levels/arcade/duel';
import type { SongId } from '@/levels/arcade/rhythm';
import { isDayKey, keyOf, PUZZLE_ID } from '@/rules/formats';
import { orElse, type InputRecord } from '@/rules/input';
import { COUNT_LIMITS, NUMBER_RULES, SAVE_LIMITS } from '@/rules/limits';
import type { KeyValueStorage } from './KeyValueStorage';
import { readMap, SaveSlot } from './SaveSlot';

export const ARCADE_KEY = 'ballmania:arcade';
/** Format version of the saved records; bump it with a migration when it changes. */
export const ARCADE_VERSION = 1;

/** The stars of a solved puzzle. */
const STARS = { min: 1, max: 3, integer: true } as const;
/** The songs and duels a save may hold (their modules stay out of the menus' code). */
const SONG_IDS: readonly SongId[] = ['pulse', 'drive', 'rush'];
const DUEL_LEVELS: readonly DuelDifficulty[] = ['easy', 'normal', 'hard'];
const isPuzzleId = keyOf(PUZZLE_ID);

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
 * Read field by field (`SaveSlot`): a record that cannot be read falls back to
 * its default, and a puzzle whose stars cannot be read stays solved.
 */
export class ArcadeProgress {
  private readonly slot: SaveSlot;
  private readonly state: State;
  /** Read-only, reactive view for the interface. */
  readonly view: Readonly<State>;

  constructor(storage: KeyValueStorage) {
    this.slot = new SaveSlot(storage, { key: ARCADE_KEY, maxLength: SAVE_LIMITS.arcade });
    this.state = reactive(
      this.slot.load(
        (save) => ArcadeProgress.read(save),
        () => ArcadeProgress.fresh(),
      ),
    );
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
    this.slot.write({ version: ARCADE_VERSION, ...this.state });
  }

  private static fresh(): State {
    return { endless: 0, puzzles: {}, dailyPuzzles: {}, songs: {}, duels: {} };
  }

  /** The records of a save of this version, each read on its own. */
  private static read(save: InputRecord): State {
    // Another version's save is not read here: it is kept as it is (SaveSlot).
    save.choice('version', [ARCADE_VERSION]);
    const state = ArcadeProgress.fresh();
    // Scores, read as numbers, are still floored as before 9 Nov 2026.
    state.endless = Math.floor(orElse(() => save.number('endless', NUMBER_RULES.score), 0));
    state.puzzles = readMap(save, 'puzzles', {
      maxKeys: COUNT_LIMITS.puzzles,
      isKey: isPuzzleId,
      entry: (puzzles, id) => {
        const puzzle = puzzles.record(id);
        return {
          stars: orElse(() => puzzle.number('stars', STARS), STARS.min),
          shots: orElse(() => puzzle.number('shots', NUMBER_RULES.count), 0),
        };
      },
    });
    state.dailyPuzzles = readMap(save, 'dailyPuzzles', {
      maxKeys: COUNT_LIMITS.days,
      isKey: isDayKey,
      entry: (days, day) => {
        const attempt = days.record(day);
        return {
          won: orElse(() => attempt.boolean('won'), false),
          shots: orElse(() => attempt.number('shots', NUMBER_RULES.count), 0),
        };
      },
    });
    const songs = orElse(() => save.record('songs'), null);
    for (const id of SONG_IDS) {
      if (songs?.has(id)) {
        state.songs[id] = Math.floor(orElse(() => songs.number(id, NUMBER_RULES.score), 0));
      }
    }
    const duels = orElse(() => save.record('duels'), null);
    for (const difficulty of DUEL_LEVELS) {
      const won = orElse(() => duels?.number(difficulty, NUMBER_RULES.count) ?? 0, 0);
      if (won > 0) state.duels[difficulty] = won;
    }
    return state;
  }
}
