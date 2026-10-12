import type { Objective, ObjectiveContext } from './Objective';

/** From `at` seconds on, the chain moves `speed` times faster and uses `tones` colours. */
export interface EndlessStage {
  readonly at: number;
  readonly speed: number;
  readonly tones: number;
}

export interface EndlessSetup {
  /** In order of time; the first one starts at 0. */
  readonly stages: readonly EndlessStage[];
  /** Balls queued behind the tail each time it comes out of the tunnel. */
  readonly feed: number;
}

/**
 * Endless mode (specification § 3.2, Arcade): the chain never runs out and
 * never stops; every stage makes it faster and more colourful. It cannot be
 * won: the score is the record.
 */
export class EndlessObjective implements Objective {
  private stageValue = 0;

  constructor(readonly setup: EndlessSetup) {
    if (setup.stages.length === 0) throw new RangeError('Endless mode needs a first stage');
  }

  get stage(): number {
    return this.stageValue;
  }

  start(context: ObjectiveContext): void {
    for (const chain of context.chains) chain.setSpeedFactor(this.current.speed);
  }

  onExplosion(): void {}

  update(context: ObjectiveContext): void {
    const next = this.setup.stages[this.stageValue + 1];
    if (next && context.elapsed >= next.at) {
      this.stageValue++;
      for (const chain of context.chains) chain.setSpeedFactor(next.speed);
      context.stageReached({ stage: this.stageValue, tones: next.tones });
    }
    for (const chain of context.chains) {
      const tail = chain.tail;
      // More balls wait in the tunnel as soon as the tail comes out of it.
      if (tail === null || tail > -chain.diameter) {
        chain.feed(context.createBalls(this.setup.feed, this.current.tones));
      }
    }
  }

  isComplete(): boolean {
    return false;
  }

  private get current(): EndlessStage {
    return this.setup.stages[this.stageValue]!;
  }
}
