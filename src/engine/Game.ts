import { ingredients, mix, PRIMARIES, SECONDARIES } from './chain/Alchemy';
import { BallFactory, type BallView, type Tone } from './chain/Ball';
import { Chain, type ChainParams, type Explosion, type ExplosionCause } from './chain/Chain';
import { ChainGenerator, type ChainRecipe } from './chain/ChainGenerator';
import { Emitter } from './core/Emitter';
import type { RandomSource } from './core/Random';
import { Vec2 } from './geometry/Vec2';
import { Rival, type RivalSetup } from './duel/Rival';
import { ColossusObjective, type ColossusSetup } from './objectives/ColossusObjective';
import { DuelObjective, type DuelSetup } from './objectives/DuelObjective';
import { EndlessObjective, type EndlessSetup } from './objectives/EndlessObjective';
import {
  ClearObjective,
  type Objective,
  type ObjectiveContext,
  type Side,
} from './objectives/Objective';
import { PuzzleObjective } from './objectives/PuzzleObjective';
import { Groove, Tempo, type RhythmSetup } from './rhythm/Tempo';
import { Gravity, type GravitySetup } from './orbit/Gravity';
import { Orbit, type OrbitSetup } from './orbit/Orbit';
import type { Branch, ForkSpan, ForkedRoute } from './path/ForkedRoute';
import type { Path } from './path/Path';
import { Reflectors, type ReflectorSetup } from './reflectors/Reflectors';
import { Scoring } from './Scoring';
import type { Projectile, ProjectileView } from './shooter/Projectile';
import { Shooter } from './shooter/Shooter';

export interface ChainSetup {
  readonly path: Path;
  readonly recipe: ChainRecipe;
  /** A track with switches (Volcano world); `path` is then its all-short version. */
  readonly route?: ForkedRoute;
  /** The exact colours, tail first, instead of drawing them from the recipe (Puzzle). */
  readonly tones?: readonly Tone[];
  /** The chain starts on the track with its tail at this arc length, instead of in the tunnel. */
  readonly tail?: number;
}

/** A switch of the board, as the interface needs it. */
export interface SwitchView {
  readonly chain: number;
  readonly fork: number;
  readonly branch: Branch;
  /** The chain has reached it: it can no longer be flipped. */
  readonly locked: boolean;
  readonly position: Vec2;
}

/** Explosions on the short branch of a fork are worth this much more (Volcano world). */
export const HOT_MULTIPLIER = 2;

/** Everything needed to start a level; levels are data, never code. */
export interface LevelSetup {
  /** Size of the board in units; the renderer scales it to the screen. */
  readonly board: { readonly width: number; readonly height: number };
  readonly shooter: Vec2;
  readonly chains: readonly ChainSetup[];
  readonly chain: ChainParams;
  readonly projectileSpeed: number;
  /** Seconds between two shots. */
  readonly fireCooldown: number;
  /** A boss level: the Colossus pushes one of the chains. */
  readonly colossus?: ColossusSetup;
  /** Seconds under which finishing earns a speed bonus. */
  readonly parTime?: number;
  /** Mirrors shots bounce off (Neon world). */
  readonly reflectors?: readonly ReflectorSetup[];
  /** The magnet that pulls balls out of the chain (Abyss world). */
  readonly magnet?: MagnetSetup;
  /** Primaries fuse into secondaries instead of being inserted (Jewel world). */
  readonly alchemy?: boolean;
  /** A black hole bends every shot (Singularity world). */
  readonly gravity?: GravitySetup;
  /** The shooter glides along a ring instead of standing still (Singularity world). */
  readonly orbit?: OrbitSetup;
  /** Endless mode: the chain never runs out and speeds up by stages. */
  readonly endless?: EndlessSetup;
  /** Puzzle mode: a limited number of shots, and the player picks each colour. */
  readonly puzzle?: { readonly shots: number };
  /** Rhythm mode: the chain moves on the beat; shots on the beat feed the groove. */
  readonly rhythm?: RhythmSetup;
  /** Duel mode: a computer rival shares the chain, which explosions push to and fro. */
  readonly duel?: DuelSetup & { readonly rival: RivalSetup };
}

export interface MagnetSetup {
  /** Charges at the start of the level. */
  readonly charges: number;
  readonly max: number;
  /** Explosions needed to earn one charge back. */
  readonly rechargeEvery: number;
}

export type GameState = 'playing' | 'won' | 'lost';

/** What a finished (or abandoned) game says about how it was played; feeds progression. */
export interface GameReport {
  readonly outcome: GameState;
  readonly score: number;
  readonly seconds: number;
  readonly ballsDestroyed: number;
  readonly bestDepth: number;
  readonly bestStreak: number;
  /** Most mirrors a successful shot bounced off. */
  readonly bestBounce: number;
  readonly swaps: number;
  /** Balls pulled out of the chain with the magnet. */
  readonly pulls: number;
  /** Primaries fused into a secondary (Jewel world). */
  readonly fusions: number;
  /** Switches flipped (Volcano world). */
  readonly switches: number;
  /** Shots bent by at least 45° by the black hole that exploded balls (Singularity world). */
  readonly curves: number;
  /** Shots the player fired. */
  readonly shots: number;
  /** Highest groove multiplier reached (Rhythm mode; 1 elsewhere). */
  readonly bestGroove: number;
  /** Last stage reached (Endless mode; 0 elsewhere). */
  readonly stage: number;
  /** The rival's score (Duel mode; 0 elsewhere). */
  readonly rivalScore: number;
  /** Furthest any chain head got, as a share of its track (1 = the hole). */
  readonly danger: number;
  readonly colossusDefeated: boolean;
}

/** Domain events: rendering, sound and vibrations subscribe; the engine knows none of them. */
export interface GameEvents {
  fired: { readonly projectile: ProjectileView };
  /** Rhythm mode: a beat of the music. */
  beat: { readonly index: number };
  /** Rhythm mode: a shot was judged on or off the beat. */
  groove: { readonly onBeat: boolean; readonly multiplier: number };
  /** Endless mode: a new stage, faster and maybe with one more colour. */
  stage: { readonly stage: number; readonly tones: number };
  bounced: { readonly projectile: ProjectileView; readonly position: Vec2 };
  pulled: { readonly chain: number; readonly ball: BallView; readonly position: Vec2 };
  magnetCharged: { readonly charges: number };
  switched: { readonly chain: number; readonly fork: number; readonly branch: Branch };
  fused: {
    readonly chain: number;
    readonly ball: BallView;
    /** The two colours that fused, the shot one first. */
    readonly from: readonly [Tone, Tone];
    readonly position: Vec2;
  };
  inserted: { readonly chain: number; readonly ball: BallView; readonly from: Vec2 };
  missed: { readonly projectile: ProjectileView };
  /** A shot fell into the black hole (Singularity world); a miss as well. */
  swallowed: { readonly projectile: ProjectileView };
  exploded: {
    readonly chain: number;
    readonly balls: readonly BallView[];
    /** Where each ball was when it exploded, in the order of `balls`. */
    readonly positions: readonly Vec2[];
    readonly cause: ExplosionCause;
    readonly depth: number;
    readonly points: number;
    readonly streak: number;
    /** Mirrors the shot bounced off before landing (0 for chain reactions). */
    readonly bounces: number;
    /** The explosion happened on a hot short branch (Volcano world). */
    readonly hot: boolean;
    /** Who caused it (Duel mode: the rival's explosions push the other way). */
    readonly by: Side;
  };
  colossusHit: {
    readonly hp: number;
    readonly maxHp: number;
    readonly damage: number;
    readonly position: Vec2;
  };
  colossusPhase: { readonly phase: number };
  ended: { readonly outcome: 'won' | 'lost'; readonly score: number; readonly bonus: number };
}

/** Fixed simulation step: the same inputs always give the same game, at any frame rate. */
export const STEP = 1 / 120;
/** A shot that bounced this many times shatters: no endless ping-pong. */
export const MAX_BOUNCES = 6;

/** Seconds a shot may fly before it is given up (one circling the black hole). */
export const MAX_FLIGHT = 4;
/** A charged shot flies this much faster (§ 3.9, module de tir). */
export const POWER_SPEED = 2;

/** A shot bent at least this much by gravity is a curve (radians). */
export const CURVE_ANGLE = Math.PI / 4;

/** Longest frame simulated at once (a tab coming back from the background). */
const MAX_FRAME = 0.25;

/**
 * One game: chains, shooter, balls in flight and score, advanced in fixed
 * steps. The interface sends commands (aim, swap, fire) and listens to events.
 */
export class Game {
  readonly events = new Emitter<GameEvents>();
  readonly chains: readonly Chain[];
  readonly shooter: Shooter;
  private readonly scoring = new Scoring();
  /** Duel mode: the rival's shooter and its points; null elsewhere. */
  readonly rival: Shooter | null;
  private readonly rivalBrain: Rival | null;
  private readonly rivalScoring = new Scoring();
  /** Who shot each chain last: chain reactions are theirs. */
  private readonly lastShooter: Side[];
  /** Rhythm mode. */
  readonly tempo: Tempo | null;
  private readonly groove = new Groove();
  private bestGroove = 1;
  private beatIndex = 0;
  private shotsFired = 0;
  private readonly balls = new BallFactory();
  private readonly flying: Projectile[] = [];
  private readonly objective: Objective;
  private readonly context: ObjectiveContext;
  private readonly generator: ChainGenerator;
  readonly reflectors: Reflectors;
  /** The black hole of the Singularity world, or null. */
  readonly gravity: Gravity | null;
  private readonly orbit: Orbit | null;
  private accumulator = 0;
  private elapsedValue = 0;
  private stateValue: GameState = 'playing';
  private swaps = 0;
  private pulls = 0;
  private fusions = 0;
  private flips = 0;
  private curves = 0;
  /** Switch choices and fork spans of each chain with a forked route. */
  private readonly routes: ({ choices: Branch[]; spans: readonly ForkSpan[] } | null)[];
  private charges: number;
  private towardsCharge = 0;
  private danger = 0;

  constructor(
    readonly setup: LevelSetup,
    random: RandomSource,
  ) {
    const generator = new ChainGenerator(random, setup.chain.minMatch);
    this.generator = generator;
    this.chains = setup.chains.map(({ path, recipe, tones, tail }) => {
      const balls = (tones ?? generator.tones(recipe)).map((tone) => this.balls.create(tone));
      return tail === undefined
        ? Chain.queued(path, balls, setup.chain)
        : Chain.placed(path, balls, setup.chain, tail);
    });
    this.lastShooter = this.chains.map(() => 'player');
    this.tempo = setup.rhythm ? new Tempo(setup.rhythm) : null;
    this.routes = setup.chains.map(({ route }) => {
      if (!route) return null;
      const choices: Branch[] = Array.from({ length: route.forkCount }, () => 'short');
      return { choices, spans: route.build(choices).spans };
    });
    this.reflectors = new Reflectors(setup.reflectors ?? []);
    this.gravity = setup.gravity ? new Gravity(setup.gravity) : null;
    this.orbit = setup.orbit ? new Orbit(setup.orbit) : null;
    this.charges = setup.magnet?.charges ?? 0;
    this.context = this.createContext();
    this.objective = Game.objectiveFor(setup);
    this.objective.start(this.context);
    this.shooter = new Shooter(
      this.orbit?.position ?? setup.shooter,
      random,
      setup.projectileSpeed,
      setup.fireCooldown,
      this.shooterTones(),
      { choosing: setup.puzzle !== undefined },
    );
    const rival = setup.duel?.rival;
    this.rival = rival
      ? new Shooter(rival.position, random, setup.projectileSpeed, 0, this.shooterTones(), {
          side: 'rival',
        })
      : null;
    this.rivalBrain = rival ? new Rival(rival, random) : null;
  }

  /** What wins (or loses) this level, from its setup. */
  private static objectiveFor(setup: LevelSetup): Objective {
    if (setup.colossus) return new ColossusObjective(setup.colossus);
    if (setup.endless) return new EndlessObjective(setup.endless);
    if (setup.puzzle) return new PuzzleObjective();
    if (setup.duel) return new DuelObjective(setup.duel);
    return new ClearObjective();
  }

  /** Shots left in Puzzle mode, or null without a limit. */
  get shotsLeft(): number | null {
    return this.setup.puzzle ? Math.max(0, this.setup.puzzle.shots - this.shotsFired) : null;
  }

  /** The groove multiplier of Rhythm mode (1 elsewhere). */
  get grooveMultiplier(): number {
    return this.groove.multiplier;
  }

  /** The rival's score in Duel mode. */
  get rivalScore(): number {
    return this.rivalScoring.score;
  }

  /** Current stage of Endless mode, or null. */
  get stage(): number | null {
    return this.objective instanceof EndlessObjective ? this.objective.stage : null;
  }

  /** Health of the Colossus of a boss level, or null. */
  get colossus(): { readonly hp: number; readonly maxHp: number; readonly phase: number } | null {
    if (!(this.objective instanceof ColossusObjective)) return null;
    const { hp, phase, setup } = this.objective;
    return { hp, maxHp: setup.hp, phase };
  }

  get state(): GameState {
    return this.stateValue;
  }

  get score(): number {
    return this.scoring.score;
  }

  get streak(): number {
    return this.scoring.streak;
  }

  /** Deepest chain reaction of the game. */
  get bestDepth(): number {
    return this.scoring.bestDepth;
  }

  /** Seconds of play simulated so far. */
  get elapsed(): number {
    return this.elapsedValue;
  }

  get projectiles(): readonly ProjectileView[] {
    return this.flying;
  }

  /**
   * Where the loaded ball would go: the shooter, each mirror it bounces off
   * (up to `maxBounces`), and the point where it touches a ball or gives up.
   * Uses the projectiles' own bounce rule, so the line never lies.
   */
  aimPath(maxBounces = 2): Vec2[] {
    return this.trace(maxBounces).points;
  }

  /**
   * The aim line and, apart, the points where it bounces off a mirror; for a
   * charged shot, straight and fast whatever the gravity.
   */
  aimLine(maxBounces = 2, power = false): { readonly points: Vec2[]; readonly rebounds: Vec2[] } {
    const { points, rebounds } = this.trace(maxBounces, power);
    return { points, rebounds };
  }

  /**
   * Where the loaded ball would land and the group it would make (aim
   * assistance, § 3.9): the slot it takes, and the balls of its colour that
   * would explode with it, if they are enough. Null without a target, or when
   * the shot would fuse instead (Jewel world).
   */
  preview(power = false): {
    readonly position: Vec2;
    readonly group: readonly Vec2[];
  } | null {
    const target = this.trace(2, power).target;
    if (!target) return null;
    const chain = this.chains[target.chain]!;
    const balls = chain.balls;
    const touched = balls[target.index]!;
    const tone = this.shooter.current;
    if (this.setup.alchemy && mix(tone, touched.tone) !== null) return null;
    const diameter = chain.diameter;
    // Between the touched ball and its neighbour, where the shot wedges itself in.
    const position = chain.path.pointAt(touched.s + (target.after ? diameter : -diameter) / 2);
    const touching = (a: number, b: number) =>
      Math.abs(balls[b]!.s - balls[a]!.s) <= diameter + 1e-6;
    const group: Vec2[] = [];
    // The ball before the new one is the touched one when it lands after it.
    let behind = target.after ? target.index : target.index - 1;
    for (let i = behind; i >= 0 && balls[i]!.tone === tone; i--) {
      if (i < behind && !touching(i, i + 1)) break;
      group.push(chain.positionOf(balls[i]!));
      behind = i;
    }
    const ahead = target.after ? target.index + 1 : target.index;
    for (let i = ahead; i < balls.length && balls[i]!.tone === tone; i++) {
      if (i > ahead && !touching(i - 1, i)) break;
      group.push(chain.positionOf(balls[i]!));
    }
    const enough = group.length + 1 >= this.setup.chain.minMatch;
    return { position, group: enough ? group : [] };
  }

  /** The ring the shooter glides along, or null when it stands still. */
  get ring(): OrbitSetup | null {
    return this.orbit?.setup ?? null;
  }

  /** Every switch of the board, with its branch and whether the chain has reached it. */
  switches(): SwitchView[] {
    const views: SwitchView[] = [];
    this.routes.forEach((state, chain) => {
      if (!state) return;
      const track = this.chains[chain]!;
      state.spans.forEach((span, fork) => {
        views.push({
          chain,
          fork,
          branch: state.choices[fork]!,
          locked: this.isLocked(chain, fork),
          position: track.path.pointAt(span.start),
        });
      });
    });
    return views;
  }

  /** Sends the chain the other way at a fork it has not reached yet. */
  toggleSwitch(chain: number, fork: number): boolean {
    const state = this.routes[chain];
    const route = this.setup.chains[chain]?.route;
    if (this.stateValue !== 'playing' || !state || !route || fork >= state.choices.length) {
      return false;
    }
    if (this.isLocked(chain, fork)) return false;
    state.choices[fork] = state.choices[fork] === 'short' ? 'long' : 'short';
    const built = route.build(state.choices);
    state.spans = built.spans;
    this.chains[chain]!.setPath(built.path);
    this.flips++;
    this.events.emit('switched', { chain, fork, branch: state.choices[fork] });
    return true;
  }

  private isLocked(chain: number, fork: number): boolean {
    const span = this.routes[chain]?.spans[fork];
    if (!span) return true;
    return this.chains[chain]!.front >= span.start - this.setup.chain.ballRadius;
  }

  /** True if any of these balls sits on the short branch of a fork (Volcano world). */
  private isHot(chain: number, balls: readonly BallView[]): boolean {
    const spans = this.routes[chain]?.spans;
    if (!spans) return false;
    return balls.some((ball) =>
      spans.some((span) => span.branch === 'short' && ball.s >= span.start && ball.s <= span.end),
    );
  }

  /** The ball the aim line meets first (rebounds included), or null. */
  aimTarget(): { readonly chain: number; readonly index: number; readonly ball: BallView } | null {
    const target = this.trace(2).target;
    if (!target) return null;
    return { ...target, ball: this.chains[target.chain]!.balls[target.index]! };
  }

  /** Magnet charges left, or null on a level without a magnet. */
  get magnet(): { readonly charges: number; readonly max: number } | null {
    const setup = this.setup.magnet;
    return setup ? { charges: this.charges, max: setup.max } : null;
  }

  /**
   * Pulls the ball the aim line meets out of its chain and loads it into the
   * shooter (Abyss world). False without a charge, a target, or while reloading.
   */
  pull(): boolean {
    if (this.stateValue !== 'playing' || this.charges <= 0 || !this.shooter.ready) return false;
    const target = this.trace(2).target;
    if (!target) return false;
    const chain = this.chains[target.chain]!;
    const position = chain.positionOf(chain.balls[target.index]!);
    const ball = chain.extract(target.index);
    this.shooter.load(ball.tone);
    this.charges--;
    this.pulls++;
    this.events.emit('pulled', { chain: target.chain, ball, position });
    return true;
  }

  /**
   * Follows the aim, rebounds and gravity included, up to the first ball it
   * meets. Without gravity it walks the straight line in small steps; with
   * gravity it integrates exactly like a flying projectile does.
   */
  private trace(
    maxBounces: number,
    power = false,
    reach = 1800,
    step = 12,
    skip = 80,
  ): {
    points: Vec2[];
    rebounds: Vec2[];
    target: { chain: number; index: number; after: boolean } | null;
  } {
    const radius = this.setup.chain.ballRadius;
    const gravity = power ? null : this.gravity;
    const speed = this.setup.projectileSpeed * (power ? POWER_SPEED : 1);
    const dt = gravity ? STEP : step / speed;
    let position = this.shooter.position;
    let velocity = Vec2.fromAngle(this.shooter.angle, speed);
    const points = [position];
    const rebounds: Vec2[] = [];
    let travelled = 0;
    for (let k = 0; travelled < reach && k * dt < MAX_FLIGHT; k++) {
      if (gravity) velocity = velocity.add(gravity.acceleration(position).scale(dt));
      const move = velocity.scale(dt);
      position = position.add(move);
      travelled += move.length();
      const bounce = this.reflectors.bounce(position, velocity, radius);
      if (bounce) {
        position = bounce.position;
        velocity = bounce.velocity;
        points.push(position);
        rebounds.push(position);
        if (rebounds.length > maxBounces) return { points, rebounds, target: null };
      } else if (gravity && k % 4 === 3) {
        points.push(position);
      }
      if (gravity?.swallows(position)) {
        points.push(position);
        return { points, rebounds, target: null };
      }
      if (travelled <= skip) continue;
      for (let chain = 0; chain < this.chains.length; chain++) {
        const hit = this.chains[chain]!.hitTest(position);
        if (!hit) continue;
        points.push(position);
        return { points, rebounds, target: { chain, index: hit.index, after: hit.after } };
      }
    }
    points.push(position);
    return { points, rebounds, target: null };
  }

  aimAt(target: Vec2): void {
    this.shooter.aimAt(target);
  }

  /** Everything progression needs to know about this game so far. */
  summary(): GameReport {
    return {
      outcome: this.stateValue,
      score: this.scoring.score,
      seconds: this.elapsedValue,
      ballsDestroyed: this.scoring.ballsDestroyed,
      bestDepth: this.scoring.bestDepth,
      bestStreak: this.scoring.bestStreak,
      bestBounce: this.scoring.bestBounce,
      swaps: this.swaps,
      pulls: this.pulls,
      fusions: this.fusions,
      switches: this.flips,
      curves: this.curves,
      shots: this.shotsFired,
      bestGroove: this.bestGroove,
      stage: this.stage ?? 0,
      rivalScore: this.rivalScoring.score,
      danger: this.danger,
      colossusDefeated: this.stateValue === 'won' && this.setup.colossus !== undefined,
    };
  }

  swap(): void {
    if (this.stateValue !== 'playing') return;
    this.shooter.swap(this.shooterTones());
    this.swaps++;
  }

  /**
   * Fires the loaded ball, charged or not; false while reloading, out of
   * shots or once the game is over.
   */
  fire(power = false): boolean {
    if (this.stateValue !== 'playing' || this.shotsLeft === 0) return false;
    const projectile = this.shooter.fire(this.shooterTones(), power ? POWER_SPEED : 1);
    if (!projectile) return false;
    this.shotsFired++;
    this.flying.push(projectile);
    this.events.emit('fired', { projectile });
    if (this.tempo) {
      const onBeat = this.tempo.onBeat(this.elapsedValue);
      this.groove.shot(onBeat);
      this.bestGroove = Math.max(this.bestGroove, this.groove.multiplier);
      this.events.emit('groove', { onBeat, multiplier: this.groove.multiplier });
    }
    return true;
  }

  /** Duel mode: the rival plays its turn when it is ready. */
  private playRival(dt: number): void {
    const rival = this.rival;
    const brain = this.rivalBrain;
    if (!rival || !brain) return;
    rival.tick(dt);
    rival.refresh(this.shooterTones());
    const move = brain.think(dt, this.chains, rival.current, rival.next);
    if (!move) return;
    if (move.swap) rival.swap();
    rival.aimAt(move.target);
    const projectile = rival.fire(this.shooterTones());
    if (!projectile) return;
    this.flying.push(projectile);
    this.events.emit('fired', { projectile });
  }

  /** Rhythm mode: the chain moves to the music, and every beat is announced. */
  private followTempo(): void {
    if (!this.tempo) return;
    const pulse = this.tempo.pulse(this.elapsedValue);
    for (const chain of this.chains) chain.setSpeedFactor(pulse);
    const beat = Math.floor(this.tempo.beats(this.elapsedValue));
    if (beat > this.beatIndex) {
      this.beatIndex = beat;
      this.events.emit('beat', { index: beat });
    }
  }

  /** Advances the game by a real frame duration, in seconds. */
  update(frame: number): void {
    this.accumulator += Math.min(Math.max(frame, 0), MAX_FRAME);
    // The tolerance absorbs the rounding of frame durations such as 1/30 s.
    while (this.accumulator >= STEP - 1e-9 && this.stateValue === 'playing') {
      this.accumulator -= STEP;
      this.step(STEP);
    }
  }

  private step(dt: number): void {
    this.elapsedValue += dt;
    if (this.orbit) {
      this.orbit.advance(dt);
      this.shooter.moveTo(this.orbit.position);
    }
    this.shooter.tick(dt);
    this.followTempo();
    this.playRival(dt);
    this.reflectors.update(dt);
    this.moveProjectiles(dt);
    this.chains.forEach((chain, index) => {
      for (const explosion of chain.advance(dt)) this.report(index, chain, explosion);
    });
    this.objective.update(this.context, dt);
    for (const chain of this.chains) {
      const head = chain.balls[chain.balls.length - 1];
      if (head) this.danger = Math.max(this.danger, head.s / chain.path.length);
    }
    this.shooter.refresh(this.shooterTones());
    this.checkEnd();
  }

  private moveProjectiles(dt: number): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const projectile = this.flying[i]!;
      if (this.gravity && !projectile.powered) {
        projectile.accelerate(this.gravity.acceleration(projectile.position), dt);
      }
      projectile.move(dt);
      const bounce = this.reflectors.bounce(
        projectile.position,
        projectile.velocity,
        this.setup.chain.ballRadius,
      );
      if (bounce) {
        projectile.bounce(bounce.position, bounce.velocity);
        this.events.emit('bounced', { projectile, position: bounce.position });
        if (projectile.bounces > MAX_BOUNCES) {
          this.flying.splice(i, 1);
          this.scoringOf(projectile.by).miss();
          this.events.emit('missed', { projectile });
          continue;
        }
      }
      if (this.land(projectile) || this.leave(projectile) || this.fall(projectile)) {
        this.flying.splice(i, 1);
      }
    }
  }

  /** Inserts the projectile into the first chain it touches; true if it landed. */
  private land(projectile: Projectile): boolean {
    for (let index = 0; index < this.chains.length; index++) {
      const chain = this.chains[index]!;
      const hit = chain.hitTest(projectile.position);
      if (!hit) continue;
      if (this.fuse(index, chain, hit.index, projectile)) return true;
      this.lastShooter[index] = projectile.by;
      const ball = this.balls.create(projectile.tone);
      const explosion = chain.insert(ball, hit);
      this.events.emit('inserted', { chain: index, ball, from: projectile.position });
      if (explosion) {
        this.countCurve(projectile);
        this.report(index, chain, explosion, projectile.bounces);
      } else this.scoringOf(projectile.by).miss();
      return true;
    }
    return false;
  }

  /** A shot that exploded balls after gravity bent it hard enough counts as a curve. */
  private countCurve(projectile: Projectile): void {
    if (this.gravity && projectile.deflection >= CURVE_ANGLE) this.curves++;
  }

  /**
   * Singularity world: true if the shot fell into the black hole or circled
   * it for too long. Either way it is a miss.
   */
  private fall(projectile: Projectile): boolean {
    if (!this.gravity) return false;
    const swallowed = this.gravity.swallows(projectile.position);
    if (!swallowed && projectile.age < MAX_FLIGHT) return false;
    this.scoringOf(projectile.by).miss();
    if (swallowed) this.events.emit('swallowed', { projectile });
    this.events.emit('missed', { projectile });
    return true;
  }

  /** Jewel world: a primary shot onto another primary fuses with it. True if it did. */
  private fuse(index: number, chain: Chain, ballIndex: number, projectile: Projectile): boolean {
    if (!this.setup.alchemy) return false;
    const touched = chain.balls[ballIndex]!;
    const mixed = mix(projectile.tone, touched.tone);
    if (mixed === null) return false;
    const from: readonly [Tone, Tone] = [projectile.tone, touched.tone];
    this.lastShooter[index] = projectile.by;
    const position = chain.positionOf(touched);
    const explosion = chain.recolour(ballIndex, mixed);
    this.fusions++;
    this.events.emit('fused', { chain: index, ball: touched, from, position });
    if (explosion) {
      this.countCurve(projectile);
      this.report(index, chain, explosion, projectile.bounces);
    } else this.scoringOf(projectile.by).miss();
    return true;
  }

  /** True once the projectile has left the board (plus a margin): a miss. */
  private leave(projectile: Projectile): boolean {
    const margin = this.setup.chain.ballRadius * 2;
    const { x, y } = projectile.position;
    const { width, height } = this.setup.board;
    if (x > -margin && y > -margin && x < width + margin && y < height + margin) return false;
    this.scoringOf(projectile.by).miss();
    this.events.emit('missed', { projectile });
    return true;
  }

  private scoringOf(side: Side): Scoring {
    return side === 'rival' ? this.rivalScoring : this.scoring;
  }

  private report(index: number, chain: Chain, explosion: Explosion, bounces = 0): void {
    const hot = this.isHot(index, explosion.balls);
    const by = this.lastShooter[index] ?? 'player';
    const groove = by === 'player' && this.tempo ? this.groove.multiplier : 1;
    const points = this.scoringOf(by).explosion(
      explosion.balls.length,
      explosion.depth,
      explosion.cause === 'shot',
      bounces,
      (hot ? HOT_MULTIPLIER : 1) * groove,
    );
    this.events.emit('exploded', {
      chain: index,
      balls: explosion.balls,
      positions: explosion.balls.map((ball) => chain.positionOf(ball)),
      cause: explosion.cause,
      depth: explosion.depth,
      points,
      streak: this.scoringOf(by).streak,
      bounces,
      hot,
      by,
    });
    this.objective.onExplosion(this.context, index, explosion, by);
    if (by === 'player') this.rechargeMagnet();
  }

  /** Every few explosions, the magnet gets a charge back. */
  private rechargeMagnet(): void {
    const setup = this.setup.magnet;
    if (!setup || this.charges >= setup.max) return;
    if (++this.towardsCharge < setup.rechargeEvery) return;
    this.towardsCharge = 0;
    this.charges++;
    this.events.emit('magnetCharged', { charges: this.charges });
  }

  private checkEnd(): void {
    if (this.chains.some((chain) => chain.reachedHole)) this.end('lost');
    else if (this.objective.isComplete(this.context)) this.end('won');
    else if (this.objective.isFailed?.(this.context)) this.end('lost');
  }

  private end(outcome: 'won' | 'lost'): void {
    this.stateValue = outcome;
    this.flying.length = 0;
    let bonus = 0;
    if (outcome === 'won') {
      // Whatever is left on the track goes up in one final cascade, the player's.
      this.lastShooter.fill('player');
      this.chains.forEach((chain, index) => {
        const balls = chain.clear();
        if (balls.length > 0) this.report(index, chain, { balls, cause: 'reaction', depth: 1 });
      });
      bonus = Scoring.levelBonus(this.elapsedValue, this.setup.parTime);
      this.scoring.bonus(bonus);
    }
    this.events.emit('ended', { outcome, score: this.scoring.score, bonus });
  }

  private createContext(): ObjectiveContext {
    const tones = Math.max(2, ...this.setup.chains.map(({ recipe }) => recipe.tones));
    const palette = this.setup.chains[0]?.recipe.palette;
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- getters below read the game
    const game = this;
    return {
      chains: this.chains,
      get elapsed() {
        return game.elapsedValue;
      },
      get shotsLeft() {
        return game.shotsLeft;
      },
      get inFlight() {
        return game.flying.length;
      },
      createBalls: (count, colours = tones) =>
        this.generator
          .tones({
            length: count,
            tones: colours,
            repeatChance: 0.35,
            ...(palette ? { palette } : {}),
            ...(this.setup.alchemy ? { paired: SECONDARIES } : {}),
          })
          .map((tone) => this.balls.create(tone)),
      colossusHit: (event) => this.events.emit('colossusHit', event),
      colossusPhase: (event) => this.events.emit('colossusPhase', event),
      stageReached: (event) => this.events.emit('stage', event),
    };
  }

  /**
   * What the shooter may load: colours still on the track. In the Jewel world,
   * only primaries: those on the track, and those a mixed colour on the track
   * is made of (never a colour that can no longer help).
   */
  private shooterTones(): Tone[] {
    const available = this.availableTones();
    if (!this.setup.alchemy) return available;
    const useful = new Set<Tone>();
    for (const tone of available) {
      if (PRIMARIES.includes(tone)) useful.add(tone);
      for (const part of ingredients(tone) ?? []) useful.add(part);
    }
    return useful.size > 0 ? [...useful].sort((a, b) => a - b) : [...PRIMARIES];
  }

  private availableTones(): Tone[] {
    const tones = new Set<Tone>();
    for (const chain of this.chains) for (const tone of chain.tones()) tones.add(tone);
    return [...tones].sort((a, b) => a - b);
  }
}
