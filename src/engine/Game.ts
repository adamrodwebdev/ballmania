import { BallFactory, type BallView, type Tone } from './chain/Ball';
import { Chain, type ChainParams, type Explosion, type ExplosionCause } from './chain/Chain';
import { ChainGenerator, type ChainRecipe } from './chain/ChainGenerator';
import { Emitter } from './core/Emitter';
import type { RandomSource } from './core/Random';
import { Vec2 } from './geometry/Vec2';
import { ColossusObjective, type ColossusSetup } from './objectives/ColossusObjective';
import { ClearObjective, type Objective, type ObjectiveContext } from './objectives/Objective';
import type { Path } from './path/Path';
import { Reflectors, type ReflectorSetup } from './reflectors/Reflectors';
import { Scoring } from './Scoring';
import type { Projectile, ProjectileView } from './shooter/Projectile';
import { Shooter } from './shooter/Shooter';

export interface ChainSetup {
  readonly path: Path;
  readonly recipe: ChainRecipe;
}

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
  /** Furthest any chain head got, as a share of its track (1 = the hole). */
  readonly danger: number;
  readonly colossusDefeated: boolean;
}

/** Domain events: rendering, sound and vibrations subscribe; the engine knows none of them. */
export interface GameEvents {
  fired: { readonly projectile: ProjectileView };
  bounced: { readonly projectile: ProjectileView; readonly position: Vec2 };
  inserted: { readonly chain: number; readonly ball: BallView; readonly from: Vec2 };
  missed: { readonly projectile: ProjectileView };
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
  private readonly balls = new BallFactory();
  private readonly flying: Projectile[] = [];
  private readonly objective: Objective;
  private readonly context: ObjectiveContext;
  private readonly generator: ChainGenerator;
  readonly reflectors: Reflectors;
  private accumulator = 0;
  private elapsedValue = 0;
  private stateValue: GameState = 'playing';
  private swaps = 0;
  private danger = 0;

  constructor(
    readonly setup: LevelSetup,
    random: RandomSource,
  ) {
    const generator = new ChainGenerator(random, setup.chain.minMatch);
    this.generator = generator;
    this.chains = setup.chains.map(({ path, recipe }) =>
      Chain.queued(
        path,
        generator.tones(recipe).map((tone) => this.balls.create(tone)),
        setup.chain,
      ),
    );
    this.reflectors = new Reflectors(setup.reflectors ?? []);
    this.context = this.createContext();
    this.objective = setup.colossus ? new ColossusObjective(setup.colossus) : new ClearObjective();
    this.objective.start(this.context);
    this.shooter = new Shooter(
      setup.shooter,
      random,
      setup.projectileSpeed,
      setup.fireCooldown,
      this.availableTones(),
    );
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
  aimPath(maxBounces = 2, reach = 1800, step = 12, skip = 80): Vec2[] {
    const radius = this.setup.chain.ballRadius;
    let position = this.shooter.position;
    let velocity = Vec2.fromAngle(this.shooter.angle);
    const points = [position];
    let bounces = 0;
    for (let travelled = 0; travelled < reach; travelled += step) {
      position = position.add(velocity.scale(step));
      const bounce = this.reflectors.bounce(position, velocity, radius);
      if (bounce) {
        position = bounce.position;
        velocity = bounce.velocity;
        points.push(position);
        if (++bounces > maxBounces) return points;
      }
      if (travelled > skip && this.chains.some((chain) => chain.hitTest(position) !== null)) {
        points.push(position);
        return points;
      }
    }
    points.push(position);
    return points;
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
      danger: this.danger,
      colossusDefeated: this.stateValue === 'won' && this.setup.colossus !== undefined,
    };
  }

  swap(): void {
    if (this.stateValue !== 'playing') return;
    this.shooter.swap();
    this.swaps++;
  }

  /** Fires the loaded ball; false while reloading or once the game is over. */
  fire(): boolean {
    if (this.stateValue !== 'playing') return false;
    const projectile = this.shooter.fire(this.availableTones());
    if (!projectile) return false;
    this.flying.push(projectile);
    this.events.emit('fired', { projectile });
    return true;
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
    this.shooter.tick(dt);
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
    this.shooter.refresh(this.availableTones());
    this.checkEnd();
  }

  private moveProjectiles(dt: number): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const projectile = this.flying[i]!;
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
          this.scoring.miss();
          this.events.emit('missed', { projectile });
          continue;
        }
      }
      if (this.land(projectile) || this.leave(projectile)) this.flying.splice(i, 1);
    }
  }

  /** Inserts the projectile into the first chain it touches; true if it landed. */
  private land(projectile: Projectile): boolean {
    for (let index = 0; index < this.chains.length; index++) {
      const chain = this.chains[index]!;
      const hit = chain.hitTest(projectile.position);
      if (!hit) continue;
      const ball = this.balls.create(projectile.tone);
      const explosion = chain.insert(ball, hit);
      this.events.emit('inserted', { chain: index, ball, from: projectile.position });
      if (explosion) this.report(index, chain, explosion, projectile.bounces);
      else this.scoring.miss();
      return true;
    }
    return false;
  }

  /** True once the projectile has left the board (plus a margin): a miss. */
  private leave(projectile: Projectile): boolean {
    const margin = this.setup.chain.ballRadius * 2;
    const { x, y } = projectile.position;
    const { width, height } = this.setup.board;
    if (x > -margin && y > -margin && x < width + margin && y < height + margin) return false;
    this.scoring.miss();
    this.events.emit('missed', { projectile });
    return true;
  }

  private report(index: number, chain: Chain, explosion: Explosion, bounces = 0): void {
    const points = this.scoring.explosion(
      explosion.balls.length,
      explosion.depth,
      explosion.cause === 'shot',
      bounces,
    );
    this.events.emit('exploded', {
      chain: index,
      balls: explosion.balls,
      positions: explosion.balls.map((ball) => chain.positionOf(ball)),
      cause: explosion.cause,
      depth: explosion.depth,
      points,
      streak: this.scoring.streak,
      bounces,
    });
    this.objective.onExplosion(this.context, index, explosion);
  }

  private checkEnd(): void {
    if (this.chains.some((chain) => chain.reachedHole)) this.end('lost');
    else if (this.objective.isComplete(this.context)) this.end('won');
  }

  private end(outcome: 'won' | 'lost'): void {
    this.stateValue = outcome;
    this.flying.length = 0;
    let bonus = 0;
    if (outcome === 'won') {
      // Whatever is left on the track goes up in one final cascade.
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
    return {
      chains: this.chains,
      createBalls: (count) =>
        this.generator
          .tones({ length: count, tones, repeatChance: 0.35 })
          .map((tone) => this.balls.create(tone)),
      colossusHit: (event) => this.events.emit('colossusHit', event),
      colossusPhase: (event) => this.events.emit('colossusPhase', event),
    };
  }

  private availableTones(): Tone[] {
    const tones = new Set<Tone>();
    for (const chain of this.chains) for (const tone of chain.tones()) tones.add(tone);
    return [...tones].sort((a, b) => a - b);
  }
}
