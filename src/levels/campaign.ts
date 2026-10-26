import { calibratedStars } from './calibration';
import { DEMO, DEMO_WORLDS } from './edition';
import type { WeatherKind } from '@/engine/hazards/Hazards';
import { POWER_KINDS, type PowerSetup } from '@/engine/powers/Powers';
import type { Lesson } from './LevelDefinition';
import type { TrackRecipe } from './tracks';

export type WorldId = 'nebula' | 'neon' | 'abyss' | 'jewel' | 'volcano' | 'singularity';

/** Hints shown at the start of the level that introduces something (i18n keys). */
export type HintId =
  | 'aim'
  | 'match'
  | 'bank'
  | 'curve'
  | 'swap'
  | 'reaction'
  | 'power'
  | 'powerSlow'
  | 'powerRainbow'
  | 'powerLaser'
  | 'twin'
  | 'colossus'
  | 'ricochet'
  | 'prism'
  | 'spin'
  | 'magnet'
  | 'magnetCombo'
  | 'alchemy'
  | 'alchemySecondary'
  | 'switch'
  | 'hot'
  | 'gravity'
  | 'orbit'
  | 'endless'
  | 'puzzle'
  | 'rhythm'
  | 'duel'
  | 'arrhythmia'
  | 'meteors'
  | 'wind'
  | 'cold'
  | 'solar';

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
  /** The hand's gesture, shown until its lesson is done (level 1-1, the training). */
  readonly lesson?: Lesson;
  /** The first shot is a Nova bomb (the training's first showcase). */
  readonly gift?: 'bomb';
  /** The chain's exact colours, tail first, laid out by hand (1-1, the training). */
  readonly sequence?: readonly number[];
  /** The first colours the launcher deals (the colour a hand-laid chain waits for). */
  readonly opening?: readonly number[];
  /**
   * A boss pushes the chain. `young`: the Colossus of world 1 met early, at
   * 1-3 (v1.7.4): smaller, a single phase, with a name of its own.
   */
  readonly colossus?: { readonly hp: number; readonly spit: number; readonly young?: true };
  readonly mirrors?: readonly MirrorRecipe[];
  /**
   * Jewel world: the colours of the chain. Shots are primaries that fuse
   * into secondaries (specification § 3.2, alchemy).
   */
  readonly palette?: readonly number[];
  /**
   * Singularity world: strength of the black hole's pull (1 = reference),
   * which bends every shot towards the centre.
   */
  readonly gravity?: number;
  /** Singularity world: the shooter glides along a ring, at this many radians per second. */
  readonly orbit?: number;
  /**
   * Hazards (§ 3.9), at the Pilot difficulty: seconds between falling balls,
   * amplitude of the arrhythmia, kinds of weather. The difficulty scales them.
   */
  readonly hazards?: {
    readonly meteors?: number;
    readonly arrhythmia?: number;
    readonly weather?: readonly WeatherKind[];
  };
  /** Balls of the chain that hold a power (v1.7): Rewind, Slow-down, Rainbow shot, Laser. */
  readonly powers?: PowerSetup;
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

export const spiral = (
  turns: number,
  start: number,
  clockwise: boolean,
  extra: {
    squareness?: number;
    arms?: number;
    inner?: number;
    outer?: number;
    portal?: boolean;
  } = {},
): TrackRecipe => ({
  kind: 'spiral',
  turns,
  outer: extra.outer ?? 0.88,
  inner: extra.inner ?? 0.42,
  start,
  clockwise,
  ...(extra.squareness === undefined ? {} : { squareness: extra.squareness }),
  ...(extra.arms === undefined ? {} : { arms: extra.arms }),
  ...(extra.portal ? { portal: true } : {}),
});

/**
 * A world's level maker. `powers`: what the world's levels carry unless a
 * level says otherwise (the Nebula introduces them one by one, level by level).
 */
const levelOf =
  (world: WorldId, powers?: PowerSetup) =>
  (number: number, data: Omit<CampaignLevel, 'id' | 'world' | 'number'>): CampaignLevel => ({
    id: `${world}-${String(number).padStart(2, '0')}`,
    world,
    number,
    ...(powers ? { powers } : {}),
    ...data,
  });
/** After the Nebula, the four powers come mixed with each world's own mechanics. */
const ALL_POWERS: PowerSetup = { kinds: POWER_KINDS, every: 20 };
const level = levelOf('nebula');
const neon = levelOf('neon', ALL_POWERS);
const abyss = levelOf('abyss', ALL_POWERS);
const jewel = levelOf('jewel', ALL_POWERS);
const volcano = levelOf('volcano', ALL_POWERS);
const singularity = levelOf('singularity', ALL_POWERS);

/**
 * A spiral around the black hole, inside the shooter's ring: balls come out
 * of a portal and fall into the centre.
 */
export const orbital = (
  turns: number,
  start: number,
  clockwise: boolean,
  extra: { squareness?: number; arms?: number; inner?: number } = {},
): TrackRecipe =>
  spiral(turns, start, clockwise, { outer: 0.6, inner: 0.2, portal: true, ...extra });

/** A serpentine whose listed rows split into a hot shortcut and a slower detour. */
const forked = (rows: number, ...forks: number[]): TrackRecipe => ({
  kind: 'serpentine',
  rows,
  forks,
});

/** Colours of the Jewel world: ruby, lime, violet are primaries; amber, cyan, rose come from them. */
const PRIMARY = [0, 2, 4] as const;
const withSecondaries = (...secondaries: number[]) => [...PRIMARY, ...secondaries];

/** The magnet of the Abyss world: generous at first, then tighter. */
const magnet = (charges: number, rechargeEvery: number) =>
  ({ charges, max: 3, rechargeEvery }) as const;

/** Diagonal mirrors across the four corners, outside spiral tracks. */
export const CORNER_WALLS: readonly MirrorRecipe[] = [
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
 * Level 1-1 (v1.8.0): the first real level, without tricks. The showcase it
 * used to be opens the training (`training.ts`). Its chain is laid by hand,
 * head first, so that the colour the launcher deals first can set off a
 * two-step cascade: three of it burst, the pairs around them meet and burst.
 */
const FIRST_LEVEL = [
  ...[1, 0, 0, 2, 2, 0, 0, 1], // the head: a 2 bursts the 2s, then the 0s meet and burst
  ...[2, 1, 1, 0, 2, 2, 1, 0, 0, 1, 2, 2],
  ...[0, 1, 1, 2, 0, 0, 2, 1, 1, 0], // the tail
];

/**
 * World 1, Nebula: the basic rules, then their combinations, in a saw-tooth
 * curve (three levels up, one to breathe), ending with the stellar Colossus.
 * Its young form comes at 1-3 (v1.7.4), so a boss shows within minutes, and
 * 1-4 breathes after it with three colours; the fourth comes at 1-5. The
 * powers arrive one at a time (v1.7): Rewind at 1-4, Slow-down at 1-6,
 * Rainbow shot at 1-8, Laser at 1-10; one lesson a level. The training shows
 * a Laser first, as a glimpse (v1.8.0).
 */
const NEBULA: readonly CampaignLevel[] = [
  level(1, {
    track: spiral(1.25, 0.75, true),
    length: FIRST_LEVEL.length,
    tones: 3,
    repeatChance: 0.55,
    speed: 30,
    hint: 'match',
    lesson: 'shot',
    sequence: [...FIRST_LEVEL].reverse(),
    opening: [2],
  }),
  level(2, {
    track: spiral(1.35, 0.25, false),
    length: 46,
    tones: 3,
    repeatChance: 0.5,
    speed: 64,
    hint: 'swap',
  }),
  level(3, {
    track: { kind: 'serpentine', rows: 3 },
    length: 24,
    tones: 3,
    repeatChance: 0.45,
    speed: 46,
    hint: 'colossus',
    colossus: { hp: 30, spit: 4, young: true },
  }),
  level(4, {
    track: spiral(1.5, 0.5, true),
    length: 50,
    tones: 3,
    repeatChance: 0.45,
    speed: 76,
    hint: 'power',
    powers: { kinds: ['rewind'], every: 20, first: 'rewind' },
  }),
  level(5, {
    track: spiral(1.45, 0.75, true, { squareness: 3 }),
    length: 44,
    tones: 4,
    repeatChance: 0.4,
    speed: 74,
    hint: 'reaction',
    powers: { kinds: ['rewind'], every: 22 },
  }),
  level(6, {
    track: { kind: 'serpentine', rows: 3 },
    length: 42,
    tones: 4,
    repeatChance: 0.45,
    speed: 56,
    hint: 'powerSlow',
    powers: { kinds: ['rewind', 'slow'], every: 19, first: 'slow' },
  }),
  level(7, {
    track: spiral(1.1, 0.75, true, { arms: 2, inner: 0.4 }),
    length: 26,
    tones: 4,
    repeatChance: 0.45,
    speed: 44,
    hint: 'twin',
    powers: { kinds: ['rewind', 'slow'], every: 22 },
  }),
  level(8, {
    track: spiral(1.7, 0, false, { inner: 0.36 }),
    length: 50,
    tones: 4,
    repeatChance: 0.38,
    speed: 64,
    hint: 'powerRainbow',
    powers: { kinds: ['rewind', 'slow', 'rainbow'], every: 17, first: 'rainbow' },
  }),
  level(9, {
    track: { kind: 'serpentine', rows: 4 },
    length: 56,
    tones: 4,
    repeatChance: 0.36,
    speed: 53,
    powers: { kinds: ['rewind', 'slow', 'rainbow'], every: 17 },
  }),
  level(10, {
    track: spiral(1.5, 0.25, true, { squareness: 2 }),
    length: 56,
    tones: 4,
    repeatChance: 0.42,
    speed: 76,
    hint: 'powerLaser',
    powers: { kinds: POWER_KINDS, every: 15, first: 'laser' },
  }),
  level(11, {
    track: spiral(1.65, 0.75, false, { squareness: 3, inner: 0.38 }),
    length: 54,
    tones: 5,
    repeatChance: 0.36,
    speed: 68,
    powers: { kinds: POWER_KINDS, every: 18 },
  }),
  level(12, {
    track: spiral(1.6, 0.75, true, { inner: 0.4 }),
    length: 26,
    tones: 4,
    repeatChance: 0.4,
    speed: 26,
    hint: 'colossus',
    colossus: { hp: 60, spit: 6 },
    // The boss keeps its pressure: only the powers that attack, now and then.
    powers: { kinds: ['rainbow', 'laser'], every: 26 },
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
    hazards: { arrhythmia: 0.25 },
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
    hazards: { meteors: 12 },
    hint: 'meteors',
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
    hazards: { arrhythmia: 0.3 },
    hint: 'arrhythmia',
  }),
  neon(11, {
    track: spiral(1.7, 0.75, true, { squareness: 3, inner: 0.36, outer: 0.78 }),
    mirrors: cornerPrisms(1.2, 3),
    length: 56,
    tones: 5,
    repeatChance: 0.36,
    speed: 62,
    hazards: { meteors: 9, arrhythmia: 0.2 },
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
    hazards: { meteors: 11 },
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
    hazards: { weather: ['wind'] },
    hint: 'wind',
  }),
  abyss(4, {
    track: { kind: 'twin' },
    magnet: magnet(2, 4),
    length: 16,
    tones: 4,
    repeatChance: 0.42,
    speed: 17,
    hint: 'twin',
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
    hazards: { meteors: 9 },
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
    hazards: { weather: ['wind'], arrhythmia: 0.2 },
  }),
  abyss(9, {
    track: { kind: 'twin' },
    magnet: magnet(2, 5),
    length: 16,
    tones: 4,
    repeatChance: 0.42,
    speed: 17,
    hazards: { arrhythmia: 0.25 },
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
    hazards: { weather: ['wind'], meteors: 10 },
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
    hazards: { weather: ['wind'] },
  }),
];

/**
 * World 4, Jewels: colours mix like light. A primary shot onto another
 * primary fuses with it (ruby + lime = amber, lime + violet = cyan,
 * ruby + violet = rose). Secondaries cannot be shot: three of them side by
 * side must be made by fusion. They appear one by one.
 */
const JEWEL: readonly CampaignLevel[] = [
  jewel(1, {
    track: spiral(1.3, 0.75, true),
    palette: withSecondaries(),
    length: 30,
    tones: 3,
    repeatChance: 0.45,
    speed: 26,
    hint: 'alchemy',
  }),
  jewel(2, {
    track: { kind: 'serpentine', rows: 3 },
    palette: withSecondaries(1),
    length: 30,
    tones: 4,
    repeatChance: 0.45,
    speed: 28,
    hint: 'alchemySecondary',
  }),
  jewel(3, {
    track: spiral(1.45, 0.25, false, { squareness: 2, outer: 0.86 }),
    palette: withSecondaries(3),
    length: 36,
    tones: 4,
    repeatChance: 0.42,
    speed: 30,
    hazards: { weather: ['cold'] },
    hint: 'cold',
  }),
  jewel(4, {
    track: spiral(1.1, 0.75, true, { arms: 2, inner: 0.4 }),
    palette: withSecondaries(5),
    length: 20,
    tones: 4,
    repeatChance: 0.42,
    speed: 30,
  }),
  jewel(5, {
    track: { kind: 'serpentine', rows: 4 },
    palette: withSecondaries(1, 3),
    length: 36,
    tones: 5,
    repeatChance: 0.42,
    speed: 30,
  }),
  jewel(6, {
    track: spiral(1.4, 0.5, true),
    palette: withSecondaries(1),
    length: 34,
    tones: 4,
    repeatChance: 0.45,
    speed: 28,
  }),
  jewel(7, {
    track: spiral(1.65, 0, false, { squareness: 3, inner: 0.38, outer: 0.84 }),
    palette: withSecondaries(1, 3, 5),
    length: 38,
    tones: 6,
    repeatChance: 0.4,
    speed: 36,
    hazards: { weather: ['cold'] },
  }),
  jewel(8, {
    track: { kind: 'serpentine', rows: 3 },
    palette: withSecondaries(3, 5),
    length: 34,
    tones: 5,
    repeatChance: 0.42,
    speed: 36,
  }),
  jewel(9, {
    track: spiral(1.15, 0.25, false, { arms: 2, inner: 0.4 }),
    palette: withSecondaries(1, 5),
    length: 24,
    tones: 5,
    repeatChance: 0.42,
    speed: 36,
  }),
  jewel(10, {
    track: spiral(1.5, 0.75, true, { squareness: 2, outer: 0.86 }),
    palette: withSecondaries(5),
    length: 38,
    tones: 4,
    repeatChance: 0.45,
    speed: 32,
  }),
  jewel(11, {
    track: spiral(1.75, 0.5, true, { inner: 0.36 }),
    palette: withSecondaries(1, 3, 5),
    length: 42,
    tones: 6,
    repeatChance: 0.38,
    speed: 42,
    hazards: { weather: ['cold'], arrhythmia: 0.2 },
  }),
  jewel(12, {
    track: spiral(1.6, 0.75, false, { inner: 0.4 }),
    palette: withSecondaries(1),
    length: 24,
    tones: 4,
    repeatChance: 0.42,
    speed: 20,
    hint: 'colossus',
    colossus: { hp: 56, spit: 5 },
    hazards: { weather: ['cold'] },
  }),
];

/**
 * World 5, Volcano: switches. Some rows split into a shortcut, where the
 * lava is molten and exploded balls are worth double, and a longer detour
 * that buys time. A switch can be flipped until the chain reaches it. Later
 * levels mix in the magnet and the mirrors of the previous worlds.
 */
const VOLCANO: readonly CampaignLevel[] = [
  volcano(1, {
    track: forked(3, 0),
    length: 36,
    tones: 4,
    repeatChance: 0.45,
    speed: 40,
    hint: 'switch',
  }),
  volcano(2, {
    track: forked(3, 0, 1),
    length: 38,
    tones: 4,
    repeatChance: 0.45,
    speed: 44,
    hint: 'hot',
  }),
  volcano(3, {
    track: forked(4, 1),
    length: 44,
    tones: 4,
    repeatChance: 0.42,
    speed: 46,
    hazards: { weather: ['solar'] },
    hint: 'solar',
  }),
  volcano(4, {
    track: forked(3, 1),
    magnet: magnet(2, 4),
    length: 40,
    tones: 5,
    repeatChance: 0.42,
    speed: 48,
  }),
  volcano(5, {
    track: forked(4, 0, 2),
    length: 48,
    tones: 5,
    repeatChance: 0.4,
    speed: 36,
    hazards: { weather: ['solar'] },
  }),
  volcano(6, {
    track: forked(3, 0, 1),
    length: 36,
    tones: 4,
    repeatChance: 0.45,
    speed: 40,
  }),
  volcano(7, {
    track: forked(3, 0),
    mirrors: SIDE_WALLS,
    length: 42,
    tones: 5,
    repeatChance: 0.4,
    speed: 46,
  }),
  volcano(8, {
    track: forked(4, 0, 1, 2),
    length: 46,
    tones: 5,
    repeatChance: 0.4,
    speed: 40,
    hazards: { weather: ['solar'] },
  }),
  volcano(9, {
    track: forked(3, 1),
    mirrors: [...SIDE_WALLS, ...lowerPrisms(0.8)],
    length: 40,
    tones: 5,
    repeatChance: 0.4,
    speed: 42,
  }),
  volcano(10, {
    track: forked(4, 1, 2),
    magnet: magnet(2, 4),
    length: 44,
    tones: 4,
    repeatChance: 0.45,
    speed: 46,
    hazards: { meteors: 9, arrhythmia: 0.2 },
  }),
  volcano(11, {
    track: forked(4, 0, 1, 2),
    length: 46,
    tones: 5,
    repeatChance: 0.38,
    speed: 46,
    hazards: { weather: ['solar'], arrhythmia: 0.2 },
  }),
  volcano(12, {
    track: forked(3, 0, 1),
    length: 30,
    tones: 5,
    repeatChance: 0.4,
    speed: 20,
    hint: 'colossus',
    colossus: { hp: 40, spit: 6 },
    hazards: { weather: ['solar'] },
  }),
];

/**
 * World 6, Singularity: a black hole at the centre swallows the chain and
 * bends every shot towards it; the aim line shows the curve. The shooter
 * glides along a ring around it, so the player chooses the moment as much
 * as the angle. The world gathers the earlier mechanics, and ends with the
 * last Colossus.
 */
const SINGULARITY: readonly CampaignLevel[] = [
  singularity(1, {
    track: orbital(1.6, 0.75, true),
    gravity: 0.45,
    length: 30,
    tones: 4,
    repeatChance: 0.5,
    speed: 28,
    hint: 'gravity',
  }),
  singularity(2, {
    track: orbital(1.8, 0.25, false),
    gravity: 0.7,
    orbit: 0.12,
    length: 34,
    tones: 4,
    repeatChance: 0.45,
    speed: 38,
    hint: 'orbit',
  }),
  singularity(3, {
    track: orbital(2, 0.75, true),
    gravity: 0.8,
    orbit: 0.15,
    length: 38,
    tones: 4,
    repeatChance: 0.45,
    speed: 38,
    hazards: { weather: ['wind'] },
  }),
  singularity(4, {
    track: orbital(1.3, 0.75, true, { arms: 2 }),
    gravity: 0.8,
    orbit: -0.15,
    length: 24,
    tones: 4,
    repeatChance: 0.45,
    speed: 32,
  }),
  singularity(5, {
    track: orbital(2.2, 0.5, false),
    gravity: 0.9,
    orbit: 0.18,
    length: 42,
    tones: 5,
    repeatChance: 0.4,
    speed: 44,
    hazards: { weather: ['cold'] },
  }),
  singularity(6, {
    track: orbital(1.8, 0, true),
    gravity: 0.8,
    orbit: 0.12,
    length: 34,
    tones: 4,
    repeatChance: 0.45,
    speed: 38,
    hazards: { arrhythmia: 0.2 },
  }),
  singularity(7, {
    track: orbital(2.2, 0.25, true),
    gravity: 1,
    orbit: -0.18,
    magnet: magnet(2, 4),
    length: 42,
    tones: 5,
    repeatChance: 0.4,
    speed: 50,
    hazards: { weather: ['solar'] },
  }),
  singularity(8, {
    track: orbital(1.5, 0.25, false, { arms: 2 }),
    gravity: 1,
    orbit: 0.2,
    length: 24,
    tones: 5,
    repeatChance: 0.42,
    speed: 28,
  }),
  singularity(9, {
    track: orbital(2.3, 0.75, false),
    gravity: 1.1,
    orbit: 0.2,
    mirrors: CORNER_WALLS,
    length: 44,
    tones: 5,
    repeatChance: 0.4,
    speed: 42,
    hazards: { meteors: 13, weather: ['wind'] },
  }),
  singularity(10, {
    track: orbital(1.8, 0.5, true),
    gravity: 0.9,
    orbit: 0.15,
    palette: withSecondaries(1),
    length: 34,
    tones: 4,
    repeatChance: 0.45,
    speed: 26,
  }),
  singularity(11, {
    track: orbital(2.5, 0, false),
    gravity: 1.2,
    orbit: -0.22,
    length: 48,
    tones: 5,
    repeatChance: 0.38,
    speed: 36,
    hazards: { weather: ['solar', 'cold', 'wind'] },
  }),
  singularity(12, {
    track: orbital(2, 0.75, true),
    gravity: 1,
    orbit: 0.15,
    length: 30,
    tones: 5,
    repeatChance: 0.4,
    speed: 18,
    hint: 'colossus',
    colossus: { hp: 44, spit: 6 },
    hazards: { weather: ['solar', 'cold'] },
  }),
];

/** The six worlds in order; the demo plays the first ones, the others stay empty. */
export const WORLDS: readonly World[] = (
  [
    { id: 'nebula', levels: NEBULA },
    { id: 'neon', levels: NEON },
    { id: 'abyss', levels: ABYSS },
    { id: 'jewel', levels: JEWEL },
    { id: 'volcano', levels: VOLCANO },
    { id: 'singularity', levels: SINGULARITY },
  ] as const satisfies readonly World[]
).map((world, index) => (DEMO && index >= DEMO_WORLDS ? { ...world, levels: [] } : world));

/** True if this build plays the world (the demo plays only the first ones). */
export const playable = (id: WorldId): boolean =>
  WORLDS.some((world) => world.id === id && world.levels.length > 0);

export const CAMPAIGN: readonly CampaignLevel[] = WORLDS.flatMap((world) => world.levels);

export function findLevel(id: string): CampaignLevel | undefined {
  return CAMPAIGN.find((candidate) => candidate.id === id);
}

/** The level after this one in the campaign, if any. */
export function nextLevel(current: CampaignLevel): CampaignLevel | undefined {
  return CAMPAIGN[CAMPAIGN.indexOf(current) + 1];
}

/** The i18n key of a Colossus's name: one per world, and one for the young Colossus. */
export function colossusName(world: WorldId, young = false): string {
  return young ? 'colossus.young' : `colossus.${world}`;
}

/**
 * Scores for two and three stars; one star is earned by finishing the level.
 * Calibrated level by level on a bot that plays like a careful person
 * (src/levels/calibration.ts): about 30 % of its wins reach the third star.
 */
export function starThresholds(level: CampaignLevel): readonly [number, number] {
  return calibratedStars(level);
}

export function starsFor(level: CampaignLevel, score: number, won: boolean): number {
  if (!won) return 0;
  const [two, three] = starThresholds(level);
  return score >= three ? 3 : score >= two ? 2 : 1;
}
