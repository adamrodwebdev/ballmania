import type { AmbienceStyle } from './Ambience';
import type { Palette } from '../Palette';
import { withAlpha, type WorldTheme } from './WorldTheme';

/**
 * World 2's backdrop, unlocked by finishing the Nebula: a striped sun over a
 * glowing grid that runs to the horizon.
 */
export class NeonTheme implements WorldTheme {
  readonly ambience: AmbienceStyle = 'scan';
  readonly night = false;

  paintBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
  ): void {
    const dark = palette.dark;
    const pink = palette.tone(5);
    const cyan = palette.tone(3);
    const horizon = height * 0.42;

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, palette.board);
    sky.addColorStop(1, withAlpha(pink, dark ? 0.35 : 0.25));
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizon);

    // The sun, cut by horizontal stripes that thicken towards the horizon.
    const r = Math.min(width, height) * 0.2;
    const cx = width / 2;
    const cy = horizon - r * 0.35;
    const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    sun.addColorStop(0, palette.tone(1));
    sun.addColorStop(1, pink);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, horizon);
    ctx.clip();
    ctx.globalAlpha = dark ? 0.85 : 0.55;
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.board;
    for (let i = 0; i < 6; i++) {
      const y = cy + r * (0.1 + i * 0.16);
      ctx.fillRect(cx - r, y, r * 2, 2 + i * 2.2);
    }
    ctx.restore();

    // The grid: lines converging to the centre of the horizon.
    ctx.strokeStyle = withAlpha(cyan, dark ? 0.55 : 0.4);
    ctx.lineWidth = Math.max(1, width / 700);
    const floor = height - horizon;
    for (let i = 1; i <= 14; i++) {
      const t = (i / 14) ** 2;
      const y = horizon + floor * t;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * (width / 24), horizon);
      ctx.lineTo(cx + i * (width / 4), height);
      ctx.stroke();
    }
    ctx.strokeStyle = withAlpha(pink, 0.9);
    ctx.lineWidth = Math.max(2, width / 400);
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.stroke();
  }
}
