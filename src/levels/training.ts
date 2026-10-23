import { CORNER_WALLS, orbital, spiral, type CampaignLevel } from './campaign';
import type { Lesson, LevelDefinition, Victory } from './LevelDefinition';
import { resolveLevel } from './resolveLevel';
import type { Frame } from './tracks';

/** The showcases of the training, in the order they play (specification § 3.13). */
export type TrainingStep = 1 | 2 | 3;
export const TRAINING_STEPS: readonly TrainingStep[] = [1, 2, 3];

/**
 * The chains stop here, as a share of their track: past the start of the
 * danger cues (80 %), short of the hole. Nobody loses the training.
 */
export const TRAINING_HALT = 0.86;

/** Seconds without a shot after which the hand shows the gesture again. */
export const TRAINING_NUDGE = 5;

/**
 * A showcase of the training (v1.8.0): a short level of its world, made to
 * hook a new player, apart from the campaign (its own content and progress).
 * Its hand teaches one gesture; it ends on a short burst, or on the promise.
 */
export interface TrainingLevel extends CampaignLevel {
  readonly step: TrainingStep;
  readonly lesson: Lesson;
  readonly victory: Victory;
}

/**
 * E1, the Nova (the Nebula's showcase, once level 1-1): the chain is laid out
 * by hand, head first: the gift Nova clears the head; behind it, pairs nested
 * around a pair of the launcher's next colour, so one shot sets off a
 * three-step cascade; a Laser rides in the pair behind; then a second
 * cascade, and a tail.
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
    lesson: 'shot',
    victory: 'short',
    gift: 'bomb',
    sequence: [...SHOWCASE].reverse(),
    // The Nova's own colour, then two of the cascade's middle colour.
    opening: [1, 2, 2],
    powers: { kinds: ['laser'], every: 99, first: 'laser', lead: SHOWCASE_LEAD },
  },
  // E2, the mirrors (Neon): a short spiral within the corner walls, three
  // colours, a slow chain; the hand shows a bank shot that completes a group.
  {
    id: 'training-2',
    world: 'neon',
    number: 2,
    step: 2,
    track: spiral(1.25, 0.25, false),
    mirrors: CORNER_WALLS,
    length: 30,
    tones: 3,
    repeatChance: 0.5,
    speed: 28,
    hint: 'bank',
    lesson: 'bank',
    victory: 'short',
  },
  // E3, the black hole (Singularity): weak gravity and a still launcher, as at
  // 6-1, so that the curve reads at once; the supernova, then the promise.
  {
    id: 'training-3',
    world: 'singularity',
    number: 3,
    step: 3,
    track: orbital(1.5, 0.75, true),
    gravity: 0.45,
    length: 28,
    tones: 3,
    repeatChance: 0.5,
    speed: 26,
    hint: 'curve',
    lesson: 'curve',
    victory: 'promise',
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
