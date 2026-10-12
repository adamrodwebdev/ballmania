import type { TrackRecipe } from './tracks';

export type WorldId = 'nebula' | 'neon' | 'abyss' | 'jewel' | 'volcano' | 'singularity';

/** Hints shown at the start of the level that introduces something (i18n keys). */
export type HintId =
  | 'aim'
  | 'swap'
  | 'reaction'
  | 'colours'
  | 'twin'
  | 'colossus'
  | 'ricochet'
  | 'prism'
  | 'spin'
  | 'magnet'
  | 'magnetCombo';

/**
 * A mirror described in fractions of the board (0 to 1 on each axis), so it
 * fits both board shapes like the tracks do. Prism radius is in board units.
 */
export type MirrorRecipe =
  | {
      readonly kind: 'wall';
      readonly from: readonly [number, number];
      readonly to: readonly [number, number];
    }
  | {
      readonly kind: 'prism';
      readonly at: readonly [number, number];
      readonly radius: number;
      readonly sides: number;
      /** Radians per second; 0 for a still prism. */
      readonly spin: number;
    };

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
  readonly mirrors?: readonly MirrorRecipe[];
  /** Abyss world: pull balls out of the chain. */
  readonly magnet?: {
    readonly charges: number;
    readonly max: number;
    readonly rechargeEvery: number;
  };
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
  extra: { squareness?: number; arms?: number; inner?: number; outer?: number } = {},
): TrackRecipe => ({
  kind: 'spiral',
  turns,
  outer: extra.outer ?? 0.88,
  inner: extra.inner ?? 0.42,
  start,
  clockwise,
  ...(extra.squareness === undefined ? {} : { squareness: extra.squareness }),
  ...(extra.arms === undefined ? {} : { arms: extra.arms }),
});

const levelOf =
  (world: WorldId) =>
  (number: number, data: Omit<CampaignLevel, 'id' | 'world' | 'number'>): CampaignLevel => ({
    id: `${world}-${String(number).padStart(2, '0')}`,
    world,
    number,
    ...data,
  });
const level = levelOf('nebula');
const neon = levelOf('neon');
const abyss = levelOf('abyss');

/** The magnet of the Abyss world: generous at first, then tighter. */
const magnet = (charges: number, rechargeEvery: number) =>
  ({ charges, max: 3, rechargeEvery }) as const;

/** Diagonal mirrors across the four corners, outside spiral tracks. */
const CORNER_WALLS: readonly MirrorRecipe[] = [
  { kind: 'wall', from: [0.02, 0.2], to: [0.2, 0.02] },
  { kind: 'wall', from: [0.8, 0.02], to: [0.98, 0.2] },
  { kind: 'wall', from: [0.98, 0.8], to: [0.8, 0.98] },
  { kind: 'wall', from: [0.2, 0.98], to: [0.02, 0.8] },
];

/** A prism in each corner, still or turning. */
const cornerPrisms = (spin: number, sides = 3): MirrorRecipe[] =>
  [
    [0.08, 0.08],
    [0.92, 0.08],
    [0.92, 0.92],
    [0.08, 0.92],
  ].map(([x, y], i) => ({
    kind: 'prism',
    at: [x!, y!] as const,
    radius: 42,
    sides,
    spin: i % 2 === 0 ? spin : -spin,
  }));

/** Upright mirrors along both sides, below the rows of a serpentine. */
const SIDE_WALLS: readonly MirrorRecipe[] = [
  { kind: 'wall', from: [0.02, 0.72], to: [0.02, 0.97] },
  { kind: 'wall', from: [0.98, 0.72], to: [0.98, 0.97] },
];

/** Turning prisms in the lower corners, beside the shooter of a serpentine. */
const lowerPrisms = (spin: number): MirrorRecipe[] => [
  { kind: 'prism', at: [0.14, 0.88], radius: 40, sides: 4, spin },
  { kind: 'prism', at: [0.86, 0.88], radius: 40, sides: 4, spin: -spin },
];

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

/**
 * World 2, Neon: shots bounce off mirrors, and a ball hit after n rebounds
 * is worth n + 1 times its points. Mirrors stand outside the tracks: a
 * direct shot is always possible, the bank shot is the reward.
 */
const NEON: readonly CampaignLevel[] = [
  neon(1, {
    track: spiral(1.3, 0.75, true),
    mirrors: CORNER_WALLS,
    length: 34,
    tones: 4,
    repeatChance: 0.5,
    speed: 34,
    hint: 'ricochet',
  }),
  neon(2, {
    track: { kind: 'serpentine', rows: 3 },
    mirrors: SIDE_WALLS,
    length: 38,
    tones: 4,
    repeatChance: 0.45,
    speed: 38,
  }),
  neon(3, {
    track: spiral(1.4, 0.25, false, { squareness: 2 }),
    mirrors: cornerPrisms(0, 4),
    length: 40,
    tones: 4,
    repeatChance: 0.45,
    speed: 46,
    hint: 'prism',
  }),
  neon(4, {
    track: spiral(1.1, 0.75, true, { arms: 2, inner: 0.4 }),
    mirrors: CORNER_WALLS,
    length: 26,
    tones: 4,
    repeatChance: 0.45,
    speed: 40,
  }),
  neon(5, {
    track: { kind: 'serpentine', rows: 4 },
    mirrors: [...SIDE_WALLS, ...lowerPrisms(0.8)],
    length: 48,
    tones: 4,
    repeatChance: 0.4,
    speed: 50,
    hint: 'spin',
  }),
  neon(6, {
    track: spiral(1.4, 0.5, true),
    mirrors: CORNER_WALLS,
    length: 40,
    tones: 4,
    repeatChance: 0.45,
    speed: 38,
  }),
  neon(7, {
    track: spiral(1.6, 0.75, false, { squareness: 3, inner: 0.38, outer: 0.82 }),
    mirrors: cornerPrisms(0.9),
    length: 48,
    tones: 4,
    repeatChance: 0.4,
    speed: 60,
  }),
  neon(8, {
    track: { kind: 'serpentine', rows: 3 },
    mirrors: [...SIDE_WALLS, ...lowerPrisms(1.1)],
    length: 40,
    tones: 5,
    repeatChance: 0.42,
    speed: 44,
  }),
  neon(9, {
    track: spiral(1.1, 0.25, false, { arms: 2, inner: 0.4 }),
    mirrors: cornerPrisms(1),
    length: 30,
    tones: 4,
    repeatChance: 0.42,
    speed: 46,
  }),
  neon(10, {
    track: spiral(1.5, 0, true, { squareness: 2, outer: 0.84 }),
    mirrors: CORNER_WALLS,
    length: 46,
    tones: 4,
    repeatChance: 0.45,
    speed: 44,
  }),
  neon(11, {
    track: spiral(1.7, 0.75, true, { squareness: 3, inner: 0.36, outer: 0.78 }),
    mirrors: cornerPrisms(1.2, 3),
    length: 56,
    tones: 5,
    repeatChance: 0.36,
    speed: 62,
  }),
  neon(12, {
    track: spiral(1.6, 0.25, true, { inner: 0.4 }),
    mirrors: cornerPrisms(1.3),
    length: 28,
    tones: 4,
    repeatChance: 0.4,
    speed: 24,
    hint: 'colossus',
    colossus: { hp: 66, spit: 6 },
  }),
];

/**
 * World 3, Abyss: the magnet pulls a ball out of the chain and loads it in the
 * shooter. Taking out the ball that separates two equal colours makes them
 * pull together and explode. Charges come back with explosions.
 */
const ABYSS: readonly CampaignLevel[] = [
  abyss(1, {
    track: spiral(1.3, 0.75, true),
    magnet: magnet(3, 3),
    length: 36,
    tones: 4,
    repeatChance: 0.45,
    speed: 40,
    hint: 'magnet',
  }),
  abyss(2, {
    track: { kind: 'serpentine', rows: 3 },
    magnet: magnet(3, 3),
    length: 38,
    tones: 4,
    repeatChance: 0.42,
    speed: 46,
    hint: 'magnetCombo',
  }),
  abyss(3, {
    track: spiral(1.45, 0.25, false, { squareness: 2, outer: 0.86 }),
    magnet: magnet(2, 4),
    length: 44,
    tones: 4,
    repeatChance: 0.4,
    speed: 54,
  }),
  abyss(4, {
    track: spiral(1.1, 0.75, true, { arms: 2, inner: 0.4 }),
    magnet: magnet(2, 4),
    length: 28,
    tones: 4,
    repeatChance: 0.42,
    speed: 48,
  }),
  abyss(5, {
    track: { kind: 'serpentine', rows: 4 },
    magnet: magnet(2, 4),
    length: 50,
    tones: 5,
    repeatChance: 0.4,
    speed: 52,
  }),
  abyss(6, {
    track: spiral(1.4, 0.5, true),
    magnet: magnet(3, 3),
    length: 42,
    tones: 4,
    repeatChance: 0.45,
    speed: 44,
  }),
  abyss(7, {
    track: spiral(1.65, 0, false, { squareness: 3, inner: 0.38, outer: 0.84 }),
    magnet: magnet(2, 5),
    length: 52,
    tones: 5,
    repeatChance: 0.38,
    speed: 64,
  }),
  abyss(8, {
    track: { kind: 'serpentine', rows: 3 },
    magnet: magnet(1, 5),
    length: 40,
    tones: 5,
    repeatChance: 0.4,
    speed: 54,
  }),
  abyss(9, {
    track: spiral(1.15, 0.25, false, { arms: 2, inner: 0.4 }),
    magnet: magnet(2, 5),
    length: 30,
    tones: 4,
    repeatChance: 0.42,
    speed: 50,
  }),
  abyss(10, {
    track: spiral(1.5, 0.75, true, { squareness: 2, outer: 0.86 }),
    magnet: magnet(3, 4),
    length: 46,
    tones: 4,
    repeatChance: 0.45,
    speed: 50,
  }),
  abyss(11, {
    track: spiral(1.75, 0.5, true, { inner: 0.36 }),
    magnet: magnet(1, 6),
    length: 54,
    tones: 5,
    repeatChance: 0.36,
    speed: 70,
  }),
  abyss(12, {
    track: spiral(1.6, 0.75, false, { inner: 0.4 }),
    magnet: magnet(2, 4),
    length: 30,
    tones: 5,
    repeatChance: 0.4,
    speed: 26,
    hint: 'colossus',
    colossus: { hp: 66, spit: 6 },
  }),
];

/** The six worlds in order; Nebula, Neon and Abyss have their levels in this version. */
export const WORLDS: readonly World[] = [
  { id: 'nebula', levels: NEBULA },
  { id: 'neon', levels: NEON },
  { id: 'abyss', levels: ABYSS },
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
