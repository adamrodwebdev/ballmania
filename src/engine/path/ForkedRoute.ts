import type { Vec2 } from '../geometry/Vec2';
import { Path } from './Path';

/** Which way a fork sends the chain: the main line, or the longer detour. */
export type Branch = 'short' | 'long';

/** A track as a sequence of lines and forks; a fork's two branches start and end at the same points. */
export type RoutePart =
  | { readonly kind: 'line'; readonly points: readonly Vec2[] }
  | { readonly kind: 'fork'; readonly short: readonly Vec2[]; readonly long: readonly Vec2[] };

/** A fork on the route actually built: where it starts and ends, in arc length. */
export interface ForkSpan {
  readonly start: number;
  readonly end: number;
  readonly branch: Branch;
}

/**
 * A track with switches (Volcano world, specification § 3.2). For a given
 * choice of branches it builds one ordinary `Path`. Everything before a fork
 * is the same whatever is chosen at that fork, so switching a fork the chain
 * has not reached yet never moves a single ball.
 */
export class ForkedRoute {
  constructor(readonly parts: readonly RoutePart[]) {
    if (parts.length === 0) throw new RangeError('A route needs at least one part');
  }

  get forkCount(): number {
    return this.parts.filter((part) => part.kind === 'fork').length;
  }

  /** Every branch of every fork, for drawing the track. */
  get forks(): readonly { readonly short: readonly Vec2[]; readonly long: readonly Vec2[] }[] {
    return this.parts.flatMap((part) => (part.kind === 'fork' ? [part] : []));
  }

  build(choices: readonly Branch[]): { readonly path: Path; readonly spans: readonly ForkSpan[] } {
    const points: Vec2[] = [];
    const spans: ForkSpan[] = [];
    let length = 0;
    let fork = 0;
    const append = (part: readonly Vec2[]) => {
      for (const point of part) {
        const last = points[points.length - 1];
        if (last && last.distanceTo(point) < 1e-9) continue;
        if (last) length += last.distanceTo(point);
        points.push(point);
      }
    };
    for (const part of this.parts) {
      if (part.kind === 'line') {
        append(part.points);
        continue;
      }
      const branch = choices[fork] ?? 'short';
      const start = length;
      append(branch === 'short' ? part.short : part.long);
      spans.push({ start, end: length, branch });
      fork++;
    }
    return { path: Path.fromPoints(points), spans };
  }
}
