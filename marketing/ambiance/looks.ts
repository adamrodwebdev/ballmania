import type { SectionKind } from './Composer';
import type { WorldId } from './Mood';

/**
 * The colours of each world on screen (specification § 3.18, art direction):
 * its gas, its two glows and its three grades, one per kind of section.
 * Linear RGB, 0 to 1 (the grade may push past 1 before tone mapping).
 */

export type Rgb = readonly [number, number, number];

export interface GradeLook {
  /** Tint of the shadows and of the highlights (split toning). */
  readonly shadow: Rgb;
  readonly highlight: Rgb;
  readonly exposure: number;
  readonly saturation: number;
  readonly contrast: number;
}

export interface WorldLook {
  readonly index: number;
  readonly gas: readonly [Rgb, Rgb];
  readonly glow: readonly [Rgb, Rgb];
  readonly grades: Readonly<Record<SectionKind, GradeLook>>;
  /** Particles across the picture at full density. */
  readonly particles: number;
}

const hex = (value: string): Rgb => {
  const n = Number.parseInt(value.slice(1), 16);
  const linear = (c: number) => (c / 255) ** 2.2;
  return [linear((n >> 16) & 255), linear((n >> 8) & 255), linear(n & 255)];
};

const grade = (
  shadow: string,
  highlight: string,
  exposure: number,
  saturation: number,
  contrast = 1.05,
): GradeLook => ({
  shadow: hex(shadow),
  highlight: hex(highlight),
  exposure,
  saturation,
  contrast,
});

export const LOOKS: Readonly<Record<WorldId, WorldLook>> = {
  nebula: {
    index: 0,
    gas: [hex('#7b3fd0'), hex('#ff5fb4')],
    glow: [hex('#ffe3a8'), hex('#c46bff')],
    grades: {
      calm: grade('#3b2a7a', '#ffc6e8', 1.15, 1.2),
      bright: grade('#5a2a6e', '#ffe0a0', 1.35, 1.3),
      deep: grade('#1c1f5e', '#b9a6ff', 1.0, 1.15),
    },
    particles: 2400,
  },
  neon: {
    index: 1,
    gas: [hex('#1b2a8a'), hex('#c2189b')],
    glow: [hex('#27f2ff'), hex('#ff3fd8')],
    grades: {
      calm: grade('#14205e', '#7ff7ff', 1.15, 1.25),
      bright: grade('#3a0f5e', '#ff9ef0', 1.35, 1.35),
      deep: grade('#0a1240', '#5b7bff', 1.0, 1.2),
    },
    particles: 1800,
  },
  abyss: {
    index: 2,
    gas: [hex('#0d5a6e'), hex('#1fa98a')],
    glow: [hex('#5ff7e6'), hex('#b4ff8a')],
    grades: {
      calm: grade('#0c3b52', '#a8fff0', 1.15, 1.2),
      bright: grade('#0f4d5c', '#d8fff6', 1.35, 1.3),
      deep: grade('#061f3d', '#6fd6ff', 1.0, 1.15),
    },
    particles: 2600,
  },
  jewel: {
    index: 3,
    gas: [hex('#0f6b4f'), hex('#7a2fb0')],
    glow: [hex('#e8fbff'), hex('#b26bff')],
    grades: {
      calm: grade('#123f3a', '#e6c8ff', 1.15, 1.2),
      bright: grade('#203a5a', '#ffffff', 1.4, 1.25),
      deep: grade('#0d1c4d', '#7fb2ff', 1.0, 1.2),
    },
    particles: 2000,
  },
  volcano: {
    index: 4,
    gas: [hex('#6e1414'), hex('#a8326e')],
    glow: [hex('#ff8a1f'), hex('#ffd36a')],
    grades: {
      calm: grade('#3a0c1f', '#ffb27a', 1.15, 1.2),
      bright: grade('#4d1a0a', '#ffe08a', 1.35, 1.3),
      deep: grade('#250510', '#ff6a4a', 1.0, 1.15),
    },
    particles: 2400,
  },
  singularity: {
    index: 5,
    gas: [hex('#22336e'), hex('#5a2a8a')],
    glow: [hex('#ffe9b0'), hex('#8ab4ff')],
    grades: {
      calm: grade('#15204d', '#d6e4ff', 1.15, 1.15),
      bright: grade('#2a2040', '#fff4d6', 1.4, 1.2),
      deep: grade('#05060f', '#c9a64a', 1.0, 1.1),
    },
    particles: 2200,
  },
};
