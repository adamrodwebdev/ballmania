import type { AmbienceStyle } from './Ambience';
import type { Palette } from '../Palette';
import type { Context2D } from '../canvas';

/**
 * The look of a world (specification § 3.5): for now, the backdrop of the
 * board. Painted once per size and colour scheme into a cached canvas.
 */
export interface WorldTheme {
  /** How the backdrop lives, frame after frame (§ 3.9). */
  readonly ambience: AmbienceStyle;
  /**
   * A night sky in both themes: the board keeps the cosmos colours while the
   * interface around it follows the theme.
   */
  readonly night: boolean;
  paintBackground(ctx: Context2D, width: number, height: number, palette: Palette): void;
}

/** `#rrggbb` with an alpha channel; other colour syntaxes are returned unchanged. */
export function withAlpha(colour: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(colour.trim())) return colour;
  const byte = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${colour.trim()}${byte.toString(16).padStart(2, '0')}`;
}
