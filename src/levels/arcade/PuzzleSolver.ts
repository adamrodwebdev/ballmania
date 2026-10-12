import type { RandomSource } from '@/engine/core/Random';

/** A run of touching balls of one colour: [colour, count]. */
type Run = readonly [tone: number, count: number];

/** Smallest group that explodes, as in the game. */
const MIN_MATCH = 3;

const runsOf = (tones: readonly number[]): Run[] => {
  const runs: [number, number][] = [];
  for (const tone of tones) {
    const last = runs[runs.length - 1];
    if (last?.[0] === tone) last[1]++;
    else runs.push([tone, 1]);
  }
  return runs;
};

/**
 * Plays a still chain in the abstract (Puzzle mode): a shot adds a ball to a
 * run of its colour; a run of three or more explodes, and the runs on each
 * side merge if they share a colour, which may explode in turn. This is what
 * the game does with a chain that does not move.
 */
export class PuzzleSolver {
  private readonly memo = new Map<string, number>();

  /** Fewest shots that clear the chain (colours from tail to head). */
  minimumShots(tones: readonly number[]): number {
    return this.solve(runsOf(tones));
  }

  /**
   * A shortest solution: for each shot, the run to shoot into, counted from
   * the tail of the chain as it is at that moment.
   */
  solution(tones: readonly number[]): number[] {
    const moves: number[] = [];
    let runs: readonly Run[] = runsOf(tones);
    while (runs.length > 0) {
      const left = this.solve(runs);
      const current = runs;
      const index = current.findIndex(
        (_, run) => this.solve(PuzzleSolver.shoot(current, run)) === left - 1,
      );
      moves.push(index);
      runs = PuzzleSolver.shoot(current, index);
    }
    return moves;
  }

  /**
   * Shots a player who never uses chain reactions would need: two for a
   * lone ball, one for a pair. The gap with the minimum measures how much
   * the puzzle rewards thinking.
   */
  static naiveShots(tones: readonly number[]): number {
    return runsOf(tones).reduce((sum, [, count]) => sum + (MIN_MATCH - count), 0);
  }

  /** The runs after a shot into run `index`. */
  static shoot(runs: readonly Run[], index: number): Run[] {
    const next = [...runs];
    const [tone, count] = next[index]!;
    if (count + 1 < MIN_MATCH) {
      next[index] = [tone, count + 1];
      return next;
    }
    next.splice(index, 1);
    // The two sides of the gap meet; if they share a colour, they may explode in turn.
    let join = index;
    while (join > 0 && join < next.length && next[join - 1]![0] === next[join]![0]) {
      const merged = next[join - 1]![1] + next[join]![1];
      if (merged < MIN_MATCH) {
        next.splice(join - 1, 2, [next[join]![0], merged]);
        break;
      }
      next.splice(join - 1, 2);
      join--;
    }
    return next;
  }

  private solve(runs: readonly Run[]): number {
    if (runs.length === 0) return 0;
    const key = runs.map(([tone, count]) => `${tone}${count}`).join('');
    const known = this.memo.get(key);
    if (known !== undefined) return known;
    let best = Infinity;
    for (let index = 0; index < runs.length; index++) {
      best = Math.min(best, 1 + this.solve(PuzzleSolver.shoot(runs, index)));
    }
    this.memo.set(key, best);
    return best;
  }
}

/** A puzzle as data: its colours, tail first, and the fewest shots that clear it. */
export interface PuzzleShape {
  readonly sequence: readonly number[];
  readonly par: number;
}

/**
 * Draws random still chains (runs of one or two balls, never two runs of
 * the same colour side by side) and keeps the one whose solution saves the
 * most shots through chain reactions, within the wanted range of shots.
 */
export function generatePuzzle(
  random: RandomSource,
  spec: {
    readonly length: number;
    readonly tones: number;
    readonly par: readonly [min: number, max: number];
    readonly tries: number;
  },
): PuzzleShape {
  let best: (PuzzleShape & { readonly saved: number }) | null = null;
  for (let attempt = 0; attempt < spec.tries || !best; attempt++) {
    const sequence: number[] = [];
    while (sequence.length < spec.length) {
      const previous = sequence[sequence.length - 1];
      const choices = Array.from({ length: spec.tones }, (_, tone) => tone).filter(
        (tone) => tone !== previous,
      );
      const tone = choices[random.nextInt(choices.length)]!;
      const count = random.next() < 0.5 ? 1 : 2;
      for (let k = 0; k < count && sequence.length < spec.length; k++) sequence.push(tone);
    }
    const par = new PuzzleSolver().minimumShots(sequence);
    const saved = PuzzleSolver.naiveShots(sequence) - par;
    const inRange = par >= spec.par[0] && par <= spec.par[1];
    if (!inRange && attempt < spec.tries * 20) continue;
    if (!best || saved > best.saved) best = { sequence, par, saved };
  }
  return { sequence: best.sequence, par: best.par };
}
