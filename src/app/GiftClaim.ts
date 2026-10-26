import { shallowRef } from 'vue';

/** What the claim reads and changes of the player's daily gift. */
export interface GiftTaker {
  /** Takes today's gift: the shards it gives, none if it was already taken. */
  takeGift(today: Date): number;
}

/**
 * Milliseconds into the tap: the shards have reached the wallet, and the card
 * folds into the pill that says what tomorrow brings.
 */
export const CLAIM_FOLD = 520;

/**
 * Today's gift taken on the title screen (v1.7; its motion, v1.8.0): the
 * shards fly to the wallet while the card shows the day ticked, then the card
 * folds away. With reduced motion, it folds at once.
 */
export class GiftClaim {
  private readonly flight = shallowRef(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly player: GiftTaker,
    private readonly today: () => Date,
    private readonly motion: boolean,
  ) {}

  /** The shards are on their way to the wallet: the card stays, today ticked. */
  get flying(): boolean {
    return this.flight.value;
  }

  /** The tap: takes today's gift and starts the motion. The shards it gave, 0 if none. */
  take(): number {
    const shards = this.player.takeGift(this.today());
    if (shards <= 0 || !this.motion) return shards;
    this.stop();
    this.flight.value = true;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flight.value = false;
    }, CLAIM_FOLD);
    return shards;
  }

  /** The screen goes: no timer outlives it. */
  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.flight.value = false;
  }
}
