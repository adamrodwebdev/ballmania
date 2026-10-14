import { loadScript, type PlatformAdapter } from './PlatformAdapter';
import { StandalonePlatform } from './StandalonePlatform';
import type { CrazyGamesHost } from './CrazyGamesPlatform';
import type { GameDistributionHost } from './GameDistributionPlatform';
import type { PlaygamaHost } from './PlaygamaPlatform';
import type { PokiHost } from './PokiPlatform';

export type { PlatformAdapter, PlatformId } from './PlatformAdapter';

/** Longest wait for a portal's SDK before the game starts without it, in milliseconds. */
const INIT_TIMEOUT = 10_000;

/**
 * The platform of this build (`vite build --mode <portal>`, specification
 * § 3.7). `__PLATFORM__` is a constant: the branches of other platforms are
 * removed from the bundle, so our own site carries no portal code at all.
 */
export async function createPlatform(): Promise<PlatformAdapter> {
  let platform: PlatformAdapter;
  if (__PLATFORM__ === 'crazygames') {
    const { CrazyGamesPlatform } = await import('./CrazyGamesPlatform');
    platform = new CrazyGamesPlatform(window as Window & CrazyGamesHost, loadScript(document));
  } else if (__PLATFORM__ === 'poki') {
    const { PokiPlatform } = await import('./PokiPlatform');
    platform = new PokiPlatform(window as Window & PokiHost, loadScript(document));
  } else if (__PLATFORM__ === 'gamedistribution') {
    const { GameDistributionPlatform } = await import('./GameDistributionPlatform');
    platform = new GameDistributionPlatform(
      window as Window & GameDistributionHost,
      loadScript(document),
      import.meta.env.VITE_GD_GAME_ID ?? '',
    );
  } else if (__PLATFORM__ === 'playgama') {
    const { PlaygamaPlatform } = await import('./PlaygamaPlatform');
    platform = new PlaygamaPlatform(window as Window & PlaygamaHost);
  } else if (__PLATFORM__ === 'simulated') {
    const { SimulatedPlatform } = await import('./SimulatedPlatform');
    const ads = new URLSearchParams(window.location.search).get('ads');
    const simulated = new SimulatedPlatform(
      document,
      ads === 'blocked' || ads === 'refused' ? ads : 'normal',
    );
    Object.assign(window, { platformLog: simulated.log });
    platform = simulated;
  } else {
    platform = new StandalonePlatform(window.location);
  }
  await Promise.race([
    platform.init(),
    new Promise((resolve) => setTimeout(resolve, INIT_TIMEOUT)),
  ]);
  return platform;
}
