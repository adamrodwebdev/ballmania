import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLAIM_FOLD, GiftClaim, type GiftTaker } from '@/app/GiftClaim';

const TODAY = new Date(2026, 9, 26, 10);

/** A player whose gift of `shards` waits: the first take gives it, the next ones nothing. */
const waiting = (shards: number): GiftTaker & { readonly days: Date[] } => {
  const days: Date[] = [];
  let left = shards;
  return {
    days,
    takeGift(today) {
      days.push(today);
      const given = left;
      left = 0;
      return given;
    },
  };
};

/**
 * Today's gift taken on the title screen (v1.8.0): the card stays while the
 * shards fly to the wallet, then folds away.
 */
describe('GiftClaim', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("takes today's gift and holds the card while its shards fly", () => {
    const player = waiting(15);
    const claim = new GiftClaim(player, () => TODAY, true);
    expect(claim.take()).toBe(15);
    expect(player.days).toEqual([TODAY]);
    expect(claim.flying).toBe(true);
    vi.advanceTimersByTime(CLAIM_FOLD - 1);
    expect(claim.flying).toBe(true);
    vi.advanceTimersByTime(1);
    expect(claim.flying).toBe(false);
  });

  it('lets the card fold at once with reduced motion', () => {
    const claim = new GiftClaim(waiting(15), () => TODAY, false);
    expect(claim.take()).toBe(15);
    expect(claim.flying).toBe(false);
  });

  it('plays nothing for a gift already taken', () => {
    const claim = new GiftClaim(waiting(0), () => TODAY, true);
    expect(claim.take()).toBe(0);
    expect(claim.flying).toBe(false);
  });

  it('leaves no timer behind once the screen goes', () => {
    const claim = new GiftClaim(waiting(15), () => TODAY, true);
    claim.take();
    claim.stop();
    expect(claim.flying).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
