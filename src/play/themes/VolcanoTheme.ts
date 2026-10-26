import type { AmbienceStyle } from './Ambience';
import { SeededRandom } from '@/engine/core/Random';
import type { Palette } from '../Palette';
import { withAlpha, type WorldTheme } from './WorldTheme';
import type { Context2D } from '../canvas';

/**
 * World 5's backdrop, unlocked by finishing the Jewels: cooled basalt split
 * by glowing magma cracks, with embers floating up.
 */
export class VolcanoTheme implements WorldTheme {
  readonly ambience: AmbienceStyle = 'embers';
  readonly night = false;

  paintBackground(ctx: Context2D, width: number, height: number, palette: Palette): void {
    const random = new SeededRandom(505);
    const dark = palette.dark;
    const magma = palette.tone(1);
    const fire = palette.tone(0);

    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, width, height);
    const heat = ctx.createLinearGradient(0, height, 0, 0);
    heat.addColorStop(0, withAlpha(fire, dark ? 0.32 : 0.2));
    heat.addColorStop(0.5, withAlpha(magma, dark ? 0.08 : 0.06));
    heat.addColorStop(1, withAlpha(magma, 0));
    ctx.fillStyle = heat;
    ctx.fillRect(0, 0, width, height);

    // Magma cracks: jagged lines branching across the basalt, with a soft glow.
    const scale = Math.max(1, Math.min(width, height) / 600);
    for (let i = 0; i < 9; i++) {
      let x = random.next() * width;
      let y = random.next() * height;
      const points: [number, number][] = [[x, y]];
      const heading = random.next() * Math.PI * 2;
      for (let k = 0; k < 7; k++) {
        const angle = heading + (random.next() - 0.5) * 1.4;
        const step = (20 + random.next() * 50) * scale;
        x += Math.cos(angle) * step;
        y += Math.sin(angle) * step;
        points.push([x, y]);
      }
      for (const [lineWidth, colour, alpha] of [
        [9 * scale, fire, dark ? 0.25 : 0.15],
        [2.5 * scale, magma, dark ? 0.9 : 0.6],
      ] as const) {
        ctx.strokeStyle = withAlpha(colour, alpha);
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        points.forEach(([px, py], k) => (k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
        ctx.stroke();
      }
    }

    // Embers.
    const count = Math.round((width * height) / 14000);
    for (let i = 0; i < count; i++) {
      ctx.globalAlpha = 0.3 + random.next() * 0.6;
      ctx.fillStyle = random.next() < 0.5 ? magma : fire;
      ctx.beginPath();
      ctx.arc(
        random.next() * width,
        random.next() * height,
        (0.8 + random.next() * 1.8) * scale,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
