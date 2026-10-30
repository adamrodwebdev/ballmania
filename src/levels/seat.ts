import type { FrameKind } from './tracks';

/** The hand that aims: a finger on a touch screen, or a mouse. */
export type Aiming = 'touch' | 'mouse';

/**
 * Where a game is played (v1.8.1, spec § 3.17): the shape of the board the
 * screen gave the level, and the hand that aims. The pace, the stars and the
 * time bonus are tuned seat by seat, so that a phone and a desktop play a
 * level alike.
 */
export interface Seat {
  readonly board: FrameKind;
  readonly aiming: Aiming;
}

/** A seat as the tables write it: `square/touch`. */
export type SeatKey = `${FrameKind}/${Aiming}`;

/** One level's values, seat by seat. */
export type SeatTable<T> = Partial<Readonly<Record<SeatKey, T>>>;

export const seatKey = ({ board, aiming }: Seat): SeatKey => `${board}/${aiming}`;

const OTHER_HAND: Readonly<Record<Aiming, Aiming>> = { touch: 'mouse', mouse: 'touch' };

/**
 * A seat's value in a level's table, else the same board's with the other
 * hand: the board decides first (spec § 3.17). A seat no surveyed screen
 * gives (a phone on its side) finds its board this way.
 */
export function onBoard<T>(table: SeatTable<T> | undefined, seat: Seat): T | undefined {
  return (
    table?.[seatKey(seat)] ??
    table?.[seatKey({ board: seat.board, aiming: OTHER_HAND[seat.aiming] })]
  );
}

/** A seat's value, else its board's, else another board's with the same hand, else any. */
export function nearestOf<T>(table: SeatTable<T> | undefined, seat: Seat): T | undefined {
  const own = onBoard(table, seat);
  if (own !== undefined || !table) return own;
  const keys = Object.keys(table) as SeatKey[];
  const key = keys.find((candidate) => candidate.endsWith(`/${seat.aiming}`)) ?? keys[0];
  return key === undefined ? undefined : table[key];
}
