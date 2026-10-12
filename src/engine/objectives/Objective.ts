import type { Ball } from '../chain/Ball';
import type { Chain, Explosion } from '../chain/Chain';
import type { Vec2 } from '../geometry/Vec2';

/** Who caused something: the player, or the computer rival of a duel. */
export type Side = 'player' | 'rival';

/** What an objective may read and do in the game it judges. */
export interface ObjectiveContext {
  readonly chains: readonly Chain[];
  /** Seconds of play so far. */
  readonly elapsed: number;
  /** Shots the player has left, or null without a limit. */
  readonly shotsLeft: number | null;
  /** Balls in flight. */
  readonly inFlight: number;
  /**
   * New balls for chains that grow back: of colours still in play, or of the
   * first `tones` colours when given.
   */
  createBalls(count: number, tones?: number): Ball[];
  /** Domain events an objective may publish. */
  colossusHit(event: { hp: number; maxHp: number; damage: number; position: Vec2 }): void;
  colossusPhase(event: { phase: number }): void;
  stageReached(event: { stage: number; tones: number }): void;
}

/**
 * What wins a level (specification § 3.2): clearing the track, defeating a
 * Colossus… The game asks the objective; the objective never ends the game.
 */
export interface Objective {
  /** Called once, before the first step. */
  start(context: ObjectiveContext): void;
  /** Called after each explosion of chain `chain`. */
  onExplosion(context: ObjectiveContext, chain: number, explosion: Explosion, by: Side): void;
  /** Called at every simulation step. */
  update(context: ObjectiveContext, dt: number): void;
  isComplete(context: ObjectiveContext): boolean;
  /** Lost for another reason than a chain reaching its hole (out of shots…). */
  isFailed?(context: ObjectiveContext): boolean;
}

/** The classic objective: destroy every ball of every chain. */
export class ClearObjective implements Objective {
  start(): void {}

  onExplosion(): void {}

  update(): void {}

  isComplete(context: ObjectiveContext): boolean {
    return context.chains.every((chain) => chain.isEmpty);
  }
}
