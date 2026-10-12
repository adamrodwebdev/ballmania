import { describe, expect, it } from 'vitest';
import { COSMETICS, DEFAULT_LOOK } from '@/player/catalog';
import { resolveLook } from '@/play/cosmetics/Look';
import { GlassShards, PetalShards, PixelShards, StarShards } from '@/play/cosmetics/ShardShapes';
import { CrownSkin, OrbitSkin } from '@/play/cosmetics/ShooterSkins';
import { CometTrail, NoTrail } from '@/play/cosmetics/Trails';
import { NeonTheme } from '@/play/themes/NeonTheme';
import { NebulaTheme } from '@/play/themes/WorldTheme';

describe('Look', () => {
  it('resolves the default look, the world board and equipped items', () => {
    const base = resolveLook(DEFAULT_LOOK, 'nebula');
    expect(base.shooter).toBeInstanceOf(OrbitSkin);
    expect(base.trail).toBeInstanceOf(NoTrail);
    expect(base.shards).toBeInstanceOf(GlassShards);
    expect(base.theme).toBeInstanceOf(NebulaTheme);
    expect(resolveLook(DEFAULT_LOOK, 'neon').theme).toBeInstanceOf(NeonTheme);
    const dressed = resolveLook(
      { shooter: 'shooter-crown', trail: 'trail-comet', burst: 'burst-stars', board: 'board-neon' },
      'nebula',
    );
    expect(dressed.shooter).toBeInstanceOf(CrownSkin);
    expect(dressed.trail).toBeInstanceOf(CometTrail);
    expect(dressed.shards).toBeInstanceOf(StarShards);
    expect(dressed.theme).toBeInstanceOf(NeonTheme);
  });

  it('falls back to the defaults for unknown ids', () => {
    const look = resolveLook({ shooter: 'x', trail: 'y', burst: 'z', board: 'w' }, 'nebula');
    expect(look.shooter).toBeInstanceOf(OrbitSkin);
    expect(look.theme).toBeInstanceOf(NebulaTheme);
  });

  it('can draw every cosmetic of the catalog', () => {
    for (const item of COSMETICS) {
      const look = resolveLook({ ...DEFAULT_LOOK, [item.slot]: item.id }, 'nebula');
      expect(look, item.id).toBeDefined();
    }
  });
});

describe('ShardShapes', () => {
  it.each([
    ['glass', new GlassShards(), 3],
    ['stars', new StarShards(), 10],
    ['pixels', new PixelShards(), 4],
    ['petals', new PetalShards(), 8],
  ] as const)('%s gives a closed polygon within its size', (_, shape, corners) => {
    const outline = shape.outline(() => 0.3, 10);
    expect(outline).toHaveLength(corners * 2);
    for (const value of outline) expect(Math.abs(value)).toBeLessThanOrEqual(12.01);
  });
});
