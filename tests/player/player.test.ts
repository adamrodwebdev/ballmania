import { describe, expect, it } from 'vitest';
import type { GameReport } from '@/engine/Game';
import { ACHIEVEMENTS, EMPTY_STATS, newlyReached, progressOf } from '@/player/achievements';
import { COSMETICS, DEFAULT_LOOK, nextLauncher, STARTER_ITEMS } from '@/player/catalog';
import { DailyChallenge } from '@/player/DailyChallenge';
import { PLAYER_KEY, PlayerProfile, type GameContext } from '@/player/PlayerProfile';
import { REWARDS } from '@/player/rewards';
import { MemoryStorage } from '@/services/KeyValueStorage';

const report = (overrides: Partial<GameReport> = {}): GameReport => ({
  outcome: 'won',
  score: 1500,
  seconds: 60,
  ballsDestroyed: 40,
  bestDepth: 1,
  bestStreak: 2,
  bestBounce: 0,
  swaps: 3,
  pulls: 0,
  fusions: 0,
  switches: 0,
  curves: 0,
  shots: 30,
  bestGroove: 1,
  stage: 0,
  rivalScore: 0,
  fragments: 0,
  danger: 0.5,
  colossusDefeated: false,
  ...overrides,
});

const campaign = (overrides: Partial<GameContext> = {}): GameContext => ({
  kind: 'campaign',
  levelId: 'nebula-04',
  stars: 2,
  starsGained: 2,
  threeStarLevels: 0,
  ...overrides,
});

describe('catalog', () => {
  it('has unique ids, a free default in every slot, and only cosmetics', () => {
    const ids = COSMETICS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of Object.values(DEFAULT_LOOK)) expect(STARTER_ITEMS).toContain(id);
    expect(STARTER_ITEMS).not.toContain('board-neon');
  });

  it('points at the cheapest launcher not owned yet, then none', () => {
    const owned = new Set<string>(STARTER_ITEMS);
    const owns = (id: string) => owned.has(id);
    expect(nextLauncher(owns)?.id).toBe('shooter-crown');
    owned.add('shooter-crown');
    expect(nextLauncher(owns)?.id).toBe('shooter-halo');
    owned.add('shooter-halo').add('shooter-eye');
    expect(nextLauncher(owns)).toBeNull();
  });
});

describe('achievements', () => {
  it('are reached once, with capped progress', () => {
    const stats = { ...EMPTY_STATS, bestDepth: 4, levelsWon: 1 };
    const reached = newlyReached(stats, new Set(['first-win']));
    expect(reached.map((achievement) => achievement.id)).toEqual(['chain-3']);
    const chain5 = ACHIEVEMENTS.find((achievement) => achievement.id === 'chain-5')!;
    expect(progressOf(chain5, stats)).toBe(4);
    expect(progressOf(chain5, { ...stats, bestDepth: 9 })).toBe(5);
  });
});

describe('PlayerProfile', () => {
  it('starts with the free look and no shards', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    expect(profile.shards).toBe(0);
    expect(profile.equipped('burst')).toBe('burst-glass');
    expect(profile.owns('shooter-crown')).toBe(false);
  });

  it('pays a won level by stars gained, plus reached achievements', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    const rewards = profile.recordGame(report({ bestDepth: 3 }), campaign());
    const first = 20;
    const chain3 = 30;
    expect(rewards.shards).toBe(REWARDS.levelWon + 2 * REWARDS.perStarGained + first + chain3);
    expect(rewards.achievements.map((achievement) => achievement.id)).toEqual([
      'first-win',
      'chain-3',
    ]);
    expect(profile.shards).toBe(rewards.shards);
    expect(profile.view.stats.ballsDestroyed).toBe(40);
  });

  it('counts failures in a row and forgets them after a win', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    profile.recordGame(report({ outcome: 'lost' }), campaign());
    profile.recordGame(report({ outcome: 'lost' }), campaign());
    expect(profile.failures('nebula-04')).toBe(2);
    profile.recordGame(report(), campaign());
    expect(profile.failures('nebula-04')).toBe(0);
  });

  it('rewards special wins: no swap, close call, Colossus', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    profile.recordGame(
      report({ swaps: 0, danger: 0.95, colossusDefeated: true }),
      campaign({ starsGained: 0 }),
    );
    expect(profile.view.achievements).toEqual(
      expect.arrayContaining(['no-swap', 'close-call', 'colossus']),
    );
  });

  it('counts curved shots around the black hole', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    profile.recordGame(report({ curves: 6 }), campaign());
    expect(profile.view.achievements).not.toContain('slingshot');
    profile.recordGame(report({ curves: 4 }), campaign());
    expect(profile.view.stats.curves).toBe(10);
    expect(profile.view.achievements).toContain('slingshot');
  });

  it('keeps the star fragments of the campaign and spends them on upgrades', () => {
    const storage = new MemoryStorage();
    const profile = new PlayerProfile(storage);
    profile.recordGame(report({ fragments: 4 }), campaign());
    profile.recordGame(report({ fragments: 9 }), { ...campaign(), kind: 'daily', day: '20261013' });
    expect(profile.view.fragments).toBe(4);
    expect(profile.upgradeAffordable).toBe(false);
    profile.recordGame(report({ fragments: 2 }), campaign());
    expect(profile.upgradeAffordable).toBe(true);
    expect(profile.upgradeCost('nova')).toBe(5);
    expect(profile.buyUpgrade('nova')).toBe(true);
    expect(profile.upgradeRank('nova')).toBe(1);
    expect(profile.view.fragments).toBe(1);
    expect(profile.upgradeCost('nova')).toBe(12);
    expect(profile.buyUpgrade('nova')).toBe(false);
    expect(profile.upgrades).toEqual({ nova: 1 });
    const restored = new PlayerProfile(storage);
    expect(restored.upgradeRank('nova')).toBe(1);
    expect(restored.view.stats.fragmentsCaught).toBe(6);
  });

  it('points at the Observatory once, when a first upgrade can be bought', () => {
    const storage = new MemoryStorage();
    const profile = new PlayerProfile(storage);
    expect(profile.observatoryTipDue).toBe(false);
    profile.recordGame(report({ fragments: 5 }), campaign());
    expect(profile.observatoryTipDue).toBe(true);
    profile.markTipSeen('observatory');
    expect(profile.observatoryTipDue).toBe(false);
    expect(new PlayerProfile(storage).observatoryTipDue).toBe(false);
  });

  it('spares the bubble to a player who already owns an upgrade', () => {
    const storage = new MemoryStorage();
    storage.set(
      PLAYER_KEY,
      JSON.stringify({ version: 2, fragments: 20, upgrades: { eye: 1 }, tips: ['nope', 7] }),
    );
    const profile = new PlayerProfile(storage);
    expect(profile.upgradeAffordable).toBe(true);
    expect(profile.observatoryTipDue).toBe(false);
    expect(profile.view.tips).toEqual([]);
  });

  it('unlocks the Singularity backdrop by finishing the Volcano', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    const rewards = profile.recordGame(report(), campaign({ worldCompleted: 'volcano' }));
    expect(rewards.unlocked.map((item) => item.id)).toEqual(['board-singularity']);
  });

  it('unlocks the theme of a finished world once', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    const first = profile.recordGame(report(), campaign({ worldCompleted: 'nebula' }));
    expect(first.unlocked.map((item) => item.id)).toEqual(['board-neon']);
    expect(profile.owns('board-neon')).toBe(true);
    const again = profile.recordGame(report(), campaign({ worldCompleted: 'nebula' }));
    expect(again.unlocked).toEqual([]);
    expect(profile.view.stats.worldsCompleted).toBe(1);
  });

  it('buys and equips cosmetics with shards only', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    expect(profile.buy('trail-comet')).toBe(false);
    profile.recordGame(report({ bestDepth: 5, bestStreak: 5 }), campaign({ starsGained: 3 }));
    const before = profile.shards;
    expect(profile.buy('trail-comet')).toBe(true);
    expect(profile.shards).toBe(before - 80);
    expect(profile.buy('trail-comet')).toBe(false);
    expect(profile.buy('board-neon')).toBe(false);
    expect(profile.equip('trail-comet')).toBe(true);
    expect(profile.equipped('trail')).toBe('trail-comet');
    expect(profile.equip('shooter-eye')).toBe(false);
  });

  it('lends a cosmetic on sale for one game, never saved (rewarded ad)', () => {
    const storage = new MemoryStorage();
    const profile = new PlayerProfile(storage);
    expect(profile.tryOn('board-neon')).toBe(false);
    expect(profile.tryOn('trail-orbit-unknown')).toBe(false);
    expect(profile.tryOn('shooter-eye')).toBe(true);
    expect(profile.trial).toBe('shooter-eye');
    expect(new PlayerProfile(storage).trial).toBeNull();
    expect(profile.takeLook()).toEqual({ ...DEFAULT_LOOK, shooter: 'shooter-eye' });
    expect(profile.trial).toBeNull();
    expect(profile.takeLook()).toEqual(DEFAULT_LOOK);
    expect(profile.owns('shooter-eye')).toBe(false);
  });

  it('spends shards on a help, never more than the wallet holds', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    profile.grantShards(50);
    expect(profile.spendShards(60)).toBe(false);
    expect(profile.spendShards(20)).toBe(true);
    expect(profile.spendShards(0)).toBe(false);
    expect(profile.shards).toBe(30);
  });

  it('adds the doubled shards of a game (rewarded ad)', () => {
    const storage = new MemoryStorage();
    const profile = new PlayerProfile(storage);
    profile.grantShards(30);
    profile.grantShards(-5);
    expect(profile.shards).toBe(30);
    expect(new PlayerProfile(storage).shards).toBe(30);
  });

  it('counts only the first attempt of a daily challenge', () => {
    const profile = new PlayerProfile(new MemoryStorage());
    const daily = (outcome: 'won' | 'lost', score: number) =>
      profile.recordGame(report({ outcome, score }), {
        kind: 'daily',
        levelId: 'nebula-05',
        stars: outcome === 'won' ? 2 : 0,
        starsGained: 0,
        threeStarLevels: 0,
        day: '20261012',
      });
    const first = daily('lost', 300);
    expect(first.firstDailyAttempt).toBe(true);
    expect(first.shards).toBe(REWARDS.dailyTried);
    const second = daily('won', 2000);
    expect(second.firstDailyAttempt).toBe(false);
    expect(profile.daily('20261012')).toEqual({ score: 300, stars: 0, won: false });
    expect(profile.view.stats.dailyPlayed).toBe(1);
  });

  it('saves and restores; repairs or ignores bad saves', () => {
    const storage = new MemoryStorage();
    const profile = new PlayerProfile(storage);
    profile.recordGame(report(), campaign());
    const restored = new PlayerProfile(storage);
    expect(restored.shards).toBe(profile.shards);
    expect(restored.view.stats.levelsWon).toBe(1);

    storage.set(
      PLAYER_KEY,
      JSON.stringify({
        version: 1,
        shards: -5,
        owned: ['trail-comet', 'nope', 3],
        equipped: { trail: 'trail-comet', shooter: 'shooter-eye', burst: 'trail-comet' },
        stats: { levelsWon: 'x', bestDepth: 4 },
        daily: { '20261012': { score: 10, stars: 9, won: true }, yesterday: { won: true } },
        failures: { a: 2, b: -1 },
      }),
    );
    const repaired = new PlayerProfile(storage);
    expect(repaired.shards).toBe(0);
    expect(repaired.owns('trail-comet')).toBe(true);
    expect(repaired.owns('nope')).toBe(false);
    expect(repaired.equipped('trail')).toBe('trail-comet');
    expect(repaired.equipped('shooter')).toBe('shooter-star');
    expect(repaired.equipped('burst')).toBe('burst-glass');
    expect(repaired.view.stats.bestDepth).toBe(4);
    expect(repaired.daily('20261012')).toEqual({ score: 10, stars: 3, won: true });
    expect(repaired.failures('a')).toBe(2);
    expect(repaired.failures('b')).toBe(0);

    storage.set(PLAYER_KEY, JSON.stringify({ version: 7, shards: 999 }));
    expect(new PlayerProfile(storage).shards).toBe(0);
  });

  it('gives the Star heart to players who wore the first launcher by default', () => {
    const storage = new MemoryStorage();
    const equipped = { shooter: 'shooter-orbit', trail: 'trail-none', burst: 'burst-glass' };
    storage.set(PLAYER_KEY, JSON.stringify({ version: 1, shards: 40, equipped }));
    const migrated = new PlayerProfile(storage);
    expect(migrated.equipped('shooter')).toBe('shooter-star');
    expect(migrated.shards).toBe(40);
    // Chosen again after 1.7, the first launcher stays.
    migrated.equip('shooter-orbit');
    expect(new PlayerProfile(storage).equipped('shooter')).toBe('shooter-orbit');
  });
});

describe('DailyChallenge', () => {
  it('is the same all day, changes from day to day, and avoids tutorials and bosses', () => {
    const morning = DailyChallenge.of(new Date(2026, 9, 12, 8));
    const evening = DailyChallenge.of(new Date(2026, 9, 12, 23));
    expect(morning.day).toBe('20261012');
    expect(evening.level).toBe(morning.level);
    expect(morning.seed).toBe('daily:20261012');
    expect(morning.date.getDate()).toBe(12);
    const levels = new Set(
      Array.from({ length: 30 }, (_, i) => DailyChallenge.of(new Date(2026, 9, i + 1)).level),
    );
    expect(levels.size).toBeGreaterThan(3);
    for (const level of levels) {
      expect(level.number).toBeGreaterThanOrEqual(3);
      expect(level.number).toBeLessThanOrEqual(11);
      // Not the young Colossus of 1-3 either.
      expect(level.colossus).toBeUndefined();
    }
  });
});
