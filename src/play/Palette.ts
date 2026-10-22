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

  /** True on a dark board: light then adds up (additive blending) instead of covering. */
  get dark(): boolean {
    return luminance(this.board) < 0.4;
  }

  /** The palette of these colours: one sent to a worker (the title scene draws in one, v1.7.6). */
  static of(colours: PaletteColours): Palette {
    return new Palette(
      colours.tones,
      colours.board,
      colours.track,
      colours.trackEdge,
      colours.hole,
      colours.danger,
      colours.accent,
      colours.text,
      colours.shooter,
    );
  }

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

  /** Its colours as plain data, which `postMessage` can copy to a worker. */
  colours(): PaletteColours {
    return {
      tones: [...this.tones],
      board: this.board,
      track: this.track,
      trackEdge: this.trackEdge,
      hole: this.hole,
      danger: this.danger,
      accent: this.accent,
      text: this.text,
      shooter: this.shooter,
    };
  }
}

/** A palette's colours, without its methods. */
export type PaletteColours = Pick<
  Palette,
  'tones' | 'board' | 'track' | 'trackEdge' | 'hole' | 'danger' | 'accent' | 'text' | 'shooter'
>;

/** Relative luminance (0 to 1) of a `#rrggbb` or `#rgb` colour; 0.5 when unreadable. */
export function luminance(colour: string): number {
  const hex = colour.trim().replace('#', '');
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
