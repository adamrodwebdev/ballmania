import { reactive, readonly } from 'vue';
import { readJson, type KeyValueStorage } from './KeyValueStorage';

export const PROGRESS_KEY = 'ballmania:progress';
/** Format version of the saved progress; bump it with a migration when it changes. */
export const PROGRESS_VERSION = 1;

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
 * Validated when read; a corrupt or unknown save starts afresh.
 */
export class CampaignProgress {
  private readonly records: Record<string, LevelRecord>;
  /** Read-only, reactive view for the interface. */
  readonly levels: Readonly<Record<string, LevelRecord>>;

  constructor(private readonly storage: KeyValueStorage) {
    this.records = reactive(CampaignProgress.parse(readJson(storage, PROGRESS_KEY)));
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
    this.storage.set(
      PROGRESS_KEY,
      JSON.stringify({ version: PROGRESS_VERSION, levels: this.records }),
    );
  }

  private static parse(value: unknown): Record<string, LevelRecord> {
    if (typeof value !== 'object' || value === null) return {};
    const { version, levels } = value as { version?: unknown; levels?: unknown };
    if (version !== PROGRESS_VERSION || typeof levels !== 'object' || levels === null) return {};
    const records: Record<string, LevelRecord> = {};
    for (const [id, record] of Object.entries(levels as Record<string, unknown>)) {
      if (typeof record !== 'object' || record === null) continue;
      const { stars, best } = record as { stars?: unknown; best?: unknown };
      if (!Number.isInteger(stars) || (stars as number) < 1 || (stars as number) > 3) continue;
      if (typeof best !== 'number' || !Number.isFinite(best) || best < 0) continue;
      records[id] = { stars: stars as number, best };
    }
    return records;
  }
}
