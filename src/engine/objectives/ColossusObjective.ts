import type { Chain, Explosion } from '../chain/Chain';
import type { Objective, ObjectiveContext } from './Objective';

export interface ColossusSetup {
  /** Index of the chain the Colossus pushes. */
  readonly chain: number;
  readonly hp: number;
  /** Radius of its body, in board units. */
  readonly radius: number;
  /** Explosions within this distance (along the track) of its body hurt it. */
  readonly reach: number;
  /** Pushing speed factor of each phase; a new phase starts at each third of its health. */
  readonly phases: readonly number[];
  /** Balls it spits in front of itself when a phase starts or its chain runs out. */
  readonly spit: number;
}

/**
 * A boss fight (specification § 3.2): a Colossus pushes the chain from behind.
 * Explosions close to it hurt it (balls × depth); at each third of its health
 * it gets faster and spits new balls. It never runs out of balls: an empty
 * chain grows back. The level is won when it falls.
 */
export class ColossusObjective implements Objective {
  private hpValue: number;
  private phaseValue = 0;

  constructor(readonly setup: ColossusSetup) {
    this.hpValue = setup.hp;
  }

  get hp(): number {
    return this.hpValue;
  }

  get phase(): number {
    return this.phaseValue;
  }

  start(context: ObjectiveContext): void {
    const chain = this.chainOf(context);
    chain.attachPusher(this.setup.radius);
    chain.setSpeedFactor(this.setup.phases[0] ?? 1);
  }

  onExplosion(context: ObjectiveContext, index: number, explosion: Explosion): void {
    if (index !== this.setup.chain || this.hpValue <= 0) return;
    const chain = this.chainOf(context);
    const body = chain.pusherArc;
    const rear = explosion.balls[0];
    if (body === null || !rear) return;
    const gap = rear.s - (body + this.setup.radius);
    if (gap > this.setup.reach) return;

    const damage = Math.min(this.hpValue, explosion.balls.length * explosion.depth);
    this.hpValue -= damage;
    context.colossusHit({
      hp: this.hpValue,
      maxHp: this.setup.hp,
      damage,
      position: chain.path.pointAt(body),
    });

    const phase = Math.min(
      this.setup.phases.length - 1,
      Math.floor((1 - this.hpValue / this.setup.hp) * this.setup.phases.length),
    );
    if (phase > this.phaseValue && this.hpValue > 0) {
      this.phaseValue = phase;
      chain.setSpeedFactor(this.setup.phases[phase] ?? 1);
      chain.feed(context.createBalls(this.setup.spit));
      context.colossusPhase({ phase });
    }
  }

  update(context: ObjectiveContext): void {
    const chain = this.chainOf(context);
    if (this.hpValue > 0 && chain.isEmpty) chain.feed(context.createBalls(this.setup.spit));
  }

  isComplete(): boolean {
    return this.hpValue <= 0;
  }

  private chainOf(context: ObjectiveContext): Chain {
    const chain = context.chains[this.setup.chain];
    if (!chain) throw new RangeError(`No chain ${this.setup.chain} for the Colossus`);
    return chain;
  }
}
