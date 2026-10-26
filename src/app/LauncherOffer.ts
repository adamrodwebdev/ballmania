import { shallowRef } from 'vue';
import type { Cosmetic } from '@/player/catalog';

/** What the offer reads of the player's wallet and wardrobe, and changes there. */
export interface LauncherWallet {
  readonly shards: number;
  buy(id: string): boolean;
  equip(id: string): boolean;
}

/**
 * Milliseconds into the tap (the storyboard validated on 26/10/2026): the
 * launcher is worn, the bar refills toward the next one, all is at rest.
 */
export const EQUIP_TIMES = { worn: 320, refill: 420, rest: 720 } as const;

/** Where the tap's motion stands: the shards fly, the launcher is worn, the bar refills, rest. */
export type EquipPhase = 'flying' | 'worn' | 'refill' | 'rest';

/** What the line under the bar says. */
export type OfferLine =
  | { readonly kind: 'progress'; readonly have: number; readonly price: number }
  | { readonly kind: 'price'; readonly price: number }
  | {
      readonly kind: 'next';
      readonly item: Cosmetic;
      readonly have: number;
      readonly price: number;
    }
  | { readonly kind: 'blank' };

/** The row as it is drawn now. */
export interface OfferView {
  /** The launcher in the picture. */
  readonly item: Cosmetic;
  /** The title says the launcher is worn, rather than naming it. */
  readonly worn: boolean;
  /** The bar shows; once nothing is left to aim at, it keeps its place, unseen. */
  readonly bar: boolean;
  /** Share of the bar filled, as drawn (0 to 1). */
  readonly fill: number;
  readonly line: OfferLine;
  /** The launcher « Équiper » buys and wears, or null: no button. */
  readonly takeable: Cosmetic | null;
  /** The shards fly from the bar into the picture. */
  readonly flying: boolean;
  /** The picture swells and glows: the launcher is worn. */
  readonly popped: boolean;
}

/**
 * The launcher a win's shards bring closer, on the victory panel (§ 3.5,
 * v1.8.0): its bar fills; once the shards are there, one tap on « Équiper »
 * buys and wears it, then the bar aims at the next launcher on sale, which
 * the same button takes in turn when it is within reach. Nothing is bought
 * without that tap, and the Workshop stays there to choose otherwise.
 */
export class LauncherOffer {
  private readonly wornItem = shallowRef<Cosmetic | null>(null);
  private readonly phase = shallowRef<EquipPhase>('rest');
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private readonly wallet: LauncherWallet,
    /** False with reduced motion: the row changes at once. */
    private readonly motion: boolean,
  ) {}

  /**
   * The row while the bar aims at `goal`, the cheapest launcher on sale not
   * owned (null when none is left), or null when there is nothing to show.
   */
  view(goal: Cosmetic | null): OfferView | null {
    const worn = this.wornItem.value;
    const shards = this.wallet.shards;
    if (!worn) {
      if (!goal) return null;
      const ready = shards >= goal.price;
      return {
        item: goal,
        worn: false,
        bar: true,
        fill: ready ? 1 : shards / goal.price,
        line: ready
          ? { kind: 'price', price: goal.price }
          : { kind: 'progress', have: shards, price: goal.price },
        takeable: ready ? goal : null,
        flying: false,
        popped: false,
      };
    }
    const phase = this.phase.value;
    const settled = phase === 'refill' || phase === 'rest';
    const aim = settled ? goal : null;
    return {
      item: worn,
      worn: phase !== 'flying',
      bar: !settled || goal !== null,
      fill: aim ? Math.min(1, shards / aim.price) : 0,
      line: this.wornLine(worn, aim, phase),
      takeable: phase === 'rest' && aim && shards >= aim.price ? aim : null,
      flying: phase === 'flying',
      popped: phase === 'worn',
    };
  }

  /** Under the bar once a launcher is bought: its price while the shards fly, then the next one. */
  private wornLine(worn: Cosmetic, aim: Cosmetic | null, phase: EquipPhase): OfferLine {
    if (aim) return { kind: 'next', item: aim, have: this.wallet.shards, price: aim.price };
    if (phase === 'flying') return { kind: 'price', price: worn.price };
    return { kind: 'blank' };
  }

  /** The tap: buys and wears `item`, then plays the motion. False if it cannot be bought. */
  take(item: Cosmetic): boolean {
    if (!this.wallet.buy(item.id)) return false;
    this.wallet.equip(item.id);
    this.stop();
    this.wornItem.value = item;
    if (!this.motion) {
      this.phase.value = 'rest';
      return true;
    }
    this.phase.value = 'flying';
    this.timers = (['worn', 'refill', 'rest'] as const).map((phase) =>
      setTimeout(() => (this.phase.value = phase), EQUIP_TIMES[phase]),
    );
    return true;
  }

  /** The panel goes: no timer outlives it. */
  stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
