import { WORLDS, type CampaignLevel, type WorldId } from '@/levels/campaign';

/**
 * A level's role in its world's rise (v1.8.1, spec § 3.17, tables validated
 * on 28/10/2026): calm, rise, thrill, breather, or the Colossus.
 */
export type Role = 'calm' | 'rise' | 'thrill' | 'breather' | 'colossus';

/** World 1's shape: thrills at 3, 7 and 11, breathers at 4 and 8, the Colossus at 12. */
const SHAPE: readonly Role[] = [
  'calm',
  'rise',
  'thrill',
  'breather',
  'rise',
  'rise',
  'thrill',
  'breather',
  'rise',
  'rise',
  'thrill',
  'colossus',
];

const ROLES: Readonly<Record<WorldId, readonly Role[]>> = {
  nebula: SHAPE,
  // No peak in the Neon's first three levels.
  neon: [
    'calm',
    'rise',
    'rise',
    'breather',
    'thrill',
    'breather',
    'rise',
    'thrill',
    'breather',
    'rise',
    'thrill',
    'colossus',
  ],
  abyss: SHAPE,
  jewel: SHAPE,
  volcano: SHAPE,
  singularity: SHAPE,
};

/** Each world's hardest level: its eleventh, a thrill before the Colossus. */
const HARDEST = 11;

/** A band of wins per attempt, as shares: the lowest and the highest. */
export type Band = readonly [number, number];

/**
 * A level crawls when its typical newcomer still plays more than one game in
 * twenty at the robots' cap, five minutes: its chain no longer threatens, the
 * level only lasts (decided on 30/10/2026; no waiting to lengthen a level, § 3.15).
 */
export const CRAWL = 1 / 20;

/** The typical newcomer's wins per attempt, by world (1 to 6) and role. */
const BANDS: Readonly<Record<number, Readonly<Record<Role | 'hardest', Band>>>> = {
  1: {
    calm: [0.95, 1],
    rise: [0.9, 1],
    breather: [0.95, 1],
    thrill: [0.85, 0.95],
    hardest: [0.8, 0.9],
    colossus: [0.85, 0.95],
  },
  2: {
    calm: [0.95, 1],
    rise: [0.85, 0.9],
    breather: [0.9, 1],
    thrill: [0.65, 0.75],
    hardest: [0.55, 0.65],
    colossus: [0.65, 0.75],
  },
  3: {
    calm: [0.9, 1],
    rise: [0.75, 0.85],
    breather: [0.85, 0.95],
    thrill: [0.55, 0.65],
    hardest: [0.4, 0.5],
    colossus: [0.55, 0.65],
  },
  5: {
    calm: [0.85, 0.95],
    rise: [0.65, 0.75],
    breather: [0.8, 0.9],
    thrill: [0.45, 0.55],
    hardest: [0.3, 0.4],
    colossus: [0.45, 0.55],
  },
};

/** The world's number, 1 to 6. */
const worldNumber = (level: Pick<CampaignLevel, 'world'>): number =>
  WORLDS.findIndex((world) => world.id === level.world) + 1;

export function roleOf(level: Pick<CampaignLevel, 'world' | 'number'>): Role {
  return ROLES[level.world][level.number - 1]!;
}

/** The band of wins a level's typical newcomer should get, on every board. */
export function bandOf(level: Pick<CampaignLevel, 'world' | 'number'>): Band {
  const world = worldNumber(level);
  // Worlds 3 and 4 share a band, as do 5 and 6.
  const bands = BANDS[world] ?? BANDS[world - 1]!;
  return level.number === HARDEST ? bands.hardest : bands[roleOf(level)];
}
