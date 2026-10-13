import type { RandomSource } from '../core/Random';
import { Vec2 } from '../geometry/Vec2';

/** A star fragment crossing the board. */
export interface Fragment {
  readonly id: number;
  position: Vec2;
  readonly velocity: Vec2;
  age: number;
}

/** Speed of a fragment across the board, in units per second. */
const FRAGMENT_SPEED = 170;

/**
 * Star fragments (specification § 3.9): every few seconds a shooting star
 * crosses the board in a straight line; a shot passing close enough catches
 * it. They are the currency of the Observatory.
 */
export class StarFragments {
  private readonly items: Fragment[] = [];
  private wait: number;
  private nextId = 1;

  constructor(
    private readonly every: number,
    private readonly board: { readonly width: number; readonly height: number },
    private readonly random: RandomSource,
  ) {
    this.wait = this.next();
  }

  get fragments(): readonly Fragment[] {
    return this.items;
  }

  update(dt: number): void {
    this.wait -= dt;
    if (this.wait <= 0) {
      this.wait = this.next();
      this.spawn();
    }
    const { width, height } = this.board;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const fragment = this.items[i]!;
      fragment.age += dt;
      fragment.position = fragment.position.add(fragment.velocity.scale(dt));
      const { x, y } = fragment.position;
      if (fragment.age > 1 && (x < -80 || y < -80 || x > width + 80 || y > height + 80)) {
        this.items.splice(i, 1);
      }
    }
  }

  /** The fragment a shot at `point` catches, if one is within `reach`; it is removed. */
  catchAt(point: Vec2, reach: number): Fragment | null {
    const index = this.items.findIndex((item) => item.position.distanceTo(point) < reach);
    if (index < 0) return null;
    return this.items.splice(index, 1)[0]!;
  }

  /** A fragment enters from one side and crosses towards a point near the middle. */
  private spawn(): void {
    const { width, height } = this.board;
    const fromLeft = this.random.next() < 0.5;
    const start = new Vec2(fromLeft ? -60 : width + 60, height * (0.1 + 0.5 * this.random.next()));
    const target = new Vec2(
      width * (0.3 + 0.4 * this.random.next()),
      height * (0.2 + 0.5 * this.random.next()),
    );
    this.items.push({
      id: this.nextId++,
      position: start,
      velocity: target.sub(start).normalize().scale(FRAGMENT_SPEED),
      age: 0,
    });
  }

  private next(): number {
    return this.every * (0.75 + 0.5 * this.random.next());
  }
}
