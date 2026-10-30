import { ingredients, mix } from '@/engine/chain/Alchemy';
import type { BallView } from '@/engine/chain/Ball';
import { SeededRandom } from '@/engine/core/Random';
import { Game, type GameReport } from '@/engine/Game';
import type { CampaignLevel } from '@/levels/campaign';
import { resolveLevel } from '@/levels/resolveLevel';
import { toLevelSetup, type LevelDefinition } from '@/levels/LevelDefinition';
import type { Aiming } from '@/levels/seat';
import type { Frame, FrameKind } from '@/levels/tracks';

export interface BotResult {
  readonly outcome: 'won' | 'lost' | 'timeout';
  readonly score: number;
  readonly seconds: number;
  readonly shots: number;
  /** Furthest the head of a chain got, as a share of its track (1 = the hole). */
  readonly danger: number;
  /** Seconds with the head of a chain past half its track: time under pressure (v1.8.0). */
  readonly pressure: number;
  /** Points of the computer rival (Duel mode). */
  readonly rivalScore: number;
  /** Seconds spent with no ball on the board while more wait in the tunnel. */
  readonly idle: number;
  /** Seconds with fewer balls on the board than a group needs (3) while more wait in the tunnel. */
  readonly thin: number;
  /** Longest run of shots in a row that each made a group explode. */
  readonly bestStreak: number;
  /** Shots aimed at a marble of the chain. */
  readonly aimedShots: number;
  /** Of those, shots whose marble another one hid from the launcher: aimed true, the line meets that one first. */
  readonly hiddenShots: number;
  /** End-of-level bonus included in the score (0 without a win). */
  readonly bonus: number;
  /** Seconds played, to the tenth. */
  readonly elapsed: number;
  /** The game's own report, as the game settles it (rewards, achievements). */
  readonly report: GameReport;
}

/** Share of its track past which the head of a chain puts the player under pressure. */
export const PRESSURE_FROM = 0.5;

/**
 * Players for balancing (frames between two shots, aim error, one move ahead).
 * Humans take longer than a greedy bot to decide, but once they do, they
 * shoot true and set up chain reactions: they are the reference for the time
 * bonus and the stars.
 */
export const PLAYERS = {
  /**
   * A newcomer (v1.8.0): a shot every 1.6 s, often off target, no plan; the
   * profile of the genre study of 21/10/2026, to set again on the hallway test.
   */
  newcomer: { cadence: 96, sloppiness: 32, insight: false },
  /** A greedy, hasty player: a shot every 1.2 s, often off target. */
  casual: { cadence: 72, sloppiness: 24, insight: false },
  /** A human: decides every 1.5 s, shoots true, looks for chain reactions. */
  human: { cadence: 90, sloppiness: 8, insight: true },
  /** An applied human: decides every 1.1 s, very precise. */
  applied: { cadence: 66, sloppiness: 5, insight: true },
} as const;

/**
 * A hand per device (v1.8.1, spec § 3.17): the spread of the aim, as a
 * standard deviation in marble widths, and the seconds each shot costs on top.
 */
export const DEVICES = {
  /** The mouse on a desktop: the ISO 9241-9 rule and Aim Lab's first day. */
  mouse: { spread: 0.25, extra: 0 },
  /** A finger dragging with the preview on 3–4 mm marbles, firing on release. */
  finger: { spread: 0.3, extra: 0.35 },
} as const;

export type Device = keyof typeof DEVICES;

/** Each device's hand as the game names it, for its seat (spec § 3.17). */
export const AIMING: Readonly<Record<Device, Aiming>> = { finger: 'touch', mouse: 'mouse' };

/** The board each device shows (spec § 3.17): a phone held upright, a 16:9 desktop screen. */
export const BOARD_OF: Readonly<Record<Device, FrameKind>> = { mouse: 'wide', finger: 'tall' };

/**
 * Three newcomers on each device (spec § 3.17): the median time between two
 * shots, how many targets they weigh, how often they swap for a better next
 * ball, how often they think of a world's tool (the magnet, a lava switch)
 * when it would help, and their hand against the device's. Looks, swaps and
 * tools are assumptions no study has measured, for the first portal players
 * to correct; a tool is thought of as often as a swap.
 */
export const NEWCOMERS = {
  quick: { cadence: 1.2, looks: 6, swaps: 0.9, tools: 0.9, hand: { mouse: 0.8, finger: 0.8 } },
  typical: { cadence: 1.6, looks: 4, swaps: 0.7, tools: 0.7, hand: { mouse: 1, finger: 1 } },
  /** Players over 60: twice as slow with a mouse, more scattered with a finger. */
  slow: { cadence: 2.4, looks: 2, swaps: 0.4, tools: 0.4, hand: { mouse: 1, finger: 1.5 } },
} as const;

export type Newcomer = keyof typeof NEWCOMERS;

/** One newcomer on one device, as the robot plays them. */
export interface RobotPlayer {
  /** The hand it aims with: its seat takes this hand's pace and stars. */
  readonly device: Device;
  /** Median seconds between two shots. */
  readonly cadence: number;
  /** Seconds each shot costs on top (aiming on release). */
  readonly extra: number;
  /** Targets weighed before a shot, drawn at random among the possible ones. */
  readonly looks: number;
  /** Chance of swapping when the next ball has a clearly better target. */
  readonly swaps: number;
  /** Chance of thinking of a world's tool at a decision where it would help. */
  readonly tools: number;
  /** Standard deviation of the aim, in marble widths. */
  readonly spread: number;
}

export const robotOf = (newcomer: Newcomer, device: Device): RobotPlayer => {
  const profile = NEWCOMERS[newcomer];
  return {
    device,
    cadence: profile.cadence,
    extra: DEVICES[device].extra,
    looks: profile.looks,
    swaps: profile.swaps,
    tools: profile.tools,
    spread: DEVICES[device].spread * profile.hand[device],
  };
};

/** Shot times spread around their median: nine in ten under 1.37 times it. */
const CADENCE_SPREAD = 0.25;
/** A bank shot scatters three times as much (Puzzle Bobble, Isaksen et al. 2017). */
const BANK_SPREAD = 3;
/** A colour mix is one look more: the eye finds same-colour pairs at a glance, a mix takes thought. */
export const MIX_LOOKS = 1;
/** Seconds before the lava reaches a fork when its switch catches a newcomer's eye. */
export const NOTICE = 3;

/** A target, a ball to pull or a line to fire along; a colour mix of the Jewel world is marked. */
export interface Option {
  readonly score: number;
  readonly mix?: boolean;
}

/** How a robot paces its decisions, weighs its targets, uses the worlds' tools and aims. */
export interface Brain {
  /**
   * It takes in the whole board at once, the balancing players up to v1.8.0:
   * every lava switch watched and flipped at no cost, every angle of a laser tried.
   */
  readonly omniscient: boolean;
  /** Whether the robot decides at this frame, once the shooter is ready. */
  due(frame: number): boolean;
  /** The robot has just decided: it waits before the next decision. */
  decided(frame: number): void;
  /** The options it weighs, best first. */
  weigh<T extends Option>(list: readonly T[]): T[];
  /** Whether it swaps for a next ball with a clearly better target. */
  swaps(): boolean;
  /** Whether it pulls a ball with the magnet now, the chain's head this far along its track. */
  pulls(ahead: number): boolean;
  /** Whether it flips a lava switch the chain is about to reach, instead of a shot. */
  flips(): boolean;
  /** Aim error, in board units along the track; `bank` tells whether the shot rebounds. */
  error(bank: () => boolean): number;
}

/** The balancing players up to v1.8.0: a fixed cadence, a uniform error, every option weighed. */
const steadyBrain = (cadence: number, sloppiness: number, hand: SeededRandom): Brain => ({
  omniscient: true,
  due: (frame) => frame % cadence === 0,
  decided: () => undefined,
  weigh: (list) => [...list],
  swaps: () => true,
  pulls: () => true,
  flips: () => true,
  error: () => (hand.next() - 0.5) * 2 * sloppiness,
});

/** A standard normal draw (Box–Muller). */
const normal = (random: SeededRandom): number =>
  Math.sqrt(-2 * Math.log(1 - random.next())) * Math.cos(2 * Math.PI * random.next());

/**
 * A newcomer's mind (v1.8.1, spec § 3.17): uneven times between shots, a few
 * targets weighed at random rather than all, a swap sometimes forgotten, and
 * a hand that scatters like a person's, three times as much on a bank shot.
 * The worlds' tools as a newcomer uses them: magnet charges kept for when the
 * chain presses, a lava switch flipped when the lava comes near and if it
 * comes to mind, and a colour mix weighed as one look more, besides the
 * same-colour targets the eye picks at a glance.
 */
export class NewcomerBrain implements Brain {
  readonly omniscient = false;
  private next: number;

  constructor(
    private readonly robot: RobotPlayer,
    private readonly random: SeededRandom,
    /** A marble's width on this board, in board units. */
    private readonly marble: number,
  ) {
    // A newcomer looks at the board before the first shot.
    this.next = this.pause();
  }

  /** Frames until the next decision: a log-normal time around the median, plus the device's cost. */
  pause(): number {
    const seconds =
      this.robot.cadence * Math.exp(CADENCE_SPREAD * normal(this.random)) + this.robot.extra;
    return Math.round(60 * Math.min(6, Math.max(0.4, seconds)));
  }

  due(frame: number): boolean {
    return frame >= this.next;
  }

  decided(frame: number): void {
    this.next = frame + this.pause();
  }

  weigh<T extends Option>(list: readonly T[]): T[] {
    const seen = [
      ...this.draw(
        list.filter((option) => !option.mix),
        this.robot.looks,
      ),
      ...this.draw(
        list.filter((option) => option.mix),
        MIX_LOOKS,
      ),
    ];
    return seen.sort((a, b) => b.score - a.score);
  }

  swaps(): boolean {
    return this.random.next() < this.robot.swaps;
  }

  pulls(ahead: number): boolean {
    return ahead >= PRESSURE_FROM && this.random.next() < this.robot.tools;
  }

  flips(): boolean {
    return this.random.next() < this.robot.tools;
  }

  /** Some options drawn at random among the possible ones. */
  private draw<T>(list: readonly T[], count: number): T[] {
    const pool = [...list];
    const seen: T[] = [];
    while (seen.length < count && pool.length > 0) {
      seen.push(pool.splice(Math.floor(this.random.next() * pool.length), 1)[0]!);
    }
    return seen;
  }

  error(bank: () => boolean): number {
    return normal(this.random) * this.robot.spread * this.marble * (bank() ? BANK_SPREAD : 1);
  }
}

/**
 * A simple greedy player, for balancing: it shoots at a visible ball of the
 * loaded colour, preferring pairs and the balls closest to the hole, and
 * swaps when the next ball has a better target. With `insight`, it also
 * prefers the groups whose neighbours will meet and explode in turn.
 */
export function playLevel(
  level: CampaignLevel,
  frame: Frame,
  seed: string,
  /** Frames between two shots (54 ≈ a casual player's 0.9 s). */
  cadence = 54,
  /** Aim error, in board units along the track. */
  sloppiness = 18,
  insight = false,
): BotResult {
  return playDefinition(resolveLevel(level, frame), seed, cadence, sloppiness, insight);
}

/**
 * A newcomer of the v1.8.1 robots on a level: `seed` draws the colours,
 * `handSeed` the player's hesitations and errors, so that one sequence of
 * colours can be played by several hands.
 */
export function playRobot(
  level: CampaignLevel,
  frame: Frame,
  seed: string,
  robot: RobotPlayer,
  handSeed = seed,
): BotResult {
  // The level at the robot's seat: this board, and its hand's pace and time bonus.
  return playRobotOn(resolveLevel(level, frame, { aiming: AIMING[robot.device] }), seed, {
    robot,
    handSeed,
  });
}

/** A newcomer on a level given as data: a campaign level slowed by the assistance, say. */
export function playRobotOn(
  definition: LevelDefinition,
  seed: string,
  { robot, handSeed = seed }: { readonly robot: RobotPlayer; readonly handSeed?: string },
): BotResult {
  return run(
    definition,
    seed,
    handSeed,
    false,
    (hand, marble) => new NewcomerBrain(robot, hand, marble),
  );
}

/**
 * Looking one move ahead: once the group around `index` is gone, will the
 * balls on either side, of one colour and three or more together, meet and
 * explode in turn? A join of two only makes a pair.
 */
const reactionAfter = (balls: readonly BallView[], index: number, colour: number): number => {
  let first = index;
  while (first > 0 && balls[first - 1]!.tone === colour) first--;
  let last = index;
  while (last + 1 < balls.length && balls[last + 1]!.tone === colour) last++;
  const left = balls[first - 1];
  const right = balls[last + 1];
  if (!left || !right || left.tone !== right.tone) return 0;
  let run = 2;
  for (let k = first - 2; k >= 0 && balls[k]!.tone === left.tone; k--) run++;
  for (let k = last + 2; k < balls.length && balls[k]!.tone === left.tone; k++) run++;
  return run >= 3 ? 3 : 0;
};

/** The same player, on any level given as data (Arcade modes). */
export function playDefinition(
  definition: LevelDefinition,
  seed: string,
  cadence = 54,
  sloppiness = 18,
  insight = false,
): BotResult {
  return run(definition, seed, seed, insight, (hand) => steadyBrain(cadence, sloppiness, hand));
}

function run(
  definition: LevelDefinition,
  seed: string,
  handSeed: string,
  insight: boolean,
  /** The robot's mind, from its own random draws and a marble's width on the board. */
  mind: (hand: SeededRandom, marble: number) => Brain,
): BotResult {
  const hand = SeededRandom.fromString(`hand:${handSeed}`);
  const game = new Game(toLevelSetup(definition), SeededRandom.fromString(seed));
  const brain = mind(hand, game.setup.chain.ballRadius * 2);
  const alchemy = game.setup.alchemy === true;
  const gravity = game.gravity;
  let shots = 0;
  let aimedShots = 0;
  let hiddenShots = 0;
  let danger = 0;
  let pressureFrames = 0;
  let idleFrames = 0;
  let thinFrames = 0;
  let bonus = 0;
  game.events.on('ended', (event) => (bonus = event.bonus));
  interface Candidate extends Option {
    readonly chain: number;
    readonly s: number;
    readonly id: number;
  }
  /** Balls worth shooting the loaded colour at, best first. */
  const candidates = (tone: number): Candidate[] => {
    const found: Candidate[] = [];
    game.chains.forEach((chain, index) => {
      const balls = chain.balls;
      balls.forEach((ball, i) => {
        if (ball.s < 0) return;
        // Jewel world: shooting onto another primary turns it into their mix.
        const becomes = alchemy ? mix(tone, ball.tone) : null;
        // Jewel world, first half of a two-step move: put an ingredient next to a
        // pair of its mixed colour; the other ingredient will fuse it into a third.
        const setsUp =
          alchemy &&
          becomes === null &&
          ingredients(ball.tone)?.includes(tone) === true &&
          (balls[i - 1]?.tone === ball.tone || balls[i + 1]?.tone === ball.tone);
        if (setsUp) {
          found.push({
            score: 1 + ball.s / chain.path.length,
            chain: index,
            s: ball.s,
            id: ball.id,
            mix: true,
          });
          return;
        }
        if (ball.tone !== tone && becomes === null) return;
        const colour = becomes ?? tone;
        const pair =
          (balls[i - 1]?.tone === colour ? 1 : 0) + (balls[i + 1]?.tone === colour ? 1 : 0);
        // A fusion only helps next to its own colour; alone, it leaves a ball nobody can shoot.
        const fusion = becomes === null ? 0 : pair > 0 ? 0.3 : -1.5;
        const ahead = insight && pair > 0 && becomes === null ? reactionAfter(balls, i, colour) : 0;
        found.push({
          score: pair * 2 + fusion + ahead + ball.s / chain.path.length,
          chain: index,
          s: ball.s,
          id: ball.id,
          ...(becomes === null ? {} : { mix: true }),
        });
      });
    });
    return found.sort((a, b) => b.score - a.score);
  };
  /**
   * Singularity world: shots curve, so the bot sweeps the aim like a player
   * watching the aim line bend, and remembers the middle angle that reaches
   * each ball.
   */
  let reach = new Map<number, number>();
  /** Shots curve now: around a black hole, or in a gust of wind. */
  const curving = () => gravity !== null || game.weather?.kind === 'wind';
  const sweep = () => {
    reach = new Map();
    if (!gravity && curving()) {
      // In the wind: for the best balls, the angle closest to straight that reaches them.
      const saved = game.shooter.angle;
      for (const tone of [game.shooter.current, game.shooter.next]) {
        for (const candidate of candidates(tone).slice(0, 6)) {
          if (reach.has(candidate.id)) continue;
          const point = game.chains[candidate.chain]!.path.pointAt(candidate.s);
          const direct = point.sub(game.shooter.position).angle();
          for (let k = 0; k <= 40; k++) {
            const angle = direct + (k % 2 === 1 ? 1 : -1) * Math.ceil(k / 2) * 0.012;
            game.shooter.aim(angle);
            if (game.aimTarget()?.ball.id === candidate.id) {
              reach.set(candidate.id, angle);
              break;
            }
          }
        }
      }
      game.shooter.aim(saved);
      return;
    }
    if (!gravity) return;
    const found = new Map<number, number[]>();
    const saved = game.shooter.angle;
    const base = gravity.centre.sub(game.shooter.position).angle();
    for (let k = -70; k <= 70; k++) {
      const angle = base + k * 0.015;
      game.shooter.aim(angle);
      const hit = game.aimTarget();
      if (!hit) continue;
      const angles = found.get(hit.ball.id) ?? [];
      angles.push(angle);
      found.set(hit.ball.id, angles);
    }
    game.shooter.aim(saved);
    for (const [id, angles] of found) reach.set(id, angles[Math.floor(angles.length / 2)]!);
  };

  /**
   * The best candidate the shot would really reach, as a player reading the
   * aim line checks: another ball may stand in the way (two rows, two chains),
   * shots may curve (gravity, wind), and in the Jewel world what is touched
   * matters. Without any reachable candidate, the best one anyway.
   */
  const firstInReach = (list: readonly Candidate[]): Candidate | null => {
    if (curving()) return list.find((candidate) => reach.has(candidate.id)) ?? null;
    const saved = game.shooter.angle;
    for (const candidate of list.slice(0, 8)) {
      game.aimAt(game.chains[candidate.chain]!.path.pointAt(candidate.s));
      if (game.aimTarget()?.ball.id === candidate.id) {
        game.shooter.aim(saved);
        return candidate;
      }
    }
    game.shooter.aim(saved);
    return alchemy ? null : (list[0] ?? null);
  };
  /** The target for a colour, among the ones the player weighs. */
  const target = (tone: number) => firstInReach(brain.weigh(candidates(tone)));

  /**
   * Nothing useful to shoot at: aim where the ball lands next to a mixed colour,
   * which neither fuses nor wastes a good ball (Jewel world).
   */
  const harmless = (): boolean => {
    for (const chain of game.chains) {
      const visible = chain.balls.filter((ball) => ball.s >= 0);
      for (const ball of [...visible].reverse()) {
        if (mix(game.shooter.current, ball.tone) !== null) continue;
        game.aimAt(chain.positionOf(ball));
        if (game.aimTarget()?.ball.id === ball.id) return true;
      }
    }
    return false;
  };

  /**
   * A ball between two balls of one same colour: pulling it out makes them
   * meet. The frontmost of those the player looks at.
   */
  const separator = (): Candidate | null => {
    const found: Candidate[] = [];
    game.chains.forEach((chain, index) => {
      const balls = chain.balls;
      for (let i = 1; i + 1 < balls.length; i++) {
        const ball = balls[i]!;
        if (ball.s < 0 || balls[i - 1]!.tone !== balls[i + 1]!.tone) continue;
        if (ball.tone === balls[i - 1]!.tone) continue;
        if (curving() && !reach.has(ball.id)) continue;
        found.push({ score: ball.s, chain: index, s: ball.s, id: ball.id });
      }
    });
    return brain.weigh(found)[0] ?? null;
  };

  /** How far the foremost head has come along its track, from 0 to 1 (the hole). */
  const headway = () => Math.max(0, ...game.chains.map((chain) => chain.front / chain.path.length));

  /** A free switch the lava will take the short way within a few seconds (Volcano world). */
  const nearSwitch = () =>
    game
      .switches()
      .find(
        (view) =>
          !view.locked &&
          view.branch === 'short' &&
          view.start - game.chains[view.chain]!.front <= game.setup.chain.speed * NOTICE,
      ) ?? null;

  /**
   * A laser flies straight through four balls: the player aims it where it
   * takes the most, among the balls it looks at (every angle, for the
   * balancing players up to v1.8.0).
   */
  const aimLaser = (): boolean => {
    const angles = brain.omniscient
      ? Array.from({ length: 180 }, (_, k) => (k / 180) * Math.PI * 2)
      : brain
          .weigh(
            game.chains.flatMap((chain) =>
              chain.balls
                .filter((ball) => ball.s >= 0)
                .map((ball) => ({ score: 0, point: chain.positionOf(ball) })),
            ),
          )
          .map(({ point }) => point.sub(game.shooter.position).angle());
    let best: { angle: number; balls: number } | null = null;
    for (const angle of angles) {
      game.shooter.aim(angle);
      const balls = game.laserPath()?.targets.length ?? 0;
      if (balls > 0 && (!best || balls > best.balls)) best = { angle, balls };
    }
    if (best) game.shooter.aim(best.angle);
    return best !== null;
  };

  /**
   * A rainbow ball takes the colour it touches: the player looks for the best
   * pair of any colour, among the ones it weighs.
   */
  const aimWild = (): boolean => {
    const tones = new Set(game.chains.flatMap((chain) => chain.balls.map((ball) => ball.tone)));
    const best = firstInReach(brain.weigh([...tones].flatMap((tone) => candidates(tone))));
    if (!best) return false;
    const angle = reach.get(best.id);
    if (angle === undefined) game.aimAt(game.chains[best.chain]!.path.pointAt(best.s + 6));
    else game.shooter.aim(angle);
    return true;
  };

  for (let frameIndex = 0; frameIndex < 60 * 300 && game.state === 'playing'; frameIndex++) {
    // Waiting: the board runs short while balls are still to come out of a tunnel.
    if (game.chains.some((chain) => (chain.balls[0]?.s ?? 0) < 0)) {
      const onBoard = game.chains.reduce(
        (sum, chain) => sum + chain.balls.filter((ball) => ball.s >= 0).length,
        0,
      );
      if (onBoard === 0) idleFrames++;
      if (onBoard < 3) thinFrames++;
    }
    // Volcano world: the balancing players up to v1.8.0 send the lava into every free detour.
    if (brain.omniscient && frameIndex % 30 === 0) {
      for (const view of game.switches()) {
        if (!view.locked && view.branch === 'short') game.toggleSwitch(view.chain, view.fork);
      }
    }
    const magnet = game.magnet;
    const decide = brain.due(frameIndex) && game.shooter.ready;
    if (decide) {
      brain.decided(frameIndex);
      sweep();
    }
    // A newcomer flips a switch when the lava comes near it, if it thinks of it, instead of a shot.
    if (decide && !brain.omniscient) {
      const near = nearSwitch();
      if (near && brain.flips() && game.toggleSwitch(near.chain, near.fork)) {
        game.update(1 / 60);
        continue;
      }
    }
    if (decide && magnet && magnet.charges > 0 && brain.pulls(headway())) {
      const target = separator();
      if (target) {
        const angle = reach.get(target.id);
        if (angle === undefined) game.aimAt(game.chains[target.chain]!.path.pointAt(target.s));
        else game.shooter.aim(angle);
        if (game.pull()) {
          game.update(1 / 60);
          continue;
        }
      }
    }
    // A power loaded a rainbow ball or a laser: the player uses it at once.
    const special = game.powerShot;
    if (decide && special) {
      if (special === 'laser' ? aimLaser() : aimWild()) {
        if (game.fire()) shots++;
        game.update(1 / 60);
        continue;
      }
    }
    if (decide) {
      let aim = target(game.shooter.current);
      const other = target(game.shooter.next);
      if (other && (!aim || other.score > aim.score + 1) && brain.swaps()) {
        game.swap();
        aim = other;
      }
      if (aim) {
        const chosen = aim;
        const chain = game.chains[chosen.chain]!;
        const angle = reach.get(chosen.id);
        const aimed = (error: number) => {
          // Around the black hole, the error is on the angle: about as far off at the chain.
          if (angle === undefined) game.aimAt(chain.path.pointAt(chosen.s + 6 + error));
          else game.shooter.aim(angle + error * 0.0006);
        };
        aimed(0);
        aimedShots++;
        if (game.aimTarget()?.ball.id !== chosen.id) hiddenShots++;
        aimed(
          brain.error(() => {
            aimed(0);
            return game.aimLine().rebounds.length > 0;
          }),
        );
        if (game.fire()) shots++;
      } else if (alchemy && harmless()) {
        if (game.fire()) shots++;
      }
    }
    game.update(1 / 60);
    let ahead = 0;
    for (const chain of game.chains) {
      const head = chain.balls[chain.balls.length - 1];
      if (head) ahead = Math.max(ahead, head.s / chain.path.length);
    }
    danger = Math.max(danger, ahead);
    if (ahead > PRESSURE_FROM) pressureFrames++;
  }
  return {
    outcome: game.state === 'playing' ? 'timeout' : game.state,
    score: game.score,
    seconds: Math.round(game.elapsed),
    shots,
    danger: Math.round(danger * 100) / 100,
    pressure: Math.round(pressureFrames / 6) / 10,
    rivalScore: game.rivalScore,
    idle: Math.round(idleFrames / 6) / 10,
    thin: Math.round(thinFrames / 6) / 10,
    bestStreak: game.summary().bestStreak,
    aimedShots,
    hiddenShots,
    bonus,
    elapsed: Math.round(game.elapsed * 10) / 10,
    report: game.summary(),
  };
}
