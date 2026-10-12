import { shallowReactive } from 'vue';
import type { SoundEngine } from '@/audio/SoundEngine';
import type { Tone } from '@/engine/chain/Ball';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type GameReport, type GameState } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import { BallMotion } from './BallMotion';
import { CanvasRenderer, SWITCH_RADIUS, type Renderer } from './CanvasRenderer';
import { Destruction } from './effects/Destruction';
import type { DistortionLayer } from './effects/DistortionLayer';
import type { EffectProfile } from './effects/EffectProfile';
import { FrameMonitor } from './effects/FrameMonitor';
import { TimeWarp } from './effects/TimeWarp';
import { GameLoop } from './GameLoop';
import type { Haptics } from './Haptics';
import type { Palette } from './Palette';
import type { Look } from './cosmetics/Look';

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
  /** Health of the Colossus on a boss level. */
  colossus: { readonly hp: number; readonly maxHp: number } | null;
  /** End-of-level bonus included in the score. */
  bonus: number;
  /** Magnet charges on an Abyss level, or null. */
  magnet: { readonly charges: number; readonly max: number } | null;
  /** The next shot pulls a ball out instead. */
  magnetArmed: boolean;
  /** Latest switch flipped, for the screen reader announcement. */
  switched: { readonly branch: 'short' | 'long'; readonly serial: number } | null;
}

export interface SessionOptions {
  readonly canvas: HTMLCanvasElement;
  readonly distortion: DistortionLayer | null;
  readonly level: LevelDefinition;
  readonly palette: Palette;
  readonly profile: EffectProfile;
  readonly feedback: Feedback;
  readonly look: Look;
  /** Seed of each game; a new one per game by default. */
  readonly seed?: () => string;
}

/** Sound and vibrations, shared by every game of the visit. */
export interface Feedback {
  readonly sound: SoundEngine;
  readonly haptics: Haptics;
}

/** Real seconds between the end of a game and the result dialog. */
const RESULT_DELAY = 1.6;
/** Speed at which a lost chain is swallowed by the hole, in units per second. */
const DRAIN_SPEED = 1400;
/** Share of the track from which the heart starts beating. */
const DANGER_FROM = 0.8;

/**
 * A level being played: owns the game, the loop, the renderer, the visual
 * motion and the destruction effects, and turns player commands into game
 * commands. Created by the game screen, which only displays `hud`.
 */
export class PlaySession {
  readonly hud: HudState;
  private game: Game;
  private renderer: Renderer;
  private motion = new BallMotion();
  private destruction: Destruction;
  private readonly warp = new TimeWarp();
  private readonly monitor = new FrameMonitor();
  private readonly loop: GameLoop;
  private time = 0;
  private overIn: number | null = null;
  private heartIn = 0;
  private turning = 0;
  private reactions = 0;
  private switchSerial = 0;
  private size = { width: 1, height: 1, pixelRatio: 1 };
  private colossusFlash = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly distortion: DistortionLayer | null;
  private level: LevelDefinition;
  private palette: Palette;
  private profile: EffectProfile;
  private readonly feedback: Feedback;
  private readonly look: Look;
  private readonly seed: () => string;

  constructor(options: SessionOptions) {
    ({
      canvas: this.canvas,
      distortion: this.distortion,
      level: this.level,
      palette: this.palette,
      profile: this.profile,
      feedback: this.feedback,
      look: this.look,
    } = options);
    this.seed = options.seed ?? (() => `${options.level.id}:${Date.now()}`);
    this.game = this.createGame();
    this.renderer = new CanvasRenderer(this.canvas, this.game, this.palette, this.look);
    this.destruction = this.createDestruction();
    this.hud = shallowReactive(this.initialHud());
    this.loop = new GameLoop((dt) => this.frame(dt));
  }

  start(): void {
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.game.events.clear();
    this.distortion?.hide();
  }

  pause(): void {
    if (this.hud.state !== 'playing') return;
    this.hud.paused = true;
    this.turning = 0;
    this.feedback.sound.suspend();
  }

  resume(): void {
    this.hud.paused = false;
    this.monitor.reset();
    this.feedback.sound.resume();
  }

  togglePause(): void {
    this.feedback.sound.unlock();
    if (this.hud.paused) this.resume();
    else this.pause();
  }

  /** What the game says about how it was played, for progression. */
  summary(): GameReport {
    return this.game.summary();
  }

  /** Starts a new game, of another version of the level if given (the assistance). */
  restart(level: LevelDefinition = this.level): void {
    this.level = level;
    this.game.events.clear();
    this.game = this.createGame();
    this.renderer = new CanvasRenderer(this.canvas, this.game, this.palette, this.look);
    this.renderer.resize(this.size.width, this.size.height, this.size.pixelRatio);
    this.motion = new BallMotion();
    this.destruction = this.createDestruction();
    this.overIn = null;
    this.feedback.sound.resume();
    Object.assign(this.hud, this.initialHud());
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.size = { width, height, pixelRatio };
    this.renderer.resize(width, height, pixelRatio);
    const { surface } = this.renderer;
    this.distortion?.resize(surface.width, surface.height);
    this.render();
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    this.renderer.setPalette(palette);
    this.render();
  }

  setProfile(profile: EffectProfile): void {
    this.profile = profile;
    this.destruction.setProfile(profile);
    this.monitor.reset();
  }

  /** Aims at a point given in CSS pixels relative to the canvas. */
  aimAt(x: number, y: number): void {
    if (this.acceptsCommands) this.game.aimAt(this.renderer.toBoard(x, y));
  }

  /** True if the point (CSS pixels relative to the canvas) is on the shooter. */
  /** Flips the switch under this point (CSS pixels on the canvas), if any. */
  flipSwitchAt(x: number, y: number): boolean {
    if (!this.acceptsCommands) return false;
    const point = this.renderer.toBoard(x, y);
    // A generous target: a finger is wider than the lever.
    const view = this.game
      .switches()
      .find((candidate) => candidate.position.distanceTo(point) < SWITCH_RADIUS * 1.6);
    if (!view) return false;
    this.feedback.sound.unlock();
    if (!this.game.toggleSwitch(view.chain, view.fork)) this.feedback.sound.locked();
    return true;
  }

  /** Flips the next switch a chain has not reached yet (keyboard). */
  flipNextSwitch(): void {
    if (!this.acceptsCommands) return;
    this.feedback.sound.unlock();
    const view = this.game.switches().find((candidate) => !candidate.locked);
    if (view) this.game.toggleSwitch(view.chain, view.fork);
  }

  isOnShooter(x: number, y: number): boolean {
    return this.renderer.toBoard(x, y).distanceTo(this.game.shooter.position) < 70;
  }

  fire(): void {
    this.feedback.sound.unlock();
    if (!this.acceptsCommands) return;
    if (this.hud.magnetArmed) {
      // Without a ball under the aim, the magnet stays armed: the player aims again.
      if (this.game.pull()) this.hud.magnetArmed = false;
      return;
    }
    if (this.game.fire()) this.feedback.sound.shoot();
  }

  /** Arms or disarms the magnet; only with a charge left. */
  toggleMagnet(): void {
    this.feedback.sound.unlock();
    const magnet = this.game.magnet;
    if (!this.acceptsCommands || !magnet) return;
    this.hud.magnetArmed = !this.hud.magnetArmed && magnet.charges > 0;
  }

  swap(): void {
    this.feedback.sound.unlock();
    if (!this.acceptsCommands) return;
    this.game.swap();
    this.feedback.sound.swap();
    this.syncTones();
  }

  /** Keyboard aiming: turn direction (negative = anticlockwise), applied every frame. */
  turn(direction: number): void {
    this.turning = direction;
  }

  private get acceptsCommands(): boolean {
    return !this.hud.paused && this.hud.state === 'playing';
  }

  private createDestruction(): Destruction {
    const destruction = new Destruction(
      this.profile,
      this.game.setup.chain.ballRadius,
      this.look.shards,
    );
    const gravity = this.game.gravity;
    if (gravity) destruction.setAttractor(gravity.centre, gravity.setup.horizon);
    return destruction;
  }

  private createGame(): Game {
    const game = new Game(toLevelSetup(this.level), SeededRandom.fromString(this.seed()));
    const { sound, haptics } = this.feedback;
    game.events.on('inserted', ({ ball, from }) => {
      this.motion.land(ball, from);
      sound.land();
    });
    game.events.on('exploded', (event) => {
      this.destruction.explode({
        positions: event.positions,
        tones: event.balls.map((ball) => ball.tone),
        points: event.points,
        depth: event.depth,
        bounces: event.bounces,
        hot: event.hot,
      });
      sound.explode(event.balls.length, event.depth);
      haptics.explosion(event.depth);
      if (event.depth >= 3 && this.profile.slowMotion) this.warp.trigger(0.3, 0.12, 0.25);
      this.hud.score = game.score;
      this.hud.streak = event.streak;
      if (event.depth > 1) this.hud.reaction = { depth: event.depth, serial: ++this.reactions };
    });
    game.events.on('missed', () => (this.hud.streak = 0));
    game.events.on('swallowed', ({ projectile }) => {
      this.destruction.swallow(projectile.position, projectile.tone);
      sound.swallow();
    });
    game.events.on('switched', ({ branch }) => {
      sound.switch(branch === 'long');
      this.hud.switched = { branch, serial: ++this.switchSerial };
    });
    game.events.on('fused', ({ position, from, ball }) => {
      this.destruction.fuse(position, from, ball.tone);
      sound.fuse();
    });
    game.events.on('pulled', ({ position, ball }) => {
      this.destruction.pull(position, game.shooter.position, ball.tone);
      this.hud.magnet = game.magnet;
      sound.pull();
      haptics.explosion(1);
      this.syncTones();
    });
    game.events.on('magnetCharged', () => {
      this.hud.magnet = game.magnet;
      sound.charge();
    });
    game.events.on('bounced', ({ projectile, position }) => {
      this.destruction.rebound(position, projectile.tone);
      sound.rebound(projectile.bounces);
    });
    game.events.on('colossusHit', ({ hp, maxHp, position }) => {
      this.hud.colossus = { hp, maxHp };
      this.colossusFlash = 1;
      this.destruction.impact(position, 0.35);
      sound.colossusHit();
    });
    game.events.on('colossusPhase', () => {
      sound.roar();
      haptics.lose();
    });
    game.events.on('ended', ({ outcome, bonus }) => {
      this.hud.state = outcome;
      this.hud.score = game.score;
      this.hud.bonus = bonus;
      this.hud.bestDepth = game.bestDepth;
      this.overIn = RESULT_DELAY;
      if (outcome === 'won') {
        this.destruction.finale(game.shooter.position, [0, 1, 2, 3, 4, 5], this.palette.accent);
        if (this.profile.slowMotion) this.warp.trigger(0.35, 0.4, 0.5);
        sound.win();
        haptics.win();
      } else {
        this.destruction.defeat(this.palette.danger);
        sound.lose();
        haptics.lose();
      }
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
      colossus: this.game.colossus && {
        hp: this.game.colossus.hp,
        maxHp: this.game.colossus.maxHp,
      },
      bonus: 0,
      magnet: this.game.magnet,
      magnetArmed: false,
      switched: null,
    };
  }

  private frame(realDt: number): void {
    if (this.hud.paused) return;
    if (this.monitor.record(realDt)) this.lowerEffects();
    const dt = this.warp.update(realDt);
    this.time += dt;
    if (this.turning !== 0 && this.acceptsCommands) {
      this.game.shooter.aim(this.game.shooter.angle + this.turning * 2.4 * realDt);
    }
    this.game.update(dt);
    if (this.game.state === 'lost') this.motion.drain(DRAIN_SPEED, dt);
    this.motion.update(this.game.chains, dt);
    this.destruction.update(dt);
    this.colossusFlash = Math.max(0, this.colossusFlash - 4 * dt);
    this.syncTones();
    this.beatHeart(realDt);
    if (this.overIn !== null) {
      this.overIn -= realDt;
      if (this.overIn <= 0) {
        this.overIn = null;
        this.hud.over = this.game.state === 'won' ? 'won' : 'lost';
      }
    }
    this.render();
  }

  /** The frame rate dropped: one step less spectacle, for the rest of the game. */
  private lowerEffects(): void {
    const lower = this.profile.lowered();
    if (lower) this.setProfile(lower);
  }

  private beatHeart(realDt: number): void {
    if (this.game.state !== 'playing') return;
    const danger = Math.max(
      0,
      ...this.game.chains.map((chain) => {
        const head = chain.balls[chain.balls.length - 1];
        return head ? head.s / chain.path.length : 0;
      }),
    );
    if (danger < DANGER_FROM) {
      this.heartIn = 0;
      return;
    }
    this.heartIn -= realDt;
    if (this.heartIn > 0) return;
    this.feedback.sound.heartbeat();
    const urgency = (danger - DANGER_FROM) / (1 - DANGER_FROM);
    this.heartIn = 1 - 0.55 * urgency;
  }

  private render(): void {
    this.renderer.draw({
      game: this.game,
      motion: this.motion,
      destruction: this.destruction,
      aim: this.game.state === 'playing' ? this.game.aimLine() : null,
      magnetArmed: this.hud.magnetArmed,
      time: this.time,
      colossusFlash: this.colossusFlash,
    });
    if (!this.distortion) return;
    const k = this.renderer.deviceScale;
    this.distortion.present(
      this.renderer.surface,
      this.destruction.waves.map((wave) => {
        const centre = this.renderer.toDevice(new Vec2(wave.x, wave.y));
        return { x: centre.x, y: centre.y, radius: wave.radius * k, strength: wave.strength * k };
      }),
      42 * k,
    );
  }

  private syncTones(): void {
    const { current, next } = this.game.shooter;
    if (this.hud.current !== current) this.hud.current = current;
    if (this.hud.next !== next) this.hud.next = next;
  }
}
