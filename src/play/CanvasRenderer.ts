import type { Chain } from '@/engine/chain/Chain';
import type { Game } from '@/engine/Game';
import { mix } from '@/engine/chain/Alchemy';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallSprites } from './BallSprites';
import { BlackHole } from './BlackHole';
import {
  contentBounds,
  NO_INSETS,
  settleBoard,
  type BoardView,
  type Content,
  type Insets,
} from './BoardView';
import { withAlpha } from './themes/WorldTheme';
import { Ambience } from './themes/Ambience';
import { WeatherLayer } from './WeatherLayer';
import {
  afterglow,
  gathering,
  moteAt,
  novaAge,
  novaCore,
  shockRings,
  stardust,
  surge,
  SURGE,
  type Mote,
} from './effects/Victory';
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
  /**
   * Size of the drawing surface in CSS pixels, the device pixel ratio, and the
   * room the interface takes along each edge (the level is fitted beside it).
   */
  resize(width: number, height: number, pixelRatio: number, insets?: Insets): void;
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
  /** The player asked for less motion: the backdrop stays still. */
  readonly reducedMotion: boolean;
  /**
   * After a win (effects/Victory): the hole the light runs to, real seconds
   * since the win, and whether to keep it still (reduced motion).
   */
  readonly victory: {
    readonly at: Vec2;
    readonly elapsed: number;
    readonly reducedMotion: boolean;
  } | null;
  /** The magnet is armed: the next "shot" pulls the aimed ball instead. */
  readonly magnetArmed: boolean;
  /** Seconds since the session started, for pulsing details. */
  readonly time: number;
  /** White flash of the Colossus when it is hit, from 1 down to 0. */
  readonly colossusFlash: number;
  /** Puzzle hint (§ 3.7): the ball to shoot at, circled; null without. */
  readonly hint?: Vec2 | null;
  /** First level: a hand drags from the shooter to the chain and lets go; null without. */
  readonly tutorial?: { readonly from: Vec2; readonly to: Vec2; readonly time: number } | null;
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
  /** The part of the board fitted to the screen: the level, without the board's margins. */
  private readonly content: Content;
  /** Where the board is drawn; kept through small changes of the screen. */
  private view: BoardView | null = null;
  /** Track shapes, per path: flipping a switch gives the chain a new path. */
  private readonly tracks = new Map<Path, Path2D>();
  private background: HTMLCanvasElement | null = null;
  private readonly trails = new Map<number, Vec2[]>();
  private time = 0;
  /** Singularity world: the black hole and the shooter's ring. */
  private readonly blackHole: BlackHole | null;
  /** Hazards: weather, falling balls, arrhythmia (§ 3.9). */
  private readonly weather: WeatherLayer;
  private readonly ambience: Ambience;
  /**
   * The tracks' fixed layers (halo, rim, groove), painted once per size and
   * per route: wide strokes along a whole track are costly every frame on a
   * modest device. Only the flowing thread is drawn live.
   */
  private trackLayer: HTMLCanvasElement | null = null;
  /** Glows by colour (holes, the shooter's aura), painted once. */
  private readonly glows = new Map<string, HTMLCanvasElement>();
  private trackPaths: readonly unknown[] = [];
  /** After a win: the tracks full of light, painted once for the afterglow. */
  private litLayer: HTMLCanvasElement | null = null;
  /** After a win: the stardust of the supernova. */
  private dust: Mote[] | null = null;

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
    this.ambience = new Ambience(look.theme.ambience);
    this.content = contentBounds(game.setup);
  }

  resize(width: number, height: number, pixelRatio: number, insets: Insets = NO_INSETS): void {
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
    this.view = settleBoard(this.view, this.content, width, height, insets);
    this.scale = this.view.scale;
    this.offsetX = this.view.offsetX;
    this.offsetY = this.view.offsetY;
    // Read by the end-to-end tests, which aim at board points.
    Object.assign(this.canvas.dataset, {
      scale: String(this.scale),
      offsetX: String(this.offsetX),
      offsetY: String(this.offsetY),
      boardWidth: String(this.game.setup.board.width),
      boardHeight: String(this.game.setup.board.height),
    });
    this.rebuildSprites();
    this.repaintBackground();
    this.trackLayer = null;
    this.litLayer = null;
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    this.rebuildSprites();
    this.repaintBackground();
    this.trackLayer = null;
  }

  /** The tracks' fixed layers, repainted when the size, the colours or a route (switch) change. */
  private tracksLayer(): HTMLCanvasElement | null {
    const paths = this.game.chains.map((chain) => chain.path);
    const same =
      this.trackLayer !== null &&
      paths.length === this.trackPaths.length &&
      paths.every((path, i) => path === this.trackPaths[i]);
    if (same) return this.trackLayer;
    const layer = this.trackLayer ?? document.createElement('canvas');
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, layer.width, layer.height);
    const k = this.scale * this.pixelRatio;
    ctx.setTransform(k, 0, 0, k, this.offsetX * this.pixelRatio, this.offsetY * this.pixelRatio);
    const radius = this.game.setup.chain.ballRadius;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const chain of this.game.chains) {
      const track = this.trackOf(chain);
      ctx.strokeStyle = this.palette.trackEdge;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = radius * 2 + 34;
      ctx.stroke(track);
      ctx.globalAlpha = 1;
      ctx.lineWidth = radius * 2 + 12;
      ctx.stroke(track);
      ctx.strokeStyle = this.palette.track;
      ctx.lineWidth = radius * 2 + 4;
      ctx.stroke(track);
    }
    this.trackLayer = layer;
    this.trackPaths = paths;
    return layer;
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
    if (!scene.reducedMotion) {
      this.ambience.draw(ctx, this.canvas.width, this.canvas.height, palette, scene.time);
    }
    const tracks = this.tracksLayer();
    if (tracks) {
      const shaken = scene.destruction.shakeOffset;
      ctx.drawImage(
        tracks,
        shaken.x * this.scale * this.pixelRatio,
        shaken.y * this.scale * this.pixelRatio,
      );
    }
    const k = this.scale * this.pixelRatio;
    const shake = scene.destruction.shakeOffset;
    ctx.transform(
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
    for (const chain of game.chains) this.drawTrack(chain);
    if (scene.victory) this.drawSurge(scene.victory, radius);
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
    if (scene.hint) this.drawHint(scene.hint, radius, scene.time, scene.reducedMotion);
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
    if (scene.tutorial) this.drawTutorial(scene.tutorial, scene.reducedMotion);
    if (scene.victory) this.drawNova(scene.victory, radius);
    const flash = scene.destruction.flash;
    if (flash.amount > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = flash.amount;
      ctx.fillStyle = flash.colour;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * After a win: light runs along every track from its entrance to the hole,
   * leaving the groove lit; then the light fades (from a layer painted once:
   * wide strokes along whole tracks are costly every frame on a modest phone).
   * With reduced motion, the tracks simply light up and fade.
   */
  private drawSurge(victory: NonNullable<Scene['victory']>, radius: number): void {
    const { ctx, palette } = this;
    const still = victory.reducedMotion;
    const glow = afterglow(victory.elapsed) * (still ? Math.min(1, victory.elapsed / SURGE) : 1);
    if (glow <= 0.01) return;
    const lighten = palette.dark ? 'lighter' : 'source-over';
    if (still || victory.elapsed >= SURGE) {
      const layer = this.litTracks(radius);
      if (!layer) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = lighten;
      ctx.globalAlpha = glow;
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
      return;
    }
    const progress = surge(victory.elapsed);
    ctx.save();
    ctx.globalCompositeOperation = lighten;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const chain of this.game.chains) {
      const track = this.trackOf(chain);
      const length = chain.path.length;
      const lit = progress * length;
      // Behind the light, the groove stays lit…
      ctx.setLineDash([lit, length * 2]);
      ctx.lineDashOffset = 0;
      this.strokeLit(ctx, track, radius);
      // …and the light itself: a white-hot dash in a halo.
      const head = Math.min(lit, radius * 9);
      ctx.setLineDash([head, length * 2]);
      ctx.lineDashOffset = head - lit;
      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = radius * 3.2;
      ctx.stroke(track);
      ctx.strokeStyle = palette.dark ? '#ffffff' : palette.accent;
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = radius * 0.9;
      ctx.stroke(track);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /** A lit groove: a wide soft glow and a bright thread. */
  private strokeLit(ctx: CanvasRenderingContext2D, track: Path2D, radius: number): void {
    ctx.strokeStyle = this.palette.accent;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = radius * 2 + 16;
    ctx.stroke(track);
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = radius * 0.7;
    ctx.stroke(track);
    ctx.globalAlpha = 1;
  }

  /** Every track full of light, painted once (device pixels, the whole canvas). */
  private litTracks(radius: number): HTMLCanvasElement | null {
    if (this.litLayer) return this.litLayer;
    const layer = document.createElement('canvas');
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext('2d');
    if (!ctx) return null;
    const k = this.scale * this.pixelRatio;
    ctx.setTransform(k, 0, 0, k, this.offsetX * this.pixelRatio, this.offsetY * this.pixelRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const chain of this.game.chains) this.strokeLit(ctx, this.trackOf(chain), radius);
    this.litLayer = layer;
    return layer;
  }

  /**
   * After a win: the hole gathers the light, then bursts: a white-hot core,
   * shock rings running off the screen, stardust drifting up. With reduced
   * motion, a glow that swells and fades in place.
   */
  private drawNova(victory: NonNullable<Scene['victory']>, radius: number): void {
    const { ctx, palette } = this;
    const { at } = victory;
    const bright = palette.dark ? '#ffffff' : palette.accent;
    ctx.save();
    ctx.globalCompositeOperation = palette.dark ? 'lighter' : 'source-over';
    const gather = gathering(victory.elapsed);
    if (gather > 0) this.drawGlow(at, radius * (1.5 + 3 * gather), gather);
    const age = novaAge(victory.elapsed);
    if (age !== null) {
      if (victory.reducedMotion) {
        this.drawGlow(at, radius * 6, Math.max(0, 1 - age / 0.9));
      } else {
        const core = novaCore(age);
        if (core) this.drawGlow(at, radius * core.size, core.alpha);
        const reach = this.reachFrom(at);
        // Neon: a white ring with a cyan glow, then a soft rose wave and a violet echo.
        const colours = [bright, palette.tone(5), palette.tone(4)];
        for (const ring of shockRings(age, reach)) {
          ctx.globalAlpha = ring.alpha * (ring.layer === 1 ? 0.3 : 0.9);
          ctx.strokeStyle = colours[ring.layer] ?? bright;
          ctx.lineWidth = ring.width;
          ctx.beginPath();
          ctx.arc(at.x, at.y, ring.radius, 0, Math.PI * 2);
          ctx.stroke();
          if (ring.layer === 0) {
            // A cyan glow just inside the leading ring.
            ctx.globalAlpha = ring.alpha * 0.4;
            ctx.strokeStyle = palette.tone(3);
            ctx.lineWidth = ring.width * 3;
            ctx.beginPath();
            ctx.arc(at.x, at.y, Math.max(0, ring.radius - ring.width * 2.5), 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        this.dust ??= stardust(42, reach * 0.4, seededRandom(at.x * 31 + at.y * 17));
        for (const mote of this.dust) {
          const speck = moteAt(mote, age);
          if (!speck) continue;
          ctx.globalAlpha = speck.alpha;
          ctx.fillStyle = mote.tone % 2 === 0 ? bright : palette.tone(mote.tone);
          ctx.beginPath();
          ctx.arc(at.x + speck.dx, at.y + speck.dy, mote.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /** A soft round glow: white at the heart, golden at the edge. */
  private drawGlow(at: Vec2, size: number, alpha: number): void {
    if (alpha <= 0 || size <= 0) return;
    const { ctx, palette } = this;
    const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, size);
    glow.addColorStop(0, palette.dark ? '#ffffff' : palette.accent);
    glow.addColorStop(0.35, palette.accent);
    glow.addColorStop(1, withAlpha(palette.accent, 0));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(at.x, at.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Board units from a point to the farthest corner of the screen. */
  private reachFrom(at: Vec2): number {
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    const corners: readonly (readonly [number, number])[] = [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ];
    return Math.max(...corners.map(([x, y]) => this.toBoard(x, y).distanceTo(at)));
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

  /**
   * Over the track's fixed layers (`tracksLayer`): a thread of light flowing
   * towards the hole, so the chain's way reads at a glance.
   */
  private drawTrack(chain: Chain): void {
    const { ctx, palette } = this;
    const path = chain.path;
    // Small points placed along the path, one fill: far cheaper than a dashed stroke.
    const spacing = 24;
    const shift = (this.time * 40) % spacing;
    ctx.beginPath();
    for (let s = shift; s < path.length; s += spacing) {
      const point = path.pointAt(s);
      ctx.rect(point.x - 1.5, point.y - 1.5, 3, 3);
    }
    ctx.fillStyle = palette.trackEdge;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** A soft round glow of `colour`, painted once and reused (gradients cost every frame). */
  private glowOf(colour: string): HTMLCanvasElement {
    let glow = this.glows.get(colour);
    if (!glow) {
      glow = document.createElement('canvas');
      glow.width = glow.height = 128;
      const ctx = glow.getContext('2d');
      if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, colour);
        gradient.addColorStop(0.3, colour);
        gradient.addColorStop(1, withAlpha(colour, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
      }
      this.glows.set(colour, glow);
    }
    return glow;
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
    // The entrance: a small portal the chain pours out of.
    const portal = ctx.createRadialGradient(start.x, start.y, 0, start.x, start.y, radius * 2);
    portal.addColorStop(0, palette.hole);
    portal.addColorStop(0.55, palette.hole);
    portal.addColorStop(0.7, palette.trackEdge);
    portal.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = portal;
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius * 2, 0, Math.PI * 2);
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

  /**
   * A hole: a small black hole with a turning disc of light, gold at rest,
   * pulsing in `colour` as `danger` (0 to 1) rises.
   */
  private drawHole(at: Vec2, radius: number, time: number, danger: number, colour: string): void {
    const { ctx, palette } = this;
    const tint = danger > 0 ? colour : palette.accent;
    const pulse = 1 + 0.25 * danger * Math.sin(time * 10);
    const reach = radius * 3.2 * pulse;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35 + 0.45 * danger;
    ctx.drawImage(this.glowOf(tint), -reach, -reach, reach * 2, reach * 2);
    // Two dashed rings orbit the hole, faster as danger rises.
    ctx.strokeStyle = tint;
    ctx.lineWidth = 2.5;
    for (let ring = 0; ring < 2; ring++) {
      const r = radius * (1.75 + ring * 0.55);
      ctx.globalAlpha = 0.55 - ring * 0.2;
      ctx.setLineDash([r * 0.8, r * 0.45]);
      ctx.lineDashOffset = -time * r * (1.2 + danger * 2) * (ring === 0 ? 1 : -0.7);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.45);
    core.addColorStop(0, palette.hole);
    core.addColorStop(0.78, palette.hole);
    core.addColorStop(0.9, tint);
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

  /**
   * The tutorial gesture, a picture rather than a sentence: a hand presses on
   * the shooter, drags to the chain drawing the aim, and lets go (a ripple).
   * With reduced motion, the hand rests on the chain, the path dotted.
   */
  private drawTutorial(tutorial: NonNullable<Scene['tutorial']>, still: boolean): void {
    const { ctx, palette } = this;
    const { from, to } = tutorial;
    const t = still ? 0.75 : (tutorial.time % 2.6) / 2.6;
    const ease = (x: number) => x * x * (3 - 2 * x);
    const drag = ease(Math.min(1, Math.max(0, (t - 0.18) / 0.5)));
    const at = from.lerp(to, drag);
    const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : t < 0.06 ? t / 0.06 : 1;
    const pressed = t > 0.1 && t < 0.72;
    ctx.save();
    ctx.globalAlpha = fade;
    // The aim being drawn behind the finger.
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 4;
    ctx.setLineDash([4, 14]);
    ctx.lineCap = 'round';
    ctx.globalAlpha = fade * 0.7;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(at.x, at.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Ripples: the press at the start, the release at the end.
    const ripple = (centre: Vec2, progress: number) => {
      if (progress <= 0 || progress >= 1) return;
      ctx.globalAlpha = fade * (1 - progress);
      ctx.lineWidth = 4;
      ctx.strokeStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, 18 + progress * 46, 0, Math.PI * 2);
      ctx.stroke();
    };
    ripple(from, (t - 0.08) / 0.22);
    ripple(to, (t - 0.72) / 0.22);
    if (still) ripple(to, 0.4);
    ctx.globalAlpha = fade;
    ctx.translate(at.x, at.y);
    ctx.rotate(-0.35);
    const scale = pressed ? 0.92 : 1.05;
    ctx.scale(scale, scale);
    // A hand drawn from rounded shapes, the fingertip on the point.
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = palette.board;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    const hand = new Path2D();
    hand.roundRect(-10, 0, 20, 52, 10);
    hand.roundRect(-10, 30, 56, 50, 16);
    hand.roundRect(10, 22, 16, 30, 8);
    hand.roundRect(26, 26, 16, 28, 8);
    hand.roundRect(-28, 42, 20, 30, 10);
    ctx.fill(hand);
    ctx.shadowColor = 'transparent';
    // Stroke, then fill again: the outline stays outside, the seams between parts vanish.
    ctx.stroke(hand);
    ctx.fill(hand);
    ctx.restore();
  }

  /** The hint's ball: two rings, the outer one breathing (still with reduced motion). */
  private drawHint(at: Vec2, radius: number, time: number, still: boolean): void {
    const { ctx, palette } = this;
    const pulse = still ? 0 : 0.5 + 0.5 * Math.sin(time * 6);
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * 1.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35 + 0.4 * (1 - pulse);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * (1.8 + 0.5 * pulse), 0, Math.PI * 2);
    ctx.stroke();
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
    // A glow of the loaded colour under the shooter: the colour reads from afar.
    const aura = SHOOTER_RADIUS * 2.2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28 + 0.08 * Math.sin(this.time * 3);
    ctx.drawImage(this.glowOf(palette.tone(shooter.current)), -aura, -aura, aura * 2, aura * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

/** A small seeded random source: the same stardust for the same win. */
function seededRandom(seed: number): () => number {
  let state = Math.floor(Math.abs(seed)) >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
