import { BallFactory, type BallView, type Tone } from './chain/Ball';
import { Chain, type ChainParams, type Explosion, type ExplosionCause } from './chain/Chain';
import { ChainGenerator, type ChainRecipe } from './chain/ChainGenerator';
import { Emitter } from './core/Emitter';
import type { RandomSource } from './core/Random';
import type { Vec2 } from './geometry/Vec2';
import type { Path } from './path/Path';
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
}

export type GameState = 'playing' | 'won' | 'lost';

/** Domain events: rendering, sound and vibrations subscribe; the engine knows none of them. */
export interface GameEvents {
  fired: { readonly projectile: ProjectileView };
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
  };
  ended: { readonly outcome: 'won' | 'lost'; readonly score: number };
}

/** Fixed simulation step: the same inputs always give the same game, at any frame rate. */
export const STEP = 1 / 120;
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
  private accumulator = 0;
  private elapsedValue = 0;
  private stateValue: GameState = 'playing';

  constructor(
    readonly setup: LevelSetup,
    random: RandomSource,
  ) {
    const generator = new ChainGenerator(random, setup.chain.minMatch);
    this.chains = setup.chains.map(({ path, recipe }) =>
      Chain.queued(
        path,
        generator.tones(recipe).map((tone) => this.balls.create(tone)),
        setup.chain,
      ),
    );
    this.shooter = new Shooter(
      setup.shooter,
      random,
      setup.projectileSpeed,
      setup.fireCooldown,
      this.availableTones(),
    );
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

  aimAt(target: Vec2): void {
    this.shooter.aimAt(target);
  }

  swap(): void {
    if (this.stateValue === 'playing') this.shooter.swap();
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
    this.moveProjectiles(dt);
    this.chains.forEach((chain, index) => {
      for (const explosion of chain.advance(dt)) this.report(index, chain, explosion);
    });
    this.shooter.refresh(this.availableTones());
    this.checkEnd();
  }

  private moveProjectiles(dt: number): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const projectile = this.flying[i]!;
      projectile.move(dt);
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
      if (explosion) this.report(index, chain, explosion);
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

  private report(index: number, chain: Chain, explosion: Explosion): void {
    const points = this.scoring.explosion(
      explosion.balls.length,
      explosion.depth,
      explosion.cause === 'shot',
    );
    this.events.emit('exploded', {
      chain: index,
      balls: explosion.balls,
      positions: explosion.balls.map((ball) => chain.positionOf(ball)),
      cause: explosion.cause,
      depth: explosion.depth,
      points,
      streak: this.scoring.streak,
    });
  }

  private checkEnd(): void {
    if (this.chains.some((chain) => chain.reachedHole)) this.end('lost');
    else if (this.chains.every((chain) => chain.isEmpty)) this.end('won');
  }

  private end(outcome: 'won' | 'lost'): void {
    this.stateValue = outcome;
    this.flying.length = 0;
    this.events.emit('ended', { outcome, score: this.scoring.score });
  }

  private availableTones(): Tone[] {
    const tones = new Set<Tone>();
    for (const chain of this.chains) for (const tone of chain.tones()) tones.add(tone);
    return [...tones].sort((a, b) => a - b);
  }
}
