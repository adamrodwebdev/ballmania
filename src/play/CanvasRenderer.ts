import type { Chain } from '@/engine/chain/Chain';
import type { Game } from '@/engine/Game';
import { mix } from '@/engine/chain/Alchemy';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallSprites } from './BallSprites';
import { BlackHole } from './BlackHole';
import type { BallMotion } from './BallMotion';
import type { Destruction } from './effects/Destruction';
import type { Palette } from './Palette';
import type { Look } from './cosmetics/Look';
import { SHOOTER_RADIUS } from './cosmetics/ShooterSkins';
import type { Path } from '@/engine/path/Path';

/** Radius of a switch lever, in board units (also the size of its tap target). */
export const SWITCH_RADIUS = 30;
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
  /** The aim line, from the shooter to the first ball it meets; null to hide it. */
  readonly aim: AimLine | null;
  /** The magnet is armed: the next "shot" pulls the aimed ball instead. */
  readonly magnetArmed: boolean;
  /** Seconds since the session started, for pulsing details. */
  readonly time: number;
  /** White flash of the Colossus when it is hit, from 1 down to 0. */
  readonly colossusFlash: number;
}

/** The aim line: its points (curved by gravity) and where it bounces off mirrors. */
export interface AimLine {
  readonly points: readonly Vec2[];
  readonly rebounds: readonly Vec2[];
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
  /** Track shapes, per path: flipping a switch gives the chain a new path. */
  private readonly tracks = new Map<Path, Path2D>();
  private background: HTMLCanvasElement | null = null;
  private readonly trails = new Map<number, Vec2[]>();
  private time = 0;
  /** Singularity world: the black hole and the shooter's ring. */
  private readonly blackHole: BlackHole | null;

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
    this.blackHole = game.gravity ? new BlackHole(game.gravity, game.ring) : null;
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
    this.blackHole?.drawRing(ctx, palette, scene.time);
    this.drawSwitches(radius, scene.time);
    this.drawReflectors(scene.time);
    if (scene.aim) this.drawAim(scene.aim, radius, scene.magnetArmed, scene.time);
    for (const chain of game.chains) this.drawChain(chain, scene.motion, radius);
    game.chains.forEach((chain) => this.drawColossus(chain, scene));
    this.drawTrails(radius);
    for (const projectile of game.projectiles) {
      this.drawBall(projectile.tone, projectile.position, radius);
    }
    // Entrances and holes cover the balls coming out of and going into them.
    for (const chain of game.chains) this.drawEnds(chain, radius, scene.time);
    this.blackHole?.draw(ctx, palette, scene.time, this.danger());
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
    let track = this.tracks.get(chain.path);
    if (!track) {
      track = new Path2D();
      chain.path.sample(8).forEach((point, i) => {
        if (i === 0) track!.moveTo(point.x, point.y);
        else track!.lineTo(point.x, point.y);
      });
      this.tracks.set(chain.path, track);
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

  /** How close the nearest chain head is to its hole, from 0 (far) to 1 (in). */
  private danger(): number {
    return Math.max(
      0,
      ...this.game.chains.map((chain) => {
        const head = chain.balls[chain.balls.length - 1];
        return head ? Math.max(0, (head.s / chain.path.length - 0.75) / 0.25) : 0;
      }),
    );
  }

  private drawEnds(chain: Chain, radius: number, time: number): void {
    const { ctx, palette } = this;
    const start = chain.path.pointAt(0);
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = palette.trackEdge;
    ctx.fill();
    if (this.blackHole) {
      // Singularity world: balls come out of a glowing portal; the black hole is the hole.
      ctx.lineWidth = 5;
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 3);
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius * (1.3 + 0.1 * Math.sin(time * 3)), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

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

  private drawAim(aim: AimLine, radius: number, magnet: boolean, time: number): void {
    const { ctx, palette } = this;
    const path = aim.points;
    const from = this.game.shooter.position;
    ctx.save();
    ctx.setLineDash(magnet ? [18, 10] : [4, 18]);
    ctx.lineDashOffset = magnet ? time * 60 : 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = magnet ? 8 : 6;
    ctx.strokeStyle = magnet ? palette.tone(3) : palette.tone(this.game.shooter.current);
    ctx.globalAlpha = magnet ? 0.85 : 0.6;
    const start = from.add(Vec2.fromAngle(this.game.shooter.angle, SHOOTER_RADIUS + radius));
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    // Curve samples still inside the barrel would make the line start backwards.
    const barrel = SHOOTER_RADIUS + radius;
    path.slice(1).forEach((point, i, rest) => {
      if (i === rest.length - 1 || point.distanceTo(from) > barrel) ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    // A dot on each rebound, so a bank shot reads at a glance.
    ctx.setLineDash([]);
    ctx.fillStyle = palette.tone(this.game.shooter.current);
    for (const point of aim.rebounds) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Jewel world: the touched ball would turn into the mix; show its colour.
    const end = path[path.length - 1];
    if (!magnet && end && this.game.setup.alchemy) {
      const target = this.game.aimTarget();
      const mixed = target ? mix(this.game.shooter.current, target.ball.tone) : null;
      if (mixed !== null) {
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = palette.tone(mixed);
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(end.x, end.y, radius * (1.3 + 0.08 * Math.sin(time * 6)), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Armed magnet: a pulsing ring around the ball it would pull.
    if (magnet && end) {
      ctx.strokeStyle = palette.tone(3);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(end.x, end.y, radius * (1.35 + 0.12 * Math.sin(time * 8)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Volcano world: each fork's unused branch, dashed; the shortcut glowing
   * like lava while the chain is sent that way; a lever on each switch.
   */
  private drawSwitches(radius: number, time: number): void {
    const switches = this.game.switches();
    if (switches.length === 0) return;
    const { ctx, palette } = this;
    const line = (points: readonly Vec2[]) => {
      ctx.beginPath();
      points.forEach((point, i) =>
        i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
      );
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const view of switches) {
      const fork = this.game.setup.chains[view.chain]?.route?.forks[view.fork];
      if (!fork) continue;
      // The branch not taken: a faint, dashed track.
      line(view.branch === 'short' ? fork.long : fork.short);
      ctx.setLineDash([radius, radius * 0.8]);
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = palette.trackEdge;
      ctx.lineWidth = radius * 2 + 4;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (view.branch === 'short') {
        // Molten shortcut: balls exploded here are worth double.
        line(fork.short);
        ctx.globalAlpha = 0.35 + 0.12 * Math.sin(time * 4 + view.fork);
        ctx.strokeStyle = palette.tone(1);
        ctx.lineWidth = radius * 2 + 10;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // Levers, on top of everything on the track.
    for (const view of switches) {
      const fork = this.game.setup.chains[view.chain]?.route?.forks[view.fork];
      if (!fork) continue;
      const branch = view.branch === 'short' ? fork.short : fork.long;
      const ahead = branch[Math.min(3, branch.length - 1)]!.sub(branch[0]!).normalize();
      const { x, y } = view.position;
      ctx.globalAlpha = view.locked ? 0.45 : 1;
      ctx.beginPath();
      ctx.arc(x, y, SWITCH_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = palette.shooter;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = view.branch === 'short' ? palette.tone(1) : palette.tone(3);
      ctx.stroke();
      // Arrow towards the branch taken.
      ctx.beginPath();
      ctx.moveTo(x - ahead.x * 14, y - ahead.y * 14);
      ctx.lineTo(x + ahead.x * 16, y + ahead.y * 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + ahead.x * 20, y + ahead.y * 20);
      ctx.lineTo(x + ahead.x * 6 - ahead.y * 10, y + ahead.y * 6 + ahead.x * 10);
      ctx.lineTo(x + ahead.x * 6 + ahead.y * 10, y + ahead.y * 6 - ahead.x * 10);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /** Mirrors as glowing neon tubes; prisms as lit glass. */
  private drawReflectors(time: number): void {
    const { ctx, palette } = this;
    const items = this.game.reflectors.items;
    if (items.length === 0) return;
    const glow = palette.tone(3);
    const prismTone = palette.tone(5);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const item of items) {
      const colour = item.kind === 'wall' ? glow : prismTone;
      ctx.beginPath();
      item.segments.forEach((segment, i) => {
        if (i === 0) ctx.moveTo(segment.a.x, segment.a.y);
        ctx.lineTo(segment.b.x, segment.b.y);
      });
      if (item.kind === 'prism') {
        ctx.closePath();
        ctx.globalAlpha = 0.18 + 0.06 * Math.sin(time * 3);
        ctx.fillStyle = colour;
        ctx.fill();
      }
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 16;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = palette.dark ? '#ffffff' : colour;
      ctx.globalAlpha = palette.dark ? 0.85 : 1;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
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
