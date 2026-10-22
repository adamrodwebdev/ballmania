import type { GameReport } from '@/engine/Game';
import type { HintId, WorldId } from '@/levels/campaign';
import type { UpgradeRanks } from '@/engine/upgrades/Upgrades';
import type { Difficulty } from '@/levels/difficulty';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';
import type { Rewards } from '@/player/PlayerProfile';
import type { AppServices } from '../AppServices';
import type { PlayRequest } from '../PlayRequest';

/** A text of the interface, as an i18n key and its parameters: modes never translate. */
export interface Message {
  readonly key: string;
  /** Values in the text; a message among them is translated first ("Boss: {name}"). */
  readonly params?: Readonly<Record<string, string | number | Message>>;
}

/** What to offer after a win: the game, its button label, what it brings that is new. */
export interface NextGame {
  readonly request: PlayRequest;
  readonly label: Message;
  /** A new world, a Colossus, a power marble or a mechanic, said under the label. */
  readonly detail?: Message;
}

/** What the player brings to a game: the assistance, the difficulty, the upgrades. */
export interface PlayOptions {
  readonly assisted: boolean;
  readonly difficulty: Difficulty;
  readonly upgrades: UpgradeRanks;
}

/** What a finished game earned, for the end dialog. */
export interface Settlement {
  /** Stars earned, or null for a mode without stars. */
  readonly stars: number | null;
  /** Stars this game added to the campaign's total (0 elsewhere). */
  readonly starsGained?: number;
  /** The record of the mode after this game, or null for a mode without one. */
  readonly record: {
    readonly value: number;
    readonly newBest: boolean;
    /** How the record reads: a score, or a number of duels won. */
    readonly unit: 'score' | 'wins';
  } | null;
  readonly rewards: Rewards;
}

/**
 * One way of playing (specification § 3.2): a campaign level, the daily
 * challenge, or an Arcade mode. The game screen asks its mode for the level,
 * the texts around the board and what to do with the result, instead of
 * testing what kind of game it shows.
 */
export interface PlayMode {
  readonly request: PlayRequest;
  /** The world whose backdrop and Colossus name the game uses. */
  readonly world: WorldId;
  readonly hint: HintId | null;
  /** The three mixes of the Jewel world stay on screen. */
  readonly alchemy: boolean;
  /** Seed of the balls when everyone must get the same game, else null. */
  readonly seed: string | null;
  /** Short name in the top bar ("3-7", "Endless"…). */
  readonly label: Message;
  /**
   * After a defeat, the player may continue once with a rewarded ad (§ 3.7):
   * the campaign and Endless, never a game that is compared (daily challenge,
   * puzzle, song, duel).
   */
  readonly continuable: boolean;
  /** Where leaving the game leads. */
  readonly home: 'campaign' | 'home' | 'arcade';
  /** Title of the end dialog. */
  outcome(won: boolean): Message;
  /**
   * The level for this board shape: slowed down when assisted, at the
   * campaign difficulty, with the player's upgrades (the campaign only).
   */
  definition(frame: Frame, options: PlayOptions): LevelDefinition;
  /** Saves the finished game and pays its rewards. */
  settle(report: GameReport, services: AppServices): Settlement;
  /** What to offer after a win, if anything is open. */
  next(services: AppServices): NextGame | null;
}
