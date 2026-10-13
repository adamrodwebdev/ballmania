import { BrowserStorage, type KeyValueStorage } from '@/services/KeyValueStorage';
import type { AdStart, PlatformAdapter } from './PlatformAdapter';

/** How the simulated portal behaves, from the page address (`?ads=blocked`…). */
export type SimulatedAds = 'normal' | 'blocked' | 'refused';

/**
 * A pretend portal, for development and the end-to-end tests of the portal
 * builds (`vite --mode simulated`): ads are a dark modal box that closes by
 * itself, and every call is written to `window.platformLog`.
 * `?ads=blocked` acts as an ad blocker, `?ads=refused` as a rewarded ad closed early.
 */
export class SimulatedPlatform implements PlatformAdapter {
  readonly id = 'simulated';
  readonly hasAds = true;
  readonly log: string[] = [];
  private readonly storage: KeyValueStorage;

  constructor(
    private readonly document: Document,
    private readonly ads: SimulatedAds = 'normal',
    private readonly duration = 600,
    storage: KeyValueStorage = BrowserStorage.local(),
  ) {
    this.storage = storage;
  }

  init(): Promise<void> {
    this.record('init');
    return Promise.resolve();
  }

  saves(): KeyValueStorage {
    return this.storage;
  }

  locale(): null {
    return null;
  }

  loaded(): void {
    this.record('loaded');
  }

  gameplayStart(): void {
    this.record('gameplayStart');
  }

  gameplayStop(): void {
    this.record('gameplayStop');
  }

  celebrate(): void {
    this.record('celebrate');
  }

  async interstitial(onStart: AdStart): Promise<void> {
    this.record('interstitial');
    await this.show(onStart);
  }

  rewardedAvailable(): boolean {
    return this.ads !== 'blocked';
  }

  async rewarded(onStart: AdStart): Promise<boolean> {
    this.record('rewarded');
    if (!this.rewardedAvailable()) return false;
    await this.show(onStart);
    return this.ads === 'normal';
  }

  shareLink(params: Readonly<Record<string, string>>): Promise<string> {
    const query = new URLSearchParams({ ...params }).toString();
    return Promise.resolve(`https://portal.example/ballmania?${query}`);
  }

  muted(): boolean {
    return false;
  }

  onMutedChange(): () => void {
    return () => {};
  }

  private record(event: string): void {
    this.log.push(event);
  }

  /** The pretend ad: in the top layer, above the game's own dialogs, like a real one. */
  private show(onStart: AdStart): Promise<void> {
    const box = this.document.createElement('dialog');
    box.setAttribute('aria-label', 'Ad (simulated)');
    box.dataset.testid = 'simulated-ad';
    box.textContent = 'Ad (simulated)';
    Object.assign(box.style, {
      border: '0',
      padding: '3rem',
      background: '#111',
      color: '#fff',
      font: '700 1.25rem system-ui, sans-serif',
    });
    this.document.body.append(box);
    box.showModal();
    onStart();
    return new Promise((resolve) =>
      setTimeout(() => {
        box.close();
        box.remove();
        resolve();
      }, this.duration),
    );
  }
}
