/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

/** The platform of this build (specification § 3.7), from `vite build --mode <platform>`. */
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- a global declaration cannot import
declare const __PLATFORM__: import('./src/platform/platforms').PlatformId;

/** The demo of the portfolio (lot 14), from `vite build --mode demo`. */
declare const __DEMO__: boolean;

/**
 * Ads in the CrazyGames build: off for the Basic Launch, where CrazyGames turns
 * them off (the default); on with `CRAZYGAMES_LAUNCH=full`, once invited to the
 * Full Launch.
 */
declare const __CRAZYGAMES_ADS__: boolean;

interface ImportMetaEnv {
  /** GameDistribution game id, for the GameDistribution build. */
  readonly VITE_GD_GAME_ID?: string;
}
