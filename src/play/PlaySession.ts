import { shallowReactive } from 'vue';
import type { SoundEngine } from '@/audio/SoundEngine';
import type { Tone } from '@/engine/chain/Ball';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type GameReport, type GameState } from '@/engine/Game';
import { Vec2 } from '@/engine/geometry/Vec2';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import { BallMotion } from './BallMotion';
import { NO_INSETS, type Insets } from './BoardView';
import { CanvasRenderer, SWITCH_RADIUS, type Renderer } from './CanvasRenderer';
import { Destruction } from './effects/Destruction';
import type { DistortionLayer } from './effects/DistortionLayer';
import type { EffectProfile } from './effects/EffectProfile';
import { FrameMonitor } from './effects/FrameMonitor';
import { NOVA, RESULT } from './effects/Victory';
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
  /** Shots left in Puzzle mode, or null. */
  shotsLeft: number | null;
  /** Groove multiplier in Rhythm mode, or null. */
  groove: number | null;
  /** Stage reached in Endless mode, or null. */
  stage: number | null;
  /** The rival's score in Duel mode, or null. */
  rivalScore: number | null;
  /** The weather now (§ 3.9), or null in calm weather. */
  weather: 'solar' | 'cold' | 'wind' | null;
  /** Star fragments caught this game, or null outside the campaign. */
  fragments: number | null;
  /** Nova upgrade: how charged the bomb is (0 to 1), or null without it. */
  nova: number | null;
  /** Latest use of the second chance, for the announcement. */
  secondChance: number | null;
  /** Bombs gone off this game (a gift or the Nova), for the cheer over the board. */
  bombs: number;
  /** A chain is close to its hole (the heart beats): said once each time it gets there. */
  danger: boolean;
  /**
   * Duel mode: where the chain stands between the two holes, from 0 (in the
   * rival's hole: won) to 1 (in the player's: lost); null elsewhere.
   */
  tug: number | null;
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
  /** Key of the music in Rhythm mode, in hertz. */
  readonly root?: number;
  /** Ghost ball and group preview on the aim line (§ 3.9); on by default. */
  readonly aimAssist?: boolean;
  /** The first level: a hand shows how to aim and shoot, until the first shot. */
  readonly tutorial?: boolean;
}

/** Sound and vibrations, shared by every game of the visit. */
export interface Feedback {
  readonly sound: SoundEngine;
  readonly haptics: Haptics;
}

/** Seconds a puzzle hint stays circled on the board. */
const HINT_TIME = 6;

/** Real seconds between the end of a game and the result dialog. */
const RESULT_DELAY = 1.6;
/** Speed at which a lost chain is swallowed by the hole, in units per second. */
const DRAIN_SPEED = 1400;
/** Share of the track from which the heart starts beating. */
const DANGER_FROM = 0.8;
/** Real seconds between two updates of the tug-of-war gauge. */
const TUG_REFRESH = 0.1;
/** Seconds of holding the shot that charge it fully (§ 3.9, module de tir). */
export const CHARGE_TIME = 0.35;
/** How fast the recoil of the shooter fades (per second). */
const RECOIL_FADE = 7;

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
  private tugIn = 0;
  /** After a win: the hole the light runs to, the seconds since, and whether it burst yet. */
  private victory: { readonly at: Vec2; elapsed: number; burst: boolean } | null = null;
  private size: { width: number; height: number; pixelRatio: number; insets: Insets } = {
    width: 1,
    height: 1,
    pixelRatio: 1,
    insets: NO_INSETS,
  };
  private colossusFlash = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly distortion: DistortionLayer | null;
  private level: LevelDefinition;
  private palette: Palette;
  private profile: EffectProfile;
  private readonly feedback: Feedback;
  private readonly look: Look;
  private readonly seed: () => string;
  private readonly root: number;
  private aimAssist: boolean;
  /** Seconds the shot has been held, or null when not charging. */
  private charging: number | null = null;
  private chargedOnce = false;
  private recoil = 0;
  /** The first level's hand, shown until the player's first shot. */
  private tutorial: boolean;
  /** Puzzle hint: the ball circled, and until when (session time). */
  private hinted: { readonly at: Vec2; readonly until: number } | null = null;
  /** An ad is playing over the game: time stands still, without the pause menu. */
  private held = false;

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
    this.root = options.root ?? 55;
    this.aimAssist = options.aimAssist ?? true;
    this.tutorial = options.tutorial ?? false;
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

  /** Stops time and sound while something covers the game (an ad), without the pause menu. */
  hold(): void {
    this.held = true;
    this.turning = 0;
    this.charging = null;
    this.feedback.sound.suspend();
  }

  release(): void {
    this.held = false;
    this.monitor.reset();
    this.feedback.sound.resume();
  }

  togglePause(): void {
    this.feedback.sound.unlock();
    if (this.hud.paused) this.resume();
    else this.pause();
  }

  /** True if the game was lost by a chain in its hole, so it could be continued. */
  get revivable(): boolean {
    return this.game.state === 'lost' && this.game.chains.some((chain) => chain.reachedHole);
  }

  /**
   * Continue after a defeat (§ 3.7, a rewarded ad watched): the chains come
   * back out of the hole and the game goes on. False if it cannot.
   */
  revive(): boolean {
    if (!this.game.revive()) return false;
    this.motion.undrain();
    this.overIn = null;
    this.feedback.sound.resume();
    Object.assign(this.hud, { state: 'playing', over: null, paused: false, danger: false });
    return true;
  }

  /**
   * Shows a hint (Puzzle mode, a rewarded ad watched): loads the colour and
   * aims at the ball, which stays circled for a few seconds.
   */
  showHint(find: (game: Game) => { readonly tone: Tone; readonly target: Vec2 } | null): boolean {
    if (!this.acceptsCommands) return false;
    const hint = find(this.game);
    if (!hint) return false;
    for (let i = 0; i < 6 && this.game.shooter.current !== hint.tone; i++) this.game.swap();
    this.game.aimAt(hint.target);
    this.hinted = { at: hint.target, until: this.time + HINT_TIME };
    this.syncTones();
    this.render();
    return true;
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
    this.renderer.resize(this.size.width, this.size.height, this.size.pixelRatio, this.size.insets);
    this.motion = new BallMotion();
    this.destruction = this.createDestruction();
    this.overIn = null;
    this.victory = null;
    this.hinted = null;
    this.feedback.sound.resume();
    Object.assign(this.hud, this.initialHud());
  }

  /** The canvas's size, and the room the interface takes along its edges (see BoardView). */
  resize(width: number, height: number, pixelRatio: number, insets: Insets = NO_INSETS): void {
    this.size = { width, height, pixelRatio, insets };
    this.renderer.resize(width, height, pixelRatio, insets);
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

  /** Turns the aim assistance (ghost ball, group preview) on or off. */
  setAimAssist(enabled: boolean): void {
    this.aimAssist = enabled;
  }

  /** Starts charging the shot (or starts again: the finger moved). */
  charge(): void {
    this.feedback.sound.unlock();
    if (!this.acceptsCommands) return;
    this.charging = 0;
    this.chargedOnce = false;
  }

  /** True once the held shot is fully charged. */
  private get powered(): boolean {
    return this.charging !== null && this.charging >= CHARGE_TIME && !this.hud.magnetArmed;
  }

  /** Releases the shot: a powered one if it was held long enough. */
  fire(): void {
    this.feedback.sound.unlock();
    const power = this.powered;
    this.charging = null;
    if (!this.acceptsCommands) return;
    if (this.hud.magnetArmed) {
      // Without a ball under the aim, the magnet stays armed: the player aims again.
      if (this.game.pull()) this.hud.magnetArmed = false;
      return;
    }
    const { shooter } = this.game;
    const fired = { at: shooter.position, angle: shooter.angle, tone: shooter.current };
    if (this.game.fire(power)) {
      if (power) this.feedback.sound.powerShot();
      else this.feedback.sound.shoot();
      this.feedback.haptics.shot(power);
      this.recoil = 1;
      this.destruction.muzzle(fired.at, fired.angle, fired.tone, power);
      this.hud.shotsLeft = this.game.shotsLeft;
    }
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
    return !this.hud.paused && !this.held && this.hud.state === 'playing';
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
      const rival = event.by === 'rival';
      this.destruction.explode({
        positions: event.positions,
        tones: event.balls.map((ball) => ball.tone),
        points: event.points,
        depth: event.depth,
        bounces: event.bounces,
        hot: event.hot,
        groove: rival ? 1 : game.grooveMultiplier,
        rival,
      });
      if (rival) {
        this.hud.rivalScore = game.rivalScore;
        sound.explode(event.balls.length, 1);
        return;
      }
      sound.explode(event.balls.length, event.depth);
      haptics.explosion(event.depth);
      if (event.depth >= 3 && this.profile.slowMotion) this.warp.trigger(0.3, 0.12, 0.25);
      this.hud.score = game.score;
      this.hud.streak = event.streak;
      if (event.depth > 1) this.hud.reaction = { depth: event.depth, serial: ++this.reactions };
    });
    game.events.on('missed', ({ projectile }) => {
      if (projectile.by === 'player') this.hud.streak = 0;
    });
    game.events.on('fired', ({ projectile }) => {
      if (projectile.by === 'rival') sound.rivalShoot();
      else this.tutorial = false;
    });
    game.events.on('beat', ({ index }) => {
      if (game.tempo) sound.beat(index, game.tempo.beat, this.root);
    });
    game.events.on('groove', ({ multiplier, onBeat }) => {
      if (onBeat && multiplier > (this.hud.groove ?? 1)) sound.grooveUp(multiplier);
      this.hud.groove = multiplier;
    });
    game.events.on('weather', ({ kind, active, massive }) => {
      this.hud.weather = active ? kind : null;
      if (active) {
        sound.weather(kind, massive);
        if (massive) this.destruction.impact(game.shooter.position, 0.5);
      }
    });
    game.events.on('meteorWarning', () => sound.whistle());
    game.events.on('fragment', ({ position }) => {
      this.hud.fragments = (this.hud.fragments ?? 0) + 1;
      this.destruction.sparkle(position);
      sound.fragment();
      haptics.explosion(1);
    });
    game.events.on('novaReady', () => sound.novaReady());
    game.events.on('bomb', ({ position, radius }) => {
      this.hud.bombs++;
      this.destruction.blast(position, radius);
      sound.bomb();
      haptics.explosion(4);
    });
    game.events.on('revived', () => {
      this.destruction.defeat(this.palette.accent);
      sound.roar();
    });
    game.events.on('secondChance', () => {
      this.destruction.defeat(this.palette.accent);
      this.hud.secondChance = (this.hud.secondChance ?? 0) + 1;
      sound.roar();
    });
    game.events.on('meteor', ({ position }) => {
      this.destruction.impact(position, 0.25);
      sound.thud();
    });
    game.events.on('stage', ({ stage }) => {
      this.hud.stage = stage;
      sound.stageUp();
    });
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
        // Light surges along the tracks to the hole (or the black hole), which
        // gathers what is left and bursts into a supernova (effects/Victory).
        const hole = game.gravity?.centre ?? game.chains[0]?.path.end ?? game.shooter.position;
        this.victory = { at: hole, elapsed: 0, burst: false };
        this.overIn = RESULT;
        this.destruction.vortex(hole, game.setup.board, [0, 1, 2, 3, 4, 5]);
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
      shotsLeft: this.game.shotsLeft,
      groove: this.game.tempo ? 1 : null,
      stage: this.game.stage,
      rivalScore: this.game.rival ? 0 : null,
      tug: this.tug(),
      weather: null,
      fragments: this.game.setup.fragments ? 0 : null,
      nova: this.game.nova,
      secondChance: null,
      bombs: 0,
      danger: false,
    };
  }

  /** Duel mode: the chain's place between the two holes, 0 to 1 (see `HudState.tug`). */
  private tug(): number | null {
    const chain = this.game.chains[0];
    if (!this.game.rival || !chain) return null;
    const tail = chain.tail ?? 0;
    const room = tail + (chain.path.length - (chain.balls[chain.balls.length - 1]?.s ?? tail));
    return room > 0 ? 1 - tail / room : 0.5;
  }

  private frame(realDt: number): void {
    if (this.hud.paused || this.held) return;
    if (this.monitor.record(realDt)) this.lowerEffects();
    const dt = this.warp.update(realDt);
    this.time += dt;
    this.recoil = Math.max(0, this.recoil - RECOIL_FADE * realDt);
    if (this.victory) this.updateVictory(realDt);
    if (this.charging !== null) {
      this.charging += realDt;
      if (!this.chargedOnce && this.charging >= CHARGE_TIME) {
        this.chargedOnce = true;
        this.feedback.sound.charged();
      }
    }
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
    const nova = this.game.nova;
    if (nova !== this.hud.nova) this.hud.nova = nova;
    if (this.game.rival) {
      this.tugIn -= realDt;
      if (this.tugIn <= 0) {
        this.tugIn = TUG_REFRESH;
        this.hud.tug = this.tug();
      }
    }
    if (this.overIn !== null) {
      this.overIn -= realDt;
      if (this.overIn <= 0) {
        this.overIn = null;
        this.hud.over = this.game.state === 'won' ? 'won' : 'lost';
      }
    }
    this.render();
  }

  /** After a win: the seconds of the effect, and the supernova when its time comes. */
  private updateVictory(realDt: number): void {
    const victory = this.victory;
    if (!victory) return;
    victory.elapsed += realDt;
    if (victory.burst || victory.elapsed < NOVA) return;
    victory.burst = true;
    this.destruction.supernova(victory.at, [0, 1, 2, 3, 4, 5]);
    this.feedback.sound.nova();
    this.feedback.haptics.win();
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
    this.feedback.sound.setTension(
      Math.max(0, (danger - DANGER_FROM + 0.15) / (1 - DANGER_FROM + 0.15)),
    );
    if (danger < DANGER_FROM) {
      this.heartIn = 0;
      // Far enough again: the next approach will be announced too.
      if (danger < DANGER_FROM - 0.1 && this.hud.danger) this.hud.danger = false;
      return;
    }
    if (!this.hud.danger) this.hud.danger = true;
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
      aim:
        this.game.state === 'playing'
          ? this.game.aimLine(this.game.upgrades.aimBounces, this.powered)
          : null,
      preview:
        this.aimAssist && this.game.state === 'playing' && !this.hud.magnetArmed
          ? this.game.preview(this.powered)
          : null,
      assist: this.aimAssist,
      charge: this.charging === null ? 0 : Math.min(1, this.charging / CHARGE_TIME),
      recoil: this.recoil,
      reducedMotion: this.profile.reducedMotion,
      victory: this.victory && {
        at: this.victory.at,
        elapsed: this.victory.elapsed,
        reducedMotion: this.profile.reducedMotion,
      },
      magnetArmed: this.hud.magnetArmed,
      time: this.time,
      colossusFlash: this.colossusFlash,
      hint: this.hinted && this.time < this.hinted.until ? this.hinted.at : null,
      tutorial: this.tutorial && this.acceptsCommands ? this.tutorialPath() : null,
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

  /** The tutorial hand's way: from the shooter to a ball in the middle of the visible chain. */
  private tutorialPath(): { readonly from: Vec2; readonly to: Vec2; readonly time: number } | null {
    const chain = this.game.chains[0];
    if (!chain) return null;
    const visible = chain.balls.filter((ball) => ball.s > chain.diameter * 2);
    const ball = visible[Math.floor(visible.length * 0.4)];
    if (!ball) return null;
    return {
      from: this.game.shooter.position,
      to: this.motion.positionOf(chain, ball),
      time: this.time,
    };
  }

  private syncTones(): void {
    const { current, next } = this.game.shooter;
    if (this.hud.current !== current) this.hud.current = current;
    if (this.hud.next !== next) this.hud.next = next;
  }
}
