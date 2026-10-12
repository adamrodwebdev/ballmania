import { spiral, type LevelDefinition, type Point } from './LevelDefinition';

const CENTRE: Point = [500, 500];

/** Enters from the top edge, then spirals clockwise towards the hole near the shooter. */
const track: Point[] = [[500, -40], ...spiral(CENTRE, 440, 210, 1.55, -Math.PI / 2)];

/**
 * Demonstration level of lot 2: the basic rules, before the campaign (lot 4).
 */
export const DEMO_LEVEL: LevelDefinition = {
  id: 'demo',
  board: { width: 1000, height: 1000 },
  shooter: CENTRE,
  chains: [{ path: { kind: 'points', points: track }, length: 48, tones: 4, repeatChance: 0.4 }],
  speed: 34,
  rushSpeed: 420,
  rushDistance: 900,
};
