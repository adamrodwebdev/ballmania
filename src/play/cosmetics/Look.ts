import type { WorldId } from '@/levels/campaign';
import type { CosmeticSlot } from '@/player/catalog';
import { AbyssTheme } from '../themes/AbyssTheme';
import { JewelTheme } from '../themes/JewelTheme';
import { NeonTheme } from '../themes/NeonTheme';
import { NebulaTheme, type WorldTheme } from '../themes/WorldTheme';
import { GlassShards, PetalShards, PixelShards, StarShards, type ShardShape } from './ShardShapes';
import { CrownSkin, EyeSkin, HaloSkin, OrbitSkin, type ShooterSkin } from './ShooterSkins';
import { CometTrail, NoTrail, PrismTrail, StardustTrail, type TrailStyle } from './Trails';

/** Everything cosmetic about a game, resolved from what the player wears. */
export interface Look {
  readonly shooter: ShooterSkin;
  readonly trail: TrailStyle;
  readonly shards: ShardShape;
  readonly theme: WorldTheme;
}

const SHOOTERS: Record<string, () => ShooterSkin> = {
  'shooter-orbit': () => new OrbitSkin(),
  'shooter-crown': () => new CrownSkin(),
  'shooter-halo': () => new HaloSkin(),
  'shooter-eye': () => new EyeSkin(),
};

const TRAILS: Record<string, () => TrailStyle> = {
  'trail-none': () => new NoTrail(),
  'trail-comet': () => new CometTrail(),
  'trail-stardust': () => new StardustTrail(),
  'trail-prism': () => new PrismTrail(),
};

const SHARDS: Record<string, () => ShardShape> = {
  'burst-glass': () => new GlassShards(),
  'burst-stars': () => new StarShards(),
  'burst-pixels': () => new PixelShards(),
  'burst-petals': () => new PetalShards(),
};

const BOARDS: Record<string, () => WorldTheme> = {
  'board-nebula': () => new NebulaTheme(),
  'board-neon': () => new NeonTheme(),
  'board-abyss': () => new AbyssTheme(),
  'board-jewel': () => new JewelTheme(),
};

/** The backdrop each world wears when the player keeps "the world's own". */
const WORLD_BOARDS: Partial<Record<WorldId, string>> = {
  nebula: 'board-nebula',
  neon: 'board-neon',
  abyss: 'board-abyss',
  jewel: 'board-jewel',
};

/** Builds the look from equipped cosmetic ids; unknown ids fall back to the defaults. */
export function resolveLook(
  equipped: Readonly<Record<CosmeticSlot, string>>,
  world: WorldId,
): Look {
  const board =
    equipped.board === 'board-world' ? (WORLD_BOARDS[world] ?? 'board-nebula') : equipped.board;
  return {
    shooter: (SHOOTERS[equipped.shooter] ?? SHOOTERS['shooter-orbit']!)(),
    trail: (TRAILS[equipped.trail] ?? TRAILS['trail-none']!)(),
    shards: (SHARDS[equipped.burst] ?? SHARDS['burst-glass']!)(),
    theme: (BOARDS[board] ?? BOARDS['board-nebula']!)(),
  };
}
