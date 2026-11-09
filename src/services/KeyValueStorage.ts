/** Where the game keeps small pieces of data (settings, records). */
export interface KeyValueStorage {
  /**
   * What is kept under the key: null when nothing is, else what the storage holds, a text as the
   * game wrote it or anything a portal kept in another shape, or `UNREADABLE`. Read only through
   * a `SaveSlot`, which tells a value it cannot read from nothing at all.
   */
  get(key: string): unknown;
  set(key: string, value: string): void;
}

/**
 * A value the storage holds but could not hand over (a portal's data module failed): there, so
 * nothing the game notes by itself replaces it, but unread.
 */
export const UNREADABLE: unique symbol = Symbol('unreadable');

export class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }
}

/**
 * Browser storage that never throws: private browsing, blocked cookies or a
 * full quota fall back to memory for the rest of the session.
 */
export class BrowserStorage implements KeyValueStorage {
  private readonly fallback = new MemoryStorage();

  constructor(private readonly backend: Storage | null) {}

  static local(): BrowserStorage {
    try {
      return new BrowserStorage(window.localStorage);
    } catch {
      return new BrowserStorage(null);
    }
  }

  get(key: string): string | null {
    try {
      return this.backend?.getItem(key) ?? this.fallback.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }

  set(key: string, value: string): void {
    this.fallback.set(key, value);
    try {
      this.backend?.setItem(key, value);
    } catch {
      // Kept in memory only.
    }
  }
}
