import { dayKey } from './days';

/** Shards of each day of the streak (v1.7): rising, with a big seventh day; 300 a week. */
export const GIFT_SHARDS: readonly number[] = [15, 20, 25, 30, 40, 50, 120];

/** What the save keeps of the streak. */
export interface GiftRecord {
  /** Local day of the last gift taken (YYYYMMDD), or null before the first. */
  readonly last: string | null;
  /** The day of the streak that gift was, 1 to 7; 0 before the first. */
  readonly streak: number;
}

/** The gift of a day, as the title screen shows it. */
export interface GiftOffer {
  /** Day of the streak, 1 to 7: today's gift, taken or not. */
  readonly day: number;
  readonly taken: boolean;
  /** Shards of that day. */
  readonly shards: number;
  /** Shards of tomorrow's gift, if the streak goes on. */
  readonly tomorrow: number;
}

const next = (day: number) => (day % GIFT_SHARDS.length) + 1;
const shardsOf = (day: number) => GIFT_SHARDS[day - 1] ?? 0;

/**
 * The daily gift (v1.7): one gift a calendar day, a day of the streak each.
 * Missing a day starts the streak again at day 1; after the seventh day, it
 * starts over.
 */
export class DailyGift {
  constructor(private readonly record: GiftRecord) {}

  offer(today: Date): GiftOffer {
    const { last, streak } = this.record;
    if (last === dayKey(today)) {
      return {
        day: streak,
        taken: true,
        shards: shardsOf(streak),
        tomorrow: shardsOf(next(streak)),
      };
    }
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12);
    const day = last !== null && last === dayKey(yesterday) ? next(streak) : 1;
    return { day, taken: false, shards: shardsOf(day), tomorrow: shardsOf(next(day)) };
  }

  /** Takes today's gift: the record to save, and the shards it gives (none if already taken). */
  take(today: Date): { readonly record: GiftRecord; readonly shards: number } {
    const offer = this.offer(today);
    if (offer.taken) return { record: this.record, shards: 0 };
    return { record: { last: dayKey(today), streak: offer.day }, shards: offer.shards };
  }
}
