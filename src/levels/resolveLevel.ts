import type { ColossusSetup } from '@/engine/objectives/ColossusObjective';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';
import type { CampaignLevel, MirrorRecipe } from './campaign';
import { LEVEL_DEFAULTS, type LevelDefinition, type ReflectorDefinition } from './LevelDefinition';
import { buildTrack, type Frame } from './tracks';

/** Pull of the black hole at strength 1 (units³/s²), tuned so curves read clearly. */
export const BASE_GRAVITY = 6e7;
/** Radius of the event horizon: shots that come closer are swallowed. */
export const HORIZON = 46;
/** Distance between the shooter's ring and the edges of the board. */
export const RING_MARGIN = 70;
/** Shots fly slower around the black hole, so their curve can be read. */
export const ORBIT_SHOT_SPEED = 1050;

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
  // Singularity world: the shooter stands at the bottom of a ring around the
  // black hole, and glides along it when the level says so.
  const centre = [frame.width / 2, frame.height / 2] as const;
  const ring = [centre[0] - RING_MARGIN, centre[1] - RING_MARGIN] as const;
  const orbit =
    level.orbit === undefined
      ? undefined
      : { centre, radius: ring, speed: level.orbit, start: Math.PI / 2 };
  return {
    id: level.id,
    board: { width: frame.width, height: frame.height },
    shooter: level.gravity === undefined ? track.shooter : [centre[0], centre[1] + ring[1]],
    chains: track.paths.map((points, chain) => ({
      path: track.routes?.[chain]
        ? { kind: 'forked' as const, parts: track.routes[chain] }
        : { kind: 'points' as const, points },
      length: level.length,
      tones: level.palette?.length ?? level.tones,
      repeatChance: level.repeatChance,
      ...(level.palette ? { palette: level.palette } : {}),
    })),
    speed: level.speed,
    rushSpeed: 420,
    rushDistance: Math.min(900, longest * 0.3),
    // Par: a bit more than half the time the chain would take to reach the hole untouched.
    parTime: Math.round((longest / level.speed) * 0.55),
    ...(colossus ? { colossus } : {}),
    ...(level.mirrors
      ? { reflectors: level.mirrors.map((mirror) => placeMirror(mirror, frame)) }
      : {}),
    ...(level.magnet ? { magnet: level.magnet } : {}),
    ...(level.palette ? { alchemy: true } : {}),
    ...(level.gravity === undefined
      ? {}
      : {
          gravity: { centre, strength: level.gravity * BASE_GRAVITY, horizon: HORIZON },
          projectileSpeed: ORBIT_SHOT_SPEED,
        }),
    ...(orbit ? { orbit } : {}),
  };
}

/** Turns board fractions into board units for this board shape. */
function placeMirror(mirror: MirrorRecipe, frame: Frame): ReflectorDefinition {
  const at = ([x, y]: readonly [number, number]) => [x * frame.width, y * frame.height] as const;
  if (mirror.kind === 'wall') return { kind: 'wall', from: at(mirror.from), to: at(mirror.to) };
  return {
    kind: 'prism',
    at: at(mirror.at),
    radius: mirror.radius,
    sides: mirror.sides,
    angle: 0,
    spin: mirror.spin,
  };
}
