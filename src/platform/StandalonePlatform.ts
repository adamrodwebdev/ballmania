import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter, PlatformId } from './PlatformAdapter';

/**
 * Our own site (specification § 3.7): no ad, no SDK, no tracker. Saves stay
 * in the browser, and a shared result links to the page itself.
 */
export class StandalonePlatform implements PlatformAdapter {
  readonly id: PlatformId = 'standalone';
  readonly hasAds: boolean = false;
  private readonly storage: KeyValueStorage;

  constructor(
    private readonly location: Pick<Location, 'origin' | 'pathname'>,
    storage: KeyValueStorage = BrowserStorage.local(),
  ) {
    this.storage = storage;
  }

  init(): Promise<void> {
    return Promise.resolve();
  }

  saves(): KeyValueStorage {
    return this.storage;
  }

  preferences(): KeyValueStorage {
    return this.storage;
  }

  locale(): null {
    return null;
  }

  loaded(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  levelEnded(_won: boolean): void {}
  celebrate(): void {}

  interstitial(_onStart: AdStart): Promise<void> {
    return Promise.resolve();
  }

  rewardedAvailable(): boolean {
    return false;
  }

  rewarded(_onStart: AdStart): Promise<boolean> {
    return Promise.resolve(false);
  }

  shareLink(): Promise<string> {
    return Promise.resolve(`${this.location.origin}${this.location.pathname}`);
  }

  muted(): boolean {
    return false;
  }

  onMutedChange(): () => void {
    return () => {};
  }

  onPausedChange(): () => void {
    return () => {};
  }
}
