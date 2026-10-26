import { SeededRandom } from '@/engine/core/Random';
import type { AmbienceStyle } from './Ambience';
import { fractalNoise } from './noise';
import type { WorldTheme } from './WorldTheme';
import { blankCanvas, context2d, type Context2D } from '../canvas';

type Rgb = readonly [number, number, number];

/** A soft glow of colour, in fractions of the screen (radii: of its width and height). */
interface Cloud {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly core: string;
  readonly rim: string;
}

/** Wisps of gas: a noise texture in one colour, inside an ellipse of the screen. */
interface Wisp {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly colour: Rgb;
  /** Noise to opacity: `gain × noise − cut`, so only the densest parts show. */
  readonly gain: number;
  readonly cut: number;
  readonly strength: number;
  readonly seed: number;
}

/** A body in the margins: its centre in fractions of the screen, its size in short sides. */
interface Body {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

interface Giant extends Body {
  /** Where the light comes from, in fractions of the planet's box. */
  readonly light: { readonly x: number; readonly y: number };
  /** The lit edge, between two angles (degrees). */
  readonly rim: readonly [number, number];
  /** Bands, as distances below the planet's top in radii. */
  readonly bands: readonly number[];
}

/** Where everything sits: a wide screen and an upright one frame the board differently. */
interface Layout {
  readonly clouds: readonly Cloud[];
  readonly wisps: readonly Wisp[];
  readonly galaxy: Body;
  readonly giant: Giant;
  readonly moon: Body;
}

const VIOLET: Rgb = [189, 158, 255];
const ROSE: Rgb = [255, 128, 224];

const WIDE: Layout = {
  clouds: [
    { x: 0.5, y: 0.54, rx: 0.28, ry: 0.35, core: 'rgba(36,64,200,0.16)', rim: 'rgba(36,64,200,0)' },
    {
      x: 0.33,
      y: 0.42,
      rx: 0.44,
      ry: 0.46,
      core: 'rgba(124,77,255,0.42)',
      rim: 'rgba(74,32,168,0.18)',
    },
    {
      x: 0.77,
      y: 0.74,
      rx: 0.34,
      ry: 0.4,
      core: 'rgba(244,114,208,0.32)',
      rim: 'rgba(200,25,95,0.12)',
    },
    {
      x: 0.7,
      y: 0.19,
      rx: 0.3,
      ry: 0.28,
      core: 'rgba(34,211,238,0.24)',
      rim: 'rgba(22,131,184,0.08)',
    },
    {
      x: 0.18,
      y: 0.88,
      rx: 0.22,
      ry: 0.21,
      core: 'rgba(255,176,32,0.16)',
      rim: 'rgba(255,176,32,0)',
    },
  ],
  wisps: [
    {
      x: 0.34,
      y: 0.42,
      rx: 0.47,
      ry: 0.47,
      colour: VIOLET,
      gain: 2.4,
      cut: 1.02,
      strength: 0.6,
      seed: 7,
    },
    {
      x: 0.78,
      y: 0.75,
      rx: 0.37,
      ry: 0.42,
      colour: ROSE,
      gain: 2.6,
      cut: 1.24,
      strength: 0.5,
      seed: 23,
    },
  ],
  galaxy: { x: 0.17, y: 0.09, size: 0.092 },
  giant: {
    x: 0.086,
    y: 1.128,
    size: 0.364,
    light: { x: 0.7, y: 0.18 },
    rim: [-100, -10],
    bands: [0.19, 0.39, 0.6],
  },
  moon: { x: 0.895, y: 0.086, size: 0.033 },
};

const UPRIGHT: Layout = {
  clouds: [
    {
      x: 0.54,
      y: 0.52,
      rx: 0.51,
      ry: 0.27,
      core: 'rgba(36,64,200,0.16)',
      rim: 'rgba(36,64,200,0)',
    },
    {
      x: 0.38,
      y: 0.39,
      rx: 0.67,
      ry: 0.36,
      core: 'rgba(124,77,255,0.42)',
      rim: 'rgba(74,32,168,0.18)',
    },
    {
      x: 0.77,
      y: 0.76,
      rx: 0.59,
      ry: 0.31,
      core: 'rgba(244,114,208,0.32)',
      rim: 'rgba(200,25,95,0.12)',
    },
    {
      x: 0.77,
      y: 0.18,
      rx: 0.51,
      ry: 0.18,
      core: 'rgba(34,211,238,0.24)',
      rim: 'rgba(22,131,184,0.08)',
    },
    {
      x: 0.2,
      y: 0.9,
      rx: 0.46,
      ry: 0.14,
      core: 'rgba(255,176,32,0.16)',
      rim: 'rgba(255,176,32,0)',
    },
  ],
  wisps: [
    {
      x: 0.41,
      y: 0.39,
      rx: 0.77,
      ry: 0.43,
      colour: VIOLET,
      gain: 2.4,
      cut: 1.02,
      strength: 0.6,
      seed: 7,
    },
    {
      x: 0.74,
      y: 0.76,
      rx: 0.67,
      ry: 0.33,
      colour: ROSE,
      gain: 2.6,
      cut: 1.24,
      strength: 0.5,
      seed: 23,
    },
  ],
  galaxy: { x: 0.82, y: 0.14, size: 0.118 },
  giant: {
    x: 0.744,
    y: 1.28,
    size: 0.949,
    light: { x: 0.3, y: 0.12 },
    rim: [-150, -80],
    bands: [0.086, 0.184, 0.292],
  },
  moon: { x: 0.138, y: 0.145, size: 0.038 },
};

const TINTS = ['#ffffff', '#ffffff', '#cfe9ff', '#ffd9f2', '#fff1c9', '#ffffff'];
const degrees = (value: number) => (value * Math.PI) / 180;
const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * World 1: a nebula in layers (specification § 3.5) — deep sky, coloured
 * clouds and wisps of gas, a far galaxy, a giant planet and a ringed moon in
 * the margins, three depths of stars and a vignette that keeps the eye on the
 * board. A night sky in both themes: it is art, like the title screen.
 * Painted once per size; the nearest stars drift in the ambience.
 */
export class NebulaTheme implements WorldTheme {
  readonly ambience: AmbienceStyle = 'drift';
  readonly night = true;

  paintBackground(ctx: Context2D, width: number, height: number): void {
    const layout = width >= height ? WIDE : UPRIGHT;
    const short = Math.min(width, height);
    const unit = Math.max(1, short / 600);
    // Stars are counted on the screen's size in units, not in pixels: a sharper
    // screen gets finer stars, not more of them.
    const area = (width * height) / (unit * unit);
    const random = new SeededRandom(71);

    const sky = ctx.createRadialGradient(
      width * 0.54,
      height * 0.52,
      0,
      width * 0.54,
      height * 0.52,
      Math.hypot(width, height) * 0.56,
    );
    sky.addColorStop(0, '#1d0c47');
    sky.addColorStop(0.45, '#0e0630');
    sky.addColorStop(0.8, '#070318');
    sky.addColorStop(1, '#030109');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Far stars first: the clouds veil them.
    this.stars(ctx, random, width, height, area / 2600, [0.5, 0.95], [0.3, 0.65], unit);
    for (const cloud of layout.clouds) this.cloud(ctx, cloud, width, height);
    for (const wisp of layout.wisps) this.wisp(ctx, wisp, width, height);
    this.stars(ctx, random, width, height, area / 12000, [0.9, 1.4], [0.55, 0.9], unit, true);
    this.galaxy(ctx, layout.galaxy, width, height, short);
    this.brightStars(ctx, random, width, height, Math.max(3, Math.round(area / 120000)), unit);
    this.giant(ctx, layout.giant, width, height, short);
    this.moon(ctx, layout.moon, width, height, short);
    this.vignette(ctx, width, height);
  }

  private stars(
    ctx: Context2D,
    random: SeededRandom,
    width: number,
    height: number,
    count: number,
    size: readonly [number, number],
    light: readonly [number, number],
    unit: number,
    tinted = false,
  ): void {
    for (let i = 0; i < Math.round(count); i++) {
      const x = random.next() * width;
      const y = random.next() * height;
      const r = (size[0] + random.next() * (size[1] - size[0])) * unit;
      ctx.globalAlpha = light[0] + random.next() * (light[1] - light[0]);
      ctx.fillStyle = tinted ? TINTS[random.nextInt(TINTS.length)]! : '#ece4ff';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** The nearest stars that stay put: a halo and a glint each. */
  private brightStars(
    ctx: Context2D,
    random: SeededRandom,
    width: number,
    height: number,
    count: number,
    unit: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const x = random.next() * width;
      const y = random.next() * height;
      const r = (1.4 + random.next() * 0.4) * unit;
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      halo.addColorStop(0, 'rgba(255,255,255,0.5)');
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x - r * 3.5, y - 0.4 * unit, r * 7, 0.8 * unit);
      ctx.fillRect(x - 0.4 * unit, y - r * 3.5, 0.8 * unit, r * 7);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private cloud(ctx: Context2D, cloud: Cloud, width: number, height: number): void {
    ctx.save();
    ctx.translate(cloud.x * width, cloud.y * height);
    ctx.scale(cloud.rx * width, cloud.ry * height);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    glow.addColorStop(0, cloud.core);
    glow.addColorStop(0.5, cloud.rim);
    glow.addColorStop(1, cloud.rim.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = glow;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  /** Wisps: noise on a small grid, stretched smoothly over the screen. */
  private wisp(ctx: Context2D, wisp: Wisp, width: number, height: number): void {
    const long = Math.max(width, height);
    const columns = Math.max(8, Math.round((192 * width) / long));
    const rows = Math.max(8, Math.round((192 * height) / long));
    const grid = blankCanvas(ctx.canvas);
    grid.width = columns;
    grid.height = rows;
    const small = context2d(grid);
    if (!small) return;
    const noise = fractalNoise(columns, rows, {
      cells: 4,
      octaves: 4,
      random: new SeededRandom(wisp.seed),
    });
    const image = small.createImageData(columns, rows);
    const [red, green, blue] = wisp.colour;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const i = y * columns + x;
        const dx = (x / columns - wisp.x) / wisp.rx;
        const dy = (y / rows - wisp.y) / wisp.ry;
        const fall = Math.max(0, 1 - Math.hypot(dx, dy));
        const alpha = clamp(wisp.gain * noise[i]! - wisp.cut) * fall * wisp.strength;
        image.data[i * 4] = red;
        image.data[i * 4 + 1] = green;
        image.data[i * 4 + 2] = blue;
        image.data[i * 4 + 3] = Math.round(alpha * 255);
      }
    }
    small.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(grid, 0, 0, width, height);
  }

  /** A far spiral galaxy, tilted: a disc, two faint arms and a warm core. */
  private galaxy(ctx: Context2D, galaxy: Body, width: number, height: number, short: number): void {
    const k = (galaxy.size * short) / 66;
    ctx.save();
    ctx.translate(galaxy.x * width, galaxy.y * height);
    ctx.rotate(degrees(-24));
    ctx.scale(k, k);
    ctx.globalAlpha = 0.9;
    ctx.save();
    ctx.scale(1, 19 / 66);
    const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, 66);
    disc.addColorStop(0, 'rgba(231,220,255,0.45)');
    disc.addColorStop(0.5, 'rgba(157,123,255,0.18)');
    disc.addColorStop(1, 'rgba(157,123,255,0)');
    ctx.fillStyle = disc;
    ctx.fillRect(-66, -66, 132, 132);
    ctx.restore();
    ctx.strokeStyle = 'rgba(217,200,255,0.22)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-46, 4);
    ctx.bezierCurveTo(-20, 18, 22, 14, 44, -6);
    ctx.moveTo(46, -4);
    ctx.bezierCurveTo(20, -18, -22, -14, -44, 6);
    ctx.stroke();
    ctx.save();
    ctx.scale(1, 7 / 16);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
    core.addColorStop(0, 'rgba(255,244,214,1)');
    core.addColorStop(1, 'rgba(255,207,122,0)');
    ctx.fillStyle = core;
    ctx.fillRect(-16, -16, 32, 32);
    ctx.restore();
    ctx.fillStyle = '#fff8e6';
    ctx.beginPath();
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** A gas giant rising from a corner: banded, lit on one side, with a thin atmosphere. */
  private giant(ctx: Context2D, giant: Giant, width: number, height: number, short: number): void {
    const cx = giant.x * width;
    const cy = giant.y * height;
    const r = giant.size * short;
    const left = cx - r;
    const top = cy - r;

    const air = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.053);
    air.addColorStop(0, 'rgba(34,211,238,0)');
    air.addColorStop(0.5, 'rgba(124,216,255,0.3)');
    air.addColorStop(1, 'rgba(124,216,255,0)');
    ctx.fillStyle = air;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.053, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(
      left + giant.light.x * 2 * r,
      top + giant.light.y * 2 * r,
      0,
      cx,
      cy,
      r * 1.5,
    );
    body.addColorStop(0, '#6a58d6');
    body.addColorStop(0.45, '#2f1f7a');
    body.addColorStop(1, '#0b0526');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.clip();
    const colours = ['rgba(139,123,234,0.2)', 'rgba(196,107,216,0.16)', 'rgba(95,208,238,0.13)'];
    const widths = [0.084, 0.046, 0.069];
    giant.bands.forEach((depth, i) => {
      const y = top + depth * r;
      ctx.strokeStyle = colours[i % colours.length]!;
      ctx.lineWidth = widths[i % widths.length]! * r;
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.1, y);
      ctx.quadraticCurveTo(cx, y - r * 0.15, cx + r * 1.1, y + r * 0.02);
      ctx.stroke();
    });
    // Night side: the planet darkens away from the light.
    const night = ctx.createLinearGradient(
      left + giant.light.x * 2 * r,
      top + giant.light.y * 2 * r,
      left + (1 - giant.light.x) * 2 * r,
      top + (1 - giant.light.y) * 2 * r,
    );
    night.addColorStop(0, 'rgba(5,3,13,0)');
    night.addColorStop(0.55, 'rgba(5,3,13,0.22)');
    night.addColorStop(1, 'rgba(5,3,13,0.88)');
    ctx.fillStyle = night;
    ctx.fillRect(left, top, r * 2, r * 2);
    ctx.restore();

    ctx.strokeStyle = 'rgba(124,216,255,0.7)';
    ctx.lineWidth = Math.max(1.5, r * 0.009);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, degrees(giant.rim[0]), degrees(giant.rim[1]));
    ctx.stroke();
  }

  /** A small ringed planet, warm against the cool clouds. */
  private moon(ctx: Context2D, moon: Body, width: number, height: number, short: number): void {
    const cx = moon.x * width;
    const cy = moon.y * height;
    const r = moon.size * short;
    const ring = ctx.createLinearGradient(cx - r * 2.2, cy, cx + r * 2.2, cy);
    ring.addColorStop(0, 'rgba(255,225,179,0.85)');
    ring.addColorStop(1, 'rgba(244,114,208,0.45)');
    const halfRing = (front: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(degrees(-18));
      ctx.strokeStyle = ring;
      ctx.lineWidth = r * 0.21;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.17, r * 0.46, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    ctx.globalAlpha = 0.92;
    halfRing(false);
    const body = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.4, 0, cx, cy, r);
    body.addColorStop(0, '#ffd2a1');
    body.addColorStop(0.5, '#ff8a3d');
    body.addColorStop(1, '#7a1f45');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    halfRing(true);
    ctx.globalAlpha = 1;
  }

  /** Darker edges: the eye stays on the board. */
  private vignette(ctx: Context2D, width: number, height: number): void {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(width, height);
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.72);
    shade.addColorStop(0.55, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = shade;
    ctx.fillRect(-0.5, -0.5, 1, 1);
    ctx.restore();
  }
}
