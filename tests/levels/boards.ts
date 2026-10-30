import type { CampaignLevel } from '@/levels/campaign';
import { seatKey, type SeatKey } from '@/levels/seat';
import type { FrameKind } from '@/levels/tracks';
import { AIMING, type Device } from './bot';

/**
 * The screens the robots play on (v1.8.1, spec § 3.17), each with its hand:
 * a phone with its browser's bars showing, the same phone full screen, a
 * portal's 16:9 frame on a desktop, where moderators and most portal players
 * meet the game, and a maximized desktop window of our site.
 */
export type Screen = 'phone' | 'phoneFull' | 'desktop' | 'window';

export const SCREENS: Readonly<Record<Screen, { readonly device: Device; readonly name: string }>> =
  {
    phone: { device: 'finger', name: 'Téléphone, barres du navigateur visibles (393 × 659)' },
    phoneFull: { device: 'finger', name: 'Téléphone en plein écran (390 × 844)' },
    desktop: { device: 'mouse', name: 'Ordinateur, cadre de portail (1280 × 720)' },
    window: { device: 'mouse', name: 'Ordinateur, fenêtre agrandie de notre site (1920 × 947)' },
  };

/**
 * The board each campaign level gets on each screen, read in the game
 * (`data-board`) on 28/10/2026: the game picks the shape that shows a level
 * largest on the screen, so it changes with the level and the screen.
 */
const SURVEYED: Readonly<Record<string, Readonly<Record<Screen, FrameKind>>>> = {
  'nebula-01': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'nebula-02': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'nebula-03': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'nebula-04': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'nebula-05': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'nebula-06': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'nebula-07': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'nebula-08': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'nebula-09': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'nebula-10': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'nebula-11': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'nebula-12': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'neon-01': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'neon-02': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'neon-03': { phone: 'square', phoneFull: 'tall', desktop: 'wide', window: 'wide' },
  'neon-04': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'neon-05': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'neon-06': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'neon-07': { phone: 'square', phoneFull: 'tall', desktop: 'wide', window: 'wide' },
  'neon-08': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'neon-09': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'neon-10': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'neon-11': { phone: 'square', phoneFull: 'tall', desktop: 'wide', window: 'wide' },
  'neon-12': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'abyss-01': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'abyss-02': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'abyss-03': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'abyss-04': { phone: 'tall', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'abyss-05': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'abyss-06': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'abyss-07': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'abyss-08': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'abyss-09': { phone: 'tall', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'abyss-10': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'abyss-11': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'abyss-12': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'jewel-01': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'jewel-02': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'jewel-03': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'jewel-04': { phone: 'square', phoneFull: 'square', desktop: 'wide', window: 'wide' },
  'jewel-05': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'jewel-06': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'jewel-07': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'jewel-08': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'jewel-09': { phone: 'square', phoneFull: 'square', desktop: 'wide', window: 'wide' },
  'jewel-10': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'jewel-11': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'jewel-12': { phone: 'square', phoneFull: 'portrait', desktop: 'wide', window: 'wide' },
  'volcano-01': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-02': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-03': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-04': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-05': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-06': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-07': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'volcano-08': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-09': { phone: 'portrait', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'volcano-10': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-11': { phone: 'portrait', phoneFull: 'tall', desktop: 'square', window: 'landscape' },
  'volcano-12': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-01': { phone: 'square', phoneFull: 'square', desktop: 'wide', window: 'wide' },
  'singularity-02': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-03': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-04': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-05': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-06': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-07': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-08': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-09': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-10': { phone: 'square', phoneFull: 'tall', desktop: 'wide', window: 'wide' },
  'singularity-11': { phone: 'square', phoneFull: 'tall', desktop: 'landscape', window: 'wide' },
  'singularity-12': { phone: 'square', phoneFull: 'tall', desktop: 'wide', window: 'wide' },
};

/** The levels surveyed. */
export const SURVEYED_IDS: readonly string[] = Object.keys(SURVEYED);

/** The board a level gets on a screen. */
export function boardOn(level: Pick<CampaignLevel, 'id'>, screen: Screen): FrameKind {
  const board = SURVEYED[level.id]?.[screen];
  if (!board) throw new Error(`No board surveyed for ${level.id}`);
  return board;
}

/** A seat a level is played at (spec § 3.17): the board, and the device that aims on it. */
export interface PlayedSeat {
  readonly board: FrameKind;
  readonly device: Device;
}

/**
 * The seats a level's screens give it, in the order of the screens: a phone's
 * boards at the finger, a desktop's and a window's with a mouse.
 */
export function seatsOf(level: Pick<CampaignLevel, 'id'>): Map<SeatKey, PlayedSeat> {
  const seats = new Map<SeatKey, PlayedSeat>();
  for (const screen of Object.keys(SCREENS) as Screen[]) {
    const board = boardOn(level, screen);
    const { device } = SCREENS[screen];
    seats.set(seatKey({ board, aiming: AIMING[device] }), { board, device });
  }
  return seats;
}
