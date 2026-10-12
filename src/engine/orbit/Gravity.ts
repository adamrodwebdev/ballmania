import type { Vec2 } from '../geometry/Vec2';

export interface GravitySetup {
  /** The black hole, in board units. */
  readonly centre: Vec2;
  /** Pull at one unit of distance (units³/s²): acceleration = strength / distance². */
  readonly strength: number;
  /** Shots that come this close are swallowed. */
  readonly horizon: number;
}

/**
 * Softening length: below it the pull stops growing, so a shot grazing the
 * black hole is not flung away at absurd speed.
 */
const SOFTENING = 60;

/**
 * A black hole at the centre of the board (Singularity world): it bends
 * every shot towards it and swallows those that come too close. The aim
 * line uses the same rule, so it shows the curve the ball will follow.
 */
export class Gravity {
  constructor(readonly setup: GravitySetup) {}

  get centre(): Vec2 {
    return this.setup.centre;
  }

  /** Acceleration felt at `position`, in units per second squared. */
  acceleration(position: Vec2): Vec2 {
    const towards = this.setup.centre.sub(position);
    const squared = towards.dot(towards) + SOFTENING * SOFTENING;
    return towards.scale(this.setup.strength / (squared * Math.sqrt(squared)));
  }

  swallows(position: Vec2): boolean {
    return position.distanceTo(this.setup.centre) < this.setup.horizon;
  }
}
