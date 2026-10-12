import type { Gravity } from '@/engine/orbit/Gravity';
import type { OrbitSetup } from '@/engine/orbit/Orbit';
import type { Palette } from './Palette';
import { withAlpha } from './themes/WorldTheme';

/**
 * The Singularity world drawn on the board: the shooter's ring, and the
 * black hole that swallows the chains, with its spinning accretion disk.
 * The hole stays black in both colour schemes; its rim turns red as a chain
 * gets close (`danger`, 0 to 1).
 */
export class BlackHole {
  constructor(
    private readonly gravity: Gravity,
    private readonly ring: OrbitSetup | null,
  ) {}

  /** Under the tracks: the dashed ring the shooter glides along. */
  drawRing(ctx: CanvasRenderingContext2D, palette: Palette, time: number): void {
    if (!this.ring) return;
    const { centre, radiusX, radiusY, speed } = this.ring;
    ctx.save();
    ctx.setLineDash([6, 16]);
    // The dashes run the way the shooter goes.
    ctx.lineDashOffset = -Math.sign(speed) * time * 30;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = palette.accent;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(centre.x, centre.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Over the chains: the disk hides the balls falling in. */
  draw(ctx: CanvasRenderingContext2D, palette: Palette, time: number, danger: number): void {
    const { x, y } = this.gravity.centre;
    const horizon = this.gravity.setup.horizon;
    const disk = horizon * 2.3;
    ctx.save();
    ctx.translate(x, y);

    // Light bent around the hole: a wide, faint halo.
    const halo = ctx.createRadialGradient(0, 0, horizon, 0, 0, disk * 1.9);
    halo.addColorStop(0, withAlpha(palette.tone(4), palette.dark ? 0.45 : 0.3));
    halo.addColorStop(1, withAlpha(palette.tone(4), 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, disk * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Accretion disk: hot arcs whirling inwards, faster near the horizon.
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = palette.dark ? 'lighter' : 'source-over';
    const bands = [palette.tone(1), palette.tone(5), palette.tone(0), palette.tone(1)];
    bands.forEach((colour, band) => {
      const radius = horizon * (1.25 + band * 0.32);
      const spin = time * (2.6 - band * 0.45);
      ctx.strokeStyle = colour;
      ctx.lineWidth = 7 - band;
      for (let arc = 0; arc < 3; arc++) {
        const start = spin + (arc / 3) * Math.PI * 2 + band;
        ctx.globalAlpha = 0.75 - band * 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, start + 1.3);
        ctx.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over';

    // Photon ring, red with danger.
    const pulse = danger > 0 ? 0.5 + 0.5 * Math.sin(time * 10) : 0;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3 + 3 * danger * pulse;
    ctx.strokeStyle = danger > 0 ? palette.danger : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, horizon * 1.08, 0, Math.PI * 2);
    ctx.stroke();

    // The event horizon itself.
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, horizon, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
