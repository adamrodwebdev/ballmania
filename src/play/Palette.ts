import { MAX_TONES, type Tone } from '@/engine/chain/Ball';

/** CSS variables of the tones, in tone order (the same order as the `.tone-N` classes). */
export const TONE_VARIABLES = [
  '--orb-ruby',
  '--orb-amber',
  '--orb-lime',
  '--orb-cyan',
  '--orb-violet',
  '--orb-rose',
] as const;

/**
 * Colours the renderer draws with, read from the design tokens so that the
 * board follows the light and dark themes like the rest of the interface.
 */
export class Palette {
  private constructor(
    readonly tones: readonly string[],
    readonly board: string,
    readonly track: string,
    readonly trackEdge: string,
    readonly hole: string,
    readonly danger: string,
    readonly accent: string,
    readonly text: string,
    readonly shooter: string,
  ) {}

  static fromStyle(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): Palette {
    const read = (name: string, fallback: string) =>
      style.getPropertyValue(name).trim() || fallback;
    return new Palette(
      TONE_VARIABLES.map((name) => read(name, '#888888')),
      read('--board-bg', '#101020'),
      read('--track', '#222244'),
      read('--track-edge', '#333366'),
      read('--hole', '#000000'),
      read('--danger', '#ff3b3b'),
      read('--accent', '#9d7bff'),
      read('--text', '#ffffff'),
      read('--shooter', '#2a2550'),
    );
  }

  tone(tone: Tone): string {
    return this.tones[tone % MAX_TONES]!;
  }
}
