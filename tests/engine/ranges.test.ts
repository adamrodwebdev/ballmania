import { describe, expect, it } from 'vitest';
import {
  openingUpgrade,
  rangeOf,
  rangeOpening,
  RANGES,
  UPGRADE_RANGES,
  type UpgradeStanding,
} from '@/engine/upgrades/ranges';
import { UPGRADE_IDS, type UpgradeId } from '@/engine/upgrades/Upgrades';

/** A player who can afford these upgrades and has these at their best. */
const standing = (
  affordable: readonly UpgradeId[],
  maxed: readonly UpgradeId[] = [],
): UpgradeStanding => ({
  affordable: (id) => affordable.includes(id),
  maxed: (id) => maxed.includes(id),
});

describe("the Observatory's ranges (v1.8.0)", () => {
  it('sort every upgrade into exactly one range', () => {
    const sorted = RANGES.flatMap((range) => UPGRADE_RANGES[range]);
    expect([...sorted].sort()).toEqual([...UPGRADE_IDS].sort());
    for (const id of UPGRADE_IDS) expect(UPGRADE_RANGES[rangeOf(id)]).toContain(id);
  });

  it('open on the first upgrade the player can buy, in the order of the tabs', () => {
    expect(openingUpgrade(standing(['anchor', 'shockwave']))).toBe('shockwave');
    expect(openingUpgrade(standing(['nova', 'chronos']))).toBe('nova');
  });

  it('else on the first upgrade not at its best, else on the first of all', () => {
    expect(openingUpgrade(standing([], ['eye', 'prism']))).toBe('nova');
    expect(openingUpgrade(standing([], [...UPGRADE_IDS]))).toBe('eye');
  });

  it('open each tab on what can be bought there first', () => {
    expect(rangeOpening('weather', standing(['anchor']))).toBe('anchor');
    expect(rangeOpening('weather', standing([], ['shield']))).toBe('icebreaker');
    expect(rangeOpening('chain', standing([], ['chronos', 'shockwave', 'secondChance']))).toBe(
      'chronos',
    );
  });
});
