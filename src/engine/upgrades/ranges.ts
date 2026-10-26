import { UPGRADE_IDS, type UpgradeId } from './Upgrades';

/** What an upgrade acts on (v1.8.0): the player's shot, the chain, or a world's weather. */
export type UpgradeRange = 'shot' | 'chain' | 'weather';

/** The Observatory's tabs, in order, each with its upgrades in the order shown. */
export const UPGRADE_RANGES: Readonly<Record<UpgradeRange, readonly UpgradeId[]>> = {
  shot: ['eye', 'prism', 'nova', 'catcher'],
  chain: ['chronos', 'shockwave', 'secondChance'],
  weather: ['shield', 'icebreaker', 'anchor'],
};

export const RANGES: readonly UpgradeRange[] = ['shot', 'chain', 'weather'];

/** The range an upgrade belongs to. */
export function rangeOf(id: UpgradeId): UpgradeRange {
  return RANGES.find((range) => UPGRADE_RANGES[range].includes(id)) ?? 'shot';
}

/** Where an upgrade stands for the player: whether its next rank can be bought, or is the last. */
export interface UpgradeStanding {
  readonly affordable: (id: UpgradeId) => boolean;
  readonly maxed: (id: UpgradeId) => boolean;
}

/**
 * The upgrade the Observatory opens on (v1.8.0): the first one the player
 * can buy, in the tabs' order; else the first not at its best; else the first.
 */
export function openingUpgrade({ affordable, maxed }: UpgradeStanding): UpgradeId {
  const order = RANGES.flatMap((range) => UPGRADE_RANGES[range]);
  return order.find(affordable) ?? order.find((id) => !maxed(id)) ?? UPGRADE_IDS[0]!;
}

/** The upgrade a tab opens on: the first the player can buy, else the first not at its best. */
export function rangeOpening(
  range: UpgradeRange,
  { affordable, maxed }: UpgradeStanding,
): UpgradeId {
  const ids = UPGRADE_RANGES[range];
  return ids.find(affordable) ?? ids.find((id) => !maxed(id)) ?? ids[0]!;
}
