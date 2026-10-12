import type { Chain } from '@/engine/chain/Chain';
import type { Game } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallSprites } from './BallSprites';
import type { BallMotion } from './BallMotion';
import type { Destruction } from './effects/Destruction';
import type { Palette } from './Palette';
import type { Look } from './cosmetics/Look';
import { SHOOTER_RADIUS } from './cosmetics/ShooterSkins';
import { TRAIL_LENGTH } from './cosmetics/Trails';

/** What every renderer offers the play session. */
export interface Renderer {
  /** Size of the drawing surface in CSS pixels, and the device pixel ratio. */
  resize(width: number, height: number, pixelRatio: number): void;
  setPalette(palette: Palette): void;
  /** Board coordinates of a point given in CSS pixels relative to the canvas. */
  toBoard(x: number, y: number): Vec2;
  /** Device-pixel position of a board point, and device pixels per board unit. */
  toDevice(point: Vec2): Vec2;
  readonly deviceScale: number;
  /** The surface drawn on, which post-processing reads. */
  readonly surface: HTMLCanvasElement;
  draw(scene: Scene): void;
}

export interface Scene {
  readonly game: Game;
  readonly motion: BallMotion;
  readonly destruction: Destruction;
  /** Where the aim line stops (first ball it meets), or null to hide it. */
  readonly aimEnd: Vec2 | null;
  /** Seconds since the session started, for pulsing details. */
  readonly time: number;
  /** White flash of the Colossus when it is hit, from 1 down to 0. */
  readonly colossusFlash: number;
}

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
  private background: HTMLCanvasElement | null = null;
  private readonly trails = new Map<number, Vec2[]>();
  private time = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
    palette: Palette,
    private readonly look: Look,
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
    this.repaintBackground();
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    this.rebuildSprites();
    this.repaintBackground();
  }

  private repaintBackground(): void {
    const background = this.background ?? document.createElement('canvas');
    background.width = this.canvas.width;
    background.height = this.canvas.height;
    const ctx = background.getContext('2d');
    if (!ctx) return;
    this.look.theme.paintBackground(ctx, background.width, background.height, this.palette);
    this.background = background;
  }

  toBoard(x: number, y: number): Vec2 {
    return new Vec2((x - this.offsetX) / this.scale, (y - this.offsetY) / this.scale);
  }

  toDevice(point: Vec2): Vec2 {
    return new Vec2(
      (point.x * this.scale + this.offsetX) * this.pixelRatio,
      (point.y * this.scale + this.offsetY) * this.pixelRatio,
    );
  }

  get deviceScale(): number {
    return this.scale * this.pixelRatio;
  }

  get surface(): HTMLCanvasElement {
    return this.canvas;
  }

  draw(scene: Scene): void {
    const { ctx, palette } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.background) ctx.drawImage(this.background, 0, 0);
    else {
      ctx.fillStyle = palette.board;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    const k = this.scale * this.pixelRatio;
    const shake = scene.destruction.shakeOffset;
    ctx.setTransform(
      k,
      0,
      0,
      k,
      (this.offsetX + shake.x * this.scale) * this.pixelRatio,
      (this.offsetY + shake.y * this.scale) * this.pixelRatio,
    );

    const { game } = scene;
    this.time = scene.time;
    const radius = game.setup.chain.ballRadius;
    for (const chain of game.chains) this.drawTrack(chain, radius);
    if (scene.aimEnd) this.drawAim(scene.aimEnd, radius);
    for (const chain of game.chains) this.drawChain(chain, scene.motion, radius);
    game.chains.forEach((chain) => this.drawColossus(chain, scene));
    this.drawTrails(radius);
    for (const projectile of game.projectiles) {
      this.drawBall(projectile.tone, projectile.position, radius);
    }
    // Entrances and holes cover the balls coming out of and going into them.
    for (const chain of game.chains) this.drawEnds(chain, radius, scene.time);
    this.drawShooter(radius);
    scene.destruction.draw(ctx, palette, this.sprites);

    const flash = scene.destruction.flash;
    if (flash.amount > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = flash.amount;
      ctx.fillStyle = flash.colour;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }
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

  /** The Colossus: a dark star with a burning rim, orbiting runes and one eye on the chain. */
  private drawColossus(chain: Chain, scene: Scene): void {
    const arc = chain.pusherArc;
    const setup = this.game.setup.colossus;
    if (arc === null || !setup || arc < -setup.radius) return;
    const { ctx, palette } = this;
    const at = chain.path.pointAt(arc);
    const ahead = chain.path.tangentAt(arc);
    const r = setup.radius;
    const pulse = 0.5 + 0.5 * Math.sin(scene.time * 4);

    ctx.save();
    ctx.translate(at.x, at.y);
    const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.6);
    halo.addColorStop(0, palette.danger);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35 + 0.25 * pulse;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    body.addColorStop(0, palette.accent);
    body.addColorStop(0.55, palette.hole);
    body.addColorStop(1, palette.hole);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = palette.danger;
    ctx.stroke();

    // Six runes orbiting the body.
    ctx.fillStyle = palette.accent;
    for (let i = 0; i < 6; i++) {
      const angle = scene.time * 0.8 + (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r * 1.22, Math.sin(angle) * r * 1.22, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }

    // The eye looks along the track, at the chain it pushes.
    const eye = ahead.scale(r * 0.38);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, r * 0.3, r * 0.2, ahead.angle(), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.danger;
    ctx.beginPath();
    ctx.arc(eye.x + ahead.x * r * 0.08, eye.y + ahead.y * r * 0.08, r * 0.11, 0, Math.PI * 2);
    ctx.fill();

    if (scene.colossusFlash > 0) {
      ctx.globalAlpha = scene.colossusFlash * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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

  /** Remembers the last positions of every ball in flight and draws its trail. */
  private drawTrails(radius: number): void {
    const flying = new Set<number>();
    for (const projectile of this.game.projectiles) {
      flying.add(projectile.id);
      const history = this.trails.get(projectile.id) ?? [];
      history.push(projectile.position);
      if (history.length > TRAIL_LENGTH) history.shift();
      this.trails.set(projectile.id, history);
      this.look.trail.draw(this.ctx, this.palette, projectile.tone, history, radius);
    }
    for (const id of this.trails.keys()) if (!flying.has(id)) this.trails.delete(id);
  }

  private drawShooter(radius: number): void {
    const { ctx, palette } = this;
    const { shooter } = this.game;
    ctx.save();
    ctx.translate(shooter.position.x, shooter.position.y);
    this.look.shooter.draw(ctx, palette, shooter.angle, radius, this.time);
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
