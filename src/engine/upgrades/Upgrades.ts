/** The ten upgrades bought at the Observatory with star fragments (specification § 3.9). */
export type UpgradeId =
  | 'eye'
  | 'chronos'
  | 'shockwave'
  | 'prism'
  | 'shield'
  | 'icebreaker'
  | 'anchor'
  | 'catcher'
  | 'nova'
  | 'secondChance';

export const UPGRADE_IDS: readonly UpgradeId[] = [
  'eye',
  'chronos',
  'shockwave',
  'prism',
  'shield',
  'icebreaker',
  'anchor',
  'catcher',
  'nova',
  'secondChance',
];

/** Each upgrade has three ranks. */
export const MAX_RANK = 3;

/** Rank of each upgrade the player owns (0 or missing: not bought). */
export type UpgradeRanks = Readonly<Partial<Record<UpgradeId, number>>>;

/** A value per rank, from rank 0 (not bought) to rank 3. */
type ByRank<T> = readonly [T, T, T, T];

const EYE_BOUNCES: ByRank<number> = [2, 3, 4, 4];
const CHRONOS: ByRank<number> = [1, 0.96, 0.92, 0.88];
const SHOCKWAVE: ByRank<number> = [0, 20, 40, 60];
const PRISM_EVERY: ByRank<number | null> = [null, 20, 15, 10];
const SHIELD_IMMUNITY: ByRank<number> = [Infinity, 4, 0, 0];
const ICEBREAKER: ByRank<number> = [1, 0.66, 0.33, 0.33];
const ANCHOR: ByRank<number> = [1, 0.65, 0.3, 0];
const CATCHER_EVERY: ByRank<number> = [1, 0.8, 0.65, 0.5];
const CATCHER_REACH: ByRank<number> = [40, 55, 70, 85];
const NOVA_BALLS: ByRank<number | null> = [null, 30, 24, 18];
const NOVA_RADIUS: ByRank<number> = [0, 90, 120, 150];
const SECOND_CHANCE: ByRank<number> = [0, 0.15, 0.25, 0.35];

/**
 * What the upgrades change in a game: every effect of every rank, in one
 * place, read by the engine where it applies.
 */
export class Upgrades {
  constructor(private readonly ranks: UpgradeRanks = {}) {}

  rank(id: UpgradeId): number {
    return Math.max(0, Math.min(MAX_RANK, Math.floor(this.ranks[id] ?? 0)));
  }

  private of<T>(id: UpgradeId, table: ByRank<T>): T {
    return table[this.rank(id)]!;
  }

  /** Œil stellaire: rebounds shown on the aim line. */
  get aimBounces(): number {
    return this.of('eye', EYE_BOUNCES);
  }

  /** Œil stellaire, rank 3: the aim preview shows the chain reaction that follows. */
  get reactionPreview(): boolean {
    return this.rank('eye') >= MAX_RANK;
  }

  /** Chronos: factor of the chain's speed. */
  get chronos(): number {
    return this.of('chronos', CHRONOS);
  }

  /** Onde de choc: distance the chain recoils after each of the player's explosions. */
  get shockwave(): number {
    return this.of('shockwave', SHOCKWAVE);
  }

  /** Bille prismatique: every how many shots a rainbow ball is loaded, or null. */
  get prismEvery(): number | null {
    return this.of('prism', PRISM_EVERY);
  }

  /** Bouclier thermique: smallest group that still explodes in a solar storm. */
  get solarImmunity(): number {
    return this.of('shield', SHIELD_IMMUNITY);
  }

  /** Bouclier thermique, rank 3: solar storms last half as long. */
  get solarDuration(): number {
    return this.rank('shield') >= MAX_RANK ? 0.5 : 1;
  }

  /** Brise-glace: factor of the slowdown of shots in the cold. */
  get coldSlowdown(): number {
    return this.of('icebreaker', ICEBREAKER);
  }

  /** Brise-glace, rank 3: any explosion shatters the frozen balls, not only reactions. */
  get shatterOnAnyExplosion(): boolean {
    return this.rank('icebreaker') >= MAX_RANK;
  }

  /** Ancre: factor of the wind's pull on shots. */
  get windPull(): number {
    return this.of('anchor', ANCHOR);
  }

  /** Attrape-étoiles: factor of the time between fragments. */
  get fragmentEvery(): number {
    return this.of('catcher', CATCHER_EVERY);
  }

  /** Attrape-étoiles: how close a shot must pass to catch a fragment. */
  get fragmentReach(): number {
    return this.of('catcher', CATCHER_REACH);
  }

  /** Nova: balls to explode to charge a bomb, or null. */
  get novaBalls(): number | null {
    return this.of('nova', NOVA_BALLS);
  }

  /** Nova: radius of the bomb. */
  get novaRadius(): number {
    return this.of('nova', NOVA_RADIUS);
  }

  /** Seconde chance: share of the track the chain is pushed back, once; 0 without. */
  get secondChance(): number {
    return this.of('secondChance', SECOND_CHANCE);
  }
}

/** Fragments each rank costs: rank 1, rank 2, rank 3. */
export const UPGRADE_COSTS: readonly [number, number, number] = [5, 12, 25];
