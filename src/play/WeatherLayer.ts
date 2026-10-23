import type { Game } from '@/engine/Game';
import type { Chain } from '@/engine/chain/Chain';
import { Vec2 } from '@/engine/geometry/Vec2';
import type { Palette } from './Palette';
import { withAlpha } from './themes/WorldTheme';
import type { Context2D } from './canvas';

/** Height balls fall from, in board units above where they land. */
const FALL_HEIGHT = 700;
/** Streaks of wind drawn during a gust. */
const STREAKS = 36;

/** A stable pseudo-random number in [0, 1) for an index, so streaks need no state. */
const hash = (index: number, salt: number) => {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * The hazards drawn on the board (specification § 3.9): the light of a solar
 * storm and the burning balls, frost and frozen balls, streaks of wind, balls
 * falling from the sky with their shadow, and the tracks throbbing with
 * arrhythmia. Drawn in board units, under the renderer's transform.
 */
export class WeatherLayer {
  constructor(private readonly game: Game) {}

  /** Under the chains: the tracks' throb and the shadows of falling balls. */
  drawUnder(ctx: Context2D, palette: Palette, tracks: Path2D[], radius: number): void {
    const pace = this.game.arrhythmiaPace;
    if (pace !== null && Math.abs(pace - 1) > 0.05) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = pace > 1 ? palette.danger : palette.tone(3);
      ctx.globalAlpha = Math.min(0.5, Math.abs(pace - 1) * 1.2);
      ctx.lineWidth = radius * 2 + 22;
      for (const track of tracks) ctx.stroke(track);
      ctx.restore();
    }
    for (const meteor of this.game.meteorsFalling) {
      const { x, y } = meteor.position;
      ctx.save();
      ctx.globalAlpha = 0.2 + 0.4 * meteor.progress;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(x, y, radius * (0.4 + 0.8 * meteor.progress), radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Over the chains: falling balls, frost and fire on the balls, and the weather's light. */
  drawOver(
    ctx: Context2D,
    palette: Palette,
    positionOf: (chain: Chain, index: number) => Vec2,
    radius: number,
    time: number,
  ): void {
    const { board } = this.game.setup;
    for (const meteor of this.game.meteorsFalling) {
      const fall = meteor.progress * meteor.progress;
      const at = meteor.position.add(new Vec2(0, -FALL_HEIGHT * (1 - fall)));
      ctx.save();
      const trail = ctx.createLinearGradient(at.x, at.y - radius * 5, at.x, at.y);
      trail.addColorStop(0, withAlpha(palette.accent, 0));
      trail.addColorStop(1, withAlpha(palette.accent, 0.8));
      ctx.fillStyle = trail;
      ctx.fillRect(at.x - radius * 0.5, at.y - radius * 5, radius, radius * 5);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(at.x, at.y, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const weather = this.game.weather;
    // Frost stays on the balls it covers only while the cold lasts.
    this.game.chains.forEach((chain) => {
      chain.balls.forEach((ball, index) => {
        if (ball.s < 0 || ball.s > chain.path.length) return;
        const at = positionOf(chain, index);
        if (ball.frozen) this.frost(ctx, at, radius);
        else if (weather?.kind === 'solar') this.burn(ctx, palette, at, radius, time + index);
      });
    });
    if (!weather) return;

    const fade = Math.min(1, (weather.duration - weather.left) * 2, weather.left * 2);
    ctx.save();
    if (weather.kind === 'solar') {
      const light = ctx.createRadialGradient(
        board.width / 2,
        -board.height * 0.2,
        0,
        board.width / 2,
        0,
        board.height * 1.3,
      );
      light.addColorStop(0, withAlpha(palette.tone(1), 0.45));
      light.addColorStop(1, withAlpha(palette.tone(0), 0));
      ctx.globalAlpha = fade * (0.8 + 0.2 * Math.sin(time * 3));
      ctx.fillStyle = light;
      ctx.fillRect(-board.width, -board.height, board.width * 3, board.height * 3);
    } else if (weather.kind === 'cold') {
      ctx.globalAlpha = fade * 0.15;
      ctx.fillStyle = palette.tone(3);
      ctx.fillRect(-board.width, -board.height, board.width * 3, board.height * 3);
    } else {
      ctx.globalAlpha = fade * 0.35;
      ctx.strokeStyle = palette.dark ? '#ffffff' : palette.tone(4);
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      const span = board.width + 400;
      for (let i = 0; i < STREAKS; i++) {
        const y = hash(i, 1) * board.height;
        const speed = 700 + 500 * hash(i, 2);
        const x =
          ((((hash(i, 3) * span + weather.direction * time * speed) % span) + span) % span) - 200;
        const length = 60 + 120 * hash(i, 4);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - weather.direction * length, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private frost(ctx: Context2D, at: Vec2, radius: number): void {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const angle = (k / 3) * Math.PI;
      const dx = Math.cos(angle) * radius * 0.7;
      const dy = Math.sin(angle) * radius * 0.7;
      ctx.beginPath();
      ctx.moveTo(at.x - dx, at.y - dy);
      ctx.lineTo(at.x + dx, at.y + dy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private burn(ctx: Context2D, palette: Palette, at: Vec2, radius: number, time: number): void {
    ctx.save();
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 9);
    ctx.strokeStyle = palette.tone(1);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 1.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
