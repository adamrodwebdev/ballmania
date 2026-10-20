/**
 * The victory, in real seconds from the last explosion (specification § 3.5):
 * light surges along every track from its entrance to the hole, the hole
 * gathers it and bursts into a supernova of rings and stardust, and the
 * result arrives while the afterglow fades. Pure timing and shapes: the
 * renderer draws them, the play session counts the seconds.
 */

/** Seconds the light takes to run from the entrance to the hole. */
export const SURGE = 0.9;
/** The moment the hole bursts. */
export const NOVA = 0.95;
/** The moment the result dialog opens. */
export const RESULT = 1.7;
/** After this, nothing is left of the effect. */
export const AFTERGLOW = 3.4;

const clamp = (t: number) => Math.min(1, Math.max(0, t));

/** Smooth start, smooth end. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Fast start, soft landing. */
export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** How far along its track the light has run, from 0 (entrance) to 1 (hole). */
export function surge(elapsed: number): number {
  return easeInOut(clamp(elapsed / SURGE));
}

/** How bright the lit tracks are: full while the light runs, then a slow fade. */
export function afterglow(elapsed: number): number {
  if (elapsed <= SURGE) return 1;
  return 1 - easeOut(clamp((elapsed - SURGE) / (AFTERGLOW - SURGE)));
}

/** The hole gathering the light just before it bursts, from 0 to 1; 0 after. */
export function gathering(elapsed: number): number {
  if (elapsed >= NOVA) return 0;
  return clamp((elapsed - 0.4) / (NOVA - 0.4)) ** 2;
}

/** Seconds since the supernova, or null before it. */
export function novaAge(elapsed: number): number | null {
  return elapsed >= NOVA ? elapsed - NOVA : null;
}

/** One shock ring of the supernova, in board units. */
export interface ShockRing {
  readonly radius: number;
  readonly width: number;
  readonly alpha: number;
  /** 0: the bright leading ring, 1: the wide soft one, 2: the thin echo. */
  readonly layer: number;
}

const RINGS = [
  { delay: 0, life: 0.85, width: 7 },
  { delay: 0.07, life: 1.25, width: 30 },
  { delay: 0.2, life: 1.05, width: 3 },
] as const;

/** The rings running out of the hole `age` seconds after the burst, out to `reach`. */
export function shockRings(age: number, reach: number): ShockRing[] {
  return RINGS.flatMap(({ delay, life, width }, layer) => {
    const t = (age - delay) / life;
    if (t <= 0 || t >= 1) return [];
    return [
      { radius: easeOut(t) * reach, width: width * (1 - 0.6 * t), alpha: (1 - t) ** 1.6, layer },
    ];
  });
}

/** The white-hot core of the burst: its radius (in ball radii) and opacity; null once out. */
export function novaCore(age: number): { readonly size: number; readonly alpha: number } | null {
  const t = age / 0.6;
  if (t >= 1) return null;
  return { size: 2 + 16 * easeOut(t), alpha: (1 - t) ** 2 };
}

/** A speck of stardust, thrown out of the hole and drifting up. */
export interface Mote {
  readonly angle: number;
  /** How far it is thrown, in board units. */
  readonly distance: number;
  /** Units per second it rises once thrown. */
  readonly rise: number;
  readonly size: number;
  readonly life: number;
  readonly phase: number;
  readonly tone: number;
}

/** Stardust for one victory, the same for the same random source. */
export function stardust(count: number, spread: number, random: () => number): Mote[] {
  return Array.from({ length: count }, () => ({
    angle: random() * Math.PI * 2,
    distance: spread * (0.25 + 0.75 * Math.sqrt(random())),
    rise: 25 + random() * 55,
    size: 2.5 + random() * 4.5,
    life: 1.6 + random() * 1.1,
    phase: random() * Math.PI * 2,
    tone: Math.floor(random() * 6),
  }));
}

/** Where a speck is, and how bright, `age` seconds after the burst; null once it has faded. */
export function moteAt(
  mote: Mote,
  age: number,
): { readonly dx: number; readonly dy: number; readonly alpha: number } | null {
  if (age <= 0 || age >= mote.life) return null;
  const thrown = easeOut(clamp(age / 0.9)) * mote.distance;
  const fade = clamp(age / 0.12) * (1 - (age / mote.life) ** 2);
  const twinkle = 0.65 + 0.35 * Math.sin(age * 9 + mote.phase);
  return {
    dx: Math.cos(mote.angle) * thrown,
    dy: Math.sin(mote.angle) * thrown - mote.rise * age,
    alpha: fade * twinkle,
  };
}
