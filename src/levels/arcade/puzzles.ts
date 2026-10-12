import { SeededRandom } from '@/engine/core/Random';
import { LEVEL_DEFAULTS, type LevelDefinition } from '../LevelDefinition';
import { buildTrack, type Frame } from '../tracks';
import { generatePuzzle } from './PuzzleSolver';

/** A puzzle: a still chain to clear with few shots (specification § 3.2, Arcade). */
export interface Puzzle {
  /** "puzzle-07", or "puzzle-20261012" for the puzzle of the day. */
  readonly id: string;
  /** 1 to 30; 0 for the puzzle of the day. */
  readonly number: number;
  /** Colours, tail first. */
  readonly sequence: readonly number[];
  /** Fewest shots that clear it (chain reactions included). */
  readonly par: number;
  /** Shots allowed. */
  readonly shots: number;
}

/**
 * The thirty puzzles, as colour letters (a = first colour) and par. Drawn by
 * `generatePuzzle` among many random chains for the ones whose solution
 * saves the most shots through chain reactions, in three tiers: two or
 * three shots, then three to five, then five to seven. Tests check every par.
 */
const DATA: readonly (readonly [letters: string, par: number])[] = [
  ['aabbacca', 2],
  ['abbaccaa', 2],
  ['aaccabaca', 3],
  ['abccbbabb', 3],
  ['ccbbabbaac', 2],
  ['bbabccbbaa', 2],
  ['bbccacaacbb', 2],
  ['aabbcbbccaa', 2],
  ['accabbacabba', 3],
  ['aacbbaabcacc', 3],
  ['aabacbcaabba', 3],
  ['bddbcddbdcbb', 4],
  ['abccbbabcbaba', 5],
  ['cacaababbcddc', 5],
  ['ccbbcbbcabbabc', 4],
  ['addaddaacdaada', 4],
  ['baacabcaaccbbab', 4],
  ['dccdbddcbbddccd', 4],
  ['bacbccbbcabbccac', 5],
  ['bdbdccdcddbddaad', 5],
  ['adcdbaabbccddba', 6],
  ['cdcaccdcdbbabdd', 6],
  ['bbdccbccdcacddb', 5],
  ['bdcaaccaccbaadda', 5],
  ['bcabdaadbbabccbb', 5],
  ['ddcacbbcbbdcaccd', 5],
  ['adacabbdccdbaddcc', 7],
  ['caabbabacbcdadccb', 7],
  ['dbdccdbbdbbadcaad', 7],
  ['bbdaaccdbbdccbcdcb', 6],
];

/** Extra shots allowed beyond par: generous at first. */
const slack = (number: number) => (number <= 10 ? 2 : 1);

export const PUZZLES: readonly Puzzle[] = DATA.map(([letters, par], index) => ({
  id: `puzzle-${String(index + 1).padStart(2, '0')}`,
  number: index + 1,
  sequence: Array.from({ length: letters.length }, (_, i) => letters.charCodeAt(i) - 97),
  par,
  shots: par + slack(index + 1),
}));

/**
 * The puzzle of the day: drawn from the day, the same for everyone, of
 * middle difficulty (four to six shots).
 */
export function dailyPuzzle(day: string): Puzzle {
  const shape = generatePuzzle(SeededRandom.fromString(`puzzle:${day}`), {
    length: 14,
    tones: 4,
    par: [4, 6],
    tries: 12,
  });
  return { id: `puzzle-${day}`, number: 0, ...shape, shots: shape.par + 1 };
}

/** Three stars at par, two with one shot more, one otherwise. */
export function puzzleStars(puzzle: Puzzle, shots: number, won: boolean): number {
  if (!won) return 0;
  return shots <= puzzle.par ? 3 : shots === puzzle.par + 1 ? 2 : 1;
}

/** The puzzle on a board: the chain still and centred on a wide spiral, the shooter inside. */
export function puzzleLevel(puzzle: Puzzle, frame: Frame): LevelDefinition {
  const track = buildTrack(
    {
      kind: 'spiral',
      turns: 1.2,
      outer: 0.84,
      inner: 0.48,
      start: (puzzle.number * 0.37) % 1,
      clockwise: puzzle.number % 2 === 0,
      portal: true,
    },
    frame,
  );
  const points = track.paths[0]!;
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    length += Math.hypot(bx - ax, by - ay);
  }
  const span = (puzzle.sequence.length - 1) * LEVEL_DEFAULTS.ballRadius * 2;
  return {
    id: puzzle.id,
    board: { width: frame.width, height: frame.height },
    shooter: track.shooter,
    chains: [
      {
        path: { kind: 'points', points },
        length: puzzle.sequence.length,
        tones: Math.max(...puzzle.sequence) + 1,
        repeatChance: 0,
        sequence: puzzle.sequence,
        tail: (length - span) / 2,
      },
    ],
    speed: 0,
    rushSpeed: 0,
    puzzle: { shots: puzzle.shots },
  };
}
