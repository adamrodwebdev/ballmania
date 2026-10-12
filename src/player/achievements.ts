/** Lifetime counters of a player, the raw material of achievements. */
export interface PlayerStats {
  readonly gamesPlayed: number;
  readonly levelsWon: number;
  readonly ballsDestroyed: number;
  readonly bestDepth: number;
  readonly bestStreak: number;
  /** Most mirrors a successful shot bounced off. */
  readonly bestBounce: number;
  /** Balls pulled out with the magnet, in total. */
  readonly magnetPulls: number;
  /** Primaries fused into secondaries, in total. */
  readonly fusions: number;
  readonly noSwapWins: number;
  /** Levels won after the chain came within 10 % of the hole. */
  readonly closeCalls: number;
  readonly colossusDefeated: number;
  readonly threeStarLevels: number;
  readonly dailyPlayed: number;
  readonly worldsCompleted: number;
}

export type StatName = keyof PlayerStats;

export const EMPTY_STATS: PlayerStats = {
  gamesPlayed: 0,
  levelsWon: 0,
  ballsDestroyed: 0,
  bestDepth: 0,
  bestStreak: 0,
  bestBounce: 0,
  magnetPulls: 0,
  fusions: 0,
  noSwapWins: 0,
  closeCalls: 0,
  colossusDefeated: 0,
  threeStarLevels: 0,
  dailyPlayed: 0,
  worldsCompleted: 0,
};

/**
 * An achievement ("objectif" in the interface, specification § 3.6): reach
 * `target` on one counter, earn `reward` shards. They also guide players
 * towards the mechanics: chain reactions, streaks, the Colossus…
 */
export interface Achievement {
  readonly id: string;
  readonly stat: StatName;
  readonly target: number;
  readonly reward: number;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-win', stat: 'levelsWon', target: 1, reward: 20 },
  { id: 'chain-3', stat: 'bestDepth', target: 3, reward: 30 },
  { id: 'chain-5', stat: 'bestDepth', target: 5, reward: 80 },
  { id: 'streak-5', stat: 'bestStreak', target: 5, reward: 40 },
  { id: 'streak-10', stat: 'bestStreak', target: 10, reward: 100 },
  { id: 'balls-500', stat: 'ballsDestroyed', target: 500, reward: 50 },
  { id: 'balls-2000', stat: 'ballsDestroyed', target: 2000, reward: 120 },
  { id: 'bank-shot', stat: 'bestBounce', target: 2, reward: 60 },
  { id: 'magnet-10', stat: 'magnetPulls', target: 10, reward: 50 },
  { id: 'alchemist', stat: 'fusions', target: 20, reward: 60 },
  { id: 'no-swap', stat: 'noSwapWins', target: 1, reward: 40 },
  { id: 'close-call', stat: 'closeCalls', target: 1, reward: 50 },
  { id: 'three-stars-5', stat: 'threeStarLevels', target: 5, reward: 80 },
  { id: 'colossus', stat: 'colossusDefeated', target: 1, reward: 100 },
  { id: 'daily-3', stat: 'dailyPlayed', target: 3, reward: 60 },
  { id: 'world-nebula', stat: 'worldsCompleted', target: 1, reward: 150 },
  { id: 'world-neon', stat: 'worldsCompleted', target: 2, reward: 200 },
  { id: 'world-abyss', stat: 'worldsCompleted', target: 3, reward: 250 },
];

/** Progress towards an achievement, capped at its target. */
export function progressOf(achievement: Achievement, stats: PlayerStats): number {
  return Math.min(stats[achievement.stat], achievement.target);
}

/** Achievements reached by `stats` and not yet in `done`. */
export function newlyReached(stats: PlayerStats, done: ReadonlySet<string>): Achievement[] {
  return ACHIEVEMENTS.filter(
    (achievement) => !done.has(achievement.id) && stats[achievement.stat] >= achievement.target,
  );
}
