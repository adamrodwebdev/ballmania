import { describe, expect, it } from 'vitest';
import { DailyGift, GIFT_SHARDS, type GiftRecord } from '@/player/DailyGift';
import { PlayerProfile } from '@/player/PlayerProfile';
import { MemoryStorage } from '@/services/KeyValueStorage';

const day = (date: number) => new Date(2026, 9, date, 10);

/** Takes the gift on each of these days of October, from a fresh record. */
const takeOn = (...dates: number[]) => {
  let record: GiftRecord = { last: null, streak: 0 };
  const shards: number[] = [];
  for (const date of dates) {
    const taken = new DailyGift(record).take(day(date));
    record = taken.record;
    shards.push(taken.shards);
  }
  return { record, shards };
};

describe('DailyGift', () => {
  it('starts at day 1, then rises day after day to a big seventh day', () => {
    expect(new DailyGift({ last: null, streak: 0 }).offer(day(1))).toEqual({
      day: 1,
      taken: false,
      shards: 15,
      tomorrow: 20,
    });
    const week = takeOn(1, 2, 3, 4, 5, 6, 7);
    expect(week.shards).toEqual([...GIFT_SHARDS]);
    expect(GIFT_SHARDS.reduce((sum, shards) => sum + shards, 0)).toBe(300);
    // After the seventh day, the streak starts over.
    expect(new DailyGift(week.record).offer(day(8)).day).toBe(1);
  });

  it('gives one gift a day', () => {
    const { record, shards } = takeOn(3, 3);
    expect(shards).toEqual([15, 0]);
    expect(new DailyGift(record).offer(day(3))).toMatchObject({
      day: 1,
      taken: true,
      tomorrow: 20,
    });
  });

  it('starts again at day 1 after a missed day', () => {
    expect(takeOn(1, 2, 3, 5).shards).toEqual([15, 20, 25, 15]);
  });

  it('follows the calendar across months and years', () => {
    let record: GiftRecord = { last: null, streak: 0 };
    for (const date of [new Date(2026, 11, 31, 22), new Date(2027, 0, 1, 7)]) {
      record = new DailyGift(record).take(date).record;
    }
    expect(record).toEqual({ last: '20270101', streak: 2 });
  });
});

describe('PlayerProfile gift', () => {
  it('adds the shards to the wallet, remembers the streak and repairs a bad save', () => {
    const storage = new MemoryStorage();
    const profile = new PlayerProfile(storage);
    expect(profile.giftOffer(day(10)).day).toBe(1);
    expect(profile.takeGift(day(10))).toBe(15);
    expect(profile.shards).toBe(15);
    expect(profile.takeGift(day(10))).toBe(0);
    const restored = new PlayerProfile(storage);
    expect(restored.giftOffer(day(11))).toMatchObject({ day: 2, taken: false, shards: 20 });

    storage.set(
      'ballmania:player',
      JSON.stringify({ version: 2, gift: { last: 'yesterday', streak: 12 } }),
    );
    expect(new PlayerProfile(storage).giftOffer(day(11)).day).toBe(1);
  });
});
