/** Where the game is published (specification § 3.7), chosen at build time. */
export type PlatformId =
  'standalone' | 'crazygames' | 'poki' | 'gamedistribution' | 'playgama' | 'simulated';

export const PLATFORM_IDS: readonly PlatformId[] = [
  'standalone',
  'crazygames',
  'poki',
  'gamedistribution',
  'playgama',
  'simulated',
];

/** CrazyGames SDK v3: in the <head> of the CrazyGames build (vite.config.ts), as they ask. */
export const CRAZYGAMES_SDK = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
