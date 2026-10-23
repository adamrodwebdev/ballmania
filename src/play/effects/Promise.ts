/**
 * The promise that ends the training (v1.8.0, specification § 3.13): after
 * the supernova, the young Stellar Colossus rises out of the black hole,
 * roars, stares at the player, and dives back, out of reach: its fight is
 * at 1-3. Pure timing and poses, in seconds from the start of the promise:
 * the renderer draws them, the play session counts the seconds and plays
 * the sounds at their cues.
 */

/** Seconds between the supernova and the start of the promise: its core has faded. */
export const PROMISE_AFTER = 0.75;
/** The hole stirs, then the body rises out of it, then settles. */
export const RISE_AT = 0.45;
const RISE_END = 1.25;
const SETTLED = 1.5;
/** The roar: a breath in, the roar itself (the cue of its sound and shake), the recovery. */
const BREATH = 1.5;
export const ROAR_AT = 1.68;
const ROAR_END = 2.15;
const RECOVERED = 2.35;
/** It turns to the player, blinks once, and holds the stare. */
const STARE_AT = 2.4;
const BLINK_AT = 2.85;
/** A last lift, the dive, and the hole closing over it (the cue of its sound). */
const LIFT_AT = 3.25;
const DIVE_AT = 3.4;
export const GONE_AT = 3.85;
/** Seconds of the whole promise. */
export const PROMISE_LENGTH = 4.2;

/** The body's radius, in radii of the black hole's horizon: it fills the disk. */
export const PROMISE_SIZE = 1.5;
/** Where the body stands when risen: this many body radii above the hole. */
const RISEN = 0.55;
/** Its runes' orbit at rest, in body radii (as in a fight). */
const ORBIT = 1.22;

/** The Colossus at a moment of the promise. */
export interface PromisePose {
  /** Size of the body, as a share of its full size. */
  readonly scale: number;
  /** How far above the hole it stands, in body radii. */
  readonly lift: number;
  readonly alpha: number;
  /** Orbit of the runes, in body radii, and how far they have turned along it (radians). */
  readonly spread: number;
  readonly turn: number;
  /** The eye: how open (1: as in a fight), and where it looks: 1 ahead (up), 0 at the player. */
  readonly open: number;
  readonly ahead: number;
  /** The roar, from 0 to 1: the rim flares, the pupil narrows, the body trembles. */
  readonly rage: number;
  /** How much the black hole stirs, from 0 to 1: it flares before the rise and at the dive. */
  readonly stir: number;
}

const clamp = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
const easeIn = (t: number) => clamp(t) ** 3;
/** Overshoots its target a little, then lands on it. */
const backOut = (t: number) => {
  const x = clamp(t) - 1;
  return 1 + 2.2 * x ** 3 + 1.2 * x ** 2;
};
/** A spring settling from `amount` above its rest, `t` seconds after the release. */
const settle = (t: number, amount: number) =>
  t <= 0 ? 0 : amount * Math.exp(-7 * t) * Math.cos(16 * t);

const HIDDEN: PromisePose = {
  scale: 0,
  lift: 0,
  alpha: 0,
  spread: 0,
  turn: 0,
  open: 0,
  ahead: 1,
  rage: 0,
  stir: 0,
};

/**
 * The pose `t` seconds into the promise; null before or after it. With
 * reduced motion, the body fades in already risen, stares, and fades out,
 * without a tremble, a spring or a roar that moves it.
 */
export function promisePose(t: number, still: boolean): PromisePose | null {
  if (t < 0 || t >= PROMISE_LENGTH) return null;
  return still ? stillPose(t) : livePose(t);
}

function stillPose(t: number): PromisePose {
  const shown = smooth((t - RISE_AT) / 0.4) * (1 - smooth((t - DIVE_AT) / 0.4));
  return {
    ...HIDDEN,
    scale: 1,
    lift: RISEN,
    alpha: shown,
    spread: ORBIT,
    turn: 0.8 * t,
    open: 1,
    ahead: 0,
    stir: t < RISE_AT ? smooth(t / RISE_AT) : 0.4 * (1 - shown),
  };
}

function livePose(t: number): PromisePose {
  if (t < RISE_AT) return { ...HIDDEN, stir: smooth(t / RISE_AT) };
  // The rise: out of the horizon, growing past its size, the runes spiralling out.
  const rise = (t - RISE_AT) / (RISE_END - RISE_AT);
  let scale = 0.25 + 0.75 * backOut(rise) + settle(t - RISE_END, 0.04);
  let lift = RISEN * easeOut(rise);
  let spread = 0.5 + (ORBIT - 0.5) * easeOut((rise - 0.25) / 0.75);
  // The runes whirl as it rises, in the roar, and as the hole swallows them.
  const turn =
    0.8 * t +
    2.4 * smooth(rise) +
    3 * smooth((t - ROAR_AT) / (RECOVERED - ROAR_AT)) +
    4 * easeIn((t - DIVE_AT) / (GONE_AT - DIVE_AT));
  // The eye opens at the end of the rise, wide for a moment.
  let open = backOut((rise - 0.75) / 0.25);
  let ahead = 1;
  let rage = 0;
  let stir = 1 - 0.7 * clamp(rise);
  if (t >= SETTLED) {
    // A breath in: the body draws in, the runes close, the eye narrows.
    const breath = smooth((t - BREATH) / (ROAR_AT - BREATH));
    scale = 1 - 0.06 * breath;
    spread = ORBIT - 0.12 * breath;
    open = 1 - 0.45 * breath;
    lift = RISEN - 0.05 * breath;
    stir = 0.3;
  }
  if (t >= ROAR_AT) {
    // The roar: the body swells, the runes fly out and whirl, the eye wide.
    const roar = (t - ROAR_AT) / (ROAR_END - ROAR_AT);
    const out = easeOut(roar / 0.4);
    const back = smooth((t - ROAR_END) / (RECOVERED - ROAR_END));
    scale = 0.94 + 0.18 * out - 0.12 * back;
    spread = ORBIT - 0.12 + 0.6 * out - 0.48 * back;
    open = 0.55 + 0.7 * out - 0.25 * back;
    lift = RISEN - 0.05 + 0.05 * back;
    rage = clamp(1 - back) * smooth(roar / 0.4);
    stir = 0.3 + 0.5 * out * (1 - back);
  }
  if (t >= RECOVERED) {
    // The stare: the eye turns to the player and holds, one blink; it breathes.
    ahead = 1 - smooth((t - STARE_AT) / 0.16);
    const blink = Math.abs(t - BLINK_AT - 0.07) < 0.07 ? Math.abs(t - BLINK_AT - 0.07) / 0.07 : 1;
    open = blink * (1 + 0.1 * smooth((t - STARE_AT) / 0.3));
    // Leaning in, breathing; the breath stops before the last lift.
    const breathing =
      0.012 * Math.sin((t - RECOVERED) * 9) * (1 - smooth((t - LIFT_AT + 0.2) / 0.2));
    scale = 1 + 0.06 * smooth((t - STARE_AT) / 0.8) + breathing;
    spread = ORBIT;
    rage = 0;
    stir = 0.3 - 0.1 * smooth((t - RECOVERED) / 0.4);
  }
  if (t >= LIFT_AT) {
    // A last lift, then the dive: it shrinks into the hole, the runes trailing behind.
    const lift2 = smooth((t - LIFT_AT) / (DIVE_AT - LIFT_AT));
    const dive = easeIn((t - DIVE_AT) / (GONE_AT - DIVE_AT));
    const trail = easeIn((t - DIVE_AT - 0.08) / (GONE_AT - DIVE_AT));
    scale = (1.06 + 0.04 * lift2) * (1 - 0.88 * dive);
    lift = (RISEN + 0.15 * lift2) * (1 - dive);
    spread = ORBIT - (ORBIT - 0.4) * trail;
    open = 1 - 0.6 * dive;
    ahead = 0;
    stir = 0.2 + 0.8 * dive;
  }
  const alpha = clamp((t - RISE_AT) / 0.25) * (1 - smooth((t - GONE_AT + 0.12) / 0.12));
  if (t >= GONE_AT) {
    // Gone: the hole calms down.
    return { ...HIDDEN, stir: 1 - smooth((t - GONE_AT) / (PROMISE_LENGTH - GONE_AT)) };
  }
  return { scale, lift, alpha, spread, turn, open, ahead, rage, stir };
}
