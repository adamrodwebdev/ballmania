import { describe, expect, it } from 'vitest';
import { CampaignProgress, PROGRESS_KEY } from '@/services/CampaignProgress';
import { MemoryStorage, readJson } from '@/services/KeyValueStorage';

const ORDER = ['w-01', 'w-02', 'w-03'];

describe('CampaignProgress', () => {
  it('opens levels one after the other', () => {
    const progress = new CampaignProgress(new MemoryStorage());
    expect(progress.isUnlocked(ORDER, 'w-01')).toBe(true);
    expect(progress.isUnlocked(ORDER, 'w-02')).toBe(false);
    progress.record('w-01', 500, 1);
    expect(progress.isUnlocked(ORDER, 'w-02')).toBe(true);
    expect(progress.isUnlocked(ORDER, 'w-03')).toBe(false);
    expect(progress.isUnlocked(ORDER, 'unknown')).toBe(false);
  });

  it('keeps the best stars and score, and says what was gained', () => {
    const progress = new CampaignProgress(new MemoryStorage());
    expect(progress.record('w-01', 800, 2)).toEqual({
      stars: 2,
      best: 800,
      newBest: false,
      starsGained: 2,
    });
    expect(progress.record('w-01', 600, 1)).toEqual({
      stars: 2,
      best: 800,
      newBest: false,
      starsGained: 0,
    });
    expect(progress.record('w-01', 1200, 3)).toEqual({
      stars: 3,
      best: 1200,
      newBest: true,
      starsGained: 1,
    });
    expect(progress.totalStars(ORDER)).toBe(3);
  });

  it('saves a versioned record and reads it back', () => {
    const storage = new MemoryStorage();
    new CampaignProgress(storage).record('w-02', 300, 1);
    expect(readJson(storage, PROGRESS_KEY)).toEqual({
      version: 1,
      levels: { 'w-02': { stars: 1, best: 300 } },
    });
    expect(new CampaignProgress(storage).get('w-02')).toEqual({ stars: 1, best: 300 });
  });

  it('ignores corrupt or foreign saves', () => {
    const storage = new MemoryStorage();
    storage.set(
      PROGRESS_KEY,
      JSON.stringify({
        version: 1,
        levels: {
          a: { stars: 4, best: 1 },
          b: { stars: 2, best: -3 },
          c: 'x',
          d: { stars: 3, best: 90 },
        },
      }),
    );
    expect(new CampaignProgress(storage).levels).toEqual({ d: { stars: 3, best: 90 } });
    storage.set(
      PROGRESS_KEY,
      JSON.stringify({ version: 99, levels: { d: { stars: 3, best: 1 } } }),
    );
    expect(new CampaignProgress(storage).levels).toEqual({});
    storage.set(PROGRESS_KEY, '{oops');
    expect(new CampaignProgress(storage).levels).toEqual({});
  });
});
