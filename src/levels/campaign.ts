import type { ColossusSetup } from '@/engine/objectives/ColossusObjective';
import { Path } from '@/engine/path/Path';
import { Vec2 } from '@/engine/geometry/Vec2';
import { LEVEL_DEFAULTS, type LevelDefinition } from './LevelDefinition';
import { buildTrack, type Frame, type TrackRecipe } from './tracks';

export type WorldId = 'nebula' | 'neon' | 'abyss' | 'jewel' | 'volcano' | 'singularity';

/** Hints shown at the start of the level that introduces something (i18n keys). */
export type HintId = 'aim' | 'swap' | 'reaction' | 'colours' | 'twin' | 'colossus';

/** A campaign level as data: intent, difficulty and rewards (specification § 3.2). */
export interface CampaignLevel {
  /** "nebula-03" */
  readonly id: string;
  readonly world: WorldId;
  /** 1 to 12; the 12th is the boss. */
  readonly number: number;
  readonly track: TrackRecipe;
  /** Balls per chain. */
  readonly length: number;
  readonly tones: number;
  readonly repeatChance: number;
  readonly speed: number;
  readonly hint?: HintId;
  readonly colossus?: { readonly hp: number; readonly spit: number };
}

export interface World {
  readonly id: WorldId;
  /** Levels of the world; empty until the world is built (later lots). */
  readonly levels: readonly CampaignLevel[];
}

const spiral = (
  turns: number,
  start: number,
  clockwise: boolean,
  extra: { squareness?: number; arms?: number; inner?: number } = {},
): TrackRecipe => ({
  kind: 'spiral',
  turns,
  outer: 0.88,
  inner: extra.inner ?? 0.42,
  start,
  clockwise,
  ...(extra.squareness === undefined ? {} : { squareness: extra.squareness }),
  ...(extra.arms === undefined ? {} : { arms: extra.arms }),
});

const level = (number: number, data: Omit<CampaignLevel, 'id' | 'world' | 'number'>) => ({
  id: `nebula-${String(number).padStart(2, '0')}`,
  world: 'nebula' as const,
  number,
  ...data,
});

/**
 * World 1, Nebula: the basic rules, then their combinations, in a saw-tooth
 * curve (three levels up, one to breathe), ending with the stellar Colossus.
 */
const NEBULA: readonly CampaignLevel[] = [
  level(1, {
    track: spiral(1.25, 0.75, true),
    length: 28,
    tones: 3,
    repeatChance: 0.55,
    speed: 30,
    hint: 'aim',
  }),
  level(2, {
    track: spiral(1.35, 0.25, false),
    length: 34,
    tones: 3,
    repeatChance: 0.5,
    speed: 34,
    hint: 'swap',
  }),
  level(3, {
    track: { kind: 'serpentine', rows: 3 },
    length: 36,
    tones: 3,
    repeatChance: 0.45,
    speed: 38,
    hint: 'reaction',
  }),
  level(4, {
    track: spiral(1.5, 0.5, true),
    length: 40,
    tones: 4,
    repeatChance: 0.45,
    speed: 44,
    hint: 'colours',
  }),
  level(5, {
    track: spiral(1.45, 0.75, true, { squareness: 3 }),
    length: 44,
    tones: 4,
    repeatChance: 0.4,
    speed: 50,
  }),
  level(6, {
    track: { kind: 'serpentine', rows: 3 },
    length: 38,
    tones: 4,
    repeatChance: 0.45,
    speed: 42,
  }),
  level(7, {
    track: spiral(1.1, 0.75, true, { arms: 2, inner: 0.4 }),
    length: 22,
    tones: 4,
    repeatChance: 0.45,
    speed: 44,
    hint: 'twin',
  }),
  level(8, {
    track: spiral(1.7, 0, false, { inner: 0.36 }),
    length: 50,
    tones: 4,
    repeatChance: 0.38,
    speed: 58,
  }),
  level(9, {
    track: { kind: 'serpentine', rows: 4 },
    length: 52,
    tones: 4,
    repeatChance: 0.36,
    speed: 48,
  }),
  level(10, {
    track: spiral(1.5, 0.25, true, { squareness: 2 }),
    length: 46,
    tones: 4,
    repeatChance: 0.42,
    speed: 50,
  }),
  level(11, {
    track: spiral(1.65, 0.75, false, { squareness: 3, inner: 0.38 }),
    length: 54,
    tones: 5,
    repeatChance: 0.36,
    speed: 68,
  }),
  level(12, {
    track: spiral(1.6, 0.75, true, { inner: 0.4 }),
    length: 26,
    tones: 4,
    repeatChance: 0.4,
    speed: 26,
    hint: 'colossus',
    colossus: { hp: 60, spit: 6 },
  }),
];

/** The six worlds in order; only Nebula has levels in this version. */
export const WORLDS: readonly World[] = [
  { id: 'nebula', levels: NEBULA },
  { id: 'neon', levels: [] },
  { id: 'abyss', levels: [] },
  { id: 'jewel', levels: [] },
  { id: 'volcano', levels: [] },
  { id: 'singularity', levels: [] },
];

export const CAMPAIGN: readonly CampaignLevel[] = WORLDS.flatMap((world) => world.levels);

export function findLevel(id: string): CampaignLevel | undefined {
  return CAMPAIGN.find((candidate) => candidate.id === id);
}

/** The level after this one in the campaign, if any. */
export function nextLevel(current: CampaignLevel): CampaignLevel | undefined {
  return CAMPAIGN[CAMPAIGN.indexOf(current) + 1];
}

/**
 * Scores for two and three stars; one star is earned by finishing the level.
 * Calibrated with a casual-player bot (tests/levels/bot.ts): it usually earns
 * two stars, three need chain reactions. To be refined with play tests.
 */
export function starThresholds(level: CampaignLevel): readonly [number, number] {
  const arms = level.track.kind === 'spiral' ? (level.track.arms ?? 1) : 1;
  const balls = level.length * arms + (level.colossus ? level.colossus.hp / 3 : 0);
  const round = (value: number) => Math.round(value / 50) * 50;
  return [round(balls * 30 + 300), round(balls * 48 + 700)];
}

export function starsFor(level: CampaignLevel, score: number, won: boolean): number {
  if (!won) return 0;
  const [two, three] = starThresholds(level);
  return score >= three ? 3 : score >= two ? 2 : 1;
}

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
