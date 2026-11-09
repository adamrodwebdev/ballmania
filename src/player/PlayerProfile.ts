import { reactive, readonly, shallowRef } from 'vue';
import type { GameReport } from '@/engine/Game';
import type { WorldId } from '@/levels/campaign';
import type { TrainingStep } from '@/levels/training';
import { DAY, IDENTIFIER, isDayKey, keyOf, LEVEL_ID, readDay } from '@/rules/formats';
import { orElse, readChoice, readText, type InputRecord } from '@/rules/input';
import { COUNT_LIMITS, NUMBER_RULES, SAVE_LIMITS } from '@/rules/limits';
import type { KeyValueStorage } from '@/services/KeyValueStorage';
import { readList, readMap, SaveSlot } from '@/services/SaveSlot';
import {
  EMPTY_STATS,
  newlyReached,
  type Achievement,
  type PlayerStats,
  type StatName,
} from './achievements';
import {
  COSMETICS,
  DEFAULT_LOOK,
  findCosmetic,
  SLOTS,
  STARTER_ITEMS,
  type Cosmetic,
  type CosmeticSlot,
} from './catalog';
import { DailyGift, GIFT_SHARDS, type GiftOffer, type GiftRecord } from './DailyGift';
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
export const PLAYER_VERSION = 2;
/** The versions a save may have: 1 until v1.7, 2 since (the Star heart by default). */
const PLAYER_VERSIONS: readonly number[] = [1, PLAYER_VERSION];

/** Tips shown once, then never again (v1.7.4): the bubble that points at the Observatory. */
export type TipId = 'observatory';
const TIP_IDS: readonly TipId[] = ['observatory'];

/** The training's steps (its module stays out of the menus' code until it is played). */
const TRAINING_STEPS: readonly TrainingStep[] = [1, 2, 3];
const COSMETIC_IDS: readonly string[] = COSMETICS.map((item) => item.id);
const STAT_NAMES = Object.keys(EMPTY_STATS) as StatName[];
/** The stars of a daily challenge: none when it was lost. */
const DAILY_STARS = { min: 0, max: 3, integer: true } as const;
/** Defeats in a row on a level: a level without any is not saved. */
const DEFEATS = { min: 1, max: Number.MAX_SAFE_INTEGER, integer: true } as const;
const RANK = { min: 0, max: MAX_RANK, integer: true } as const;
const GIFT_STREAK = { min: 1, max: GIFT_SHARDS.length, integer: true } as const;
const isLevelId = keyOf(LEVEL_ID);

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
  /** The daily gift's streak (v1.7). */
  gift: GiftRecord;
  /** The one-time tips already shown. */
  tips: TipId[];
  /** The training (v1.8.0): the showcase it resumes at, and whether it is over. */
  training: { step: TrainingStep; done: boolean };
}

/**
 * The player's belongings and history (specification § 3.6): shards, owned
 * and equipped cosmetics, lifetime counters, achievements, daily challenges
 * and failure streaks (for the assistance). Everything a game earns goes
 * through `recordGame`. Saved on every change; read field by field
 * (`SaveSlot`), each bad field falling back to its default.
 */
export class PlayerProfile {
  private readonly slot: SaveSlot;
  private readonly state: State;
  /** Read-only, reactive view for the interface. */
  readonly view: Readonly<State>;
  private readonly trialItem = shallowRef<string | null>(null);

  constructor(storage: KeyValueStorage) {
    this.slot = new SaveSlot(storage, { key: PLAYER_KEY, maxLength: SAVE_LIMITS.player });
    this.state = reactive(
      this.slot.load(
        (save) => PlayerProfile.read(save),
        () => PlayerProfile.fresh(),
      ),
    );
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
  /** Today's daily gift (v1.7): the day of the streak, taken or not. */
  giftOffer(today: Date): GiftOffer {
    return new DailyGift(this.state.gift).offer(today);
  }

  /** Takes today's daily gift: its shards go to the wallet. Returns them, 0 if already taken. */
  takeGift(today: Date): number {
    const { record, shards } = new DailyGift(this.state.gift).take(today);
    if (shards === 0) return 0;
    this.state.gift = record;
    this.state.shards += shards;
    this.save();
    return shards;
  }

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

  /**
   * True when the map should point at the Observatory (v1.7.4): a first
   * upgrade can be bought, none has been yet, and the bubble was never shown.
   */
  get observatoryTipDue(): boolean {
    return (
      this.upgradeAffordable &&
      UPGRADE_IDS.every((id) => this.upgradeRank(id) === 0) &&
      !this.state.tips.includes('observatory')
    );
  }

  /**
   * A one-time tip has been shown, or what it points at was opened: it never comes back. The game
   * notes it by itself, so it is never saved over a profile that could not be read.
   */
  markTipSeen(id: TipId): void {
    if (this.state.tips.includes(id)) return;
    this.state.tips.push(id);
    this.slot.note(this.saved());
  }

  /** Where the training stands (v1.8.0): the showcase to play next, and whether it is over. */
  get training(): { readonly step: TrainingStep; readonly done: boolean } {
    return this.state.training;
  }

  /** A showcase was won: an interrupted training resumes at the next one. */
  reachTraining(step: TrainingStep): void {
    if (this.state.training.done || step <= this.state.training.step) return;
    this.state.training = { step, done: false };
    this.save();
  }

  /** The training is over, finished or skipped: it never comes back. */
  finishTraining(): void {
    if (this.state.training.done) return;
    this.state.training = { ...this.state.training, done: true };
    this.save();
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
    this.slot.write(this.saved());
  }

  /** The profile as it is saved. */
  private saved(): unknown {
    return { version: PLAYER_VERSION, ...this.state };
  }

  private static fresh(): State {
    return {
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
      gift: { last: null, streak: 0 },
      tips: [],
      training: { step: 1, done: false },
    };
  }

  /** A profile of version 1 or 2, field by field: a field that cannot be read keeps its default. */
  private static read(save: InputRecord): State {
    // Another version's save is not read here: it is kept as it is (SaveSlot).
    const version = save.choice('version', PLAYER_VERSIONS);
    const count = (field: string) => orElse(() => save.number(field, NUMBER_RULES.count), 0);
    const owned = [
      ...new Set([
        ...STARTER_ITEMS,
        ...readList(save, 'owned', {
          maxItems: COUNT_LIMITS.owned,
          item: (value, field) => readChoice(value, COSMETIC_IDS, field),
        }),
      ]),
    ];
    const equipped = PlayerProfile.readLook(save, owned);
    // Version 1 wore the first launcher by default: from 1.7, everyone gets the Star heart.
    if (version === 1 && equipped.shooter === 'shooter-orbit') {
      equipped.shooter = DEFAULT_LOOK.shooter;
    }
    return {
      shards: count('shards'),
      owned,
      equipped,
      stats: PlayerProfile.readStats(save),
      achievements: readList(save, 'achievements', {
        maxItems: COUNT_LIMITS.achievements,
        item: (value, field) => readText(value, IDENTIFIER, field),
      }),
      worlds: readList(save, 'worlds', {
        maxItems: COUNT_LIMITS.worlds,
        item: (value, field) => readText(value, IDENTIFIER, field),
      }),
      daily: readMap(save, 'daily', {
        maxKeys: COUNT_LIMITS.days,
        isKey: isDayKey,
        entry: (days, day) => {
          const attempt = days.record(day);
          return {
            // Scores, read as numbers, are still floored as before 9 Nov 2026.
            score: Math.floor(orElse(() => attempt.number('score', NUMBER_RULES.score), 0)),
            stars: orElse(() => attempt.number('stars', DAILY_STARS), 0),
            won: orElse(() => attempt.boolean('won'), false),
          };
        },
      }),
      failures: readMap(save, 'failures', {
        maxKeys: COUNT_LIMITS.levels,
        isKey: isLevelId,
        entry: (failures, level) => failures.number(level, DEFEATS),
      }),
      fragments: count('fragments'),
      upgrades: PlayerProfile.readUpgrades(save),
      gift: PlayerProfile.readGift(save),
      tips: PlayerProfile.readTips(save),
      training: PlayerProfile.readTraining(save),
    };
  }

  /** What the player wears, slot by slot: an owned cosmetic of that slot, or the default one. */
  private static readLook(
    save: InputRecord,
    owned: readonly string[],
  ): Record<CosmeticSlot, string> {
    const look = { ...DEFAULT_LOOK };
    const equipped = orElse(() => save.record('equipped'), null);
    for (const slot of SLOTS) {
      const id = orElse(() => equipped?.choice(slot, COSMETIC_IDS) ?? null, null);
      if (id !== null && findCosmetic(id)?.slot === slot && owned.includes(id)) look[slot] = id;
    }
    return look;
  }

  private static readStats(save: InputRecord): PlayerStats {
    const saved = orElse(() => save.record('stats'), null);
    const stats: Record<StatName, number> = { ...EMPTY_STATS };
    for (const name of STAT_NAMES) {
      stats[name] = orElse(() => saved?.number(name, NUMBER_RULES.count) ?? 0, 0);
    }
    return stats;
  }

  private static readUpgrades(save: InputRecord): Partial<Record<UpgradeId, number>> {
    const saved = orElse(() => save.record('upgrades'), null);
    const upgrades: Partial<Record<UpgradeId, number>> = {};
    for (const id of UPGRADE_IDS) {
      const rank = orElse(() => saved?.number(id, RANK) ?? 0, 0);
      if (rank > 0) upgrades[id] = rank;
    }
    return upgrades;
  }

  /** The gift's streak: the last day taken, a real day, and the day of the streak it was. */
  private static readGift(save: InputRecord): GiftRecord {
    const gift = orElse(() => save.record('gift'), null);
    if (!gift) return { last: null, streak: 0 };
    const last = orElse(() => readDay(gift.text('last', DAY), 'player.gift.last'), null);
    if (last === null) return { last: null, streak: 0 };
    return { last, streak: orElse(() => gift.number('streak', GIFT_STREAK), GIFT_STREAK.min) };
  }

  private static readTips(save: InputRecord): TipId[] {
    const seen = readList(save, 'tips', {
      maxItems: COUNT_LIMITS.tips,
      item: (value, field) => readChoice(value, TIP_IDS, field),
    });
    return TIP_IDS.filter((id) => seen.includes(id));
  }

  private static readTraining(save: InputRecord): State['training'] {
    const training = orElse(() => save.record('training'), null);
    return {
      step: orElse(() => training?.choice('step', TRAINING_STEPS) ?? 1, 1),
      done: orElse(() => training?.boolean('done') ?? false, false),
    };
  }
}
