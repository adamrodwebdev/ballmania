import type { Tone } from '@/engine/chain/Ball';
import type { Vec2 } from '@/engine/geometry/Vec2';
import type { Palette } from '../Palette';

/** Positions kept per ball in flight, oldest first. */
export const TRAIL_LENGTH = 10;

/** What a ball in flight leaves behind (specification § 3.6). */
export interface TrailStyle {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    tone: Tone,
    history: readonly Vec2[],
    radius: number,
  ): void;
}

export class NoTrail implements TrailStyle {
  draw(): void {}
}

/** A tapering streak of the ball's colour. */
export class CometTrail implements TrailStyle {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    tone: Tone,
    history: readonly Vec2[],
    radius: number,
  ): void {
    ctx.lineCap = 'round';
    ctx.strokeStyle = palette.tone(tone);
    for (let i = 1; i < history.length; i++) {
      const t = i / history.length;
      ctx.globalAlpha = t * 0.7;
      ctx.lineWidth = radius * 1.6 * t;
      ctx.beginPath();
      ctx.moveTo(history[i - 1]!.x, history[i - 1]!.y);
      ctx.lineTo(history[i]!.x, history[i]!.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Sparkling specks scattered along the way. */
export class StardustTrail implements TrailStyle {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    tone: Tone,
    history: readonly Vec2[],
    radius: number,
  ): void {
    history.forEach((point, i) => {
      const t = (i + 1) / history.length;
      const spread = radius * 0.9 * (1 - t);
      // Fixed offsets per index: the dust stays still while the ball moves on.
      const dx = Math.sin(i * 12.9898) * spread;
      const dy = Math.cos(i * 78.233) * spread;
      ctx.globalAlpha = t;
      ctx.fillStyle = i % 2 === 0 ? palette.text : palette.tone(tone);
      ctx.beginPath();
      ctx.arc(point.x + dx, point.y + dy, 2 + 4 * t, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

/** A ribbon cycling through every ball colour. */
export class PrismTrail implements TrailStyle {
  draw(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    _tone: Tone,
    history: readonly Vec2[],
    radius: number,
  ): void {
    ctx.lineCap = 'round';
    for (let i = 1; i < history.length; i++) {
      const t = i / history.length;
      ctx.globalAlpha = t * 0.8;
      ctx.strokeStyle = palette.tone(i % palette.tones.length);
      ctx.lineWidth = radius * 1.2 * t;
      ctx.beginPath();
      ctx.moveTo(history[i - 1]!.x, history[i - 1]!.y);
      ctx.lineTo(history[i]!.x, history[i]!.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
