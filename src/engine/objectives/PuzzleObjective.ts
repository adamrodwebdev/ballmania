import type { Objective, ObjectiveContext } from './Objective';

/**
 * Puzzle mode (specification § 3.2, Arcade): a still chain to clear with a
 * limited number of shots. Lost once the last shot has landed, every chain
 * reaction is over and balls are left.
 */
export class PuzzleObjective implements Objective {
  start(): void {}

  onExplosion(): void {}

  update(): void {}

  isComplete(context: ObjectiveContext): boolean {
    return context.chains.every((chain) => chain.isEmpty);
  }

  isFailed(context: ObjectiveContext): boolean {
    return (
      context.shotsLeft === 0 &&
      context.inFlight === 0 &&
      context.chains.every((chain) => chain.settled) &&
      !this.isComplete(context)
    );
  }
}
