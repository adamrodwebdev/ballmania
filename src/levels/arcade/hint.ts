import type { Tone } from '@/engine/chain/Ball';
import type { Game } from '@/engine/Game';
import type { Vec2 } from '@/engine/geometry/Vec2';
import { PuzzleSolver } from './PuzzleSolver';

/** The best next shot of a puzzle: which colour, aimed where. */
export interface PuzzleHint {
  readonly tone: Tone;
  readonly target: Vec2;
}

/**
 * A hint for a puzzle (§ 3.7, rewarded ad): the first shot of a shortest
 * solution of the chain as it is now, aimed at the first ball of its run.
 * Null when the chain is empty or still moving.
 */
export function puzzleHint(game: Game): PuzzleHint | null {
  const chain = game.chains[0];
  if (!chain || chain.balls.length === 0 || !chain.settled) return null;
  const tones = chain.balls.map((ball) => ball.tone);
  const [move] = new PuzzleSolver().solution(tones);
  if (move === undefined) return null;
  let run = -1;
  for (let index = 0; index < tones.length; index++) {
    if (index === 0 || tones[index] !== tones[index - 1]) run++;
    if (run === move) {
      return { tone: tones[index]!, target: chain.positionOf(chain.balls[index]!) };
    }
  }
  return null;
}
