import type { WorldId } from '@/levels/campaign';

/** Where a cosmetic goes (specification § 3.6). */
export type CosmeticSlot = 'shooter' | 'trail' | 'burst' | 'board';

export const SLOTS: readonly CosmeticSlot[] = ['shooter', 'trail', 'burst', 'board'];

/**
 * A purely cosmetic item: it never changes how the game plays. It is either
 * free, bought with shards, or unlocked by finishing a world.
 */
export interface Cosmetic {
  readonly id: string;
  readonly slot: CosmeticSlot;
  readonly price: number;
  /** Earned by finishing this world instead of being bought. */
  readonly unlockedBy?: WorldId;
}

export const COSMETICS: readonly Cosmetic[] = [
  { id: 'shooter-orbit', slot: 'shooter', price: 0 },
  { id: 'shooter-crown', slot: 'shooter', price: 150 },
  { id: 'shooter-halo', slot: 'shooter', price: 250 },
  { id: 'shooter-eye', slot: 'shooter', price: 350 },
  { id: 'trail-none', slot: 'trail', price: 0 },
  { id: 'trail-comet', slot: 'trail', price: 80 },
  { id: 'trail-stardust', slot: 'trail', price: 160 },
  { id: 'trail-prism', slot: 'trail', price: 260 },
  { id: 'burst-glass', slot: 'burst', price: 0 },
  { id: 'burst-stars', slot: 'burst', price: 180 },
  { id: 'burst-pixels', slot: 'burst', price: 240 },
  { id: 'burst-petals', slot: 'burst', price: 320 },
  // "world" dresses each level in its own world's theme.
  { id: 'board-world', slot: 'board', price: 0 },
  { id: 'board-nebula', slot: 'board', price: 0 },
  { id: 'board-neon', slot: 'board', price: 0, unlockedBy: 'nebula' },
  { id: 'board-abyss', slot: 'board', price: 0, unlockedBy: 'neon' },
  { id: 'board-jewel', slot: 'board', price: 0, unlockedBy: 'abyss' },
];

/** What every new player owns and wears. */
export const DEFAULT_LOOK: Readonly<Record<CosmeticSlot, string>> = {
  shooter: 'shooter-orbit',
  trail: 'trail-none',
  burst: 'burst-glass',
  board: 'board-world',
};

export function findCosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((cosmetic) => cosmetic.id === id);
}

/** Owned from the start: free items that no world has to unlock. */
export const STARTER_ITEMS: readonly string[] = COSMETICS.filter(
  (cosmetic) => cosmetic.price === 0 && !cosmetic.unlockedBy,
).map((cosmetic) => cosmetic.id);
