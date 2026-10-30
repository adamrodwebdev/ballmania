import type { HazardSetup } from '@/engine/hazards/Hazards';
import type { ColossusSetup } from '@/engine/objectives/ColossusObjective';
import { Vec2 } from '@/engine/geometry/Vec2';
import { Path } from '@/engine/path/Path';
import { referenceTime } from './calibration';
import type { CampaignLevel, MirrorRecipe } from './campaign';
import { LEVEL_DEFAULTS, type LevelDefinition, type ReflectorDefinition } from './LevelDefinition';
import { DIFFICULTY_RULES, type Difficulty } from './difficulty';
import { graceOf } from './grace';
import type { Aiming, Seat } from './seat';
import { buildTrack, type Frame } from './tracks';
import { paceAt } from './tuning';

/** Pull of the black hole at strength 1 (units³/s²), tuned so curves read clearly. */
export const BASE_GRAVITY = 6e7;
/** Radius of the event horizon: shots that come closer are swallowed. */
export const HORIZON = 46;
/** Distance between the shooter's ring and the edges of the board. */
export const RING_MARGIN = 70;
/** Shots fly slower around the black hole, so their curve can be read. */
export const ORBIT_SHOT_SPEED = 1050;

/** Weather: seconds of calm between episodes, and how long they last, at the Pilot difficulty. */
export const WEATHER_EVERY = 20;
export const WEATHER_DURATION = 7;
/** Seconds of one arrhythmia cycle. */
export const ARRHYTHMIA_PERIOD = 9;

/**
 * The two forms of a Colossus: its size in ball radii, and its pushing speed
 * in each phase (a new phase starts at each third of its health). The young
 * one of 1-3 (v1.7.4) is smaller and never speeds up.
 */
const COLOSSUS_FORMS = {
  adult: { radius: 2.3, phases: [1, 1.25, 1.5] },
  young: { radius: 1.6, phases: [1] },
} as const;

/** The hazards of a level, scaled by the difficulty (§ 3.9). */
function hazardsOf(level: CampaignLevel, factor: number): HazardSetup | undefined {
  const hazards = level.hazards;
  if (!hazards) return undefined;
  return {
    ...(hazards.meteors ? { meteors: hazards.meteors / factor } : {}),
    ...(hazards.arrhythmia
      ? {
          arrhythmia: {
            amplitude: Math.min(0.6, hazards.arrhythmia * factor),
            period: ARRHYTHMIA_PERIOD,
          },
        }
      : {}),
    ...(hazards.weather
      ? {
          weather: {
            kinds: hazards.weather,
            every: WEATHER_EVERY / factor,
            duration: WEATHER_DURATION,
            strength: factor,
          },
        }
      : {}),
  };
}

/** How a level is played besides its board: the difficulty, and the hand that aims. */
export interface PlayedAs {
  readonly difficulty?: Difficulty;
  /** The finger unless told: the phones' hand, the harder one (spec § 3.17). */
  readonly aiming?: Aiming;
}

/**
 * Turns a campaign level into the geometry of one board shape, at the pace
 * and with the time bonus of its seat (v1.8.1), at a difficulty.
 */
export function resolveLevel(
  level: CampaignLevel,
  frame: Frame,
  { difficulty = 'pilot', aiming = 'touch' }: PlayedAs = {},
): LevelDefinition {
  const rule = DIFFICULTY_RULES[difficulty];
  const seat: Seat = { board: frame.kind, aiming };
  // The pace the tuning tool found for this board and hand (v1.8.1), else the level's own.
  const pace = paceAt(level, seat);
  const hazards = hazardsOf(level, rule.hazards);
  const grace = graceOf(level.world, difficulty);
  const track = buildTrack(level.track, frame);
  const radius = LEVEL_DEFAULTS.ballRadius;
  const longest = Math.max(
    ...track.paths.map((points) => Path.fromPoints(points.map(([x, y]) => new Vec2(x, y))).length),
  );
  const form = level.colossus?.young ? COLOSSUS_FORMS.young : COLOSSUS_FORMS.adult;
  const colossus: ColossusSetup | undefined = level.colossus && {
    chain: 0,
    hp: level.colossus.hp,
    radius: radius * form.radius,
    reach: radius * 2 * 3,
    phases: form.phases,
    spit: level.colossus.spit,
    ...(level.colossus.young ? { young: true } : {}),
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
      length: pace.length,
      tones: level.palette?.length ?? level.tones,
      repeatChance: level.repeatChance,
      ...(level.palette ? { palette: level.palette } : {}),
      ...(level.sequence ? { sequence: level.sequence } : {}),
    })),
    speed: pace.speed * rule.speed,
    rushSpeed: 420,
    rushDistance: Math.min(900, longest * 0.3),
    // Each second saved under it earns the time bonus (v1.7.3), calibrated seat by seat (v1.8.1).
    parTime: referenceTime(level, seat),
    ...(colossus ? { colossus } : {}),
    ...(level.gift ? { gift: level.gift } : {}),
    ...(level.opening ? { opening: level.opening } : {}),
    ...(level.powers ? { powers: level.powers } : {}),
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
    ...(hazards ? { hazards } : {}),
    ...(grace ? { grace } : {}),
    ...(rule.score === 1 ? {} : { scoreFactor: rule.score }),
    ...(level.lesson ? { lesson: level.lesson } : {}),
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
