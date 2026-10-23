import { ref } from 'vue';
import type { GameReport } from '@/engine/Game';
import { ASSIST_AFTER, CONTINUE_PRICE, HINT_COOLDOWN, HINT_PRICE } from '@/player/rewards';
import type { PlayMode, Settlement } from './modes';

/** How a game ended, or null while it goes on. */
export type Ending = 'won' | 'lost' | null;

/** What the rules read of the portal and its ads, and of the player. */
export interface EndOfGameContext {
  /** A portal's build: continuing once and the puzzle hints are offered there (§ 3.7). */
  readonly portal: boolean;
  readonly ads: { readonly rewardsOffered: boolean; readonly reviveOffered: boolean };
  readonly player: { failures(levelId: string): number };
}

/**
 * The rules of the end of a game (§ 3.7 and the portals' rules, v1.7.6): the
 * assistance after repeated defeats, continuing once after a defeat (for a
 * rewarded ad, or for shards: the way without one), doubling a game's shards
 * for an ad, a puzzle hint at most once a minute, and the portal's
 * celebration. The game screen shows the offers; these rules decide them.
 */
export class EndOfGame {
  /** Prices in shards of continuing once and of a puzzle hint. */
  readonly continuePrice = CONTINUE_PRICE;
  readonly hintPrice = HINT_PRICE;
  private readonly continued = ref(false);
  private readonly pending = ref(false);
  private readonly doubled = ref(false);
  private readonly resting = ref(false);
  private restTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly mode: PlayMode,
    private readonly context: EndOfGameContext,
  ) {}

  /** A defeat waits, unsaved, while the player may still continue it. */
  get pendingLoss(): boolean {
    return this.pending.value;
  }

  /**
   * A game was lost: kept unsaved if it may be continued (once a game, on a
   * portal, in a mode that allows it, when the engine can revive it).
   * True if it is kept.
   */
  holdDefeat(revivable: boolean): boolean {
    if (!this.context.portal || !this.mode.continuable || this.continued.value) return false;
    this.pending.value = revivable;
    return revivable;
  }

  /** The player moves on: the defeat kept is to be saved now. True if there was one. */
  releaseDefeat(): boolean {
    if (!this.pending.value) return false;
    this.pending.value = false;
    return true;
  }

  /** The game goes on after its defeat: no second offer in this game. */
  continuedOnce(): void {
    this.continued.value = true;
    this.pending.value = false;
  }

  /** The game's shards were doubled: once a game. */
  doubledOnce(): void {
    this.doubled.value = true;
  }

  /** After repeated defeats of a campaign level: retry it slower (the assistance, § 3.9). */
  offersAssist(ending: Ending, assisted: boolean): boolean {
    const level = this.mode.assistLevel;
    if (level === null || ending !== 'lost' || assisted) return false;
    // A defeat not saved yet counts already.
    return this.context.player.failures(level) + (this.pending.value ? 1 : 0) >= ASSIST_AFTER;
  }

  /** Continuing the defeat kept, once: for a rewarded ad, or for shards. */
  offersContinue(ending: Ending): boolean {
    return this.pending.value && ending === 'lost';
  }

  /** Doubling the shards of a game that paid some, for a rewarded ad, once. */
  offersDouble(ending: Ending, settlement: Settlement | null): boolean {
    return (
      !this.doubled.value &&
      ending !== null &&
      (settlement?.rewards.shards ?? 0) > 0 &&
      this.context.ads.rewardsOffered
    );
  }

  /** A puzzle hint from the pause menu, while playing, and a minute after the last one. */
  offersHint(playing: boolean): boolean {
    return this.mode.hintable && this.context.portal && playing && !this.resting.value;
  }

  /** A hint was shown: the next one waits a minute (offers are not made too often). */
  restHint(): void {
    this.resting.value = true;
    clearTimeout(this.restTimer);
    this.restTimer = setTimeout(() => (this.resting.value = false), HINT_COOLDOWN * 1000);
  }

  /**
   * Starting another game is a natural break, for an ad between games; but
   * never after an offer to continue for an ad: one ad offer a break.
   */
  adBetweenGames(ending: Ending): boolean {
    return !(this.offersContinue(ending) && this.context.ads.reviveOffered);
  }

  /**
   * A result worth the portal's celebration: an item unlocked, or the mode's
   * own reason (the campaign's last level won, an Endless record). Read from
   * the game's report: the game is saved before its result is on screen.
   */
  celebrates(report: Pick<GameReport, 'outcome'>, settlement: Settlement): boolean {
    return (
      settlement.rewards.unlocked.length > 0 ||
      this.mode.celebrates(report.outcome === 'won', settlement)
    );
  }

  /** Another game on the same screen: its offers start afresh. */
  restart(): void {
    this.continued.value = false;
    this.doubled.value = false;
  }

  dispose(): void {
    clearTimeout(this.restTimer);
  }
}
