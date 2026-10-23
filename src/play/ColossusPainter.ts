import type { Vec2 } from '@/engine/geometry/Vec2';
import type { Palette } from './Palette';

/**
 * How each form of the Colossus is drawn, in body radii: its orbiting runes,
 * the size of its eye and how far ahead it sits. The young one (v1.7.4) has
 * fewer, bigger runes and a wide eye.
 */
const LOOKS = {
  adult: { runes: 6, rune: 0.09, eye: 1, gaze: 0.38 },
  young: { runes: 3, rune: 0.14, eye: 1.45, gaze: 0.3 },
} as const;

/** The orbit of the runes at rest, in body radii. */
export const RUNE_ORBIT = 1.22;

/** The Colossus at one moment: where, how big, where it looks, and its mood. */
export interface ColossusPose {
  readonly at: Vec2;
  readonly radius: number;
  readonly young: boolean;
  /**
   * Where the eye looks: a unit vector to look that way, shorter as the eye
   * turns to the player, who is in front of the screen (zero: a stare).
   */
  readonly gaze: Vec2;
  /** Seconds, for the pulse of the halo. */
  readonly time: number;
  /** How far the runes have turned along their orbit, in radians. */
  readonly turn: number;
  /** White flash when hit, from 1 down to 0. */
  readonly flash?: number;
  /** How open the eye is: 1 as in a fight, 0 shut. */
  readonly open?: number;
  /** Orbit of the runes, in body radii. */
  readonly spread?: number;
  /** A roar, from 0 to 1: the halo and the rim flare, the pupil narrows. */
  readonly rage?: number;
  readonly alpha?: number;
}

/**
 * The Colossus (§ 3.6): a dark star with a burning rim, orbiting runes and
 * one eye, on its track in a fight, or rising out of the black hole at the
 * end of the training (effects/Promise).
 */
export class ColossusPainter {
  draw(ctx: CanvasRenderingContext2D, palette: Palette, pose: ColossusPose): void {
    const { at, radius: r } = pose;
    const look = pose.young ? LOOKS.young : LOOKS.adult;
    const rage = pose.rage ?? 0;
    const alpha = pose.alpha ?? 1;
    if (alpha <= 0 || r <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(pose.time * 4);

    ctx.save();
    ctx.translate(at.x, at.y);
    const reach = r * 1.6 * (1 + 0.35 * rage);
    const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, reach);
    halo.addColorStop(0, palette.danger);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * Math.min(1, 0.35 + 0.25 * pulse + 0.45 * rage);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, reach, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    body.addColorStop(0, palette.accent);
    body.addColorStop(0.55, palette.hole);
    body.addColorStop(1, palette.hole);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5 + 4 * rage;
    ctx.strokeStyle = palette.danger;
    ctx.stroke();

    // Runes orbiting the body.
    const orbit = r * (pose.spread ?? RUNE_ORBIT);
    ctx.fillStyle = palette.accent;
    for (let i = 0; i < look.runes; i++) {
      const angle = pose.turn + (i / look.runes) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit, r * look.rune, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawEye(ctx, palette, pose, look);

    if (pose.flash) {
      ctx.globalAlpha = alpha * pose.flash * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * The eye looks along `gaze`: off to one side it is seen at a slant, flat;
   * turned to the player it is round, in the middle of the body. The pupil
   * stays inside it when it blinks.
   */
  private drawEye(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    pose: ColossusPose,
    look: (typeof LOOKS)[keyof typeof LOOKS],
  ): void {
    const { radius: r, gaze } = pose;
    const open = Math.max(0, pose.open ?? 1);
    const away = Math.min(1, gaze.length());
    const direction = away > 1e-3 ? gaze.scale(1 / away) : gaze;
    const eye = gaze.scale(r * look.gaze);
    const width = r * 0.3 * look.eye;
    const height = r * look.eye * open * (0.2 + 0.07 * (1 - away));
    ctx.save();
    ctx.translate(eye.x, eye.y);
    ctx.rotate(away > 1e-3 ? direction.angle() : 0);
    if (height < r * 0.02) {
      // Shut: a line of light.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, r * 0.04);
      ctx.beginPath();
      ctx.moveTo(-width, 0);
      ctx.lineTo(width, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    // The pupil leans the way it looks, and narrows in a roar.
    ctx.fillStyle = palette.danger;
    ctx.beginPath();
    ctx.arc(r * 0.08 * away, 0, r * 0.11 * look.eye * (1 - 0.4 * (pose.rage ?? 0)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
