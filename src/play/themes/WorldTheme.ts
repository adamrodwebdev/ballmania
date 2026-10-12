import { SeededRandom } from '@/engine/core/Random';
import type { Palette } from '../Palette';

/**
 * The look of a world (specification § 3.5): for now, the backdrop of the
 * board. Painted once per size and colour scheme into a cached canvas.
 */
export interface WorldTheme {
  paintBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
  ): void;
}

/** World 1: deep space, soft nebulae and stars, light or dark with the interface. */
export class NebulaTheme implements WorldTheme {
  paintBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
  ): void {
    const random = new SeededRandom(71);
    const dark = palette.dark;
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, width, height);

    // Nebulae: large soft clouds of the accent colours.
    const clouds = [palette.accent, palette.tone(3), palette.tone(5), palette.tone(4)];
    clouds.forEach((colour, i) => {
      const x = width * (0.15 + 0.7 * random.next());
      const y = height * (0.15 + 0.7 * random.next());
      const r = Math.max(width, height) * (0.35 + 0.25 * random.next());
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, withAlpha(colour, dark ? 0.22 : 0.14));
      gradient.addColorStop(1, withAlpha(colour, 0));
      ctx.fillStyle = gradient;
      ctx.globalAlpha = i === 0 ? 1 : 0.8;
      ctx.fillRect(0, 0, width, height);
    });
    ctx.globalAlpha = 1;

    // Stars: many faint ones, a few bright ones with a glint.
    const count = Math.round((width * height) / (dark ? 2600 : 6000));
    const scale = Math.max(1, Math.min(width, height) / 600);
    for (let i = 0; i < count; i++) {
      const x = random.next() * width;
      const y = random.next() * height;
      const bright = random.next() < 0.06;
      const r = (bright ? 1.6 : 0.5 + random.next() * 0.8) * scale;
      ctx.globalAlpha = dark ? 0.35 + random.next() * 0.6 : 0.25 + random.next() * 0.3;
      ctx.fillStyle = dark ? '#ffffff' : palette.accent;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (bright && dark) {
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x - r * 4, y - 0.4 * scale, r * 8, 0.8 * scale);
        ctx.fillRect(x - 0.4 * scale, y - r * 4, 0.8 * scale, r * 8);
      }
    }
    ctx.globalAlpha = 1;
  }
}

/** `#rrggbb` with an alpha channel; other colour syntaxes are returned unchanged. */
export function withAlpha(colour: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(colour.trim())) return colour;
  const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${colour.trim()}${byte.toString(16).padStart(2, '0')}`;
}
