import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EQUIP_TIMES, LauncherOffer } from '@/app/LauncherOffer';
import { COSMETICS, findCosmetic, nextLauncher } from '@/player/catalog';
import { PlayerProfile } from '@/player/PlayerProfile';
import { MemoryStorage } from '@/services/KeyValueStorage';

const crown = findCosmetic('shooter-crown')!;
const halo = findCosmetic('shooter-halo')!;
const eye = findCosmetic('shooter-eye')!;

/** A player with this many shards, on memory storage. */
const playerWith = (shards: number) => {
  const player = new PlayerProfile(new MemoryStorage());
  player.grantShards(shards);
  return player;
};
/** The launcher the victory panel's bar aims at for this player. */
const goalOf = (player: PlayerProfile) => nextLauncher((id) => player.owns(id));

describe('the launcher offer of the victory panel (v1.8.0)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fills its bar toward the Crown, with no button, while shards are short', () => {
    const player = playerWith(65);
    const view = new LauncherOffer(player, true).view(goalOf(player))!;
    expect(view).toMatchObject({
      item: crown,
      worn: false,
      bar: true,
      takeable: null,
      line: { kind: 'progress', have: 65, price: 150 },
    });
    expect(view.fill).toBeCloseTo(65 / 150);
  });

  it('offers « Équiper » once the bar is full, and buys nothing before the tap', () => {
    const player = playerWith(215);
    const offer = new LauncherOffer(player, true);
    expect(offer.view(goalOf(player))).toMatchObject({
      item: crown,
      fill: 1,
      takeable: crown,
      line: { kind: 'price', price: 150 },
    });
    expect(player.owns('shooter-crown')).toBe(false);
    expect(player.shards).toBe(215);
  });

  it('buys and wears the launcher in one tap, then plays the motion toward the next one', () => {
    const player = playerWith(215);
    const offer = new LauncherOffer(player, true);
    expect(offer.take(crown)).toBe(true);
    expect(player.owns('shooter-crown')).toBe(true);
    expect(player.equipped('shooter')).toBe('shooter-crown');
    expect(player.shards).toBe(65);
    // The shards fly into the picture: the bar drains, the price still under it.
    expect(offer.view(goalOf(player))).toMatchObject({
      item: crown,
      worn: false,
      fill: 0,
      flying: true,
      takeable: null,
      line: { kind: 'price', price: 150 },
    });
    vi.advanceTimersByTime(EQUIP_TIMES.worn);
    expect(offer.view(goalOf(player))).toMatchObject({
      worn: true,
      popped: true,
      flying: false,
      fill: 0,
      line: { kind: 'blank' },
    });
    vi.advanceTimersByTime(EQUIP_TIMES.refill - EQUIP_TIMES.worn);
    const refilled = offer.view(goalOf(player))!;
    expect(refilled).toMatchObject({
      item: crown,
      worn: true,
      popped: false,
      line: { kind: 'next', item: halo, have: 65, price: 250 },
    });
    expect(refilled.fill).toBeCloseTo(65 / 250);
    vi.advanceTimersByTime(EQUIP_TIMES.rest - EQUIP_TIMES.refill);
    expect(offer.view(goalOf(player))).toMatchObject({ worn: true, flying: false, takeable: null });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('offers the next launcher in turn when the shards cover it too, one tap each', () => {
    const player = playerWith(450);
    const offer = new LauncherOffer(player, true);
    offer.take(crown);
    expect(offer.view(goalOf(player))!.takeable).toBeNull();
    vi.advanceTimersByTime(EQUIP_TIMES.rest);
    expect(offer.view(goalOf(player))).toMatchObject({
      item: crown,
      worn: true,
      fill: 1,
      takeable: halo,
    });
    expect(offer.take(halo)).toBe(true);
    expect(player.equipped('shooter')).toBe('shooter-halo');
    expect(player.shards).toBe(50);
  });

  it('changes at once with reduced motion', () => {
    const player = playerWith(215);
    const offer = new LauncherOffer(player, false);
    offer.take(crown);
    expect(offer.view(goalOf(player))).toMatchObject({
      worn: true,
      flying: false,
      popped: false,
      line: { kind: 'next', item: halo },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps its row once the last launcher is worn, the bar unseen but in place', () => {
    const player = playerWith(150 + 250 + 350);
    player.buy('shooter-crown');
    player.buy('shooter-halo');
    const offer = new LauncherOffer(player, false);
    expect(goalOf(player)).toEqual(eye);
    offer.take(eye);
    expect(goalOf(player)).toBeNull();
    expect(offer.view(null)).toMatchObject({
      item: eye,
      worn: true,
      bar: false,
      takeable: null,
      line: { kind: 'blank' },
    });
  });

  it('refuses a launcher the shards cannot pay', () => {
    const player = playerWith(100);
    const offer = new LauncherOffer(player, true);
    expect(offer.take(crown)).toBe(false);
    expect(player.owns('shooter-crown')).toBe(false);
    expect(offer.view(goalOf(player))).toMatchObject({ worn: false, takeable: null });
  });

  it('leaves no timer behind when the panel goes', () => {
    const offer = new LauncherOffer(playerWith(215), true);
    offer.take(crown);
    offer.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('has a line for every launcher on sale, saying it is worn', () => {
    // The other languages hold the same keys (tests/i18n/locales.test.ts).
    const fr = JSON.parse(
      readFileSync(new URL('../../src/i18n/locales/fr.json', import.meta.url), 'utf8'),
    ) as { game: { reward: { equipped: Record<string, string> } } };
    for (const item of COSMETICS.filter((cosmetic) => cosmetic.slot === 'shooter')) {
      if (item.price > 0) expect(fr.game.reward.equipped[item.id], item.id).toBeTypeOf('string');
    }
  });
});
