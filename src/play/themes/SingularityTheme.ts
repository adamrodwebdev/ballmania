import type { AmbienceStyle } from './Ambience';
import { SeededRandom } from '@/engine/core/Random';
import type { Palette } from '../Palette';
import { withAlpha, type WorldTheme } from './WorldTheme';

/**
 * World 6's backdrop, unlocked by finishing the Volcano: a starfield whose
 * stars thin out towards the centre, and a gravity well drawn as rings that
 * tighten around the black hole (the board is centred on the canvas).
 */
export class SingularityTheme implements WorldTheme {
  readonly ambience: AmbienceStyle = 'twinkle';
  readonly night = false;

  paintBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
  ): void {
    const random = new SeededRandom(606);
    const dark = palette.dark;
    const cx = width / 2;
    const cy = height / 2;
    const reach = Math.hypot(cx, cy);
    const violet = palette.tone(4);
    const amber = palette.tone(1);

    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
    glow.addColorStop(0, withAlpha(violet, dark ? 0.28 : 0.16));
    glow.addColorStop(0.35, withAlpha(amber, dark ? 0.07 : 0.05));
    glow.addColorStop(1, withAlpha(violet, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Gravity well: rings closer and closer together towards the centre.
    const scale = Math.max(1, Math.min(width, height) / 600);
    ctx.strokeStyle = violet;
    ctx.lineWidth = 1.2 * scale;
    for (let i = 1; i <= 14; i++) {
      const radius = reach * (i / 14) ** 1.8;
      ctx.globalAlpha = (dark ? 0.22 : 0.14) * (1 - i / 16);
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, radius * (height / width) ** 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Stars, fewer near the hole, as if it drank their light.
    const count = Math.round((width * height) / (dark ? 2400 : 5200));
    for (let i = 0; i < count; i++) {
      const x = random.next() * width;
      const y = random.next() * height;
      const distance = Math.hypot(x - cx, y - cy) / reach;
      if (random.next() > distance * 1.6) continue;
      ctx.globalAlpha = dark ? 0.3 + random.next() * 0.6 : 0.2 + random.next() * 0.3;
      ctx.fillStyle = dark ? '#ffffff' : violet;
      ctx.beginPath();
      ctx.arc(x, y, (0.5 + random.next() * 1.1) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
