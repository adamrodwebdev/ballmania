import type { Chain } from '@/engine/chain/Chain';
import type { Game } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallSprites } from './BallSprites';
import type { BallMotion } from './BallMotion';
import type { Effects } from './Effects';
import type { Palette } from './Palette';

/** What every renderer offers the play session; a WebGL2 one joins in lot 3. */
export interface Renderer {
  /** Size of the drawing surface in CSS pixels, and the device pixel ratio. */
  resize(width: number, height: number, pixelRatio: number): void;
  setPalette(palette: Palette): void;
  /** Board coordinates of a point given in CSS pixels relative to the canvas. */
  toBoard(x: number, y: number): Vec2;
  draw(scene: Scene): void;
}

export interface Scene {
  readonly game: Game;
  readonly motion: BallMotion;
  readonly effects: Effects;
  /** Where the aim line stops (first ball it meets), or null to hide it. */
  readonly aimEnd: Vec2 | null;
  /** Seconds since the session started, for pulsing details. */
  readonly time: number;
}

const SHOOTER_RADIUS = 58;

/** Canvas 2D renderer: tracks, hole, chains, shots, shooter and effects. */
export class CanvasRenderer implements Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites: BallSprites;
  private palette: Palette;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private pixelRatio = 1;
  private readonly tracks = new Map<Chain, Path2D>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
    palette: Palette,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
    this.palette = palette;
    this.sprites = new BallSprites(() => document.createElement('canvas'));
  }

  resize(width: number, height: number, pixelRatio: number): void {
    const { board } = this.game.setup;
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
    this.scale = Math.min(width / board.width, height / board.height);
    this.offsetX = (width - board.width * this.scale) / 2;
    this.offsetY = (height - board.height * this.scale) / 2;
    this.rebuildSprites();
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    this.rebuildSprites();
  }

  toBoard(x: number, y: number): Vec2 {
    return new Vec2((x - this.offsetX) / this.scale, (y - this.offsetY) / this.scale);
  }

  draw(scene: Scene): void {
    const { ctx, palette } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.scale * this.pixelRatio;
    ctx.setTransform(k, 0, 0, k, this.offsetX * this.pixelRatio, this.offsetY * this.pixelRatio);

    const { game } = scene;
    const radius = game.setup.chain.ballRadius;
    for (const chain of game.chains) this.drawTrack(chain, radius);
    if (scene.aimEnd) this.drawAim(scene.aimEnd, radius);
    for (const chain of game.chains) this.drawChain(chain, scene.motion, radius);
    for (const projectile of game.projectiles) {
      this.drawBall(projectile.tone, projectile.position, radius);
    }
    // Entrances and holes cover the balls coming out of and going into them.
    for (const chain of game.chains) this.drawEnds(chain, radius, scene.time);
    this.drawShooter(radius);
    scene.effects.draw(ctx, palette, radius);
  }

  private rebuildSprites(): void {
    this.sprites.build(
      this.palette,
      this.game.setup.chain.ballRadius * this.scale * this.pixelRatio,
    );
  }

  private trackOf(chain: Chain): Path2D {
    let track = this.tracks.get(chain);
    if (!track) {
      track = new Path2D();
      chain.path.sample(8).forEach((point, i) => {
        if (i === 0) track!.moveTo(point.x, point.y);
        else track!.lineTo(point.x, point.y);
      });
      this.tracks.set(chain, track);
    }
    return track;
  }

  private drawTrack(chain: Chain, radius: number): void {
    const { ctx, palette } = this;
    const track = this.trackOf(chain);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = palette.trackEdge;
    ctx.lineWidth = radius * 2 + 14;
    ctx.stroke(track);
    ctx.strokeStyle = palette.track;
    ctx.lineWidth = radius * 2 + 4;
    ctx.stroke(track);
  }

  private drawEnds(chain: Chain, radius: number, time: number): void {
    const { ctx, palette } = this;
    const start = chain.path.pointAt(0);
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = palette.trackEdge;
    ctx.fill();

    // The hole glows red as the head of the chain gets close.
    const head = chain.balls[chain.balls.length - 1];
    const danger = head ? Math.max(0, (head.s / chain.path.length - 0.75) / 0.25) : 0;
    const end = chain.path.end;
    const glow = radius * (1.7 + 0.25 * danger * Math.sin(time * 10));
    ctx.beginPath();
    ctx.arc(end.x, end.y, glow, 0, Math.PI * 2);
    ctx.fillStyle = danger > 0 ? palette.danger : palette.accent;
    ctx.globalAlpha = 0.25 + 0.5 * danger;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(end.x, end.y, radius * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = palette.hole;
    ctx.fill();
  }

  private drawChain(chain: Chain, motion: BallMotion, radius: number): void {
    for (const ball of chain.balls) {
      const s = motion.arcOf(ball);
      if (s < -radius || s > chain.path.length) continue;
      this.drawBall(ball.tone, motion.positionOf(chain, ball), radius);
    }
  }

  private drawBall(tone: number, at: Vec2, radius: number): void {
    const sprite = this.sprites.get(tone);
    if (sprite) this.ctx.drawImage(sprite, at.x - radius, at.y - radius, radius * 2, radius * 2);
  }

  private drawAim(end: Vec2, radius: number): void {
    const { ctx, palette } = this;
    const from = this.game.shooter.position;
    ctx.save();
    ctx.setLineDash([4, 18]);
    ctx.lineCap = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = palette.tone(this.game.shooter.current);
    ctx.globalAlpha = 0.6;
    const start = from.add(Vec2.fromAngle(this.game.shooter.angle, SHOOTER_RADIUS + radius));
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawShooter(radius: number): void {
    const { ctx, palette } = this;
    const { shooter } = this.game;
    const { x, y } = shooter.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, SHOOTER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = palette.shooter;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = palette.accent;
    ctx.stroke();
    ctx.rotate(shooter.angle);
    ctx.beginPath();
    ctx.roundRect(SHOOTER_RADIUS - 18, -radius - 6, 36, radius * 2 + 12, 10);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.restore();
    // Loaded ball in the barrel, next ball in the centre.
    this.drawBall(
      shooter.current,
      shooter.position.add(Vec2.fromAngle(shooter.angle, SHOOTER_RADIUS)),
      radius,
    );
    this.drawBall(shooter.next, shooter.position, radius * 0.6);
  }
}
