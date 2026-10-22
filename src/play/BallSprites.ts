import { MAX_TONES, type Tone } from '@/engine/chain/Ball';
import type { Palette } from './Palette';

type Context = CanvasRenderingContext2D;

/**
 * Engraved symbol of each tone, so that colours are never the only cue
 * (specification § 4.3): circle, triangle, square, diamond, star, cross.
 */
const SYMBOLS: readonly ((ctx: Context, r: number) => void)[] = [
  (ctx, r) => ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2),
  (ctx, r) => polygon(ctx, 3, r * 0.42, -Math.PI / 2),
  (ctx, r) => polygon(ctx, 4, r * 0.4, Math.PI / 4),
  (ctx, r) => polygon(ctx, 4, r * 0.42, 0),
  (ctx, r) => star(ctx, r * 0.45, r * 0.2),
  (ctx, r) => {
    const a = r * 0.36;
    const b = r * 0.12;
    ctx.rect(-a, -b, a * 2, b * 2);
    ctx.rect(-b, -a, b * 2, a * 2);
  },
];

function polygon(ctx: Context, sides: number, radius: number, rotation: number): void {
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
}

function star(ctx: Context, outer: number, inner: number): void {
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
}

/**
 * Pre-rendered glass orbs, one per tone, at the current screen resolution:
 * a frame then draws each ball with a single `drawImage`.
 */
export class BallSprites {
  private sprites: HTMLCanvasElement[] = [];
  /** The same orbs without their symbol: power balls wear an emblem instead (v1.7). */
  private plainSprites: HTMLCanvasElement[] = [];
  private glows: HTMLCanvasElement[] = [];

  constructor(private readonly createCanvas: () => HTMLCanvasElement) {}

  /** Rebuilds the sprites for a ball radius of `pixels` device pixels. */
  build(palette: Palette, pixels: number): void {
    for (let tone = 0; tone < MAX_TONES; tone++) this.buildTone(palette, pixels, tone);
  }

  /**
   * Rebuilds one tone's sprites only (its orb, its plain orb and its halo): a
   * caller can spread the work over several frames, so that no single task
   * holds the page (the title screen, v1.7.6).
   */
  buildTone(palette: Palette, pixels: number, tone: Tone): void {
    const size = Math.max(4, Math.ceil(pixels * 2));
    const colour = palette.tone(tone);
    this.sprites[tone] = this.draw(colour, tone, size);
    this.plainSprites[tone] = this.draw(colour, null, size);
    this.glows[tone] = this.drawGlow(colour, Math.min(256, size * 2));
  }

  /** Soft halo of a tone, drawn stretched over several ball radii. */
  glow(tone: Tone): HTMLCanvasElement | undefined {
    return this.glows[tone % MAX_TONES];
  }

  get(tone: Tone): HTMLCanvasElement | undefined {
    return this.sprites[tone % MAX_TONES];
  }

  /** The orb of a tone without its engraved symbol. */
  plain(tone: Tone): HTMLCanvasElement | undefined {
    return this.plainSprites[tone % MAX_TONES];
  }

  private drawGlow(colour: string, size: number): HTMLCanvasElement {
    const canvas = this.createCanvas();
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const r = size / 2;
    const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.18, colour);
    // Fade to the same colour, transparent: fading to black would darken the halo.
    gradient.addColorStop(1, /^#[0-9a-f]{6}$/i.test(colour) ? `${colour}00` : 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return canvas;
  }

  /** An orb; `tone` picks its engraved symbol, none when null. */
  private draw(colour: string, tone: Tone | null, size: number): HTMLCanvasElement {
    const canvas = this.createCanvas();
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const r = size / 2;
    ctx.translate(r, r);
    paintOrb(ctx, colour, tone, r);
    return canvas;
  }
}

/**
 * Paints a glass orb of radius `r` on the origin, as the sprites hold it:
 * for a picture drawn once (the Workshop's), where a sprite would not pay.
 * `tone` picks its engraved symbol, none when null.
 */
export function paintOrb(ctx: Context, colour: string, tone: Tone | null, r: number): void {
  // Body: the tone, lit from the top left, darker at the rim.
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
  ctx.fillStyle = colour;
  ctx.fill();
  const shade = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  shade.addColorStop(0, 'rgba(255,255,255,0.55)');
  shade.addColorStop(0.45, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = shade;
  ctx.fill();

  // Engraved symbol.
  if (tone !== null) {
    ctx.beginPath();
    SYMBOLS[tone % SYMBOLS.length]!(ctx, r);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.stroke();
  }

  // Specular highlight.
  ctx.beginPath();
  ctx.ellipse(-r * 0.36, -r * 0.42, r * 0.26, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
}
