/**
 * The shape of the pieces a ball bursts into: the "signature" of the
 * destruction (specification § 3.6). Returns a polygon around (0, 0) as a
 * flat list x0, y0, x1, y1… of at most 10 corners.
 */
export interface ShardShape {
  outline(random: () => number, size: number): number[];
}

const ring = (corners: number, radius: (i: number) => number, rotation: number): number[] =>
  Array.from({ length: corners }, (_, i) => {
    const a = rotation + (i / corners) * Math.PI * 2;
    return [Math.cos(a) * radius(i), Math.sin(a) * radius(i)];
  }).flat();

/** Irregular glass triangles: the original. */
export class GlassShards implements ShardShape {
  outline(random: () => number, size: number): number[] {
    const a = random() * Math.PI * 2;
    return [
      Math.cos(a) * size,
      Math.sin(a) * size,
      Math.cos(a + 2.2) * size * 0.7,
      Math.sin(a + 2.2) * size * 0.7,
      Math.cos(a + 4.1) * size * 0.85,
      Math.sin(a + 4.1) * size * 0.85,
    ];
  }
}

/** Little five-pointed stars. */
export class StarShards implements ShardShape {
  outline(random: () => number, size: number): number[] {
    return ring(10, (i) => (i % 2 === 0 ? size : size * 0.45), random() * Math.PI);
  }
}

/** Square pixels, like an old arcade screen. */
export class PixelShards implements ShardShape {
  outline(_random: () => number, size: number): number[] {
    const half = size * 0.6;
    return [-half, -half, half, -half, half, half, -half, half];
  }
}

/** Long, soft petals. */
export class PetalShards implements ShardShape {
  outline(random: () => number, size: number): number[] {
    const rotation = random() * Math.PI;
    return ring(8, (i) => (i % 4 === 0 ? size * 1.2 : size * 0.45), rotation);
  }
}
