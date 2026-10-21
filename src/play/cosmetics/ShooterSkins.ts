import type { Palette } from '../Palette';

/** Radius of the shooter's body, in board units (also used to detect a tap on it). */
export const SHOOTER_RADIUS = 58;

/**
 * The look of the launcher (specification § 3.6). Drawn centred on the
 * shooter, unrotated; `angle` is where it aims, `loaded` the colour of the
 * ball about to fly (when the game knows it).
 */
export interface ShooterSkin {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded?: string,
  ): void;
}

const TAU = Math.PI * 2;
/** The Star heart's own gold: the launcher looks the same on every board and in both themes. */
const GOLD = '#ffc94a';

/**
 * The Star heart (v1.7), the default launcher and the mascot of the covers:
 * an astrolabe ring of gold ticks turning slowly, five crystal petals whose
 * tips light up in the loaded colour, a violet heart holding the next ball,
 * and a gold cradle behind the ball about to fly.
 */
export class StarHeartSkin implements ShooterSkin {
  draw(
    ctx: CanvasRenderingContext2D,
    _palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded: string = GOLD,
  ): void {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, 68.7, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 5.6;
    ctx.setLineDash([1.8, 14.88]);
    ctx.lineDashOffset = -time * 4;
    ctx.beginPath();
    ctx.arc(0, 0, 63.7, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.rotate(angle);
    // Five crystal petals around the heart; the sixth place is the cradle's.
    for (let k = 1; k < 6; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 3);
      const crystal = ctx.createLinearGradient(16.8, 0, 52.5, 0);
      crystal.addColorStop(0, '#2d1680');
      crystal.addColorStop(1, '#c4afff');
      ctx.beginPath();
      ctx.moveTo(16.8, 0);
      ctx.lineTo(33.5, -11.7);
      ctx.lineTo(52.5, 0);
      ctx.lineTo(33.5, 11.7);
      ctx.closePath();
      ctx.fillStyle = crystal;
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = 'rgba(230, 220, 255, 0.7)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(21.2, 0);
      ctx.lineTo(48, 0);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(255, 201, 74, 0.85)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(52.5, 0, 3.1, 0, TAU);
      ctx.fillStyle = loaded;
      ctx.fill();
      ctx.restore();
    }

    const heart = ctx.createRadialGradient(0, 0, 0, 0, 0, 33.5);
    heart.addColorStop(0, '#3d1c93');
    heart.addColorStop(1, '#12072e');
    ctx.beginPath();
    ctx.arc(0, 0, 33.5, 0, TAU);
    ctx.fillStyle = heart;
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = 'rgba(190, 160, 255, 0.6)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 20.1, 0, TAU);
    ctx.fillStyle = '#0a0420';
    ctx.fill();
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = GOLD;
    ctx.stroke();

    // The cradle wraps the back of the loaded ball.
    const reach = ballRadius + 5.3;
    ctx.beginPath();
    ctx.arc(SHOOTER_RADIUS, 0, reach, (100 * Math.PI) / 180, (260 * Math.PI) / 180);
    ctx.lineCap = 'round';
    ctx.lineWidth = 9.5;
    ctx.strokeStyle = '#8a3a0c';
    ctx.stroke();
    const gold = ctx.createLinearGradient(0, -reach, 0, reach);
    gold.addColorStop(0, '#ffe680');
    gold.addColorStop(0.52, '#ffbf2e');
    gold.addColorStop(1, '#f2801c');
    ctx.lineWidth = 6.1;
    ctx.strokeStyle = gold;
    ctx.stroke();
    ctx.restore();
  }
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

/** The launcher of the first versions: a disc with a ring and a barrel. */
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
