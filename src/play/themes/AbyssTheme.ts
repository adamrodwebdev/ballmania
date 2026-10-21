import type { AmbienceStyle } from './Ambience';
import { SeededRandom } from '@/engine/core/Random';
import type { Palette } from '../Palette';
import { withAlpha, type WorldTheme } from './WorldTheme';

/**
 * World 3's backdrop, unlocked by finishing Neon: deep water lit by rays
 * from the surface, drifting glowing plankton, and a rocky sea floor.
 */
export class AbyssTheme implements WorldTheme {
  readonly ambience: AmbienceStyle = 'bubbles';
  readonly night = false;

  paintBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
  ): void {
    const random = new SeededRandom(303);
    const dark = palette.dark;
    const teal = palette.tone(3);
    const lime = palette.tone(2);

    const water = ctx.createLinearGradient(0, 0, 0, height);
    water.addColorStop(0, withAlpha(teal, dark ? 0.32 : 0.35));
    water.addColorStop(0.55, withAlpha(teal, dark ? 0.08 : 0.15));
    water.addColorStop(1, withAlpha(teal, 0));
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);

    // Light rays fanning down from the surface.
    for (let i = 0; i < 7; i++) {
      const x = width * (0.05 + 0.9 * random.next());
      const spread = width * (0.05 + 0.08 * random.next());
      const ray = ctx.createLinearGradient(0, 0, 0, height * 0.8);
      ray.addColorStop(0, withAlpha(dark ? '#ffffff' : teal, dark ? 0.1 : 0.16));
      ray.addColorStop(1, withAlpha(dark ? '#ffffff' : teal, 0));
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(x - spread * 0.3, 0);
      ctx.lineTo(x + spread * 0.3, 0);
      ctx.lineTo(x + spread * 2 - width * 0.1, height * 0.8);
      ctx.lineTo(x - spread * 2 - width * 0.1, height * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    // Sea floor: a soft ridge of rocks.
    ctx.fillStyle = withAlpha(dark ? '#000000' : teal, dark ? 0.45 : 0.18);
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += width / 12) {
      ctx.lineTo(x, height * (0.9 + 0.05 * Math.sin(x * 0.013 + random.next())));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Bioluminescent plankton.
    const count = Math.round((width * height) / 9000);
    const scale = Math.max(1, Math.min(width, height) / 600);
    for (let i = 0; i < count; i++) {
      const glow = random.next() < 0.5 ? teal : lime;
      ctx.globalAlpha = dark ? 0.25 + random.next() * 0.55 : 0.2 + random.next() * 0.3;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(
        random.next() * width,
        random.next() * height,
        (0.8 + random.next() * 2) * scale,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
