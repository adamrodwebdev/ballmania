import type { GameReport } from '@/engine/Game';
import type { HintId, WorldId } from '@/levels/campaign';
import type { UpgradeRanks } from '@/engine/upgrades/Upgrades';
import type { Difficulty } from '@/levels/difficulty';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';
import type { TrainingStep } from '@/levels/training';
import type { DailyChallenge } from '@/player/DailyChallenge';
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
  /** The world whose backdrop the game uses. */
  readonly world: WorldId;
  /** The name of the Colossus the game opposes, over its health in the top bar; null without one. */
  readonly boss: Message | null;
  readonly hint: HintId | null;
  /** The three mixes of the Jewel world stay on screen. */
  readonly alchemy: boolean;
  /** Seed of the balls when everyone must get the same game, else null. */
  readonly seed: string | null;
  /** Short name in the top bar ("3-7", "Endless"…). */
  readonly label: Message;
  /**
   * Points of the second and third stars, for the gauge under the score (the
   * first star is the win itself); null where stars don't come from points.
   */
  readonly stars: readonly [number, number] | null;
  /**
   * After a defeat, the player may continue once with a rewarded ad (§ 3.7):
   * the campaign and Endless, never a game that is compared (daily challenge,
   * puzzle, song, duel).
   */
  readonly continuable: boolean;
  /** Where leaving the game leads. */
  readonly home: 'campaign' | 'home' | 'arcade';
  /** The daily challenge this game is (its date heads the result, its record is shared), or null. */
  readonly daily: DailyChallenge | null;
  /** The game starts assisted: a campaign level the player chose to retry with help. */
  readonly assisted: boolean;
  /** The duel's rope, on the second line of the HUD. */
  readonly rope: boolean;
  /** The world whose music plays, or null when the mode plays its own song (Rhythm). */
  readonly music: WorldId | null;
  /** The key of the mode's own song, in hertz (Rhythm), else null. */
  readonly root: number | null;
  /** The very first level teaches by a gesture: a hand shows how to aim and shoot. */
  readonly tutorial: boolean;
  /** The campaign difficulty applies to this game: its name shows under the level's. */
  readonly ranked: boolean;
  /** What the swap button says: in a puzzle, it shows the next colour. */
  readonly swapLabel: Message;
  /** A hint can be had from the pause menu, on a portal (puzzles). */
  readonly hintable: boolean;
  /** The par of a puzzle, for its result, else null. */
  readonly par: number | null;
  /** The level whose defeats count toward the assistance, or null where there is none. */
  readonly assistLevel: string | null;
  /** A win of this game finishes the campaign. */
  readonly finale: boolean;
  /**
   * A showcase of the training (v1.8.0): its place among them, for the dots
   * of the top bar, « Passer » and the chained flow; null for every other game.
   */
  readonly training: { readonly step: TrainingStep; readonly of: number } | null;
  /**
   * A result worth a portal's celebration besides the items it unlocked: the
   * campaign's last level won, a new Endless record.
   */
  celebrates(won: boolean, settlement: Settlement): boolean;
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
