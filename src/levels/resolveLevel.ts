import type { ColossusSetup } from '@/engine/objectives/ColossusObjective';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';
import type { CampaignLevel } from './campaign';
import { LEVEL_DEFAULTS, type LevelDefinition } from './LevelDefinition';
import { buildTrack, type Frame } from './tracks';

/** Turns a campaign level into the geometry of one board shape. */
export function resolveLevel(level: CampaignLevel, frame: Frame): LevelDefinition {
  const track = buildTrack(level.track, frame);
  const radius = LEVEL_DEFAULTS.ballRadius;
  const longest = Math.max(
    ...track.paths.map((points) => Path.fromPoints(points.map(([x, y]) => new Vec2(x, y))).length),
  );
  const colossus: ColossusSetup | undefined = level.colossus && {
    chain: 0,
    hp: level.colossus.hp,
    radius: radius * 2.3,
    reach: radius * 2 * 3,
    phases: [1, 1.25, 1.5],
    spit: level.colossus.spit,
  };
  return {
    id: level.id,
    board: { width: frame.width, height: frame.height },
    shooter: track.shooter,
    chains: track.paths.map((points) => ({
      path: { kind: 'points', points },
      length: level.length,
      tones: level.tones,
      repeatChance: level.repeatChance,
    })),
    speed: level.speed,
    rushSpeed: 420,
    rushDistance: Math.min(900, longest * 0.3),
    // Par: a bit more than half the time the chain would take to reach the hole untouched.
    parTime: Math.round((longest / level.speed) * 0.55),
    ...(colossus ? { colossus } : {}),
  };
}
