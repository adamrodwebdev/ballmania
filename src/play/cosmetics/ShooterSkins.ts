import type { Palette } from '../Palette';

/** Radius of the shooter's body, in board units (also used to detect a tap on it). */
export const SHOOTER_RADIUS = 58;

/**
 * The look of the launcher (specification § 3.6). Drawn centred on the
 * shooter, unrotated; `angle` is where it aims.
 */
export interface ShooterSkin {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
  ): void;
}

const barrel = (
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  angle: number,
  ballRadius: number,
) => {
  ctx.save();
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.roundRect(SHOOTER_RADIUS - 18, -ballRadius - 6, 36, ballRadius * 2 + 12, 10);
  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.restore();
};

const disc = (ctx: CanvasRenderingContext2D, palette: Palette, radius: number) => {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = palette.shooter;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = palette.accent;
  ctx.stroke();
};

/** The original: a disc with a ring and a barrel. */
export class OrbitSkin implements ShooterSkin {
  draw(ctx: CanvasRenderingContext2D, palette: Palette, angle: number, ballRadius: number): void {
    disc(ctx, palette, SHOOTER_RADIUS);
    barrel(ctx, palette, angle, ballRadius);
  }
}

/** Seven golden points around the disc, turning slowly. */
export class CrownSkin implements ShooterSkin {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
  ): void {
    ctx.save();
    ctx.rotate(time * 0.4);
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const radius = i % 2 === 0 ? SHOOTER_RADIUS + 16 : SHOOTER_RADIUS - 4;
      const a = (i / 14) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = palette.tone(1);
    ctx.fill();
    ctx.restore();
    disc(ctx, palette, SHOOTER_RADIUS - 6);
    barrel(ctx, palette, angle, ballRadius);
  }
}

/** A double ring of light; the outer one is dashed and orbits. */
export class HaloSkin implements ShooterSkin {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
  ): void {
    ctx.save();
    ctx.rotate(-time * 0.9);
    ctx.setLineDash([10, 14]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = palette.tone(3);
    ctx.beginPath();
    ctx.arc(0, 0, SHOOTER_RADIUS + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 3);
    ctx.fillStyle = palette.tone(3);
    ctx.beginPath();
    ctx.arc(0, 0, SHOOTER_RADIUS + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    disc(ctx, palette, SHOOTER_RADIUS - 4);
    barrel(ctx, palette, angle, ballRadius);
  }
}

/** An almond-shaped eye whose pupil is the barrel. */
export class EyeSkin implements ShooterSkin {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
  ): void {
    const blink = Math.sin(time * 0.7) > 0.985 ? 0.15 : 1;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, SHOOTER_RADIUS + 8, (SHOOTER_RADIUS - 6) * blink, 0, 0, Math.PI * 2);
    ctx.fillStyle = palette.shooter;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = palette.tone(5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(SHOOTER_RADIUS * 0.45, 0, ballRadius + 8, 0, Math.PI * 2);
    ctx.fillStyle = palette.tone(5);
    ctx.fill();
    ctx.restore();
  }
}
