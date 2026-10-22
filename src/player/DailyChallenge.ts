import { WORLDS, type CampaignLevel } from '@/levels/campaign';
import { dayKey } from './days';

/** Levels the challenge draws from: the first world, without the tutorials nor the bosses. */
const POOL: readonly CampaignLevel[] = WORLDS[0]!.levels
  .slice(2, 11)
  .filter((level) => !level.colossus);

/** FNV-1a: a stable hash, so a day always gives the same level. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/**
 * The challenge of the day (specification § 2.2): the same level and the same
 * balls for every player on a given local day, so results can be compared
 * and shared. Only the first attempt of the day counts.
 */
export class DailyChallenge {
  private constructor(
    /** YYYYMMDD, in the player's time zone. */
    readonly day: string,
    readonly level: CampaignLevel,
  ) {}

  static of(date: Date): DailyChallenge {
    const day = dayKey(date);
    return new DailyChallenge(day, POOL[hash(`ballmania:${day}`) % POOL.length]!);
  }

  /** Seed of the balls: identical for everyone today. */
  get seed(): string {
    return `daily:${this.day}`;
  }

  /** The day as a date, at noon to avoid time-zone edges when formatting. */
  get date(): Date {
    const year = Number(this.day.slice(0, 4));
    const month = Number(this.day.slice(4, 6)) - 1;
    return new Date(year, month, Number(this.day.slice(6, 8)), 12);
  }
}
