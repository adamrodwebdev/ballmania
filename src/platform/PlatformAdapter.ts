import type { KeyValueStorage } from '@/services/KeyValueStorage';
import type { PlatformId } from './platforms';

export type { PlatformId } from './platforms';

/** Called when an ad really starts: the game mutes and stops listening to the player. */
export type AdStart = () => void;

/**
 * Everything the game asks of the site that hosts it: ads, saves, the
 * moments of play, the language, sharing. The game knows no SDK: each portal
 * has its own adapter, and our own site has one without any ad.
 *
 * Adapters never throw: an ad blocker, a missing SDK or a refused ad leave the
 * game playable, simply without the reward.
 */
export interface PlatformAdapter {
  readonly id: PlatformId;
  /** True if this platform shows ads at all (never on our own site). */
  readonly hasAds: boolean;
  /** Loads and starts the SDK. Resolves even when it fails. */
  init(): Promise<void>;
  /** Where saves go: the SDK's storage when the portal asks for it. */
  saves(): KeyValueStorage;
  /**
   * Where the settings go: the browser (the theme script reads them before
   * the first paint), or the SDK's storage where the portal forbids any other.
   */
  preferences(): KeyValueStorage;
  /** The player's language according to the portal (a BCP 47 tag), or null. */
  locale(): string | null;
  /** The game is loaded and can be played. */
  loaded(): void;
  /** The player starts or resumes playing. */
  gameplayStart(): void;
  /** The player stops playing: pause, end of a game, menus. */
  gameplayStop(): void;
  /** A game ended, won or lost (some portals count levels). */
  levelEnded(won: boolean): void;
  /** A rare moment of joy (a world finished, a record): some portals celebrate it. */
  celebrate(): void;
  /** An ad between two games; the portal may decline to show one. */
  interstitial(onStart: AdStart): Promise<void>;
  /** True if a rewarded ad can be offered now (false with an ad blocker). */
  rewardedAvailable(): boolean;
  /** A rewarded ad; true if it was watched to the end and the reward is due. */
  rewarded(onStart: AdStart): Promise<boolean>;
  /**
   * A link to the game to share, carrying `params`, or null when the platform
   * forbids links (the share then has no address).
   */
  shareLink(params: Readonly<Record<string, string>>): Promise<string | null>;
  /** True if the portal asks the game to be silent, whatever its own settings. */
  muted(): boolean;
  /** Calls `listener` when the portal's wish for silence changes; returns how to stop. */
  onMutedChange(listener: (muted: boolean) => void): () => void;
  /** Calls `listener` when the portal pauses or resumes the game (its own ads, tabs). */
  onPausedChange(listener: (paused: boolean) => void): () => void;
}

/** Loads an external script; resolves false if it fails or takes too long. */
export type ScriptLoader = (src: string) => Promise<boolean>;

/** Adds a script to the page, giving up after `timeout` milliseconds. */
export const loadScript =
  (document: Document, timeout = 8000): ScriptLoader =>
  (src) =>
    new Promise((resolve) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => resolve(false), timeout);
      const settle = (ok: boolean) => {
        clearTimeout(timer);
        resolve(ok);
      };
      script.src = src;
      script.async = true;
      script.addEventListener('load', () => settle(true));
      script.addEventListener('error', () => settle(false));
      document.head.append(script);
    });
