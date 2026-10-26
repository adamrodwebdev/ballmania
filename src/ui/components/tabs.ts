/** One tab of a menu screen (v1.8.0): the Workshop's departments, the Observatory's ranges. */
export interface TabItem<Id extends string> {
  readonly id: Id;
  readonly label: string;
  /** Its line icon (a path on the 24-unit grid, see icons.ts). */
  readonly icon: string;
  /** What it holds, short ("2/5"), and the same told in full to screen readers. */
  readonly count: string;
  readonly countLabel: string;
  /** Something there is within reach: a dot lights up, and screen readers hear `readyLabel`. */
  readonly ready?: boolean;
  readonly readyLabel?: string;
}
