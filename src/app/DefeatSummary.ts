import type { GameReport } from '@/engine/Game';
import type { HintId } from '@/levels/campaign';
import type { Aiming } from '@/levels/seat';

/** How the player aims: a gesture is told differently to a finger and to a mouse (v1.8.1). */
export type { Aiming };

/** From this share of the level destroyed, a defeat reads "So close!" (decided on 28/10/2026). */
export const CLOSE_SHARE = 0.7;

/** A gesture a defeat's tip can teach (v1.8.1). */
export type Gesture = 'swap' | 'charge';

/** What was left to destroy when the chain reached the hole. */
export interface Remainder {
  readonly what: 'marbles' | 'colossus';
  readonly count: number;
}

/** A gesture the game teaches, and whether the defeated game never used it. */
interface GestureTip {
  readonly gesture: Gesture;
  readonly unused: (report: GameReport) => boolean;
}

/**
 * The tips of a defeat, the first that applies (spec § 3.17): a gesture the
 * player never made in the game, else the level's own hint, else the chain
 * reaction, which pushes the chain back.
 */
const GESTURES: readonly GestureTip[] = [
  { gesture: 'swap', unused: (report) => report.swaps === 0 },
  { gesture: 'charge', unused: (report) => report.chargedShots === 0 },
];
/** Hints that open a level rather than help after losing it. */
const OPENING_HINTS: ReadonlySet<HintId> = new Set(['aim', 'match', 'swap']);
const FALLBACK_TIP = 'hints.reaction';

interface DefeatSummaryOptions {
  readonly left: Remainder;
  readonly share: number;
  readonly reaction: number;
  readonly gesture: Gesture | null;
  readonly tip: string;
}

/**
 * A defeat as its screen tells it (v1.8.1, spec § 3.17): honestly, how close
 * it came (what was left to destroy, the share destroyed), the deepest chain
 * reaction of the game, and one tip.
 */
export class DefeatSummary {
  readonly left: Remainder;
  /** Share of the level destroyed, from 0 to 1. */
  readonly share: number;
  /** Deepest chain reaction of the game (1 when there was none). */
  readonly reaction: number;
  /** The gesture the tip teaches, or null when it is the level's hint. */
  readonly gesture: Gesture | null;
  /** The tip, as a text key. */
  readonly tip: string;

  private constructor({ left, share, reaction, gesture, tip }: DefeatSummaryOptions) {
    this.left = left;
    this.share = Math.min(1, Math.max(0, share));
    this.reaction = reaction;
    this.gesture = gesture;
    this.tip = tip;
  }

  /** The defeat a game's report tells, to a player aiming this way, on a level with this hint. */
  static of(report: GameReport, aiming: Aiming, hint: HintId | null): DefeatSummary {
    const colossus = report.colossus;
    const left: Remainder = colossus
      ? { what: 'colossus', count: Math.max(1, Math.ceil(colossus.hp)) }
      : { what: 'marbles', count: report.ballsLeft };
    const share = colossus
      ? 1 - colossus.hp / Math.max(1, colossus.maxHp)
      : report.ballsDestroyed / Math.max(1, report.ballsDestroyed + report.ballsLeft);
    const gesture = GESTURES.find((candidate) => candidate.unused(report))?.gesture ?? null;
    const levelTip = hint !== null && !OPENING_HINTS.has(hint) ? `hints.${hint}` : FALLBACK_TIP;
    return new DefeatSummary({
      left,
      share,
      reaction: report.bestDepth,
      gesture,
      tip: gesture ? `game.defeat.tips.${gesture}.${aiming}` : levelTip,
    });
  }

  /** It came close: it reads "So close!"; otherwise "The chain wins". */
  get close(): boolean {
    return this.share >= CLOSE_SHARE;
  }
}
