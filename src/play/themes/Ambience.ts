import type { Palette } from '../Palette';

/** How a world's backdrop lives (specification § 3.9): one light, cheap motion per world. */
export type AmbienceStyle = 'twinkle' | 'scan' | 'bubbles' | 'glints' | 'embers';

/** Moving specks drawn per frame: few enough to cost nothing. */
const COUNT = 36;

/** A stable pseudo-random number in [0, 1) for a speck, so the layer keeps no state. */
const hash = (index: number, salt: number) => {
  const x = Math.sin(index * 91.7 + salt * 47.3) * 24634.6345;
  return x - Math.floor(x);
};

/**
 * The animated layer over a world's painted backdrop: twinkling stars,
 * a scanning neon line, rising bubbles, flashing glints or rising embers.
 * Everything is a function of time; drawn in device pixels over the whole
 * canvas, under the board. Not drawn at all with reduced motion.
 */
export class Ambience {
  constructor(private readonly style: AmbienceStyle) {}

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
    time: number,
  ): void {
    const scale = Math.max(1, Math.min(width, height) / 600);
    ctx.save();
    if (this.style === 'scan') this.scan(ctx, width, height, palette, time, scale);
    for (let i = 0; i < COUNT; i++) {
      const x = hash(i, 1) * width;
      const y = hash(i, 2) * height;
      const phase = hash(i, 3) * Math.PI * 2;
      const speed = 0.6 + hash(i, 4);
      switch (this.style) {
        case 'twinkle':
        case 'scan':
          this.twinkle(
            ctx,
            x,
            y,
            palette,
            Math.max(0, Math.sin(time * speed * 1.7 + phase)),
            scale,
          );
          break;
        case 'glints':
          this.glint(ctx, x, y, palette, Math.max(0, Math.sin(time * speed + phase)) ** 6, scale);
          break;
        case 'bubbles':
          this.bubble(ctx, x, height, palette, time * speed * 25 * scale + y, phase, time, scale);
          break;
        case 'embers':
          this.ember(ctx, x, height, palette, time * speed * 40 * scale + y, phase, time, scale, i);
          break;
      }
    }
    ctx.restore();
  }

  private twinkle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    palette: Palette,
    light: number,
    scale: number,
  ): void {
    if (light < 0.05) return;
    ctx.globalAlpha = light * (palette.dark ? 0.9 : 0.5);
    ctx.fillStyle = palette.dark ? '#ffffff' : palette.accent;
    const r = 1.4 * scale * (0.5 + light);
    ctx.fillRect(x - r * 3, y - 0.5 * scale, r * 6, scale);
    ctx.fillRect(x - 0.5 * scale, y - r * 3, scale, r * 6);
  }

  private glint(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    palette: Palette,
    light: number,
    scale: number,
  ): void {
    if (light < 0.05) return;
    const r = 5 * scale * light;
    ctx.globalAlpha = light;
    ctx.fillStyle = palette.dark ? '#ffffff' : palette.tone(1);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.3, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.3, y);
    ctx.closePath();
    ctx.fill();
  }

  private bubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    palette: Palette,
    rise: number,
    phase: number,
    time: number,
    scale: number,
  ): void {
    const span = height + 40 * scale;
    const y = height + 20 * scale - (rise % span);
    ctx.globalAlpha = palette.dark ? 0.35 : 0.25;
    ctx.strokeStyle = palette.tone(3);
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.arc(
      x + Math.sin(time + phase) * 6 * scale,
      y,
      (2 + 3 * ((phase / 6) % 1)) * scale,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  private ember(
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    palette: Palette,
    rise: number,
    phase: number,
    time: number,
    scale: number,
    index: number,
  ): void {
    const span = height + 40 * scale;
    const along = rise % span;
    const y = height + 20 * scale - along;
    ctx.globalAlpha = (1 - along / span) * (palette.dark ? 0.85 : 0.6);
    ctx.fillStyle = index % 2 === 0 ? palette.tone(1) : palette.tone(0);
    ctx.beginPath();
    ctx.arc(x + Math.sin(time * 1.3 + phase) * 10 * scale, y, 1.6 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Neon: a soft line of light sweeping down the screen, like an old monitor. */
  private scan(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
    time: number,
    scale: number,
  ): void {
    const y = ((time * 60 * scale) % (height + 200 * scale)) - 100 * scale;
    const band = ctx.createLinearGradient(0, y - 60 * scale, 0, y + 60 * scale);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(0.5, palette.tone(5));
    band.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = palette.dark ? 0.12 : 0.08;
    ctx.fillStyle = band;
    ctx.fillRect(0, y - 60 * scale, width, 120 * scale);
    ctx.globalAlpha = 1;
  }
}
