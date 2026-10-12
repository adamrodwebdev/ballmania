import type { GameReport } from '@/engine/Game';
import type { HintId, WorldId } from '@/levels/campaign';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';
import type { Rewards } from '@/player/PlayerProfile';
import type { AppServices } from '../AppServices';
import type { PlayRequest } from '../PlayRequest';

/** A text of the interface, as an i18n key and its parameters: modes never translate. */
export interface Message {
  readonly key: string;
  readonly params?: Readonly<Record<string, string | number>>;
}

/** What a finished game earned, for the end dialog. */
export interface Settlement {
  /** Stars earned, or null for a mode without stars. */
  readonly stars: number | null;
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
  /** Where leaving the game leads. */
  readonly home: 'campaign' | 'home' | 'arcade';
  /** Title of the end dialog. */
  outcome(won: boolean): Message;
  /** The level for this board shape (slowed down when assisted). */
  definition(frame: Frame, assisted: boolean): LevelDefinition;
  /** Saves the finished game and pays its rewards. */
  settle(report: GameReport, services: AppServices): Settlement;
  /** What to offer after a win, with its button label, if anything is open. */
  next(services: AppServices): { readonly request: PlayRequest; readonly label: Message } | null;
}
