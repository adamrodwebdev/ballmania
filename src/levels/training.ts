import { CORNER_WALLS, orbital, spiral, type CampaignLevel } from './campaign';
import type { Lesson, LevelDefinition, Victory } from './LevelDefinition';
import { resolveLevel } from './resolveLevel';
import type { Frame } from './tracks';

/** The showcases of the training, in the order they play (specification § 3.13). */
export type TrainingStep = 1 | 2 | 3;
export const TRAINING_STEPS: readonly TrainingStep[] = [1, 2, 3];

/**
 * The chains stop here, as a share of their track: past the start of the
 * alarm (two thirds), short of the hole. Nobody loses the training.
 */
export const TRAINING_HALT = 0.86;

/** Seconds without a shot after which the hand shows the gesture again. */
export const TRAINING_NUDGE = 5;

/**
 * A showcase of the training (v1.8.0): a short level of its world, made to
 * hook a new player, apart from the campaign (its own content and progress).
 * Its hand teaches its gestures in turn; it ends on a short burst, or on the
 * promise.
 */
export interface TrainingLevel extends CampaignLevel {
  readonly step: TrainingStep;
  readonly lessons: readonly Lesson[];
  readonly victory: Victory;
}

/**
 * E1, the Nova (the Nebula's showcase, once level 1-1): the chain is laid out
 * by hand, head first: the gift Nova clears the head; behind it, pairs nested
 * around a pair of a colour the launcher deals second, so one shot sets off
 * a three-step cascade; a Laser rides in the pair behind; then a second
 * cascade, and a tail. After the Nova (v1.8.1), the ball loaded makes no more
 * than a group, the next one the cascade: the hand teaches the swap, then the
 * charged shot on that very ball.
 */
const SHOWCASE = [
  ...[2, 2, 1, 1, 0, 0], // the head, for the Nova
  ...[1, 1, 0, 0, 2, 2, 0, 0, 1, 1], // a 2 bursts the 2s, the 0s meet and burst, then the 1s
  ...[2, 2], // the Laser's pair
  ...[0, 0, 1, 1, 2, 2, 1, 1, 0, 0], // the second cascade
  ...[2, 1, 1, 0, 0, 2, 2, 1], // the tail
];
/** Marbles ahead of the Laser, from the head: the Nova zone and the first cascade. */
const SHOWCASE_LEAD = 16;

/**
 * Pairs in turn, head first: a shot of a pair's colour into it makes a
 * group; neighbours of another colour meet, so a chain reaction comes only
 * from two pairs cleared side by side.
 */
const pairs = (count: number, first: number): number[] =>
  Array.from({ length: count * 2 }, (_, i) => (first + Math.floor(i / 2)) % 3);

/**
 * E2, the mirrors, head first: pairs nested around a middle pair, so that a
 * bank shot of the colour dealt first sets a three-step cascade off; then
 * pairs in turn, to bank again.
 */
const MIRRORS = [...[1, 1, 0, 0, 2, 2, 0, 0, 1, 1], ...pairs(12, 2)];

/**
 * E3, the black hole, head first: a cascade for the first curved shot, then
 * pairs in turn, each won by a shot the black hole bends.
 */
const BLACK_HOLE = [...[0, 0, 1, 1, 2, 2, 1, 1, 0, 0], ...pairs(7, 2)];

export const TRAINING: readonly TrainingLevel[] = [
  {
    id: 'training-1',
    world: 'nebula',
    number: 1,
    step: 1,
    track: spiral(1.25, 0.75, true),
    length: SHOWCASE.length,
    tones: 3,
    repeatChance: 0.55,
    speed: 30,
    hint: 'aim',
    lessons: ['shot', 'swap', 'charge'],
    victory: 'short',
    gift: 'bomb',
    sequence: [...SHOWCASE].reverse(),
    // The Nova's own colour; one that only makes a group, before two of the cascade's middle
    // colour: the swap brings the cascade forward.
    opening: [1, 0, 2, 2],
    powers: { kinds: ['laser'], every: 99, first: 'laser', lead: SHOWCASE_LEAD },
  },
  // E2, the mirrors (Neon): a short spiral within the corner walls, three
  // colours, a slow chain; the hand shows a bank shot that makes a group.
  {
    id: 'training-2',
    world: 'neon',
    number: 2,
    step: 2,
    track: spiral(1.25, 0.25, false),
    mirrors: CORNER_WALLS,
    length: MIRRORS.length,
    tones: 3,
    repeatChance: 0.5,
    speed: 26,
    hint: 'bank',
    lessons: ['bank'],
    victory: 'short',
    sequence: [...MIRRORS].reverse(),
    opening: [2, 0, 1],
  },
  // E3, the black hole (Singularity): weak gravity and a still launcher, as at
  // 6-1, so that the curve reads at once; the supernova, then the promise.
  {
    id: 'training-3',
    world: 'singularity',
    number: 3,
    step: 3,
    // The spiral ends well outside the disk: a head that waits at the halt can be hit.
    track: orbital(1.5, 0.75, true, { inner: 0.32 }),
    gravity: 0.45,
    length: BLACK_HOLE.length,
    tones: 3,
    repeatChance: 0.5,
    speed: 22,
    hint: 'curve',
    lessons: ['curve'],
    victory: 'promise',
    sequence: [...BLACK_HOLE].reverse(),
    opening: [2, 1, 0],
  },
];

export function trainingLevel(step: TrainingStep): TrainingLevel {
  return TRAINING[step - 1]!;
}

/**
 * A showcase on one board shape: its chain stops short of the hole, its hand
 * comes back to a player who waits, and its ending.
 */
export function trainingDefinition(level: TrainingLevel, frame: Frame): LevelDefinition {
  return {
    ...resolveLevel(level, frame),
    halt: TRAINING_HALT,
    nudge: TRAINING_NUDGE,
    victory: level.victory,
  };
}
