import { reactive, readonly, shallowRef } from 'vue';
import type { GameReport } from '@/engine/Game';
import type { WorldId } from '@/levels/campaign';
import { readJson, type KeyValueStorage } from '@/services/KeyValueStorage';
import { EMPTY_STATS, newlyReached, type Achievement, type PlayerStats } from './achievements';
import {
  COSMETICS,
  DEFAULT_LOOK,
  findCosmetic,
  SLOTS,
  STARTER_ITEMS,
  type Cosmetic,
  type CosmeticSlot,
} from './catalog';
import { REWARDS } from './rewards';
import {
  MAX_RANK,
  UPGRADE_COSTS,
  UPGRADE_IDS,
  type UpgradeId,
  type UpgradeRanks,
} from '@/engine/upgrades/Upgrades';

export const PLAYER_KEY = 'ballmania:player';
/** Format version of the saved profile; bump it with a migration when it changes. */
export const PLAYER_VERSION = 1;

/** Result of one day's challenge: the first attempt counts for the day. */
export interface DailyRecord {
  readonly score: number;
  readonly stars: number;
  readonly won: boolean;
}

/** Where a game was played, and what it changed in the campaign. */
export interface GameContext {
  readonly kind: 'campaign' | 'daily' | 'arcade';
  readonly levelId: string;
  readonly stars: number;
  /** Stars added to the campaign total by this game. */
  readonly starsGained: number;
  /** Levels with three stars, after this game. */
  readonly threeStarLevels: number;
  /** The world this win finished, if it did. */
  readonly worldCompleted?: WorldId;
  /** Day of the challenge (YYYYMMDD) for a daily game. */
  readonly day?: string;
  /** Arcade: the shards the mode pays for this game (record, first solve, duel won…). */
  readonly shards?: number;
  /** Arcade: a puzzle solved for the first time. */
  readonly puzzleSolved?: boolean;
  /** Arcade: a duel won, at this difficulty. */
  readonly duelWon?: 'easy' | 'normal' | 'hard';
}

export interface Rewards {
  readonly shards: number;
  readonly achievements: readonly Achievement[];
  readonly unlocked: readonly Cosmetic[];
  /** True for the attempt that counts for today's challenge. */
  readonly firstDailyAttempt: boolean;
}

interface State {
  shards: number;
  owned: string[];
  equipped: Record<CosmeticSlot, string>;
  stats: PlayerStats;
  achievements: string[];
  worlds: string[];
  daily: Record<string, DailyRecord>;
  failures: Record<string, number>;
  /** Star fragments to spend at the Observatory. */
  fragments: number;
  /** Rank of each upgrade bought. */
  upgrades: Partial<Record<UpgradeId, number>>;
}

/**
 * The player's belongings and history (specification § 3.6): shards, owned
 * and equipped cosmetics, lifetime counters, achievements, daily challenges
 * and failure streaks (for the assistance). Everything a game earns goes
 * through `recordGame`. Saved on every change; validated when read.
 */
export class PlayerProfile {
  private readonly state: State;
  /** Read-only, reactive view for the interface. */
  readonly view: Readonly<State>;
  private readonly trialItem = shallowRef<string | null>(null);

  constructor(private readonly storage: KeyValueStorage) {
    this.state = reactive(PlayerProfile.parse(readJson(storage, PLAYER_KEY)));
    this.view = readonly(this.state) as Readonly<State>;
  }

  get shards(): number {
    return this.state.shards;
  }

  owns(id: string): boolean {
    return this.state.owned.includes(id);
  }

  equipped(slot: CosmeticSlot): string {
    return this.state.equipped[slot];
  }

  failures(levelId: string): number {
    return this.state.failures[levelId] ?? 0;
  }

  daily(day: string): DailyRecord | undefined {
    return this.state.daily[day];
  }

  /** The upgrades owned, for the games of the campaign. */
  get upgrades(): UpgradeRanks {
    return { ...this.state.upgrades };
  }

  upgradeRank(id: UpgradeId): number {
    return this.state.upgrades[id] ?? 0;
  }

  /** Fragments the next rank of an upgrade costs, or null when it is at its best. */
  upgradeCost(id: UpgradeId): number | null {
    return UPGRADE_COSTS[this.upgradeRank(id)] ?? null;
  }

  /** True if some upgrade can be bought now (the badge on the home screen and the map). */
  get upgradeAffordable(): boolean {
    return UPGRADE_IDS.some((id) => {
      const cost = this.upgradeCost(id);
      return cost !== null && cost <= this.state.fragments;
    });
  }

  /** Spends fragments on the next rank of an upgrade; false if it cannot be bought. */
  buyUpgrade(id: UpgradeId): boolean {
    const cost = this.upgradeCost(id);
    if (cost === null || cost > this.state.fragments) return false;
    this.state.fragments -= cost;
    this.state.upgrades[id] = this.upgradeRank(id) + 1;
    this.save();
    return true;
  }

  /** Spends shards on a cosmetic; false if it cannot be bought. */
  buy(id: string): boolean {
    const item = findCosmetic(id);
    if (!item || item.unlockedBy || this.owns(id) || this.state.shards < item.price) return false;
    this.state.shards -= item.price;
    this.state.owned.push(id);
    this.save();
    return true;
  }

  /** The cosmetic lent for the next game (§ 3.7, a rewarded ad watched), or null. */
  get trial(): string | null {
    return this.trialItem.value;
  }

  /** Lends a cosmetic on sale for the next game; never saved. False if it cannot be tried. */
  tryOn(id: string): boolean {
    const item = findCosmetic(id);
    if (!item || item.unlockedBy || this.owns(id)) return false;
    this.trialItem.value = id;
    return true;
  }

  /** What the next game wears: the equipped cosmetics and the one lent, which is then given back. */
  takeLook(): Record<CosmeticSlot, string> {
    const look = { ...this.state.equipped };
    const item = this.trialItem.value ? findCosmetic(this.trialItem.value) : undefined;
    if (item) look[item.slot] = item.id;
    this.trialItem.value = null;
    return look;
  }

  /** Spends shards on a help that can also be had for an ad (§ 3.7); false if too few. */
  spendShards(amount: number): boolean {
    if (!(amount > 0) || this.state.shards < amount) return false;
    this.state.shards -= amount;
    this.save();
    return true;
  }

  /** Extra shards (§ 3.7: a game's shards doubled after a rewarded ad). */
  grantShards(amount: number): void {
    if (!(amount > 0)) return;
    this.state.shards += Math.floor(amount);
    this.save();
  }

  /** Wears an owned cosmetic in its slot. */
  equip(id: string): boolean {
    const item = findCosmetic(id);
    if (!item || !this.owns(id)) return false;
    this.state.equipped[item.slot] = id;
    this.save();
    return true;
  }

  /** Counts a finished game and pays what it earned. */
  recordGame(report: GameReport, context: GameContext): Rewards {
    const won = report.outcome === 'won';
    const stats = { ...this.state.stats };
    stats.gamesPlayed++;
    stats.ballsDestroyed += report.ballsDestroyed;
    stats.bestDepth = Math.max(stats.bestDepth, report.bestDepth);
    stats.bestStreak = Math.max(stats.bestStreak, report.bestStreak);
    stats.bestBounce = Math.max(stats.bestBounce, report.bestBounce);
    stats.magnetPulls += report.pulls;
    stats.fusions += report.fusions;
    stats.switches += report.switches;
    stats.curves += report.curves;
    stats.bestGroove = Math.max(stats.bestGroove, report.bestGroove);
    stats.endlessStage = Math.max(stats.endlessStage, report.stage);
    if (context.puzzleSolved) stats.puzzlesSolved++;
    if (context.duelWon === 'hard') stats.hardDuelsWon++;
    stats.threeStarLevels = Math.max(stats.threeStarLevels, context.threeStarLevels);
    if (won) {
      stats.levelsWon++;
      if (report.swaps === 0) stats.noSwapWins++;
      if (report.danger >= 0.9) stats.closeCalls++;
      if (report.colossusDefeated) stats.colossusDefeated++;
    }

    let shards = 0;
    let firstDailyAttempt = false;
    if (context.kind === 'campaign') {
      this.state.fragments += report.fragments;
      stats.fragmentsCaught += report.fragments;
      if (won) {
        shards += REWARDS.levelWon + REWARDS.perStarGained * context.starsGained;
        this.state.failures[context.levelId] = 0;
      } else {
        this.state.failures[context.levelId] = this.failures(context.levelId) + 1;
      }
    } else if (context.kind === 'arcade') {
      shards += context.shards ?? 0;
    } else if (context.day) {
      const previous = this.state.daily[context.day];
      if (!previous) {
        firstDailyAttempt = true;
        stats.dailyPlayed++;
        shards += won
          ? REWARDS.dailyWon + REWARDS.dailyPerStar * context.stars
          : REWARDS.dailyTried;
        this.state.daily[context.day] = { score: report.score, stars: context.stars, won };
      }
    }

    const unlocked: Cosmetic[] = [];
    if (won && context.worldCompleted && !this.state.worlds.includes(context.worldCompleted)) {
      this.state.worlds.push(context.worldCompleted);
      stats.worldsCompleted++;
      for (const item of COSMETICS) {
        if (item.unlockedBy === context.worldCompleted && !this.owns(item.id)) {
          this.state.owned.push(item.id);
          unlocked.push(item);
        }
      }
    }

    const reached = newlyReached(stats, new Set(this.state.achievements));
    for (const achievement of reached) {
      this.state.achievements.push(achievement.id);
      shards += achievement.reward;
    }
    this.state.stats = stats;
    this.state.shards += shards;
    this.save();
    return { shards, achievements: reached, unlocked, firstDailyAttempt };
  }

  private save(): void {
    this.storage.set(PLAYER_KEY, JSON.stringify({ version: PLAYER_VERSION, ...this.state }));
  }

  private static parse(value: unknown): State {
    const fresh: State = {
      shards: 0,
      owned: [...STARTER_ITEMS],
      equipped: { ...DEFAULT_LOOK },
      stats: { ...EMPTY_STATS },
      achievements: [],
      worlds: [],
      daily: {},
      failures: {},
      fragments: 0,
      upgrades: {},
    };
    if (typeof value !== 'object' || value === null) return fresh;
    const saved = value as Partial<Record<keyof State | 'version', unknown>>;
    if (saved.version !== PLAYER_VERSION) return fresh;

    const count = (raw: unknown) =>
      typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
    const strings = (raw: unknown) =>
      Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
    const record = (raw: unknown) =>
      typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

    fresh.shards = count(saved.shards);
    fresh.owned = [...new Set([...STARTER_ITEMS, ...strings(saved.owned).filter(findCosmetic)])];
    const equipped = record(saved.equipped);
    for (const slot of SLOTS) {
      const id = equipped[slot];
      const item = typeof id === 'string' ? findCosmetic(id) : undefined;
      if (item?.slot === slot && fresh.owned.includes(item.id)) fresh.equipped[slot] = item.id;
    }
    const stats = record(saved.stats);
    fresh.stats = Object.fromEntries(
      Object.keys(EMPTY_STATS).map((name) => [name, count(stats[name])]),
    ) as unknown as PlayerStats;
    fresh.achievements = strings(saved.achievements);
    fresh.worlds = strings(saved.worlds);
    for (const [day, raw] of Object.entries(record(saved.daily))) {
      const entry = record(raw);
      if (!/^\d{8}$/.test(day) || typeof entry.won !== 'boolean') continue;
      fresh.daily[day] = {
        score: count(entry.score),
        stars: Math.min(3, count(entry.stars)),
        won: entry.won,
      };
    }
    for (const [level, raw] of Object.entries(record(saved.failures))) {
      if (count(raw) > 0) fresh.failures[level] = count(raw);
    }
    fresh.fragments = count(saved.fragments);
    const upgrades = record(saved.upgrades);
    for (const id of UPGRADE_IDS) {
      const rank = Math.min(MAX_RANK, count(upgrades[id]));
      if (rank > 0) fresh.upgrades[id] = rank;
    }
    return fresh;
  }
}
