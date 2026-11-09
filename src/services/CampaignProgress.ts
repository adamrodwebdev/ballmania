import { reactive, readonly } from 'vue';
import { keyOf, LEVEL_ID } from '@/rules/formats';
import { orElse, type InputRecord } from '@/rules/input';
import { COUNT_LIMITS, NUMBER_RULES, SAVE_LIMITS } from '@/rules/limits';
import type { KeyValueStorage } from './KeyValueStorage';
import { readMap, SaveSlot } from './SaveSlot';

export const PROGRESS_KEY = 'ballmania:progress';
/** Format version of the saved progress; bump it with a migration when it changes. */
export const PROGRESS_VERSION = 1;

/** The stars of a won level. */
const STARS = { min: 1, max: 3, integer: true } as const;
const isLevelId = keyOf(LEVEL_ID);

export interface LevelRecord {
  readonly stars: number;
  readonly best: number;
}

export interface RecordResult {
  readonly stars: number;
  readonly best: number;
  readonly newBest: boolean;
  /** Stars added to the total by this result. */
  readonly starsGained: number;
}

/**
 * The player's campaign (specification § 3.4): stars and best score of every
 * finished level. A level is open when the one before it is finished.
 * Read field by field (`SaveSlot`): a level whose stars or score cannot be
 * read stays won, with one star or no score, so the levels after it stay open.
 */
export class CampaignProgress {
  private readonly slot: SaveSlot;
  private readonly records: Record<string, LevelRecord>;
  /** Read-only, reactive view for the interface. */
  readonly levels: Readonly<Record<string, LevelRecord>>;

  constructor(storage: KeyValueStorage) {
    this.slot = new SaveSlot(storage, { key: PROGRESS_KEY, maxLength: SAVE_LIMITS.progress });
    this.records = reactive(
      this.slot.load(
        (save) => CampaignProgress.read(save),
        () => ({}),
      ),
    );
    this.levels = readonly(this.records);
  }

  get(levelId: string): LevelRecord | undefined {
    return this.records[levelId];
  }

  /** Open if it is the first level or the previous one is finished. */
  isUnlocked(order: readonly string[], levelId: string): boolean {
    const index = order.indexOf(levelId);
    if (index <= 0) return index === 0;
    return this.records[order[index - 1]!] !== undefined;
  }

  /** Levels finished with three stars. */
  threeStarCount(levelIds: readonly string[]): number {
    return levelIds.filter((id) => this.records[id]?.stars === 3).length;
  }

  totalStars(levelIds: readonly string[]): number {
    return levelIds.reduce((sum, id) => sum + (this.records[id]?.stars ?? 0), 0);
  }

  /** Saves a won level, keeping the best stars and score ever. */
  record(levelId: string, score: number, stars: number): RecordResult {
    const previous = this.records[levelId];
    const best = Math.max(previous?.best ?? 0, score);
    const kept = Math.max(previous?.stars ?? 0, stars);
    this.records[levelId] = { stars: kept, best };
    this.save();
    return {
      stars: kept,
      best,
      newBest: previous !== undefined && score > previous.best,
      starsGained: kept - (previous?.stars ?? 0),
    };
  }

  private save(): void {
    this.slot.write({ version: PROGRESS_VERSION, levels: this.records });
  }

  /** The levels of a save of this version: each one whose id reads as a level's, field by field. */
  private static read(save: InputRecord): Record<string, LevelRecord> {
    // Another version's save is not read here: it is kept as it is (SaveSlot).
    save.choice('version', [PROGRESS_VERSION]);
    return readMap(save, 'levels', {
      maxKeys: COUNT_LIMITS.levels,
      isKey: isLevelId,
      entry: (levels, id) => {
        const level = levels.record(id);
        return {
          stars: orElse(() => level.number('stars', STARS), STARS.min),
          best: orElse(() => level.number('best', NUMBER_RULES.score), 0),
        };
      },
    });
  }
}
