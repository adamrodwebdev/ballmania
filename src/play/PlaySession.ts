import { shallowReactive } from 'vue';
import type { Tone } from '@/engine/chain/Ball';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type GameState } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import { BallMotion } from './BallMotion';
import { CanvasRenderer, type Renderer } from './CanvasRenderer';
import { Effects } from './Effects';
import { GameLoop } from './GameLoop';
import type { Palette } from './Palette';

/** What the interface shows around the board; updated on events, not every frame. */
export interface HudState {
  score: number;
  streak: number;
  state: GameState;
  paused: boolean;
  /** Set a moment after the end, once the last animation has played. */
  over: 'won' | 'lost' | null;
  current: Tone;
  next: Tone;
  bestDepth: number;
  /** Latest chain reaction of depth 2 or more, for the screen reader announcement. */
  reaction: { readonly depth: number; readonly serial: number } | null;
}

/** Seconds between the end of a game and the result dialog. */
const RESULT_DELAY = 1.2;
/** Speed at which a lost chain is swallowed by the hole, in units per second. */
const DRAIN_SPEED = 1400;
/** Longest aim line, in board units. */
const AIM_REACH = 1600;
const AIM_STEP = 12;

/**
 * A level being played: owns the game, the loop, the renderer and the visual
 * motion, and turns player commands into game commands. Created by the game
 * screen, which only displays `hud`.
 */
export class PlaySession {
  readonly hud: HudState;
  private game: Game;
  private renderer: Renderer;
  private motion = new BallMotion();
  private effects = new Effects();
  private readonly loop: GameLoop;
  private time = 0;
  private overIn: number | null = null;
  private turning = 0;
  private reactions = 0;
  private size = { width: 1, height: 1, pixelRatio: 1 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly level: LevelDefinition,
    private palette: Palette,
    private readonly seed: () => string = () => `${level.id}:${Date.now()}`,
  ) {
    this.game = this.createGame();
    this.renderer = new CanvasRenderer(canvas, this.game, palette);
    this.hud = shallowReactive(this.initialHud());
    this.loop = new GameLoop((dt) => this.frame(dt));
  }

  start(): void {
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.game.events.clear();
  }

  pause(): void {
    if (this.hud.state === 'playing') this.hud.paused = true;
  }

  resume(): void {
    this.hud.paused = false;
  }

  restart(): void {
    this.game.events.clear();
    this.game = this.createGame();
    this.renderer = new CanvasRenderer(this.canvas, this.game, this.palette);
    this.renderer.resize(this.size.width, this.size.height, this.size.pixelRatio);
    this.motion = new BallMotion();
    this.effects = new Effects();
    this.overIn = null;
    Object.assign(this.hud, this.initialHud());
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.size = { width, height, pixelRatio };
    this.renderer.resize(width, height, pixelRatio);
    this.render();
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    this.renderer.setPalette(palette);
    this.render();
  }

  /** Aims at a point given in CSS pixels relative to the canvas. */
  aimAt(x: number, y: number): void {
    if (this.acceptsCommands) this.game.aimAt(this.renderer.toBoard(x, y));
  }

  /** True if the point (CSS pixels relative to the canvas) is on the shooter. */
  isOnShooter(x: number, y: number): boolean {
    return this.renderer.toBoard(x, y).distanceTo(this.game.shooter.position) < 70;
  }

  fire(): void {
    if (this.acceptsCommands) this.game.fire();
  }

  swap(): void {
    if (!this.acceptsCommands) return;
    this.game.swap();
    this.syncTones();
  }

  /** Keyboard aiming: -1, 0 or 1 turn direction, applied every frame. */
  turn(direction: number): void {
    this.turning = direction;
  }

  private get acceptsCommands(): boolean {
    return !this.hud.paused && this.hud.state === 'playing';
  }

  private createGame(): Game {
    const game = new Game(toLevelSetup(this.level), SeededRandom.fromString(this.seed()));
    game.events.on('inserted', ({ ball, from }) => this.motion.land(ball, from));
    game.events.on('exploded', (event) => {
      this.effects.explode(
        event.positions,
        event.balls.map((ball) => ball.tone),
        event.points,
        event.depth,
      );
      this.hud.score = game.score;
      this.hud.streak = event.streak;
      if (event.depth > 1) this.hud.reaction = { depth: event.depth, serial: ++this.reactions };
    });
    game.events.on('missed', () => (this.hud.streak = 0));
    game.events.on('ended', ({ outcome }) => {
      this.hud.state = outcome;
      this.hud.score = game.score;
      this.hud.bestDepth = game.bestDepth;
      this.overIn = RESULT_DELAY;
    });
    return game;
  }

  private initialHud(): HudState {
    return {
      score: 0,
      streak: 0,
      state: 'playing',
      paused: false,
      over: null,
      current: this.game.shooter.current,
      next: this.game.shooter.next,
      bestDepth: 0,
      reaction: null,
    };
  }

  private frame(dt: number): void {
    if (this.hud.paused) return;
    this.time += dt;
    if (this.turning !== 0 && this.acceptsCommands) {
      this.game.shooter.aim(this.game.shooter.angle + this.turning * 2.4 * dt);
    }
    this.game.update(dt);
    if (this.game.state === 'lost') this.motion.drain(DRAIN_SPEED, dt);
    this.motion.update(this.game.chains, dt);
    this.effects.update(dt);
    this.syncTones();
    if (this.overIn !== null) {
      this.overIn -= dt;
      if (this.overIn <= 0) {
        this.overIn = null;
        this.hud.over = this.game.state === 'won' ? 'won' : 'lost';
      }
    }
    this.render();
  }

  private render(): void {
    this.renderer.draw({
      game: this.game,
      motion: this.motion,
      effects: this.effects,
      aimEnd: this.game.state === 'playing' ? this.aimEnd() : null,
      time: this.time,
    });
  }

  private syncTones(): void {
    const { current, next } = this.game.shooter;
    if (this.hud.current !== current) this.hud.current = current;
    if (this.hud.next !== next) this.hud.next = next;
  }

  /** First point along the aim where the shot would touch a ball, or the end of its reach. */
  private aimEnd(): Vec2 {
    const { shooter, chains } = this.game;
    const direction = Vec2.fromAngle(shooter.angle);
    let point = shooter.position;
    for (let travelled = 0; travelled < AIM_REACH; travelled += AIM_STEP) {
      point = shooter.position.add(direction.scale(travelled));
      if (travelled > 80 && chains.some((chain) => chain.hitTest(point) !== null)) return point;
    }
    return point;
  }
}
