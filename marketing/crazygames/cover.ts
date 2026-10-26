import type { Tone } from '@/engine/chain/Ball';
import { SeededRandom } from '@/engine/core/Random';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallSprites } from '@/play/BallSprites';
import { ColossusPainter, RUNE_ORBIT } from '@/play/ColossusPainter';
import { SHOOTER_RADIUS, StarHeartSkin } from '@/play/cosmetics/ShooterSkins';
import { PROMISE_SIZE } from '@/play/effects/Promise';
import type { Palette } from '@/play/Palette';
import { withAlpha } from '@/play/themes/WorldTheme';

/** The typeface of the title (Google Fonts, SIL Open Font License). */
export const TITLE_FONT = 'Lilita One';

type Point = readonly [number, number];

/** Where things go on a cover, as shares of its width and height. */
interface Layout {
  /** The title's centre, its height and its widest, as shares of the cover's width. */
  readonly title: Point;
  readonly titleSize: number;
  readonly titleWidth: number;
  /**
   * The black hole, on the horizon where the neon grid runs to, and the
   * radius of its horizon as a share of the cover's smaller side.
   */
  readonly hole: Point;
  readonly horizon: number;
  /** The chain's road on the grid: waypoints from where it comes in; it ends in the pit. */
  readonly road: readonly Point[];
  /** Where the group bursts: the marbles nearest this point. */
  readonly burst: Point;
  /** The Star heart: its centre, and its size as a share of the biggest marble's. */
  readonly launcher: { readonly at: Point; readonly size: number };
}

const LAYOUTS: Record<'landscape' | 'portrait' | 'tall' | 'square', Layout> = {
  landscape: {
    title: [0.29, 0.2],
    titleSize: 0.115,
    titleWidth: 0.52,
    hole: [0.7, 0.52],
    horizon: 0.11,
    road: [
      [-0.05, 0.94],
      [0.4, 0.95],
      [0.56, 0.84],
      [0.42, 0.74],
      [0.2, 0.68],
      [0.17, 0.615],
      [0.38, 0.575],
    ],
    burst: [0.26, 0.7],
    launcher: { at: [0.88, 0.8], size: 0.85 },
  },
  portrait: {
    title: [0.5, 0.115],
    titleSize: 0.19,
    titleWidth: 0.9,
    hole: [0.5, 0.5],
    horizon: 0.12,
    road: [
      [-0.1, 0.94],
      [0.45, 0.96],
      [0.7, 0.86],
      [0.55, 0.77],
      [0.2, 0.72],
      [0.12, 0.64],
      [0.3, 0.575],
    ],
    burst: [0.2, 0.72],
    launcher: { at: [0.83, 0.74], size: 0.75 },
  },
  // 9:16 (Playgama): the same scene, taller.
  tall: {
    title: [0.5, 0.12],
    titleSize: 0.19,
    titleWidth: 0.9,
    hole: [0.5, 0.47],
    horizon: 0.13,
    road: [
      [-0.1, 0.93],
      [0.45, 0.95],
      [0.7, 0.85],
      [0.55, 0.75],
      [0.2, 0.69],
      [0.12, 0.6],
      [0.3, 0.54],
    ],
    burst: [0.2, 0.69],
    launcher: { at: [0.83, 0.72], size: 0.7 },
  },
  square: {
    title: [0.5, 0.135],
    titleSize: 0.17,
    titleWidth: 0.9,
    hole: [0.6, 0.55],
    horizon: 0.1,
    road: [
      [-0.08, 0.94],
      [0.42, 0.96],
      [0.62, 0.87],
      [0.48, 0.78],
      [0.2, 0.74],
      [0.14, 0.67],
      [0.32, 0.615],
    ],
    burst: [0.2, 0.74],
    launcher: { at: [0.86, 0.76], size: 0.7 },
  },
};

const layoutOf = (width: number, height: number): Layout => {
  const ratio = width / height;
  if (ratio > 1.2) return LAYOUTS.landscape;
  if (ratio < 0.6) return LAYOUTS.tall;
  if (ratio < 0.85) return LAYOUTS.portrait;
  return LAYOUTS.square;
};

/** The colours of the chain, in runs of two and three, as the game deals them. */
const RUNS: readonly Tone[] = [
  0, 0, 1, 1, 1, 2, 2, 4, 4, 4, 3, 3, 0, 0, 2, 2, 2, 1, 1, 4, 4, 3, 3, 3,
];
/** The radius of the nearest marbles, as a share of the cover's smaller side. */
const MARBLE = 0.085;
/** The colour of the shot and of the group it bursts. */
const SHOT: Tone = 5;
/** How far the Colossus stands above the hole's centre, in body radii. */
const RISEN = 0.45;
/** Where its runes stand on their orbit, in radians: off the vertical, so they never read as ears. */
const TURN = -0.9;
/** The pit's half-width, in horizon radii, and how flat the grazing angle makes it. */
const PIT = 2.1;
const FLAT = 0.24;

interface Marble {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly tone: Tone;
  /** One of the group the shot bursts. */
  readonly bursts?: boolean;
}

/**
 * The cover (CrazyGames: landscape 16:9, portrait 2:3, square 1:1): not a
 * screenshot but an illustration in the game's own materials, showing what
 * the first session holds. A chain of glass marbles rolls along the Neon
 * world's grid towards a black hole on the horizon; the young Stellar
 * Colossus rises out of it and stares at the player, as at the end of the
 * training; in the foreground, the Star heart has fired, and a group
 * bursts. The title is the only text: no border, no logo.
 */
export function drawCover(canvas: HTMLCanvasElement, palette: Palette, title = 'Ballmania'): void {
  const { width: W, height: H } = canvas;
  const ctx = canvas.getContext('2d')!;
  const layout = layoutOf(W, H);
  const unit = Math.min(W, H);
  const random = SeededRandom.fromString('ballmania-cover');
  const hole = { x: layout.hole[0] * W, y: layout.hole[1] * H };
  const horizon = layout.horizon * unit;

  paintSky(ctx, W, H, hole, horizon, random);
  paintGrid(ctx, W, H, hole, palette);
  paintDisc(ctx, hole, horizon, 'far');
  paintPit(ctx, hole, horizon);
  paintColossus(ctx, W, hole, horizon, palette, random);

  const sprites = new BallSprites(() => document.createElement('canvas'));
  const biggest = unit * MARBLE;
  sprites.build(palette, biggest);
  const chain = layChain(layout, W, H, hole, horizon, biggest);
  const group = chain.filter((marble) => marble.bursts);
  const centre = group[1]!;
  const blast = centre.r * 4.2;
  const shot = aimShot(layout, W, H, centre, blast);
  // The trail goes under the marbles, so that they keep their colours.
  paintTrail(ctx, palette, shot);
  // Far marbles first, so the nearer ones overlap them.
  const kept = chain.filter((marble) => !marble.bursts);
  for (const marble of [...kept].reverse()) paintMarble(ctx, sprites, marble, biggest);
  // The near half of the disc passes in front of the pit, the Colossus and the last marbles.
  paintDisc(ctx, hole, horizon, 'near');
  paintBurst(ctx, palette, group, blast, random);
  paintLauncher(ctx, palette, sprites, shot);

  drawTitle(
    ctx,
    layout.title[0] * W,
    layout.title[1] * H,
    layout.titleSize * W,
    title,
    W * layout.titleWidth,
  );

  // A soft vignette keeps the eye in the middle.
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    unit * 0.45,
    W / 2,
    H / 2,
    Math.hypot(W, H) * 0.62,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

/** Deep space over the horizon, a magenta haze along it, light pouring from the hole. */
function paintSky(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  hole: { x: number; y: number },
  horizon: number,
  random: SeededRandom,
): void {
  const unit = Math.min(W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, hole.y);
  sky.addColorStop(0, '#050822');
  sky.addColorStop(0.55, '#0f0c3c');
  sky.addColorStop(1, '#2c1157');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, hole.y);
  const ground = ctx.createLinearGradient(0, hole.y, 0, H);
  ground.addColorStop(0, '#2a0b46');
  ground.addColorStop(0.2, '#0c0726');
  ground.addColorStop(1, '#04030d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, hole.y, W, H - hole.y);

  ctx.globalCompositeOperation = 'lighter';
  // Nebula clouds, cooler than the hole's light.
  const clouds: [number, number, number, string][] = [
    [0.12, 0.18, 0.5, 'rgba(40, 160, 255, 0.16)'],
    [0.95, 0.12, 0.45, 'rgba(150, 70, 255, 0.16)'],
    [0.45, 0.05, 0.4, 'rgba(255, 60, 170, 0.08)'],
  ];
  for (const [x, y, r, colour] of clouds) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * Math.max(W, H));
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // The haze where the grid meets the sky.
  const haze = ctx.createLinearGradient(0, hole.y - unit * 0.16, 0, hole.y + unit * 0.1);
  haze.addColorStop(0, 'rgba(255, 60, 170, 0)');
  haze.addColorStop(0.62, 'rgba(255, 60, 170, 0.32)');
  haze.addColorStop(1, 'rgba(255, 60, 170, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, hole.y - unit * 0.16, W, unit * 0.26);
  // The hole's light.
  const light = ctx.createRadialGradient(hole.x, hole.y, horizon, hole.x, hole.y, horizon * 7);
  light.addColorStop(0, 'rgba(255, 170, 90, 0.5)');
  light.addColorStop(0.3, 'rgba(255, 80, 140, 0.18)');
  light.addColorStop(1, 'rgba(120, 60, 255, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  // Stars above the horizon, fewer near the hole, as if it drank their light.
  const reach = Math.hypot(W, H) * 0.5;
  for (let i = 0; i < (W * hole.y) / 1800; i++) {
    const x = random.next() * W;
    const y = random.next() * hole.y;
    if (random.next() > (Math.hypot(x - hole.x, y - hole.y) / reach) * 1.8) continue;
    const size = random.next() ** 3 * unit * 0.004 + unit * 0.0008;
    ctx.globalAlpha = (0.3 + random.next() * 0.7) * Math.min(1, (hole.y - y) / (unit * 0.08));
    ctx.fillStyle = random.next() < 0.2 ? '#ffd9a8' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The Neon world's grid: lines running to the hole, crossed by lines closer and closer together. */
function paintGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  hole: { x: number; y: number },
  palette: Palette,
): void {
  const unit = Math.min(W, H);
  const cyan = palette.tone(3);
  const fade = ctx.createLinearGradient(0, hole.y, 0, H);
  fade.addColorStop(0, withAlpha(cyan, 0));
  fade.addColorStop(0.18, withAlpha(cyan, 0.3));
  fade.addColorStop(1, withAlpha(cyan, 0.75));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, hole.y, W, H - hole.y);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = fade;
  ctx.shadowColor = cyan;
  ctx.shadowBlur = unit * 0.01;
  ctx.lineWidth = Math.max(1.5, unit * 0.003);
  for (let i = 1; i <= 14; i++) {
    const y = hole.y + (H - hole.y) * (i / 14) ** 2.1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const spread = Math.max(W, H) * 1.4;
  for (let i = -16; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(hole.x, hole.y);
    ctx.lineTo(hole.x + (i / 16) * spread, H);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The accretion disc around the pit, seen at a grazing angle: rings from
 * white-hot to violet. The far half goes behind the Colossus, the near half
 * in front of it, so that it rises out of the disc.
 */
function paintDisc(
  ctx: CanvasRenderingContext2D,
  hole: { x: number; y: number },
  horizon: number,
  half: 'far' | 'near',
): void {
  ctx.save();
  ctx.translate(hole.x, hole.y);
  ctx.globalCompositeOperation = 'lighter';
  const [from, to] = half === 'far' ? [Math.PI, Math.PI * 2] : [0, Math.PI];
  const rings = 44;
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const radius = horizon * PIT * (1 + t * 1.15);
    const hue = 40 - t * 125;
    ctx.strokeStyle = `hsla(${hue}, 100%, ${72 - t * 20}%, ${0.5 * (1 - t) ** 1.3 + 0.04})`;
    ctx.lineWidth = horizon * 0.08 * (1 - t * 0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * FLAT, 0, from, to);
    ctx.stroke();
  }
  ctx.restore();
}

/** The black hole, seen from the grid: a pit of night where the road ends. */
function paintPit(
  ctx: CanvasRenderingContext2D,
  hole: { x: number; y: number },
  horizon: number,
): void {
  const rx = horizon * PIT;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(hole.x, hole.y, rx, rx * FLAT, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The young Stellar Colossus rising out of the pit, mid-roar, staring at the
 * player: the game's own painter, scaled up whole, in a corona of fire, its
 * runes on their orbit. What is below the pit's near rim stays hidden in it.
 */
function paintColossus(
  ctx: CanvasRenderingContext2D,
  W: number,
  hole: { x: number; y: number },
  horizon: number,
  palette: Palette,
  random: SeededRandom,
): void {
  const radius = horizon * PROMISE_SIZE;
  const centre = { x: hole.x, y: hole.y - radius * RISEN };
  const rx = horizon * PIT;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, hole.y);
  ctx.lineTo(hole.x + rx, hole.y);
  ctx.ellipse(hole.x, hole.y, rx, rx * FLAT, 0, 0, Math.PI);
  ctx.lineTo(0, hole.y);
  ctx.closePath();
  ctx.clip();

  // Its fire: a glow behind it (the flames come after the body).
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(
    centre.x,
    centre.y,
    radius * 0.8,
    centre.x,
    centre.y,
    radius * 2.6,
  );
  glow.addColorStop(0, withAlpha(palette.danger, 0.55));
  glow.addColorStop(0.35, 'rgba(255, 140, 60, 0.22)');
  glow.addColorStop(1, 'rgba(255, 80, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius * 2.6, 0, Math.PI * 2);
  ctx.fill();
  const point = (angle: number, distance: number) => ({
    x: centre.x + Math.cos(angle) * distance,
    y: centre.y + Math.sin(angle) * distance,
  });
  // A tongue of fire from the rim, hottest at its root, leaning the way it turns.
  const tongue = (angle: number, reach: number, width: number, colours: readonly string[]) => {
    const fire = ctx.createRadialGradient(
      centre.x,
      centre.y,
      radius * 0.95,
      centre.x,
      centre.y,
      reach,
    );
    colours.forEach((colour, i) => fire.addColorStop(i / (colours.length - 1), colour));
    ctx.fillStyle = fire;
    const left = point(angle - width / 2, radius * 0.95);
    const right = point(angle + width / 2, radius * 0.95);
    const tip = point(angle + 0.16, reach);
    const bendLeft = point(angle - width * 0.1, (radius + reach) / 2);
    const bendRight = point(angle + width * 0.45, (radius + reach) / 2);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.quadraticCurveTo(bendLeft.x, bendLeft.y, tip.x, tip.y);
    ctx.quadraticCurveTo(bendRight.x, bendRight.y, right.x, right.y);
    ctx.closePath();
    ctx.fill();
  };
  ctx.globalCompositeOperation = 'source-over';

  // The runes' orbit, faint, and a short trail behind each rune.
  const orbit = radius * RUNE_ORBIT;
  ctx.strokeStyle = withAlpha(palette.accent, 0.22);
  ctx.lineWidth = radius * 0.025;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, orbit, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineCap = 'round';
  for (let rune = 0; rune < 3; rune++) {
    const angle = TURN + (rune / 3) * Math.PI * 2;
    for (let step = 0; step < 8; step++) {
      ctx.strokeStyle = withAlpha(palette.accent, 0.5 * (1 - step / 8));
      ctx.lineWidth = radius * 0.16 * (1 - step / 10);
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, orbit, angle - (step + 1) * 0.07, angle - step * 0.07);
      ctx.stroke();
    }
  }

  // The body, by the game's own painter: it draws in board units.
  const size = 60;
  ctx.translate(centre.x, centre.y);
  ctx.scale(radius / size, radius / size);
  new ColossusPainter().draw(ctx, palette, {
    at: Vec2.ZERO,
    radius: size,
    young: true,
    gaze: Vec2.ZERO,
    time: 0.4,
    turn: TURN,
    open: 1,
    rage: 0.4,
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Its corona, over the painter's own halo: the fire licks from the rim.
  ctx.globalCompositeOperation = 'lighter';
  // Long red tongues outside, short white-hot ones against the rim.
  const outer = 28;
  for (let i = 0; i < outer; i++) {
    tongue(
      (i / outer) * Math.PI * 2 + random.next() * 0.2,
      radius * (1.4 + random.next() * 0.55),
      ((Math.PI * 2) / outer) * (0.6 + random.next() * 0.5),
      ['rgba(255, 150, 60, 0.7)', withAlpha(palette.danger, 0.45), 'rgba(255, 40, 80, 0)'],
    );
  }
  const inner = 44;
  for (let i = 0; i < inner; i++) {
    tongue(
      (i / inner) * Math.PI * 2 + random.next() * 0.15,
      radius * (1.12 + random.next() * 0.22),
      ((Math.PI * 2) / inner) * (0.9 + random.next() * 0.6),
      ['rgba(255, 245, 200, 0.95)', 'rgba(255, 190, 80, 0.6)', 'rgba(255, 110, 40, 0)'],
    );
  }
  ctx.globalCompositeOperation = 'source-over';

  // A dark star: faint stars inside the body, away from the eye.
  ctx.save();
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius * 0.95, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 40; i++) {
    const angle = random.next() * Math.PI * 2;
    const distance = radius * (0.42 + random.next() * 0.55);
    const at = point(angle, distance);
    ctx.globalAlpha = 0.25 + random.next() * 0.5;
    ctx.fillStyle = random.next() < 0.3 ? '#ffd9a8' : '#ffffff';
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * (0.008 + random.next() ** 3 * 0.02), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // The runes shine.
  ctx.globalCompositeOperation = 'lighter';
  for (let rune = 0; rune < 3; rune++) {
    const at = point(TURN + (rune / 3) * Math.PI * 2, orbit);
    const shine = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, radius * 0.4);
    shine.addColorStop(0, withAlpha(palette.accent, 0.8));
    shine.addColorStop(1, withAlpha(palette.accent, 0));
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The chain on the grid: marbles touching along the road, smaller and
 * smaller towards the horizon, in perspective, until the pit swallows them.
 */
function layChain(
  layout: Layout,
  W: number,
  H: number,
  hole: { x: number; y: number },
  horizon: number,
  biggest: number,
): Marble[] {
  // The road ends at the pit's near rim, where the marbles fall in.
  const rx = horizon * PIT;
  const ry = rx * FLAT;
  const rim = hole.y + ry;
  const road = sampleRoad([
    ...layout.road.map(([x, y]) => ({ x: x * W, y: y * H })),
    { x: hole.x, y: rim },
  ]);
  // A softened perspective: the far marbles stay big enough to read.
  const sizeAt = (y: number) => biggest * Math.max(0, (y - hole.y) / (H - hole.y)) ** 0.75;
  const marbles: Marble[] = [];
  let last = road[0]!;
  let r = sizeAt(last.y);
  marbles.push({ ...last, r, tone: RUNS[0]! });
  for (const point of road) {
    const next = sizeAt(point.y);
    // The marbles stop where they would touch the pit: there they fall in.
    const inPit =
      ((point.x - hole.x) / (rx + next)) ** 2 + ((point.y - hole.y) / (ry + next)) ** 2 < 1;
    if (next < biggest * 0.07 || inPit) break;
    if (Math.hypot(point.x - last.x, point.y - last.y) < (r + next) * 0.98) continue;
    last = point;
    r = next;
    marbles.push({ ...point, r, tone: RUNS[marbles.length % RUNS.length]! });
  }
  // The group that bursts takes the shot's colour; its neighbours never do.
  const target = { x: layout.burst[0] * W, y: layout.burst[1] * H };
  const distance = (marble: Marble) => Math.hypot(marble.x - target.x, marble.y - target.y);
  const nearest = marbles.reduce(
    (best, marble, i) => (distance(marble) < distance(marbles[best]!) ? i : best),
    0,
  );
  const centre = Math.min(Math.max(nearest, 1), marbles.length - 2);
  return marbles.map((marble, i) => {
    if (Math.abs(i - centre) <= 1) return { ...marble, tone: SHOT, bursts: true };
    if (marble.tone === SHOT) return { ...marble, tone: 2 };
    return marble;
  });
}

/** A smooth road through its waypoints (Catmull-Rom), as closely spaced points. */
function sampleRoad(points: readonly { x: number; y: number }[]): { x: number; y: number }[] {
  const steps = 600;
  const road: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const along = (t: number, a: number, b: number, c: number, d: number) =>
      0.5 *
      (2 * b +
        (c - a) * t +
        (2 * a - 5 * b + 4 * c - d) * t * t +
        (3 * b - a - 3 * c + d) * t * t * t);
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      road.push({ x: along(t, p0.x, p1.x, p2.x, p3.x), y: along(t, p0.y, p1.y, p2.y, p3.y) });
    }
  }
  road.push(points[points.length - 1]!);
  return road;
}

/** A marble on the grid: its glow, a soft shadow under it, then the glass. */
function paintMarble(
  ctx: CanvasRenderingContext2D,
  sprites: BallSprites,
  marble: Marble,
  biggest: number,
): void {
  const { x, y, r, tone } = marble;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.85, r * 0.95, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const glow = sprites.glow(tone);
  if (glow && r > biggest * 0.4) {
    ctx.globalAlpha = 0.2;
    ctx.drawImage(glow, x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.globalAlpha = 1;
  }
  const sprite = sprites.get(tone);
  if (sprite) ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

/** The burst: light, a shock ring, glass shards and sparks. */
function paintBurst(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  group: readonly Marble[],
  blast: number,
  random: SeededRandom,
): void {
  const centre = group[1] ?? group[0]!;
  const tone = palette.tone(centre.tone);
  ctx.globalCompositeOperation = 'lighter';
  const light = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, blast);
  light.addColorStop(0, 'rgba(255,255,255,1)');
  light.addColorStop(0.15, 'rgba(255,255,255,0.8)');
  light.addColorStop(0.4, `${tone}aa`);
  light.addColorStop(1, `${tone}00`);
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, blast, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = centre.r * 0.08;
  ctx.beginPath();
  ctx.ellipse(centre.x, centre.y, blast * 0.8, blast * 0.5, -0.1, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 40; i++) {
    const angle = random.next() * Math.PI * 2;
    const distance = blast * (0.3 + random.next() * 1.0);
    const length = centre.r * (0.4 + random.next() * 1.2);
    const x = centre.x + Math.cos(angle) * distance;
    const y = centre.y + Math.sin(angle) * distance;
    ctx.strokeStyle = random.next() < 0.5 ? '#fff6d6' : tone;
    ctx.lineWidth = centre.r * (0.05 + random.next() * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 22; i++) {
    const angle = random.next() * Math.PI * 2;
    const distance = blast * (0.25 + random.next() * 0.85);
    const size = centre.r * (0.18 + random.next() * 0.4);
    const x = centre.x + Math.cos(angle) * distance;
    const y = centre.y + Math.sin(angle) * distance;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random.next() * Math.PI * 2);
    const glass = ctx.createLinearGradient(-size, -size, size, size);
    glass.addColorStop(0, '#ffffff');
    glass.addColorStop(0.35, tone);
    glass.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, size * 0.6);
    ctx.lineTo(-size * 0.5, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** The shot: where the Star heart stands and aims, and where its marble flies, just short of the burst. */
interface Shot {
  readonly launcher: { readonly x: number; readonly y: number };
  readonly aim: number;
  readonly scale: number;
  /** The cradle's mouth, where the trail starts. */
  readonly mouth: { readonly x: number; readonly y: number };
  readonly marble: { readonly x: number; readonly y: number; readonly r: number };
}

function aimShot(layout: Layout, W: number, H: number, centre: Marble, blast: number): Shot {
  const biggest = Math.min(W, H) * MARBLE;
  const scale = (biggest * layout.launcher.size) / 26;
  const launcher = { x: layout.launcher.at[0] * W, y: layout.launcher.at[1] * H };
  const aim = Math.atan2(centre.y - launcher.y, centre.x - launcher.x);
  const towards = { x: Math.cos(aim), y: Math.sin(aim) };
  const cradle = SHOOTER_RADIUS * scale;
  const mouth = { x: launcher.x + towards.x * cradle, y: launcher.y + towards.y * cradle };
  // Close to the burst, but always with some trail behind it.
  const gap = Math.hypot(centre.x - mouth.x, centre.y - mouth.y);
  const near = Math.min(blast * 0.6, gap * 0.45);
  return {
    launcher,
    aim,
    scale,
    mouth,
    marble: { x: centre.x - towards.x * near, y: centre.y - towards.y * near, r: centre.r * 1.05 },
  };
}

/** The shot's comet trail, from the cradle to the flying marble. */
function paintTrail(ctx: CanvasRenderingContext2D, palette: Palette, shot: Shot): void {
  const { mouth, marble } = shot;
  const side = {
    x: -Math.sin(shot.aim) * marble.r * 0.95,
    y: Math.cos(shot.aim) * marble.r * 0.95,
  };
  const trail = ctx.createLinearGradient(mouth.x, mouth.y, marble.x, marble.y);
  trail.addColorStop(0, `${palette.tone(SHOT)}00`);
  trail.addColorStop(1, `${palette.tone(SHOT)}dd`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = trail;
  ctx.beginPath();
  ctx.moveTo(marble.x + side.x, marble.y + side.y);
  ctx.lineTo(mouth.x, mouth.y);
  ctx.lineTo(marble.x - side.x, marble.y - side.y);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * The Star heart, the game's launcher and mascot (v1.7), has just fired a
 * marble of the group's colour: its cradle faces the burst, the next marble
 * waits in its heart, and the shot flies at the head of its trail.
 */
function paintLauncher(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  sprites: BallSprites,
  shot: Shot,
): void {
  const { launcher, scale, marble } = shot;
  ctx.save();
  ctx.translate(launcher.x, launcher.y);
  ctx.scale(scale, scale);
  new StarHeartSkin().draw(ctx, palette, shot.aim, 26, 0, palette.tone(SHOT));
  ctx.restore();
  const next = sprites.get((SHOT + 3) % 6);
  if (next) {
    const inside = 26 * 0.6 * scale;
    ctx.drawImage(next, launcher.x - inside, launcher.y - inside, inside * 2, inside * 2);
  }
  const flying = sprites.get(SHOT);
  if (flying) {
    ctx.drawImage(flying, marble.x - marble.r, marble.y - marble.r, marble.r * 2, marble.r * 2);
  }
}

/** "Ballmania": gold glass letters, a deep violet outline, a glow and a little depth. */
function drawTitle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wanted: number,
  text: string,
  maxWidth: number,
): void {
  // A longer title (two words) shrinks to stay inside the cover.
  ctx.font = `${wanted}px "${TITLE_FONT}"`;
  const size = Math.min(wanted, (wanted * maxWidth) / ctx.measureText(text).width);
  // Drawn apart first, so the shine only lights the letters.
  const art = document.createElement('canvas');
  art.width = Math.ceil(size * 7);
  art.height = Math.ceil(size * 2.2);
  const g = art.getContext('2d')!;
  g.translate(art.width / 2, art.height / 2);
  g.font = `${size}px "${TITLE_FONT}"`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  for (let i = Math.round(size * 0.07); i > 0; i--) {
    g.fillStyle = '#3b0f63';
    g.fillText(text, i * 0.35, i);
  }
  g.lineWidth = size * 0.11;
  g.strokeStyle = '#1c0636';
  g.strokeText(text, 0, 0);
  const gold = g.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
  gold.addColorStop(0, '#fffbe6');
  gold.addColorStop(0.35, '#ffd34d');
  gold.addColorStop(0.7, '#ff8a3d');
  gold.addColorStop(1, '#ff4f8b');
  g.fillStyle = gold;
  g.fillText(text, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.fillRect(-art.width / 2, -size * 0.5, art.width, size * 0.3);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.045);
  // Glow behind the letters.
  ctx.shadowColor = 'rgba(190, 90, 255, 0.95)';
  ctx.shadowBlur = size * 0.4;
  ctx.drawImage(art, -art.width / 2, -art.height / 2);
  ctx.shadowBlur = 0;
  ctx.drawImage(art, -art.width / 2, -art.height / 2);
  ctx.restore();
}
