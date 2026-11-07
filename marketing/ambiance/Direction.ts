import type { Plan, Section, SectionKind, Shot } from './Composer';
import type { Mood } from './Mood';
import { isSparkle, type Note } from './Score';

/**
 * The direction of the picture (specification § 3.18, art direction): where
 * the camera is, which colour grade plays, when each section's signature
 * effect swells and where the glows of the glass notes bloom, all as pure
 * functions of time. The scene only draws what this decides.
 */

export interface Camera {
  /** Offset of the view, as a share of the picture (−0.1 to 0.1). */
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  /** Radians. */
  readonly rotation: number;
  /** Depth in focus, 0 (far) to 1 (near). */
  readonly focus: number;
}

export interface Grade {
  readonly calm: number;
  readonly bright: number;
  readonly deep: number;
}

export interface Glow {
  /** Where it blooms, 0 to 1 across and down the picture. */
  readonly x: number;
  readonly y: number;
  /** 0 to 1. */
  readonly strength: number;
  /** Which of the world's two glow colours. */
  readonly hue: number;
}

export interface FrameDirection {
  readonly camera: Camera;
  readonly grade: Grade;
  /** The section's energy, cross-faded between sections. */
  readonly energy: number;
  /** The signature effect of the world, 0 to 1. */
  readonly signature: number;
  /** A band of light crossing the picture while two sections cross-fade, 0 to 1 across. */
  readonly sweep: number;
  /** How strong the sweep is, 0 to 1. */
  readonly sweepStrength: number;
  /** The overall light, 0 to 1 (the mood's ceiling, lowered as a sleep video calms). */
  readonly light: number;
  readonly glows: readonly Glow[];
}

/** Seconds a signature effect takes to swell, hold and fall: never a flash. */
export const SIGNATURE = { rise: 6, hold: 3, fall: 10 } as const;
/** Seconds a glow takes to bloom and to fade. */
export const GLOW = { rise: 4, fall: 5 } as const;
/** At most this many glows at once. */
export const MAX_GLOWS = 8;

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
const mix = (a: number, b: number, w: number) => a + (b - a) * w;
/** A stable number in [0, 1) for an integer and a salt. */
export const hash = (n: number, salt: number) => {
  const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** When a section's signature effect peaks: past its middle, where the music is richest. */
export const peakOf = (plan: Plan, index: number): number => {
  const section = plan.sections[index]!;
  return section.start + section.seconds * (0.45 + 0.2 * hash(section.index, 7 + plan.seed));
};

/** Where a shot frames the picture at `u` (0 to 1 through the section). */
function shotCamera(shot: Shot, u: number, seed: number, amplitude: number): Camera {
  const e = smooth(u);
  const fx = (hash(seed, 1) - 0.5) * 0.08;
  const fy = (hash(seed, 2) - 0.5) * 0.06;
  const a = amplitude;
  const focus = 0.35 + 0.3 * Math.sin(Math.PI * u + hash(seed, 3) * 6);
  switch (shot) {
    case 'wide':
      return { x: fx * 0.5, y: fy * 0.5, zoom: 1 + 0.04 * a * e, rotation: 0, focus };
    case 'push':
      return { x: fx * e, y: fy * e, zoom: 1.02 + 0.12 * a * e, rotation: 0, focus };
    case 'travel':
      return { x: mix(-0.06, 0.06, e) * a, y: fy, zoom: 1.07, rotation: 0, focus };
    case 'rise':
      return { x: fx, y: mix(0.05, -0.05, e) * a, zoom: 1.06, rotation: 0, focus };
    case 'dive':
      return { x: fx, y: mix(-0.05, 0.05, e) * a, zoom: 1.04 + 0.06 * a * e, rotation: 0, focus };
    case 'orbit':
      return {
        x: fx * 0.5,
        y: fy * 0.5,
        zoom: 1.08,
        rotation: mix(-0.035, 0.035, e) * a,
        focus,
      };
  }
}

const gradeOf = (kind: SectionKind): Grade => ({
  calm: kind === 'calm' ? 1 : 0,
  bright: kind === 'bright' ? 1 : 0,
  deep: kind === 'deep' ? 1 : 0,
});

/** The director of one video: its plan, its mood and its glass notes. */
export class Director {
  private readonly sparkles: readonly Note[];

  constructor(
    private readonly plan: Plan,
    private readonly mood: Mood,
    notes: readonly Note[],
  ) {
    this.sparkles = notes.filter(isSparkle).sort((a, b) => a.at - b.at);
  }

  /** The section playing at `t`, and how far the next one has faded in (0 outside a cross-fade). */
  sectionAt(t: number): { section: Section; previous: Section | null; blend: number } {
    const sections = this.plan.sections;
    let index = sections.length - 1;
    for (let i = 0; i < sections.length; i++) {
      if (t < sections[i]!.start + sections[i]!.seconds) {
        index = i;
        break;
      }
    }
    const section = sections[index]!;
    const previous = index > 0 ? sections[index - 1]! : null;
    const into = t - section.start;
    const blend = previous && into < section.crossfade ? smooth(into / section.crossfade) : 1;
    return { section, previous, blend };
  }

  frame(t: number): FrameDirection {
    const { section, previous, blend } = this.sectionAt(t);
    const amplitude = this.mood.motion * (0.6 + 0.4 * section.energy) * this.calming(t);
    const cameraOf = (s: Section) =>
      shotCamera(s.shot, (t - s.start) / s.seconds, this.plan.seed * 31 + s.index, amplitude);
    const now = cameraOf(section);
    const camera = previous ? this.blendCamera(cameraOf(previous), now, blend) : now;
    const gradeNow = gradeOf(section.kind);
    const gradeBefore = previous ? gradeOf(previous.kind) : gradeNow;
    const grade = {
      calm: mix(gradeBefore.calm, gradeNow.calm, blend),
      bright: mix(gradeBefore.bright, gradeNow.bright, blend),
      deep: mix(gradeBefore.deep, gradeNow.deep, blend),
    };
    const energy = previous ? mix(previous.energy, section.energy, blend) : section.energy;
    const crossing = previous && blend < 1;
    return {
      camera,
      grade,
      energy,
      signature: this.signature(t),
      sweep: crossing ? blend : 0,
      // A glint, not a flash: the band changes a zone by about its own strength.
      sweepStrength: crossing ? Math.sin(Math.PI * blend) * 0.05 * this.calming(t) : 0,
      light: this.mood.light * this.dimming(t),
      glows: this.glows(t),
    };
  }

  /** The signature effect at `t`: rises, holds, falls, around each section's peak. */
  signature(t: number): number {
    let strongest = 0;
    for (const section of this.plan.sections) {
      const peak = peakOf(this.plan, section.index);
      const from = peak - SIGNATURE.rise - SIGNATURE.hold / 2;
      const until = peak + SIGNATURE.hold / 2 + SIGNATURE.fall;
      if (t < from || t > until) continue;
      const level =
        t < peak - SIGNATURE.hold / 2
          ? smooth((t - from) / SIGNATURE.rise)
          : t <= peak + SIGNATURE.hold / 2
            ? 1
            : 1 - smooth((t - peak - SIGNATURE.hold / 2) / SIGNATURE.fall);
      strongest = Math.max(strongest, level * (0.55 + 0.45 * section.energy));
    }
    return strongest;
  }

  /** The glows of the glass and bell notes ringing at `t`. */
  glows(t: number): readonly Glow[] {
    const out: Glow[] = [];
    // The last notes first: binary search for the first note after `t`.
    let low = 0;
    let high = this.sparkles.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (this.sparkles[middle]!.at <= t) low = middle + 1;
      else high = middle;
    }
    for (let i = low - 1; i >= 0 && out.length < MAX_GLOWS; i--) {
      const note = this.sparkles[i]!;
      const age = t - note.at;
      if (age > GLOW.rise + GLOW.fall) break;
      const strength =
        age < GLOW.rise ? smooth(age / GLOW.rise) : 1 - smooth((age - GLOW.rise) / GLOW.fall);
      const n = Math.round(note.at * 1000);
      out.push({
        x: 0.15 + 0.7 * hash(n, 11),
        // In the lit upper part of the picture: a glow in the dark depths would flash.
        y: 0.4 + 0.45 * hash(n, 13),
        strength: strength * note.level * 2.5,
        hue: note.voice === 'bell' ? 1 : 0,
      });
    }
    return out;
  }

  /** To sleep, the movements shrink after the opening, down to 60 % by mid-video. */
  private calming(t: number): number {
    if (this.mood.arc !== 'descending') return 1;
    return mix(1, 0.6, smooth((t - 180) / Math.max(1, this.plan.seconds / 2 - 180)));
  }

  /** To sleep, the light falls by 30 % at most, by mid-video. */
  private dimming(t: number): number {
    if (this.mood.arc !== 'descending') return 1;
    return mix(1, 0.7, smooth((t - 180) / Math.max(1, this.plan.seconds / 2 - 180)));
  }

  private blendCamera(a: Camera, b: Camera, w: number): Camera {
    return {
      x: mix(a.x, b.x, w),
      y: mix(a.y, b.y, w),
      zoom: mix(a.zoom, b.zoom, w),
      rotation: mix(a.rotation, b.rotation, w),
      focus: mix(a.focus, b.focus, w),
    };
  }
}
