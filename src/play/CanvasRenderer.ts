import type { Chain } from '@/engine/chain/Chain';
import type { Game } from '@/engine/Game';
import { mix } from '@/engine/chain/Alchemy';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallSprites } from './BallSprites';
import { BlackHole } from './BlackHole';
import { WeatherLayer } from './WeatherLayer';
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
  /** Aim assistance: where the shot lands and the group it makes; null without. */
  readonly preview: AimPreview | null;
  /** Aim assistance on: the whole aim line; off: a short guide at the barrel. */
  readonly assist: boolean;
  /** How charged the held shot is, from 0 to 1 (1 = a powered shot). */
  readonly charge: number;
  /** Recoil of the shooter after a shot, from 1 down to 0. */
  readonly recoil: number;
  /** The magnet is armed: the next "shot" pulls the aimed ball instead. */
  readonly magnetArmed: boolean;
  /** Seconds since the session started, for pulsing details. */
  readonly time: number;
  /** White flash of the Colossus when it is hit, from 1 down to 0. */
  readonly colossusFlash: number;
}

/** Length of the aim guide without aim assistance, in board units. */
const GUIDE = 160;

/** Where the loaded ball would land, and the balls that would explode with it. */
export interface AimPreview {
  readonly position: Vec2;
  readonly group: readonly Vec2[];
  /** Balls of the chain reaction that would follow (Œil stellaire, rank 3). */
  readonly reaction: readonly Vec2[];
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
  /** Hazards: weather, falling balls, arrhythmia (§ 3.9). */
  private readonly weather: WeatherLayer;

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
    this.weather = new WeatherLayer(game);
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
    this.weather.drawUnder(
      ctx,
      palette,
      game.chains.map((chain) => this.trackOf(chain)),
      radius,
    );
    this.drawSwitches(radius, scene.time);
    this.drawReflectors(scene.time);
    if (scene.aim) this.drawAim(scene, scene.aim, radius);
    for (const chain of game.chains) this.drawChain(chain, scene.motion, radius);
    this.weather.drawOver(
      ctx,
      palette,
      (chain, index) => scene.motion.positionOf(chain, chain.balls[index]!),
      radius,
      scene.time,
    );
    if (scene.preview && scene.aim) this.drawPreview(scene.preview, radius, scene.time);
    game.chains.forEach((chain) => this.drawColossus(chain, scene));
    this.drawTrails(radius);
    for (const projectile of game.projectiles) {
      this.drawBall(projectile.tone, projectile.position, radius);
      if (projectile.special) this.drawSpecial(projectile.special, projectile.position, radius);
    }
    this.drawFragments(radius, scene.time);
    // Entrances and holes cover the balls coming out of and going into them.
    for (const chain of game.chains) this.drawEnds(chain, radius, scene.time);
    this.blackHole?.draw(ctx, palette, scene.time, this.danger());
    this.drawTempo(radius);
    this.drawRival(radius);
    this.drawShooter(radius, scene);
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
    // Puzzle mode: the chain never moves, so neither entrance nor hole.
    if (this.game.setup.puzzle) return;
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
    this.drawHole(chain.path.end, radius, time, danger, palette.danger);
    if (this.game.rival) {
      // Duel: the start is the rival's hole; it glows as the tail is pushed towards it.
      const tail = chain.tail ?? chain.path.length;
      const near = Math.max(0, 1 - tail / (chain.path.length * 0.25));
      this.drawHole(start, radius, time, near, palette.tone(2));
    }
  }

  /** A hole, its glow pulsing in `colour` as `danger` (0 to 1) rises. */
  private drawHole(at: Vec2, radius: number, time: number, danger: number, colour: string): void {
    const { ctx, palette } = this;
    const glow = radius * (1.7 + 0.25 * danger * Math.sin(time * 10));
    ctx.beginPath();
    ctx.arc(at.x, at.y, glow, 0, Math.PI * 2);
    ctx.fillStyle = danger > 0 ? colour : palette.accent;
    ctx.globalAlpha = 0.25 + 0.5 * danger;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 1.25, 0, Math.PI * 2);
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

  private drawAim(scene: Scene, aim: AimLine, radius: number): void {
    const { ctx, palette } = this;
    const { magnetArmed: magnet, time } = scene;
    const powered = scene.charge >= 1 && !magnet;
    const from = this.game.shooter.position;
    const start = from.add(Vec2.fromAngle(this.game.shooter.angle, SHOOTER_RADIUS + radius));
    // Curve samples still inside the barrel would make the line start backwards.
    const barrel = SHOOTER_RADIUS + radius;
    const points = aim.points
      .slice(1)
      .filter((point, i, rest) => i === rest.length - 1 || point.distanceTo(from) > barrel);
    const path = scene.assist || magnet ? [start, ...points] : guide([start, ...points], GUIDE);
    ctx.save();
    ctx.setLineDash(magnet ? [18, 10] : powered ? [] : [4, 18]);
    ctx.lineDashOffset = magnet ? time * 60 : 0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = magnet ? 8 : powered ? 9 : 6;
    ctx.strokeStyle = magnet ? palette.tone(3) : palette.tone(this.game.shooter.current);
    ctx.globalAlpha = magnet ? 0.85 : powered ? 0.75 + 0.2 * Math.sin(time * 18) : 0.6;
    ctx.beginPath();
    path.forEach((point, i) =>
      i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
    );
    ctx.stroke();
    if (!scene.assist && !magnet) {
      ctx.restore();
      return;
    }
    // A dot on each rebound, so a bank shot reads at a glance.
    ctx.setLineDash([]);
    ctx.fillStyle = palette.tone(this.game.shooter.current);
    for (const point of aim.rebounds) {
      if (!scene.assist) break;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Jewel world: the touched ball would turn into the mix; show its colour.
    const end = aim.points[aim.points.length - 1];
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

  /**
   * Rhythm mode: a ring closes in on the shooter as the next beat comes, and
   * flashes while a shot would be on the beat.
   */
  private drawTempo(radius: number): void {
    const tempo = this.game.tempo;
    if (!tempo || this.game.state !== 'playing') return;
    const { ctx, palette } = this;
    const { x, y } = this.game.shooter.position;
    const phase = tempo.phase(this.game.elapsed);
    const onBeat = tempo.onBeat(this.game.elapsed);
    ctx.save();
    ctx.lineWidth = onBeat ? 8 : 4;
    ctx.strokeStyle = onBeat ? palette.tone(3) : palette.accent;
    ctx.globalAlpha = onBeat ? 0.95 : 0.25 + 0.5 * phase;
    ctx.beginPath();
    ctx.arc(x, y, SHOOTER_RADIUS + radius + 70 * (1 - phase), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Duel mode: the rival's shooter, the player's skin ringed in the danger colour. */
  private drawRival(radius: number): void {
    const rival = this.game.rival;
    if (!rival) return;
    const { ctx, palette } = this;
    ctx.save();
    ctx.translate(rival.position.x, rival.position.y);
    this.look.shooter.draw(ctx, palette, rival.angle, radius, this.time);
    ctx.lineWidth = 6;
    ctx.strokeStyle = palette.danger;
    ctx.beginPath();
    ctx.arc(0, 0, SHOOTER_RADIUS * 0.75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    this.drawBall(
      rival.current,
      rival.position.add(Vec2.fromAngle(rival.angle, SHOOTER_RADIUS)),
      radius,
    );
  }

  /**
   * Aim assistance: a ghost of the loaded ball in the slot it will take, and
   * a ring on every ball that would explode with it, with the group's size.
   */
  private drawPreview(preview: AimPreview, radius: number, time: number): void {
    const { ctx, palette } = this;
    const tone = this.game.shooter.current;
    const { position } = preview;
    ctx.save();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.55;
    this.drawBall(tone, position, radius * 0.8);
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.tone(tone);
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    if (preview.group.length > 0) {
      const pulse = 1.15 + 0.08 * Math.sin(time * 9);
      ctx.lineWidth = 4;
      ctx.strokeStyle = palette.accent;
      for (const ball of preview.group) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = `800 ${radius * 1.1}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6;
      ctx.strokeStyle = palette.board;
      ctx.fillStyle = palette.accent;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = palette.tone(5);
      ctx.lineWidth = 3;
      for (const ball of preview.reaction) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, radius * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineWidth = 6;
      ctx.strokeStyle = palette.board;
      const label = `×${preview.group.length + 1}`;
      const at = position.add(new Vec2(0, -radius * 2));
      ctx.strokeText(label, at.x, at.y);
      ctx.fillText(label, at.x, at.y);
    }
    ctx.restore();
  }

  /** A rainbow ball (rainbow ring) or a Nova bomb (white-hot, pulsing). */
  private drawSpecial(special: 'wild' | 'bomb', at: Vec2, radius: number): void {
    const { ctx, palette } = this;
    ctx.save();
    ctx.lineWidth = 5;
    if (special === 'wild') {
      for (let k = 0; k < 6; k++) {
        ctx.strokeStyle = palette.tone(k);
        ctx.beginPath();
        const start = this.time * 3 + (k / 6) * Math.PI * 2;
        ctx.arc(at.x, at.y, radius * 1.05, start, start + Math.PI / 3);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.time * 14);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = palette.danger;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(at.x, at.y, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Star fragments: shooting stars with a fading tail, twinkling. */
  private drawFragments(radius: number, time: number): void {
    const fragments = this.game.fragments;
    if (fragments.length === 0) return;
    const { ctx, palette } = this;
    ctx.save();
    ctx.lineCap = 'round';
    for (const fragment of fragments) {
      const { x, y } = fragment.position;
      const back = fragment.velocity.normalize().scale(-radius * 4);
      const tail = ctx.createLinearGradient(x, y, x + back.x, y + back.y);
      tail.addColorStop(0, palette.tone(3));
      tail.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = tail;
      ctx.lineWidth = radius * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + back.x, y + back.y);
      ctx.stroke();
      // A five-pointed star that turns and twinkles.
      const size = radius * (0.75 + 0.15 * Math.sin(time * 12 + fragment.id));
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = palette.tone(3);
      ctx.shadowBlur = 18;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const angle = time * 2 + (k / 10) * Math.PI * 2;
        const r = k % 2 === 0 ? size : size * 0.45;
        ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  private drawShooter(radius: number, scene: Scene): void {
    const { ctx, palette } = this;
    const { shooter } = this.game;
    // The barrel kicks back after a shot.
    const kick = Vec2.fromAngle(shooter.angle, -12 * scene.recoil * scene.recoil);
    ctx.save();
    ctx.translate(shooter.position.x + kick.x, shooter.position.y + kick.y);
    this.look.shooter.draw(ctx, palette, shooter.angle, radius, this.time);
    if (scene.charge > 0) {
      // The charge fills a ring around the shooter; full, it throbs.
      const full = scene.charge >= 1;
      ctx.lineCap = 'round';
      ctx.lineWidth = full ? 8 : 6;
      ctx.strokeStyle = palette.tone(shooter.current);
      ctx.globalAlpha = full ? 0.7 + 0.3 * Math.sin(this.time * 20) : 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, SHOOTER_RADIUS + 10, -Math.PI / 2, -Math.PI / 2 + scene.charge * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Loaded ball in the barrel, next ball in the centre.
    const barrel = shooter.position.add(Vec2.fromAngle(shooter.angle, SHOOTER_RADIUS));
    this.drawBall(shooter.current, barrel, radius);
    const special = this.game.loadedSpecial;
    if (special) this.drawSpecial(special, barrel, radius);
    this.drawBall(shooter.next, shooter.position, radius * 0.6);
  }
}

/** The first `length` units of a polyline. */
function guide(points: readonly Vec2[], length: number): Vec2[] {
  const kept: Vec2[] = [];
  let left = length;
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!;
    const previous = points[i - 1];
    if (!previous) {
      kept.push(point);
      continue;
    }
    const step = point.distanceTo(previous);
    if (step >= left) {
      kept.push(previous.lerp(point, left / step));
      break;
    }
    kept.push(point);
    left -= step;
  }
  return kept;
}
