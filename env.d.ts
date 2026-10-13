/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

/** The platform of this build (specification § 3.7), from `vite build --mode <platform>`. */
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- a global declaration cannot import
declare const __PLATFORM__: import('./src/platform/platforms').PlatformId;

interface ImportMetaEnv {
  /** GameDistribution game id, for the GameDistribution build. */
  readonly VITE_GD_GAME_ID?: string;
}
