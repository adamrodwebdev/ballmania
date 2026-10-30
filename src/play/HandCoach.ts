import type { Tone } from '@/engine/chain/Ball';
import type { AimLine, Game } from '@/engine/Game';
import type { Vec2 } from '@/engine/geometry/Vec2';
import type { ProjectileView } from '@/engine/shooter/Projectile';
import type { Lesson } from '@/levels/LevelDefinition';

/** Seconds of one gesture: the press, the drag, the release, then a breath. */
export const GESTURE_LOOP = 2.6;
/** A shot bent this much by the black hole reads as a curve (radians): 15°. */
export const LESSON_BEND = Math.PI / 12;
/** Angles tried around the shooter, and how many a frame: a sweep lasts a second at 60 Hz. */
const ANGLES = 180;
const PER_FRAME = 3;
/**
 * The order of a sweep: every fifth angle first, then the ones between, so
 * that a shot is found within a fifth of a second, then refined.
 */
const STRIDE = 5;
const ORDER = Array.from(
  { length: ANGLES },
  (_, i) => (i % (ANGLES / STRIDE)) * STRIDE + Math.floor(i / (ANGLES / STRIDE)),
);
/** Seconds of a sweep, so that a hand coming back has a fresh shot to show. */
const SWEEP_TIME = ANGLES / PER_FRAME / 60;
/** Shots in a row that made no group, after which the training's hand comes back. */
export const STRUGGLE = 3;
/** Rebounds the hand's shots may take: the aim line shows as many. */
const BOUNCES = 2;
/** Where the finger lets go on a curved shot: this far along its first direction at most. */
const CURVE_RELEASE = 260;
/** Share of the first leg of a bank shot where the finger lets go, before the mirror. */
const BANK_RELEASE = 0.6;
/**
 * A swap is shown once the next ball does this much better than the loaded
 * one (v1.8.1): a pair more, or a chain reaction behind its group.
 */
export const SWAP_MARGIN = 2;
/**
 * Times a swap's lesson may set up its moment itself (v1.8.1), when the game
 * gives none: the loaded ball the colour of the track that does least, the
 * next one the colour that does most, a ball better at least. With every
 * colour doing as well, it waits for a moment of the game's.
 */
export const SWAP_STAGINGS = 3;

/**
 * What the hand does (v1.8.1): drags a shot from the launcher; taps the
 * launcher (a swap); or presses on the target and holds still while the
 * ring fills (a charged shot).
 */
export type GestureKind = 'drag' | 'tap' | 'hold';

/** The hand's way: it presses at `from` (the shooter), lets go at `to`; the shot runs along `path`. */
interface Stroke {
  readonly from: Vec2;
  readonly to: Vec2;
  readonly path: readonly Vec2[];
}

/** The gesture drawn: its stroke, its kind, and the seconds into it (0 to `GESTURE_LOOP`). */
export interface Gesture extends Stroke {
  readonly kind: GestureKind;
  readonly time: number;
}

/**
 * A shot the hand could show: its angle, how well it teaches (0: it shows the
 * gesture but makes no group), and where it lands.
 */
export interface Candidate {
  readonly angle: number;
  readonly score: number;
  /** The ball met and the side the shot lands on: shots with the same key are one shot. */
  readonly key: number;
}

/** What a lesson asks of a shot, how the hand shows it, and when it is learnt. */
interface LessonRule {
  readonly kind: GestureKind;
  /** True if a shot along this line shows the gesture. */
  shows(line: AimLine): boolean;
  /** What such a shot is worth on top of the group it makes. */
  bonus(line: AimLine): number;
  /** True if a shot that reached the chain is the lesson done. */
  readonly landing: boolean;
  /** True if this shot of the player, which set off an explosion, is the lesson done. */
  learnt(shot: ProjectileView, bounces: number): boolean;
  /** True if this shot of the player, as it leaves, is the lesson done (a charged shot). */
  fired(shot: ProjectileView): boolean;
  /** True if a swap of the player is the lesson done. */
  readonly swap: boolean;
  /** The hand shows it only when the next ball does clearly better than the loaded one. */
  readonly moment: boolean;
}

/** How far a line turns from its first direction to its last, in radians. */
export function bend(points: readonly Vec2[]): number {
  const tip = points[points.length - 1];
  if (!tip || points.length < 3) return 0;
  // The last stretch of some length: the point where the shot lands may repeat the last one.
  let k = points.length - 2;
  while (k > 0 && points[k]!.distanceTo(tip) < 1) k--;
  const first = points[1]!.sub(points[0]!).normalize();
  const last = tip.sub(points[k]!).normalize();
  return Math.acos(Math.min(1, Math.max(-1, first.dot(last))));
}

/**
 * Where the finger lets go for a shot along `line`: on the ball for a
 * straight shot; before the mirror for a bank shot; along its first
 * direction for a shot the black hole bends, which lands elsewhere.
 */
function releaseOf(line: AimLine): Vec2 {
  const [from, next] = line.points as [Vec2, Vec2];
  const end = line.points[line.points.length - 1]!;
  const rebound = line.rebounds[0];
  if (rebound) return from.lerp(rebound, BANK_RELEASE);
  if (bend(line.points) < LESSON_BEND) return end;
  const reach = Math.min(CURVE_RELEASE, from.distanceTo(end) / 2);
  return from.add(next.sub(from).normalize().scale(reach));
}

const never = () => false;
const straight = (line: AimLine) => line.rebounds.length === 0;

const LESSONS: Readonly<Record<Lesson, LessonRule>> = {
  // A shot straight at the chain; a Nova lands wherever it touches it.
  shot: {
    kind: 'drag',
    shows: straight,
    bonus: () => 0,
    landing: true,
    learnt: never,
    fired: never,
    swap: false,
    moment: false,
  },
  // A bank shot off a mirror: the finger points at the mirror, before it.
  bank: {
    kind: 'drag',
    shows: (line) => line.rebounds.length > 0,
    bonus: (line) => line.rebounds.length,
    landing: false,
    learnt: (_, bounces) => bounces > 0,
    fired: never,
    swap: false,
    moment: false,
  },
  // A shot the black hole bends: the finger points one way, the shot lands another.
  curve: {
    kind: 'drag',
    shows: (line) => straight(line) && bend(line.points) >= LESSON_BEND,
    bonus: (line) => Math.round(4 * bend(line.points)),
    landing: false,
    learnt: (shot) => shot.deflection >= LESSON_BEND,
    fired: never,
    swap: false,
    moment: false,
  },
  // A swap (v1.8.1): when the next ball does clearly better, the hand taps the launcher.
  swap: {
    kind: 'tap',
    shows: () => true,
    bonus: () => 0,
    landing: false,
    learnt: never,
    fired: never,
    swap: true,
    moment: true,
  },
  // A charged shot (v1.8.1): the finger stays still on the target while the ring fills.
  charge: {
    kind: 'hold',
    shows: straight,
    bonus: () => 0,
    landing: false,
    learnt: never,
    fired: (shot) => shot.powered && shot.special !== 'laser',
    swap: false,
    moment: false,
  },
};

/** The item of `items` with the highest `value`, the first of equals; undefined if none. */
function maxBy<T>(items: readonly T[], value: (item: T) => number): T | undefined {
  let best: T | undefined;
  let top = -Infinity;
  for (const item of items) {
    const worth = value(item);
    if (worth > top) [best, top] = [item, worth];
  }
  return best;
}

/** The key of a line's landing: the ball it meets and the side of it; null if none. */
export function keyOf(line: AimLine, game: Game): number | null {
  const target = line.target;
  const ball = target && game.chains[target.chain]?.balls[target.index];
  return target && ball ? ball.id * 2 + (target.after ? 1 : 0) : null;
}

/**
 * The best shot of a sweep: among the runs of neighbouring angles that make
 * the same shot, the one that teaches best, then the widest, aimed at its
 * middle, so that a player who copies the hand roughly still lands it.
 */
export function bestWindow(results: readonly (Candidate | null)[]): Candidate | null {
  const n = results.length;
  const keyAt = (i: number) => results[i % n]?.key ?? null;
  // Start where a run begins, so that a run across the end of the sweep stays whole.
  let start = 0;
  while (start < n && keyAt(start + n - 1) === keyAt(start)) start++;
  if (start === n) return results[0] ?? null;
  let best: { readonly value: number; readonly candidate: Candidate } | null = null;
  for (let i = 0; i < n;) {
    const first = start + i;
    let length = 1;
    while (i + length < n && keyAt(first + length) === keyAt(first)) length++;
    const head = results[first % n];
    if (head) {
      const value = head.score * n + length;
      const middle = results[(first + Math.floor(length / 2)) % n]!;
      if (!best || value > best.value) best = { value, candidate: middle };
    }
    i += length;
  }
  return best?.candidate ?? null;
}

/**
 * The hand that teaches a level's gestures (§ 3.13), one lesson after the
 * other (v1.8.1). It looks for a shot that shows the lesson, a few angles a
 * frame, preferring the biggest group and the chain reaction behind it (else
 * any such shot that reaches the chain); shows it until the player has done
 * it; a swap, only when the next ball does clearly better than the loaded
 * one. In the training, once its lessons are done, it shows the best shot
 * again after a few seconds without a shot, or after a few shots in a row
 * that made no group. It hides while the player holds a shot or one is in
 * flight.
 */
export class HandCoach {
  private readonly lessons: readonly Lesson[];
  /** The last lesson's rule, which still flavours the help once they are all done. */
  private readonly last: LessonRule;
  /** The lesson being taught: its place in `lessons`, their count once all are learnt. */
  private index = 0;
  /** The ball loaded when the shots were looked for: another one needs others. */
  private tone: Tone;
  /** The player's last shot, to tell how the black hole bent it. */
  private shot: ProjectileView | null = null;
  /** Seconds since the player's last shot, or since the start. */
  private idle = 0;
  /** The player's shots in a row that made no group. */
  private astray = 0;
  /** Seconds into the gesture shown; it starts again each time the hand comes back. */
  private phase = 0;
  /** This sweep's verdict on each angle tried so far, and the next angle to try. */
  private readonly sweep: (Candidate | null)[] = new Array<Candidate | null>(ANGLES).fill(null);
  private cursor = 0;
  /** A whole sweep was made with the ball loaded now. */
  private swept = false;
  /** The best shot of the last sweep, shown from the next gesture on. */
  private next: Candidate | null = null;
  /**
   * This sweep's best shot with a ball of each colour on the track (a swap's
   * lesson): the balls it would burst, its whole chain reaction counted.
   */
  private readonly bestOf = new Map<Tone, number>();
  /** Moments a swap's lesson has set up itself, and whether the balls loaded now are one. */
  private stagings = 0;
  private staged = false;
  /** The last whole sweep found the next ball clearly better: the hand shows the swap. */
  private moment = false;
  /** The gesture shown and its stroke, kept as is should the chain move its shot away. */
  private shown: {
    readonly candidate: Candidate | null;
    readonly kind: GestureKind;
    stroke: Stroke;
  } | null = null;

  /**
   * Follows the player in `game` from now on.
   * @param lessons what the hand teaches, in turn
   * @param nudge seconds without a shot after which it comes back once the
   *   lessons are done; null: it never does (the campaign's first level)
   */
  constructor(
    private readonly game: Game,
    lessons: readonly Lesson[],
    private readonly nudge: number | null,
  ) {
    this.lessons = lessons;
    this.last = LESSONS[lessons.at(-1) ?? 'shot'];
    this.tone = game.shooter.current;
    game.events.on('fired', ({ projectile }) => {
      if (projectile.by !== 'player') return;
      // The gesture waits, and the next one is looked for with the next ball.
      this.shot = projectile;
      this.idle = 0;
      this.astray++;
      if (this.rule?.fired(projectile)) this.learn();
      this.forget();
    });
    const landed = () => {
      if (this.rule?.landing) this.learn();
    };
    game.events.on('inserted', landed);
    game.events.on('bomb', landed);
    game.events.on('exploded', ({ by, cause, bounces }) => {
      if (by !== 'player' || cause !== 'shot' || !this.shot) return;
      this.astray = 0;
      if (this.rule?.learnt(this.shot, bounces)) this.learn();
    });
    game.events.on('swapped', () => {
      if (this.rule?.swap) this.learn();
    });
  }

  /** Every lesson is done. */
  get learnt(): boolean {
    return this.index >= this.lessons.length;
  }

  /** The lessons done so far, in order. */
  get done(): readonly Lesson[] {
    return this.lessons.slice(0, this.index);
  }

  /**
   * The lesson the hand teaches now, for its line: none while a swap waits
   * for its moment, nor once they are all done.
   */
  get teaching(): Lesson | null {
    const lesson = this.lessons[this.index];
    if (!lesson) return null;
    return LESSONS[lesson].moment && !this.moment ? null : lesson;
  }

  /** The gesture to draw now, or null. */
  get gesture(): Gesture | null {
    return this.shown && { ...this.shown.stroke, kind: this.shown.kind, time: this.phase };
  }

  /** The rule of the lesson being taught, or null once they are all done. */
  private get rule(): LessonRule | null {
    const lesson = this.lessons[this.index];
    return lesson ? LESSONS[lesson] : null;
  }

  /**
   * The hand is wanted: a lesson is to be done (a swap at its moment); or, in
   * the training, the player has waited too long, or keeps missing.
   */
  private get wanted(): boolean {
    const rule = this.rule;
    if (rule && (!rule.moment || this.moment)) return true;
    return this.nudge !== null && (this.idle >= this.nudge || this.astray >= STRUGGLE);
  }

  /** How the hand shows its next gesture: as the lesson asks, or a plain shot to help. */
  private get kind(): GestureKind {
    const rule = this.rule;
    if (!rule || (rule.moment && !this.moment)) return 'drag';
    return rule.kind;
  }

  private learn(): void {
    this.index++;
    this.forget();
  }

  /**
   * One frame: a few more angles of the sweep while the hand is wanted (or
   * soon will be), and the gesture shown. `active`: nothing hides the hand
   * now (no shot held or in flight, the game going on).
   */
  update(dt: number, active: boolean): void {
    const { game } = this;
    this.idle += dt;
    // Another ball loaded (a swap, the magnet): the shots found were for the other one.
    if (game.shooter.current !== this.tone) {
      this.tone = game.shooter.current;
      this.forget();
    }
    // Soon wanted: a sweep ahead, so that the hand comes back with a shot to show.
    const soon =
      this.nudge !== null && (this.idle >= this.nudge - SWEEP_TIME || this.astray >= STRUGGLE - 1);
    if (this.rule || soon) this.scan();
    if (!active || !this.wanted) {
      // Hidden: the next gesture starts from the press.
      this.shown = null;
      this.phase = 0;
      return;
    }
    if (this.shown) {
      this.phase += dt;
      if (this.phase >= GESTURE_LOOP) {
        this.phase -= GESTURE_LOOP;
        this.shown = null;
      }
    }
    if (this.shown) {
      // The chain moves: the stroke follows the shot, while it still shows the lesson.
      const fresh = this.shown.candidate && this.strokeOf(this.shown.candidate, this.shown.kind);
      if (fresh) this.shown.stroke = fresh;
      return;
    }
    const kind = this.kind;
    if (kind === 'tap') {
      // A swap: the finger taps the launcher, nothing to aim.
      const at = game.shooter.position;
      this.shown = { candidate: null, kind, stroke: { from: at, to: at, path: [] } };
      return;
    }
    const stroke = this.next && this.strokeOf(this.next, kind);
    if (this.next && stroke) {
      this.shown = { candidate: this.next, kind, stroke };
      return;
    }
    // The shot found has gone (the chain moved): the sweep finds another one.
    this.next = null;
    this.phase = 0;
  }

  /**
   * The stroke of a shot found earlier, if its angle still shows as much (the
   * chain moves): from the launcher to where the finger lets go; a held press
   * starts and ends there.
   */
  private strokeOf(candidate: Candidate, kind: GestureKind): Stroke | null {
    const line = this.game.aimLineAt(candidate.angle, BOUNCES);
    const now = this.score(line);
    if (now === null || now < Math.min(candidate.score, 1)) return null;
    const to = releaseOf(line);
    return { from: kind === 'hold' ? to : this.game.shooter.position, to, path: line.points };
  }

  /**
   * A few more angles of the sweep. While no shot is found, the best one
   * tried so far will do; at the end of the sweep, its best window is the
   * next one.
   */
  private scan(): void {
    // A swap's lesson weighs a ball of each colour on the track, angle by angle.
    const weighs = this.rule?.moment === true;
    if (weighs && this.cursor === 0) {
      this.bestOf.clear();
      for (const chain of this.game.chains) {
        for (const ball of chain.balls) this.bestOf.set(ball.tone, 0);
      }
    }
    for (let k = 0; k < PER_FRAME; k++) {
      const index = ORDER[this.cursor]!;
      const angle = (index / ANGLES) * Math.PI * 2;
      const line = this.game.aimLineAt(angle, BOUNCES);
      const key = keyOf(line, this.game);
      const score = key === null ? null : this.score(line);
      const found = key !== null && score !== null ? { angle, score, key } : null;
      this.sweep[index] = found;
      if (weighs && key !== null) {
        for (const [tone, best] of this.bestOf) {
          this.bestOf.set(tone, Math.max(best, this.game.reach(tone, line)));
        }
      }
      const provisional = !this.swept || this.next === null;
      if (provisional && found && (!this.next || found.score > this.next.score)) this.next = found;
      this.cursor = (this.cursor + 1) % ANGLES;
      if (this.cursor > 0) continue;
      this.swept = true;
      this.next = bestWindow(this.sweep) ?? this.next;
      if (weighs) this.weigh();
    }
  }

  /**
   * The end of a swap lesson's sweep: it is the moment if the next ball does
   * clearly better than the loaded one. If not, the hand may set the moment
   * up (a few times): it loads the colour that does least, and deals the one
   * that does most after it.
   */
  private weigh(): void {
    const { shooter } = this.game;
    const here = this.bestOf.get(shooter.current) ?? 0;
    const next = this.bestOf.get(shooter.next) ?? 0;
    // A moment set up by the hand lasts while the next ball still does better.
    this.moment = next >= here + SWAP_MARGIN || (this.staged && next > here);
    if (this.moment || this.stagings >= SWAP_STAGINGS || this.game.loadedSpecial !== null) return;
    // As few changes as can be: the next ball kept if it does best, the loaded one if it does least.
    const scores = [...this.bestOf];
    const best = maxBy(scores, ([tone, score]) => score + (tone === shooter.next ? 0.5 : 0));
    const worst = maxBy(
      scores.filter(([tone]) => tone !== best?.[0]),
      ([tone, score]) => (tone === shooter.current ? 0.5 : 0) - score,
    );
    // The clearest moment there is; with every colour doing as well, nothing to set up.
    if (!worst || !best || best[1] < SWAP_MARGIN || best[1] <= worst[1]) return;
    this.game.stageSwap(worst[0], best[0]);
    this.stagings++;
    this.staged = true;
    this.tone = shooter.current;
    this.moment = true;
  }

  /**
   * What a shot along `line` is worth: the group it makes, the chain reaction
   * behind it, and the lesson's bonus if it shows the lesson; null if it meets
   * no ball. Until the lesson is done, only the shots that show it count (0
   * for one that makes no group, so the gesture still shows); once it is
   * done, the hand comes back to help: any shot that makes a group.
   */
  private score(line: AimLine): number | null {
    if (!line.target) return null;
    const rule = this.rule;
    // Once the lessons are done, the last one still flavours the help (bank shots in E2).
    const style = rule ?? this.last;
    const shows = style.shows(line);
    if (!shows && rule) return null;
    const preview = this.game.preview(false, line, true);
    const group = preview?.group.length ?? 0;
    if (group === 0) return rule ? 0 : null;
    return group + (preview?.reaction.length ?? 0) + (shows ? style.bonus(line) : 0);
  }

  private forget(): void {
    this.sweep.fill(null);
    this.cursor = 0;
    this.swept = false;
    this.next = null;
    this.shown = null;
    this.moment = false;
    this.staged = false;
  }
}
