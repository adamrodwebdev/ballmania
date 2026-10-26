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

/** The hand's way: it presses on the shooter (`from`), lets go at `to`; the shot runs along `path`. */
interface Stroke {
  readonly from: Vec2;
  readonly to: Vec2;
  readonly path: readonly Vec2[];
}

/** The gesture drawn: its stroke, and the seconds into it (0 to `GESTURE_LOOP`). */
export interface Gesture extends Stroke {
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

/** What a lesson asks of a shot, and when it is learnt. */
interface LessonRule {
  /** True if a shot along this line shows the gesture. */
  shows(line: AimLine): boolean;
  /** What such a shot is worth on top of the group it makes. */
  bonus(line: AimLine): number;
  /** True if a shot that reached the chain is the lesson done. */
  readonly landing: boolean;
  /** True if this shot of the player, which set off an explosion, is the lesson done. */
  learnt(shot: ProjectileView, bounces: number): boolean;
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

const LESSONS: Readonly<Record<Lesson, LessonRule>> = {
  // A shot straight at the chain; a Nova lands wherever it touches it.
  shot: {
    shows: (line) => line.rebounds.length === 0,
    bonus: () => 0,
    landing: true,
    learnt: () => false,
  },
  // A bank shot off a mirror: the finger points at the mirror, before it.
  bank: {
    shows: (line) => line.rebounds.length > 0,
    bonus: (line) => line.rebounds.length,
    landing: false,
    learnt: (_, bounces) => bounces > 0,
  },
  // A shot the black hole bends: the finger points one way, the shot lands another.
  curve: {
    shows: (line) => line.rebounds.length === 0 && bend(line.points) >= LESSON_BEND,
    bonus: (line) => Math.round(4 * bend(line.points)),
    landing: false,
    learnt: (shot) => shot.deflection >= LESSON_BEND,
  },
};

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
 * The hand that teaches a level's gesture (§ 3.13). It looks for a shot that
 * shows its lesson, a few angles a frame, preferring the biggest group and
 * the chain reaction behind it (else any such shot that reaches the chain);
 * shows it until the player has done it; and, in the training, shows it
 * again after a few seconds without a shot, or after a few shots in a row
 * that made no group. It hides while the player holds a shot or one is in
 * flight.
 */
export class HandCoach {
  private readonly rule: LessonRule;
  private learntValue = false;
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
  /** The shot shown and its stroke, kept as is should the chain move it away. */
  private shown: { readonly candidate: Candidate; stroke: Stroke } | null = null;

  /**
   * Follows the player's shots in `game` from now on.
   * @param lesson what the hand teaches
   * @param nudge seconds without a shot after which it comes back once the
   *   lesson is done; null: it never does (the campaign's first level)
   */
  constructor(
    private readonly game: Game,
    lesson: Lesson,
    private readonly nudge: number | null,
  ) {
    const rule = LESSONS[lesson];
    this.rule = rule;
    this.tone = game.shooter.current;
    game.events.on('fired', ({ projectile }) => {
      if (projectile.by !== 'player') return;
      // The gesture waits, and the next one is looked for with the next ball.
      this.shot = projectile;
      this.idle = 0;
      this.astray++;
      this.forget();
    });
    const landed = () => {
      if (rule.landing) this.learntValue = true;
    };
    game.events.on('inserted', landed);
    game.events.on('bomb', landed);
    game.events.on('exploded', ({ by, cause, bounces }) => {
      if (by !== 'player' || cause !== 'shot' || !this.shot) return;
      this.astray = 0;
      if (rule.learnt(this.shot, bounces)) this.learntValue = true;
    });
  }

  get learnt(): boolean {
    return this.learntValue;
  }

  /** The gesture to draw now, or null. */
  get gesture(): Gesture | null {
    return this.shown && { ...this.shown.stroke, time: this.phase };
  }

  /**
   * The hand is wanted: its lesson is not done yet; or, in the training, the
   * player has waited too long, or keeps missing.
   */
  private get wanted(): boolean {
    if (!this.learntValue) return true;
    return this.nudge !== null && (this.idle >= this.nudge || this.astray >= STRUGGLE);
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
    if (!this.learntValue || soon) this.scan();
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
      const fresh = this.strokeOf(this.shown.candidate);
      if (fresh) this.shown.stroke = fresh;
      return;
    }
    const stroke = this.next && this.strokeOf(this.next);
    if (this.next && stroke) {
      this.shown = { candidate: this.next, stroke };
      return;
    }
    // The shot found has gone (the chain moved): the sweep finds another one.
    this.next = null;
    this.phase = 0;
  }

  /** The stroke of a shot found earlier, if its angle still shows as much (the chain moves). */
  private strokeOf(candidate: Candidate): Stroke | null {
    const line = this.game.aimLineAt(candidate.angle, BOUNCES);
    const now = this.score(line);
    if (now === null || now < Math.min(candidate.score, 1)) return null;
    return { from: this.game.shooter.position, to: releaseOf(line), path: line.points };
  }

  /**
   * A few more angles of the sweep. While no shot is found, the best one
   * tried so far will do; at the end of the sweep, its best window is the
   * next one.
   */
  private scan(): void {
    for (let k = 0; k < PER_FRAME; k++) {
      const index = ORDER[this.cursor]!;
      const angle = (index / ANGLES) * Math.PI * 2;
      const line = this.game.aimLineAt(angle, BOUNCES);
      const key = keyOf(line, this.game);
      const score = key === null ? null : this.score(line);
      const found = key !== null && score !== null ? { angle, score, key } : null;
      this.sweep[index] = found;
      const provisional = !this.swept || this.next === null;
      if (provisional && found && (!this.next || found.score > this.next.score)) this.next = found;
      this.cursor = (this.cursor + 1) % ANGLES;
      if (this.cursor > 0) continue;
      this.swept = true;
      this.next = bestWindow(this.sweep) ?? this.next;
    }
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
    const shows = this.rule.shows(line);
    if (!shows && !this.learntValue) return null;
    const preview = this.game.preview(false, line, true);
    const group = preview?.group.length ?? 0;
    if (group === 0) return this.learntValue ? null : 0;
    return group + (preview?.reaction.length ?? 0) + (shows ? this.rule.bonus(line) : 0);
  }

  private forget(): void {
    this.sweep.fill(null);
    this.cursor = 0;
    this.swept = false;
    this.next = null;
    this.shown = null;
  }
}
