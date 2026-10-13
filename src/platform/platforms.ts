/** Where the game is published (specification § 3.7), chosen at build time. */
export type PlatformId = 'standalone' | 'crazygames' | 'poki' | 'gamedistribution' | 'simulated';

export const PLATFORM_IDS: readonly PlatformId[] = [
  'standalone',
  'crazygames',
  'poki',
  'gamedistribution',
  'simulated',
];
