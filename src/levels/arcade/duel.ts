import { LEVEL_DEFAULTS, type LevelDefinition, type Point } from '../LevelDefinition';
import type { Frame } from '../tracks';

export type DuelDifficulty = 'easy' | 'normal' | 'hard';

export interface RivalStyle {
  /** Seconds between two of its shots. */
  readonly cadence: number;
  /** Aim error along the track, in board units. */
  readonly error: number;
  /** Chance it picks its best target. */
  readonly focus: number;
}

/** How the rival plays at each difficulty. */
export const RIVALS: Readonly<Record<DuelDifficulty, RivalStyle>> = {
  easy: { cadence: 2.2, error: 34, focus: 0.3 },
  normal: { cadence: 1.5, error: 18, focus: 0.6 },
  hard: { cadence: 1.05, error: 8, focus: 0.9 },
};

export const DUEL_DIFFICULTIES: readonly DuelDifficulty[] = ['easy', 'normal', 'hard'];

/** Balls of the shared chain at the start. */
const CHAIN = 20;
/** Distance between the ends of the rows and the sides of the board. */
const EDGE = 110;

/**
 * The duel track, three rows: from the rival's hole (top right) to the left,
 * back to the right, then to the player's hole (bottom left). Each side
 * faces its own row first; the middle one is no man's land.
 */
export function duelTrack(frame: Frame): Point[] {
  const rows = [0.3, 0.5, 0.7].map((share) => frame.height * share);
  const turn = (rows[1]! - rows[0]!) / 2;
  const left = EDGE + turn;
  const right = frame.width - EDGE - turn;
  const points: Point[] = [[frame.width - EDGE, rows[0]!]];
  const halfCircle = (x: number, y: number, side: -1 | 1) => {
    for (let k = 0; k <= 24; k++) {
      const angle = -Math.PI / 2 + (k / 24) * Math.PI;
      points.push([x + side * Math.cos(angle) * turn, y + turn + Math.sin(angle) * turn]);
    }
  };
  halfCircle(left, rows[0]!, -1);
  halfCircle(right, rows[1]!, 1);
  points.push([EDGE, rows[2]!]);
  return points;
}

/** Duel mode: a tug of war on one chain against a computer rival (specification § 3.2). */
export function duelLevel(difficulty: DuelDifficulty, frame: Frame): LevelDefinition {
  const points = duelTrack(frame);
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]);
  }
  const diameter = LEVEL_DEFAULTS.ballRadius * 2;
  return {
    id: `duel-${difficulty}`,
    board: { width: frame.width, height: frame.height },
    shooter: [frame.width / 2, frame.height - 130],
    chains: [
      {
        path: { kind: 'points', points },
        length: CHAIN,
        tones: 4,
        repeatChance: 0.4,
        tail: (length - (CHAIN - 1) * diameter) / 2,
      },
    ],
    speed: 0,
    rushSpeed: 0,
    compact: true,
    duel: {
      push: 10,
      minimum: 14,
      regrow: 3,
      growEvery: 3,
      rival: { at: [frame.width / 2, 130], ...RIVALS[difficulty] },
    },
  };
}
