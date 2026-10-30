import { FUSE_REACH, ingredients, mix, offCentre, PRIMARIES, SECONDARIES } from './chain/Alchemy';
import { BallFactory, MAX_TONES, type BallView, type Tone } from './chain/Ball';
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
import {
  Arrhythmia,
  METEOR_WARNING,
  MeteorShower,
  Weather,
  type HazardSetup,
  type WeatherEpisode,
  type WeatherKind,
} from './hazards/Hazards';
import { Gravity, type GravitySetup } from './orbit/Gravity';
import { StarFragments, type Fragment } from './upgrades/StarFragments';
import { Upgrades, type UpgradeRanks } from './upgrades/Upgrades';
import { Orbit, type OrbitSetup } from './orbit/Orbit';
import { PowerEffects } from './powers/PowerEffects';
import {
  LASER_PIERCE,
  POWER_BONUS,
  placeInBatch,
  placePowers,
  powerOf,
  type PowerKind,
  type PowerSetup,
  type PowerShot,
} from './powers/Powers';
import type { Branch, ForkSpan, ForkedRoute } from './path/ForkedRoute';
import type { Path } from './path/Path';
import { Reflectors, type ReflectorSetup } from './reflectors/Reflectors';
import { CLEAR_BONUS, Scoring } from './Scoring';
import type { Projectile, ProjectileSpecial, ProjectileView } from './shooter/Projectile';
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

/** The aim line, the points where it bounces, and the ball it meets first. */
export interface AimLine {
  readonly points: Vec2[];
  readonly rebounds: Vec2[];
  /**
   * The ball met, by its chain and index, the side where the shot would land,
   * and whether it would meet it near its centre (Jewel world: it fuses then).
   */
  readonly target: {
    readonly chain: number;
    readonly index: number;
    readonly after: boolean;
    readonly centred: boolean;
  } | null;
}

/** Indexes of the touching balls of `colour` from `from` along a chain's balls, going `step`. */
function runOf(
  balls: readonly BallView[],
  diameter: number,
  { from, step, colour }: { readonly from: number; readonly step: 1 | -1; readonly colour: Tone },
): number[] {
  const found: number[] = [];
  for (let i = from; i >= 0 && i < balls.length && balls[i]!.tone === colour; i += step) {
    const previous = balls[i - step];
    if (i !== from && previous && Math.abs(balls[i]!.s - previous.s) > diameter + 1e-6) break;
    found.push(i);
  }
  return found;
}

/**
 * Where a shot would land and what it would set off: the slot it takes, the
 * balls of its colour that would explode with it, and the chain reaction
 * that would follow (when asked).
 */
export interface ShotPreview {
  readonly position: Vec2;
  readonly group: readonly Vec2[];
  readonly reaction: readonly Vec2[];
}

/** A switch of the board, as the interface needs it. */
export interface SwitchView {
  readonly chain: number;
  readonly fork: number;
  readonly branch: Branch;
  /** The chain has reached it: it can no longer be flipped. */
  readonly locked: boolean;
  readonly position: Vec2;
  /** How far along its chain's track the fork begins. */
  readonly start: number;
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
  /** Falling balls, arrhythmia and weather (§ 3.9). */
  readonly hazards?: HazardSetup;
  /** Every explosion's points are multiplied by this (campaign difficulty); 1 by default. */
  readonly scoreFactor?: number;
  /** The Observatory's upgrades the player owns (campaign, § 3.9). */
  readonly upgrades?: UpgradeRanks;
  /** Star fragments cross the board every `every` seconds, on average (campaign). */
  readonly fragments?: { readonly every: number };
  /**
   * A present for the very first shot (level 1-1): it is a Nova bomb, an
   * upgrade the player otherwise earns much later. A big burst in the first
   * seconds, and a glimpse of what the game holds.
   */
  readonly gift?: 'bomb';
  /** Balls of the chain that hold a power, set off when they explode (v1.7). */
  readonly powers?: PowerSetup;
  /** The first colours the launcher deals (level 1-1: the colour its showcase needs). */
  readonly opening?: readonly Tone[];
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
  /** Of those, shots fired charged (a laser aside). */
  readonly chargedShots: number;
  /** Balls still in the chains, on the track or in its tunnel, when the game ended (0 after a win). */
  readonly ballsLeft: number;
  /** The Colossus as the game ended (its hit points left and at the start), or null without one. */
  readonly colossus: { readonly hp: number; readonly maxHp: number } | null;
  /** Highest groove multiplier reached (Rhythm mode; 1 elsewhere). */
  readonly bestGroove: number;
  /** Last stage reached (Endless mode; 0 elsewhere). */
  readonly stage: number;
  /** The rival's score (Duel mode; 0 elsewhere). */
  readonly rivalScore: number;
  /** Star fragments caught. */
  readonly fragments: number;
  /** Furthest any chain head got, as a share of its track (1 = the hole). */
  readonly danger: number;
  readonly colossusDefeated: boolean;
}

/** Domain events: rendering, sound and vibrations subscribe; the engine knows none of them. */
export interface GameEvents {
  fired: { readonly projectile: ProjectileView };
  /** The player swapped the loaded ball and the next one (v1.8.1); a puzzle hint's load does not. */
  swapped: { readonly current: Tone };
  /** Rhythm mode: a beat of the music. */
  beat: { readonly index: number };
  /** Rhythm mode: a shot was judged on or off the beat. */
  groove: { readonly onBeat: boolean; readonly multiplier: number };
  /** A ball is about to fall from the sky onto the chain, here. */
  meteorWarning: { readonly position: Vec2 };
  /** A ball fell from the sky into the chain. */
  meteor: { readonly chain: number; readonly ball: BallView; readonly position: Vec2 };
  /** An episode of weather starts or ends. */
  weather: { readonly kind: WeatherKind; readonly active: boolean; readonly massive: boolean };
  /** A shot caught a star fragment. */
  fragment: { readonly position: Vec2 };
  /** A bomb (Nova upgrade) went off. */
  bomb: { readonly position: Vec2; readonly radius: number };
  /** The Nova bomb is ready: the next shot is a bomb. */
  novaReady: Record<string, never>;
  /** A power ball exploded and its power is at work (v1.7); the shot earned `points`. */
  power: {
    readonly kind: PowerKind;
    readonly position: Vec2;
    /** Colour of the ball that held it. */
    readonly tone: Tone;
    readonly points: number;
  };
  /** Second chance (upgrade): the chain reached the hole and was pushed back, once. */
  secondChance: { readonly chain: number };
  /** After a defeat, the player chose to continue (a rewarded ad): the chains were pushed back. */
  revived: { readonly chains: readonly number[] };
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
  ended: {
    readonly outcome: 'won' | 'lost';
    readonly score: number;
    /** The whole end-of-level bonus, included in the score… */
    readonly bonus: number;
    /** …of which this much for the time: `ahead` whole seconds under the reference. */
    readonly timeBonus: number;
    readonly ahead: number;
  };
}

/** Fixed simulation step: the same inputs always give the same game, at any frame rate. */
export const STEP = 1 / 120;
/** A shot that bounced this many times shatters: no endless ping-pong. */
export const MAX_BOUNCES = 6;

/** Share of its track a chain is pushed back by when the player continues after a defeat. */
export const REVIVE_SHARE = 0.35;

/** Share of its track a chain that stops short of the hole is pushed back by if it gets in. */
export const HALT_PUSHBACK = 0.2;

/** Radius of a gift bomb (the training's first showcase): wider than the Nova at its best. */
export const GIFT_BOMB_RADIUS = 170;

/** Seconds a shot may fly before it is given up (one circling the black hole). */
export const MAX_FLIGHT = 4;
/**
 * The aim line: how far it is followed, its step without gravity or wind, and
 * the stretch at the barrel where it meets no ball.
 */
const TRACE_REACH = 1800;
const TRACE_STEP = 12;
const TRACE_SKIP = 80;
/** A charged shot flies this much faster (§ 3.9, module de tir). */
export const POWER_SPEED = 2;
/** Biting cold: how much slower shots fly, and the share of balls frosted, at strength 1. */
export const COLD_SLOWDOWN = 0.35;
export const FROST_SHARE = 0.18;
/** Wind: sideways pull on shots (units/s²) and change of the chain's pace, at strength 1. */
export const WIND_PULL = 700;
export const WIND_PACE = 0.35;

/** A shot bent at least this much by gravity is a curve (radians). */
export const CURVE_ANGLE = Math.PI / 4;

/**
 * Shots in a row of a colour with no pair on the board, after which the next
 * ball dealt is one of a colour that has a pair (a fairer draw, § 3.1).
 */
export const DRY_SHOTS = 2;

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
  private chargedFired = 0;
  /** The player's last shots in a row of a colour that had no pair on the board. */
  private dryShots = 0;
  private readonly random: RandomSource;
  /** The Observatory's upgrades (§ 3.9). */
  readonly upgrades: Upgrades;
  private readonly starFragments: StarFragments | null;
  private fragmentsCaught = 0;
  private novaCharge = 0;
  private secondChanceUsed = false;
  /** A bomb is going off: its balls do not charge the next one. */
  private bombing = false;
  /** The first shot is a gift bomb, until it goes off. */
  private gift: boolean;
  /** The gift bomb on its way: if it misses the chain, it comes back (v1.8.0). */
  private giftShot: Projectile | null = null;
  /** The powers at work: rewind, slow-down, a loaded rainbow or laser shot. */
  private readonly powers: PowerEffects;
  /** Balls fed since the last power ball (Endless, a Colossus), and the next power's turn. */
  private fedSincePower = 0;
  private powerTurn = 0;
  private readonly arrhythmia: Arrhythmia | null;
  private readonly meteors: MeteorShower | null;
  private readonly weatherSystem: Weather | null;
  /** Balls on their way down from the sky: the ball they will land after, and the time left. */
  private readonly falling: { chain: number; after: number; left: number; position: Vec2 }[] = [];
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
    this.random = random;
    this.upgrades = new Upgrades(setup.upgrades);
    this.gift = setup.gift === 'bomb';
    this.starFragments = setup.fragments
      ? new StarFragments(setup.fragments.every * this.upgrades.fragmentEvery, setup.board, random)
      : null;
    const hazards = setup.hazards;
    this.arrhythmia = hazards?.arrhythmia ? new Arrhythmia(hazards.arrhythmia) : null;
    this.meteors = hazards?.meteors ? new MeteorShower(hazards.meteors, random) : null;
    this.weatherSystem = hazards?.weather ? new Weather(hazards.weather, random) : null;
    const generator = new ChainGenerator(random, setup.chain.minMatch);
    this.generator = generator;
    this.chains = setup.chains.map(({ path, recipe, tones, tail }) => {
      const colours = tones ?? generator.tones(recipe);
      const powers = setup.powers ? placePowers(colours, setup.powers) : [];
      const balls = colours.map((tone, i) => this.balls.create(tone, 0, powers[i] ?? null));
      return tail === undefined
        ? Chain.queued(path, balls, setup.chain)
        : Chain.placed(path, balls, setup.chain, tail);
    });
    this.powers = new PowerEffects(this.chains, setup.chain.ballRadius * 2);
    this.lastShooter = this.chains.map(() => 'player');
    for (const chain of this.chains) chain.setPace(this.upgrades.chronos);
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
      {
        choosing: setup.puzzle !== undefined,
        ...(setup.opening ? { opening: setup.opening } : {}),
      },
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

  /** The weather now, or null in calm weather (or without weather). */
  get weather(): WeatherEpisode | null {
    return this.weatherSystem?.current ?? null;
  }

  /** Balls falling from the sky: where they will land, and how far down they are (0 to 1). */
  get meteorsFalling(): readonly { readonly position: Vec2; readonly progress: number }[] {
    return this.falling.map(({ position, left }) => ({
      position,
      progress: 1 - left / METEOR_WARNING,
    }));
  }

  /** Arrhythmia: the chain's pace now (1 = normal), or null without. */
  get arrhythmiaPace(): number | null {
    return this.arrhythmia?.pace(this.elapsedValue) ?? null;
  }

  /** Speed factor of the shots now: biting cold slows them down. */
  private get shotSpeedFactor(): number {
    const weather = this.weather;
    if (weather?.kind !== 'cold') return 1;
    return Math.max(0.4, 1 - COLD_SLOWDOWN * this.strength * this.upgrades.coldSlowdown);
  }

  /** Sideways pull of the wind on shots now, or null. */
  private get windPull(): Vec2 | null {
    const weather = this.weather;
    if (weather?.kind !== 'wind') return null;
    const pull = WIND_PULL * this.strength * this.upgrades.windPull;
    return pull === 0 ? null : new Vec2(weather.direction * pull, 0);
  }

  private get strength(): number {
    return this.setup.hazards?.weather?.strength ?? 1;
  }

  /** Star fragments crossing the board now. */
  get fragments(): readonly Fragment[] {
    return this.starFragments?.fragments ?? [];
  }

  /** Nova upgrade: how charged the bomb is, from 0 to 1, or null without it. */
  get nova(): number | null {
    const needed = this.upgrades.novaBalls;
    return needed === null ? null : Math.min(1, this.novaCharge / needed);
  }

  /**
   * What the loaded ball is: a bomb (Nova), the shot a power loaded (rainbow
   * or laser), a rainbow ball (prism), or a plain ball.
   */
  get loadedSpecial(): ProjectileSpecial {
    if (this.gift || this.nova === 1) return 'bomb';
    if (this.powers.loaded) return this.powers.loaded;
    const every = this.upgrades.prismEvery;
    return every !== null && (this.shotsFired + 1) % every === 0 ? 'wild' : null;
  }

  /** Seconds of slow-down left (a power); 0 when the chains run at their speed. */
  get slowRemaining(): number {
    return this.powers.slowRemaining;
  }

  /** The shot a power has loaded and that is not fired yet: rainbow or laser. */
  get powerShot(): PowerShot | null {
    return this.powers.loaded;
  }

  /** True while a Rewind pulls the chains back. */
  get rewinding(): boolean {
    return this.powers.rewinding;
  }

  /**
   * A laser is loaded: the balls it would pierce if fired now, and where its
   * beam ends. Null when no laser is loaded.
   */
  laserPath(): { readonly targets: readonly Vec2[]; readonly end: Vec2 } | null {
    if (this.loadedSpecial !== 'laser') return null;
    const radius = this.setup.chain.ballRadius;
    const { width, height } = this.setup.board;
    const direction = Vec2.fromAngle(this.shooter.angle, 1);
    const targets: Vec2[] = [];
    const seen = new Set<number>();
    let end = this.shooter.position;
    for (let travelled = 0; travelled < width + height; travelled += radius) {
      end = this.shooter.position.add(direction.scale(travelled));
      const outside =
        end.x < -radius || end.y < -radius || end.x > width + radius || end.y > height + radius;
      if (outside || targets.length >= LASER_PIERCE) break;
      for (const chain of this.chains) {
        const hit = chain.hitTest(end);
        const ball = hit ? chain.balls[hit.index] : undefined;
        if (!ball || seen.has(ball.id)) continue;
        seen.add(ball.id);
        targets.push(chain.positionOf(ball));
      }
    }
    return { targets, end };
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

  /** Shots that exploded balls after the black hole bent them hard enough (`CURVE_ANGLE`). */
  get curvedShots(): number {
    return this.curves;
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
   * The aim line and, apart, the points where it bounces off a mirror, with
   * the ball it meets first; for a charged shot, straight and fast whatever
   * the gravity. Followed once a frame (v1.7.6): the preview reuses it.
   */
  aimLine(maxBounces = 2, power = false): AimLine {
    return this.trace(maxBounces, power);
  }

  /**
   * The aim line the shooter would draw at `angle`, without turning it: the
   * training's hand looks for the shot its lesson teaches (v1.8.0).
   */
  aimLineAt(angle: number, maxBounces = 2): AimLine {
    return this.trace(maxBounces, false, angle);
  }

  /**
   * Where the loaded ball would land and the group it would make (aim
   * assistance, § 3.9): the slot it takes, and the balls of its colour that
   * would explode with it, if they are enough; with `reactions`, the chain
   * reaction that would follow (Œil stellaire, rank 3, and the training's
   * hand). Null without a target, or when the shot would fuse instead (Jewel
   * world).
   */
  preview(
    power = false,
    line: AimLine = this.aimLine(this.upgrades.aimBounces, power),
    reactions = this.upgrades.reactionPreview,
  ): ShotPreview | null {
    const target = line.target;
    if (!target) return null;
    const chain = this.chains[target.chain]!;
    const balls = chain.balls;
    const touched = balls[target.index]!;
    const diameter = chain.diameter;
    // Between the touched ball and its neighbour, where the shot wedges itself in.
    const position = chain.path.pointAt(touched.s + (target.after ? diameter : -diameter) / 2);
    const special = this.loadedSpecial;
    if (special === 'bomb') {
      // A bomb: every ball within its radius.
      const radius = this.bombRadius;
      const group = this.chains.flatMap((other) =>
        other.balls
          .filter((ball) => ball.s >= 0 && other.positionOf(ball).distanceTo(position) <= radius)
          .map((ball) => other.positionOf(ball)),
      );
      return { position, group, reaction: [] };
    }
    const tone = special === 'wild' ? touched.tone : this.shooter.current;
    const fuses = this.setup.alchemy && target.centred && mix(tone, touched.tone) !== null;
    if (special !== 'wild' && fuses) return null;
    const run = (from: number, step: 1 | -1, colour: number) =>
      runOf(balls, diameter, { from, step, colour });
    // The ball before the new one is the touched one when it lands after it.
    const behind = run(target.after ? target.index : target.index - 1, -1, tone);
    const ahead = run(target.after ? target.index + 1 : target.index, 1, tone);
    const indexes = [...behind, ...ahead];
    if (indexes.length + 1 < this.setup.chain.minMatch) {
      return { position, group: [], reaction: [] };
    }
    const group = indexes.map((i) => chain.positionOf(balls[i]!));
    // Œil stellaire, rank 3: the two sides that meet next, if they explode in turn.
    let reaction: Vec2[] = [];
    if (reactions) {
      const low = Math.min(...indexes, target.after ? target.index + 1 : target.index) - 1;
      const high = Math.max(...indexes, target.after ? target.index : target.index - 1) + 1;
      const left = balls[low];
      const right = balls[high];
      if (left && right && left.tone === right.tone) {
        const joined = [...run(low, -1, left.tone), ...run(high, 1, right.tone)];
        if (joined.length >= this.setup.chain.minMatch) {
          reaction = joined.map((i) => chain.positionOf(balls[i]!));
        }
      }
    }
    return { position, group, reaction };
  }

  /**
   * How many balls a plain ball of `tone` would burst along `line`, its whole
   * chain reaction counted, as the sides meet again and again (v1.8.1): the
   * training's hand weighs the colours before it shows a swap. Alchemy aside.
   */
  reach(tone: Tone, line: AimLine): number {
    const target = line.target;
    if (!target) return 0;
    const { balls, diameter } = this.chains[target.chain]!;
    const { minMatch } = this.setup.chain;
    const run = (from: number, step: 1 | -1, colour: number) =>
      runOf(balls, diameter, { from, step, colour });
    const behind = run(target.after ? target.index : target.index - 1, -1, tone);
    const ahead = run(target.after ? target.index + 1 : target.index, 1, tone);
    if (behind.length + ahead.length + 1 < minMatch) return 0;
    let burst = behind.length + ahead.length;
    let low = Math.min(...behind, ...ahead, target.after ? target.index + 1 : target.index) - 1;
    let high = Math.max(...behind, ...ahead, target.after ? target.index : target.index - 1) + 1;
    for (;;) {
      const left = balls[low];
      const right = balls[high];
      if (!left || !right || left.tone !== right.tone) return burst;
      const joined = [...run(low, -1, left.tone), ...run(high, 1, right.tone)];
      if (joined.length < minMatch) return burst;
      burst += joined.length;
      low = Math.min(...joined) - 1;
      high = Math.max(...joined) + 1;
    }
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
          start: span.start,
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

  /**
   * The ball the aim line meets first (rebounds included), and whether the
   * shot takes it near its centre (a fusion, in the Jewel world), or null.
   */
  aimTarget(): {
    readonly chain: number;
    readonly index: number;
    readonly ball: BallView;
    readonly centred: boolean;
  } | null {
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
   * meets or the edge of the board. Without gravity it walks the straight
   * line in small steps; with gravity it integrates exactly like a flying
   * projectile does.
   */
  private trace(maxBounces: number, power = false, angle = this.shooter.angle): AimLine {
    const radius = this.setup.chain.ballRadius;
    const gravity = power ? null : this.gravity;
    const wind = power ? null : this.windPull;
    const speed = this.setup.projectileSpeed * (power ? POWER_SPEED : 1) * this.shotSpeedFactor;
    const dt = gravity || wind ? STEP : TRACE_STEP / speed;
    let position = this.shooter.position;
    let velocity = Vec2.fromAngle(angle, speed);
    const points = [position];
    const rebounds: Vec2[] = [];
    let travelled = 0;
    for (let k = 0; travelled < TRACE_REACH && k * dt < MAX_FLIGHT; k++) {
      if (gravity) velocity = velocity.add(gravity.acceleration(position).scale(dt));
      if (wind) velocity = velocity.add(wind.scale(dt));
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
      } else if ((gravity || wind) && k % 4 === 3) {
        points.push(position);
      }
      // Swallowed by the black hole, or off the board: the shot would be lost there.
      if (gravity?.swallows(position) || this.outside(position)) {
        points.push(position);
        return { points, rebounds, target: null };
      }
      if (travelled <= TRACE_SKIP) continue;
      for (let chain = 0; chain < this.chains.length; chain++) {
        const hit = this.chains[chain]!.hitTest(position);
        if (!hit) continue;
        points.push(position);
        const centred = this.centred(this.chains[chain]!, hit.index, position, velocity);
        return { points, rebounds, target: { chain, index: hit.index, after: hit.after, centred } };
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
      chargedShots: this.chargedFired,
      ballsLeft:
        this.stateValue === 'won'
          ? 0
          : this.chains.reduce((sum, chain) => sum + chain.balls.length, 0),
      colossus: this.colossus ? { hp: this.colossus.hp, maxHp: this.colossus.maxHp } : null,
      bestGroove: this.bestGroove,
      stage: this.stage ?? 0,
      rivalScore: this.rivalScoring.score,
      fragments: this.fragmentsCaught,
      danger: this.danger,
      colossusDefeated: this.stateValue === 'won' && this.setup.colossus !== undefined,
    };
  }

  swap(): void {
    if (this.stateValue !== 'playing') return;
    this.shooter.swap(this.shooterTones());
    this.swaps++;
    this.events.emit('swapped', { current: this.shooter.current });
  }

  /**
   * Loads `current` and deals `next` after it (v1.8.1): the training's hand
   * sets up a moment where a swap pays, when the game gives none. Neither is
   * the player's swap; a power shot loaded stays.
   */
  stageSwap(current: Tone, next: Tone): void {
    if (this.stateValue !== 'playing' || this.loadedSpecial !== null) return;
    this.shooter.stage(current, next);
  }

  /**
   * Loads `tone`, as a puzzle hint does (v1.7.6): the swaps it takes are the
   * game's, not the player's, so a win stays a win without a swap.
   */
  loadTone(tone: Tone): void {
    if (this.stateValue !== 'playing') return;
    for (let i = 0; i < MAX_TONES && this.shooter.current !== tone; i++) {
      this.shooter.swap(this.shooterTones());
    }
  }

  /**
   * Fires the loaded ball, charged or not; false while reloading, out of
   * shots or once the game is over.
   */
  fire(power = false): boolean {
    if (this.stateValue !== 'playing' || this.shotsLeft === 0) return false;
    const special = this.loadedSpecial;
    const favoured = this.shooter.ready ? this.fairDraw(special) : [];
    // A laser flies like a charged shot: fast, and straight whatever the gravity or the wind.
    const projectile = this.shooter.fire(
      this.shooterTones(),
      (power || special === 'laser' ? POWER_SPEED : 1) * this.shotSpeedFactor,
      special,
      favoured,
    );
    if (!projectile) return false;
    if (special === 'bomb') {
      this.novaCharge = 0;
      if (this.gift) this.giftShot = projectile;
      this.gift = false;
    } else if (special !== null && special === this.powers.loaded) this.powers.spend();
    this.shotsFired++;
    if (power && special !== 'laser') this.chargedFired++;
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

  /** Falling balls, arrhythmia and weather (§ 3.9). */
  private applyHazards(dt: number): void {
    const change =
      this.weatherSystem?.update(dt, (kind) =>
        kind === 'solar' ? this.upgrades.solarDuration : 1,
      ) ?? {};
    this.starFragments?.update(dt);
    if (change.started) this.startWeather(change.started);
    if (change.ended) this.endWeather(change.ended);
    const weather = this.weather;
    const wind = weather?.kind === 'wind' ? 1 + weather.direction * WIND_PACE * this.strength : 1;
    const pace =
      (this.arrhythmia?.pace(this.elapsedValue) ?? 1) * Math.max(0.3, wind) * this.upgrades.chronos;
    if (this.arrhythmia || this.weatherSystem) for (const chain of this.chains) chain.setPace(pace);
    if (this.meteors?.update(dt)) this.aimMeteor();
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const meteor = this.falling[i]!;
      meteor.left -= dt;
      if (meteor.left > 0) continue;
      this.falling.splice(i, 1);
      this.landMeteor(meteor.chain, meteor.after);
    }
  }

  private startWeather(episode: WeatherEpisode): void {
    if (episode.kind === 'solar') {
      for (const chain of this.chains) chain.setImmunity(this.upgrades.solarImmunity);
    } else if (episode.kind === 'cold') {
      for (const chain of this.chains) {
        const visible = chain.balls.filter((ball) => ball.s >= 0 && ball.s <= chain.path.length);
        chain.freeze(visible.filter(() => this.random.next() < FROST_SHARE * this.strength));
      }
    } else if (episode.massive) {
      this.gust();
    }
    this.events.emit('weather', { kind: episode.kind, active: true, massive: episode.massive });
  }

  private endWeather(episode: WeatherEpisode): void {
    if (episode.kind === 'solar') {
      // The groups made during the storm go up at once.
      this.chains.forEach((chain, index) => {
        chain.setImmunity(0);
        for (const explosion of chain.burstGroups()) this.report(index, chain, explosion);
      });
    } else if (episode.kind === 'cold') {
      for (const chain of this.chains) chain.thaw();
    }
    this.events.emit('weather', { kind: episode.kind, active: false, massive: false });
  }

  /** A massive gust swaps a few neighbouring balls, never making a group explode. */
  private gust(): void {
    const swaps = 2 + Math.round(2 * this.strength);
    let done = 0;
    for (let tries = 0; tries < swaps * 4 && done < swaps; tries++) {
      const chain = this.chains[this.random.nextInt(this.chains.length)]!;
      const visible = chain.balls.filter((ball) => ball.s >= 0);
      if (visible.length < 2) continue;
      const ball = visible[this.random.nextInt(visible.length - 1)]!;
      if (chain.swapTones(chain.balls.indexOf(ball))) done++;
    }
  }

  /** Picks where the next ball falls: after a ball well inside the track. */
  private aimMeteor(): void {
    const options: { chain: number; after: number }[] = [];
    this.chains.forEach((chain, index) => {
      for (const ball of chain.balls) {
        const along = ball.s / chain.path.length;
        if (along > 0.1 && along < 0.8) options.push({ chain: index, after: ball.id });
      }
    });
    if (options.length === 0) return;
    const pick = options[this.random.nextInt(options.length)]!;
    const chain = this.chains[pick.chain]!;
    const ball = chain.balls.find((candidate) => candidate.id === pick.after)!;
    const position = chain.positionOf(ball);
    this.falling.push({ ...pick, left: METEOR_WARNING, position });
    this.events.emit('meteorWarning', { position });
  }

  /** The ball lands after the one it aimed at, of a colour that makes no group. */
  private landMeteor(index: number, after: number): void {
    const chain = this.chains[index]!;
    const at = chain.balls.findIndex((ball) => ball.id === after);
    if (at < 0) return;
    const neighbours = [chain.balls[at]!.tone, chain.balls[at + 1]?.tone];
    const tones = this.availableTones().filter((tone) => !neighbours.includes(tone));
    if (tones.length === 0) return;
    const ball = this.balls.create(tones[this.random.nextInt(tones.length)]!);
    chain.insert(ball, { index: at, after: true });
    this.events.emit('meteor', { chain: index, ball, position: chain.positionOf(ball) });
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
    this.applyHazards(dt);
    this.powers.update(dt);
    this.playRival(dt);
    this.reflectors.update(dt);
    this.moveProjectiles(dt);
    this.chains.forEach((chain, index) => {
      for (const explosion of chain.advance(dt)) this.report(index, chain, explosion);
    });
    this.objective.update(this.context, dt);
    for (const chain of this.chains) this.danger = Math.max(this.danger, chain.progress);
    this.shooter.refresh(this.shooterTones());
    this.checkEnd();
  }

  private moveProjectiles(dt: number): void {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const projectile = this.flying[i]!;
      if (this.gravity && !projectile.powered) {
        projectile.accelerate(this.gravity.acceleration(projectile.position), dt);
      }
      const wind = this.windPull;
      if (wind && !projectile.powered) projectile.accelerate(wind, dt);
      if (this.starFragments && projectile.by === 'player') {
        const caught = this.starFragments.catchAt(projectile.position, this.upgrades.fragmentReach);
        if (caught) {
          this.fragmentsCaught++;
          this.events.emit('fragment', { position: caught.position });
        }
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
          this.missed(projectile);
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
      if (projectile.special === 'bomb') {
        if (projectile === this.giftShot) this.giftShot = null;
        this.explodeBomb(projectile.position);
        return true;
      }
      if (projectile.special === 'laser') return this.pierce(index, chain, projectile);
      const wild = projectile.special === 'wild';
      if (!wild && this.fuse(index, chain, hit.index, projectile)) return true;
      this.lastShooter[index] = projectile.by;
      // A rainbow ball takes the colour of the ball it touches.
      const ball = this.balls.create(wild ? chain.balls[hit.index]!.tone : projectile.tone);
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

  /**
   * A laser goes through the balls it touches, which explode on their own,
   * nearest to where it comes from first, and flies on; true once it has
   * pierced its last ball.
   */
  private pierce(index: number, chain: Chain, projectile: Projectile): boolean {
    this.lastShooter[index] = projectile.by;
    const reach = this.setup.chain.ballRadius * 2;
    const behind = projectile.position.sub(projectile.velocity);
    const touched = chain.balls
      .filter((ball) => ball.s >= 0)
      .map((ball) => ({ ball, at: chain.positionOf(ball) }))
      .filter(({ at }) => at.distanceTo(projectile.position) <= reach)
      .sort((a, b) => a.at.distanceTo(behind) - b.at.distanceTo(behind));
    for (const { ball } of touched) {
      const pierced = chain.extract(chain.balls.indexOf(ball));
      this.report(index, chain, { balls: [pierced], cause: 'shot', depth: 1 });
      if (projectile.pierce() >= LASER_PIERCE) return true;
    }
    return false;
  }

  /** A power ball exploded: its power goes to work, and the shot earns a bonus. */
  private setOff(kind: PowerKind, position: Vec2, tone: Tone): void {
    powerOf(kind).apply(this.powers);
    this.scoring.bonus(POWER_BONUS);
    this.events.emit('power', { kind, position, tone, points: POWER_BONUS });
  }

  /**
   * The powers of a batch of balls fed into a running chain: one every
   * `every` balls fed, taking the level's powers in turn.
   */
  private fedPowers(tones: readonly Tone[]): (PowerKind | null)[] {
    const setup = this.setup.powers;
    if (!setup || setup.kinds.length === 0) return [];
    this.fedSincePower += tones.length;
    if (this.fedSincePower < setup.every) return [];
    this.fedSincePower = 0;
    const kind = setup.kinds[this.powerTurn++ % setup.kinds.length]!;
    return placeInBatch(tones, kind);
  }

  /** Nova: every ball within the bomb's radius goes up, whatever its colour. */
  /** A bomb's reach: the Nova's, or the gift's without the upgrade. */
  private get bombRadius(): number {
    return this.upgrades.novaRadius > 0 ? this.upgrades.novaRadius : GIFT_BOMB_RADIUS;
  }

  private explodeBomb(position: Vec2): void {
    const radius = this.bombRadius;
    this.events.emit('bomb', { position, radius });
    this.bombing = true;
    this.chains.forEach((chain, index) => {
      const balls = chain.extractWithin(position, radius);
      this.lastShooter[index] = 'player';
      if (balls.length > 0) this.report(index, chain, { balls, cause: 'shot', depth: 1 });
    });
    this.bombing = false;
  }

  /** A shot that exploded balls after gravity bent it hard enough counts as a curve. */
  private countCurve(projectile: Projectile): void {
    if (this.gravity && projectile.deflection >= CURVE_ANGLE) this.curves++;
  }

  /** True for a point off the board, plus a margin: a shot there is given up. */
  private outside({ x, y }: Vec2): boolean {
    const margin = this.setup.chain.ballRadius * 2;
    const { width, height } = this.setup.board;
    return x <= -margin || y <= -margin || x >= width + margin || y >= height + margin;
  }

  /**
   * Singularity world: true if the shot fell into the black hole or circled
   * it for too long. Either way it is a miss.
   */
  private fall(projectile: Projectile): boolean {
    if (!this.gravity) return false;
    const swallowed = this.gravity.swallows(projectile.position);
    if (!swallowed && projectile.age < MAX_FLIGHT) return false;
    if (swallowed) this.events.emit('swallowed', { projectile });
    this.missed(projectile);
    return true;
  }

  /** A flight meets a ball near its centre: in the Jewel world, it fuses with it. */
  private centred(chain: Chain, ballIndex: number, position: Vec2, velocity: Vec2): boolean {
    const centre = chain.positionOf(chain.balls[ballIndex]!);
    return offCentre(centre, position, velocity) <= FUSE_REACH * this.setup.chain.ballRadius;
  }

  /**
   * Jewel world: a primary shot onto another primary, near its centre, fuses
   * with it; off-centre, it slips in beside it. True if it fused.
   */
  private fuse(index: number, chain: Chain, ballIndex: number, projectile: Projectile): boolean {
    if (!this.setup.alchemy) return false;
    if (!this.centred(chain, ballIndex, projectile.position, projectile.velocity)) return false;
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

  /** True once the projectile has left the board (plus a margin): a miss, unless a laser hit. */
  private leave(projectile: Projectile): boolean {
    if (!this.outside(projectile.position)) return false;
    if (projectile.pierced > 0) return true;
    this.missed(projectile);
    return true;
  }

  /**
   * A shot that found no ball: it breaks the streak, and the gift bomb of a
   * first level comes back to the launcher, so its burst is never lost.
   */
  private missed(projectile: Projectile): void {
    this.scoringOf(projectile.by).miss();
    this.events.emit('missed', { projectile });
    if (projectile !== this.giftShot) return;
    this.giftShot = null;
    this.gift = true;
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
      (hot ? HOT_MULTIPLIER : 1) * groove * (this.setup.scoreFactor ?? 1),
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
    if (by === 'player') {
      this.rechargeMagnet();
      this.chargeNova(explosion.balls.length);
      if (this.upgrades.shockwave > 0 && this.stateValue === 'playing') {
        chain.shift(-this.upgrades.shockwave);
      }
      for (const ball of explosion.balls) {
        if (ball.power) this.setOff(ball.power, chain.positionOf(ball), ball.tone);
      }
    }
    // Biting cold: a chain reaction shatters every frozen ball as well.
    const shatters = explosion.depth >= 2 || this.upgrades.shatterOnAnyExplosion;
    if (this.weather?.kind === 'cold' && shatters) {
      this.chains.forEach((other, i) => {
        const shattered = other.shatterFrozen(explosion.depth + 1);
        if (shattered) this.report(i, other, shattered);
      });
    }
  }

  /** Nova: exploded balls charge the bomb; full, the next shot is one. */
  private chargeNova(balls: number): void {
    const needed = this.upgrades.novaBalls;
    if (needed === null || this.novaCharge >= needed || this.bombing) return;
    this.novaCharge += balls;
    if (this.novaCharge >= needed) this.events.emit('novaReady', {});
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
    const reached = this.chains.findIndex((chain) => chain.reachedHole);
    if (reached >= 0 && this.useSecondChance(reached)) return;
    // A chain that stops short of the hole (the training) never loses: should
    // shots push it in after all, it is pushed back instead.
    if (reached >= 0 && this.setup.chain.halt !== undefined) {
      const chain = this.chains[reached]!;
      chain.shift(-chain.path.length * HALT_PUSHBACK);
      return;
    }
    if (reached >= 0) this.end('lost');
    else if (this.objective.isComplete(this.context)) this.end('won');
    else if (this.objective.isFailed?.(this.context)) this.end('lost');
  }

  /**
   * Continue after a defeat (§ 3.7, rewarded ad): every chain that reached its
   * hole is pushed back and the game goes on. False unless the game was lost
   * that way (a puzzle out of shots cannot be continued).
   */
  revive(share = REVIVE_SHARE): boolean {
    if (this.stateValue !== 'lost') return false;
    const reached = this.chains.flatMap((chain, index) => (chain.reachedHole ? [index] : []));
    if (reached.length === 0) return false;
    for (const index of reached) {
      const chain = this.chains[index]!;
      chain.shift(-chain.path.length * share);
    }
    this.stateValue = 'playing';
    this.events.emit('revived', { chains: reached });
    return true;
  }

  /** Second chance (upgrade): once a level, the chain is pushed back instead of losing. */
  private useSecondChance(index: number): boolean {
    const share = this.upgrades.secondChance;
    if (share === 0 || this.secondChanceUsed) return false;
    this.secondChanceUsed = true;
    const chain = this.chains[index]!;
    chain.shift(-chain.path.length * share);
    this.events.emit('secondChance', { chain: index });
    return true;
  }

  private end(outcome: 'won' | 'lost'): void {
    this.stateValue = outcome;
    this.flying.length = 0;
    let bonus = 0;
    let ahead = 0;
    if (outcome === 'won') {
      // Whatever is left on the track goes up in one final cascade, the player's.
      this.lastShooter.fill('player');
      this.chains.forEach((chain, index) => {
        const balls = chain.clear();
        if (balls.length > 0) this.report(index, chain, { balls, cause: 'reaction', depth: 1 });
      });
      bonus = Scoring.levelBonus(this.elapsedValue, this.setup.parTime);
      ahead = Scoring.secondsAhead(this.elapsedValue, this.setup.parTime);
      this.scoring.bonus(bonus);
    }
    this.events.emit('ended', {
      outcome,
      score: this.scoring.score,
      bonus,
      timeBonus: outcome === 'won' ? bonus - CLEAR_BONUS : 0,
      ahead: Math.floor(ahead),
    });
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
      createBalls: (count, colours = tones) => {
        const drawn = this.generator.tones({
          length: count,
          tones: colours,
          repeatChance: 0.35,
          ...(palette ? { palette } : {}),
          ...(this.setup.alchemy ? { paired: SECONDARIES } : {}),
        });
        const powers = this.fedPowers(drawn);
        return drawn.map((tone, i) => this.balls.create(tone, 0, powers[i] ?? null));
      },
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

  /**
   * Counts the shot about to leave: a colour with no pair on the board is a dry
   * shot (a special one never is). After `DRY_SHOTS` in a row, the colours to
   * favour for the next ball dealt: those with a pair on the board. Not in the
   * Jewel world, whose colours are mixed rather than matched.
   */
  private fairDraw(special: ProjectileSpecial): Tone[] {
    const pairs = this.pairTones();
    const dry = special === null && pairs.length > 0 && !pairs.includes(this.shooter.current);
    this.dryShots = dry ? this.dryShots + 1 : 0;
    return this.dryShots >= DRY_SHOTS && !this.setup.alchemy ? pairs : [];
  }

  /** Colours of which two touching balls are on the board: one more ball of them makes a group. */
  private pairTones(): Tone[] {
    const tones = new Set<Tone>();
    for (const chain of this.chains) {
      const balls = chain.balls;
      for (let i = 0; i + 1 < balls.length; i++) {
        const [a, b] = [balls[i]!, balls[i + 1]!];
        if (a.s >= 0 && a.tone === b.tone && b.s - a.s <= chain.diameter + 1e-6) tones.add(a.tone);
      }
    }
    return [...tones].sort((a, b) => a - b);
  }
}
