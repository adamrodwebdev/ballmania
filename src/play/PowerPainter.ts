import type { Chain } from '@/engine/chain/Chain';
import type { Vec2 } from '@/engine/geometry/Vec2';
import { SLOW_SECONDS, type PowerKind } from '@/engine/powers/Powers';
import type { BallMotion } from './BallMotion';
import type { Context2D, SpriteCanvas } from './canvas';

type Context = Context2D;

const TAU = Math.PI * 2;
const ICE = 'rgba(214, 248, 255, 0.9)';
const COOL = '#7cd8ff';
const BEAM = '#9d7bff';

/**
 * Each power's emblem in the middle of its ball, for a radius of 1: Rewind's
 * double arrow, Slow-down's hourglass, Rainbow's sparkle, Laser's bolt.
 */
const EMBLEMS: Readonly<Record<PowerKind, (ctx: Context) => void>> = {
  rewind: (ctx) => {
    ctx.moveTo(-0.043, -0.365);
    ctx.lineTo(-0.494, 0);
    ctx.lineTo(-0.043, 0.365);
    ctx.closePath();
    ctx.moveTo(0.429, -0.365);
    ctx.lineTo(-0.021, 0);
    ctx.lineTo(0.429, 0.365);
    ctx.closePath();
  },
  slow: (ctx) => {
    ctx.moveTo(-0.343, -0.472);
    ctx.lineTo(0.343, -0.472);
    ctx.lineTo(0.343, -0.369);
    ctx.lineTo(0.077, 0);
    ctx.lineTo(0.343, 0.369);
    ctx.lineTo(0.343, 0.472);
    ctx.lineTo(-0.343, 0.472);
    ctx.lineTo(-0.343, 0.369);
    ctx.lineTo(-0.077, 0);
    ctx.lineTo(-0.343, -0.369);
    ctx.closePath();
  },
  rainbow: (ctx) => {
    ctx.moveTo(0, -0.515);
    ctx.quadraticCurveTo(0.094, -0.094, 0.515, 0);
    ctx.quadraticCurveTo(0.094, 0.094, 0, 0.515);
    ctx.quadraticCurveTo(-0.094, 0.094, -0.515, 0);
    ctx.quadraticCurveTo(-0.094, -0.094, 0, -0.515);
    ctx.closePath();
  },
  laser: (ctx) => {
    ctx.moveTo(0.129, -0.515);
    ctx.lineTo(-0.322, 0.064);
    ctx.lineTo(-0.064, 0.064);
    ctx.lineTo(-0.172, 0.515);
    ctx.lineTo(0.322, -0.086);
    ctx.lineTo(0.064, -0.086);
    ctx.closePath();
  },
};

/**
 * Draws the powers (v1.7): the balls that hold one, and what a power does
 * while it works — the chain rolling back, the frost of the slow-down and its
 * countdown around the launcher, the laser's beam and the balls it will take.
 * Board units; the renderer has set the transform.
 */
export class PowerPainter {
  /** The emblem over a plain orb, and the light of its colour. */
  emblem(ctx: Context, kind: PowerKind, at: Vec2, radius: number): void {
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.scale(radius, radius);
    ctx.beginPath();
    EMBLEMS[kind](ctx);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.06;
    ctx.strokeStyle = 'rgba(28, 6, 54, 0.5)';
    ctx.stroke();
    // The orb's highlight stays on top of the emblem.
    ctx.beginPath();
    ctx.ellipse(-0.36, -0.42, 0.26, 0.16, -0.6, 0, TAU);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.restore();
  }

  /**
   * The ring that marks a power ball: dashed white, turning; a rainbow of the
   * six colours for the Rainbow shot.
   */
  ring(
    ctx: Context,
    kind: PowerKind,
    at: Vec2,
    radius: number,
    colours: readonly string[],
    time: number,
  ): void {
    ctx.save();
    ctx.lineWidth = radius * 0.1;
    if (kind === 'rainbow') {
      colours.forEach((colour, k) => {
        const start = time * 1.2 + (k / colours.length) * TAU;
        ctx.strokeStyle = colour;
        ctx.beginPath();
        ctx.arc(at.x, at.y, radius * 1.22, start, start + (TAU / colours.length) * 0.82);
        ctx.stroke();
      });
    } else {
      ctx.setLineDash([radius * 0.45, radius * 0.25]);
      ctx.lineDashOffset = -time * radius * 1.2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.arc(at.x, at.y, radius * 1.22, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Slow-down: a rim of frost round every ball of the chains. It leaves the
   * colours as they are (v1.8.1): a veil over the balls washed them out, cyan
   * first, just when the player has to tell them apart.
   */
  frost(ctx: Context, chains: readonly Chain[], motion: BallMotion, radius: number): void {
    ctx.save();
    ctx.strokeStyle = ICE;
    ctx.lineWidth = Math.max(1.5, radius * 0.12);
    ctx.beginPath();
    for (const chain of chains) {
      for (const ball of chain.balls) {
        if (motion.arcOf(ball) < 0) continue;
        const at = motion.positionOf(chain, ball);
        ctx.moveTo(at.x + radius * 1.06, at.y);
        ctx.arc(at.x, at.y, radius * 1.06, 0, TAU);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Slow-down: the time left, as a ring around the launcher that empties. */
  countdown(ctx: Context, at: Vec2, reach: number, remaining: number): void {
    const share = Math.max(0, Math.min(1, remaining / SLOW_SECONDS));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = COOL;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(at.x, at.y, reach, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(at.x, at.y, reach, -Math.PI / 2, -Math.PI / 2 + share * TAU);
    ctx.stroke();
    ctx.restore();
  }

  /** Rewind: chevrons ahead of each chain's head, pointing back the way it goes. */
  rewind(ctx: Context, chains: readonly Chain[], radius: number, time: number): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = radius * 0.26;
    ctx.strokeStyle = '#e6fbff';
    for (const chain of chains) {
      const head = chain.balls[chain.balls.length - 1];
      if (!head) continue;
      for (let k = 1; k <= 3; k++) {
        const s = head.s + radius * (1.6 + k * 1.4) - ((time * radius * 5) % (radius * 1.4));
        if (s < 0 || s > chain.path.length) continue;
        const at = chain.path.pointAt(s);
        const ahead = chain.path.pointAt(Math.min(chain.path.length, s + 1));
        const angle = Math.atan2(ahead.y - at.y, ahead.x - at.x);
        ctx.globalAlpha = 0.95 - k * 0.22;
        ctx.save();
        ctx.translate(at.x, at.y);
        ctx.rotate(angle + Math.PI);
        ctx.beginPath();
        ctx.moveTo(-radius * 0.5, -radius * 0.72);
        ctx.lineTo(radius * 0.36, 0);
        ctx.lineTo(-radius * 0.5, radius * 0.72);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /** Laser loaded: the beam it would draw, and a dashed ring on each ball it would take. */
  laserAim(
    ctx: Context,
    from: Vec2,
    path: { readonly targets: readonly Vec2[]; readonly end: Vec2 },
    radius: number,
    time: number,
  ): void {
    const end = path.targets.length > 0 ? path.targets[path.targets.length - 1]! : path.end;
    ctx.save();
    ctx.lineCap = 'round';
    const strokes: readonly [string, number, number][] = [
      [BEAM, radius * 0.6, 0.4],
      [COOL, radius * 0.22, 0.8],
      ['#ffffff', radius * 0.08, 1],
    ];
    for (const [colour, width, alpha] of strokes) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = radius * 0.1;
    ctx.setLineDash([radius * 0.25, radius * 0.18]);
    ctx.lineDashOffset = -time * radius;
    for (const target of path.targets) {
      ctx.beginPath();
      ctx.arc(target.x, target.y, radius * 1.18, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A laser shot, loaded or in flight: a white-hot core, and a streak behind it when it flies. */
  laserBall(
    ctx: Context,
    at: Vec2,
    radius: number,
    velocity: Vec2 | null,
    glow: SpriteCanvas,
  ): void {
    ctx.save();
    if (velocity && velocity.length() > 0) {
      const back = at.sub(velocity.normalize().scale(radius * 6));
      const streak = ctx.createLinearGradient(at.x, at.y, back.x, back.y);
      streak.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      streak.addColorStop(1, 'rgba(157, 123, 255, 0)');
      ctx.strokeStyle = streak;
      ctx.lineCap = 'round';
      ctx.lineWidth = radius * 0.9;
      ctx.beginPath();
      ctx.moveTo(at.x, at.y);
      ctx.lineTo(back.x, back.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(glow, at.x - radius * 2, at.y - radius * 2, radius * 4, radius * 4);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const core = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, radius * 0.55);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    core.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 0.55, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

/** Colour of the laser's glow, for the renderer's cached glows. */
export const LASER_GLOW = BEAM;

/** Where the slow-down's countdown ring runs, around the launcher (board units). */
export const COUNTDOWN_REACH = 82;
