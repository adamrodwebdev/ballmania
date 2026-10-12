/** Where the game keeps small pieces of data (settings, records). */
export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

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

/** Reads a JSON value, or null when it is missing or corrupt. */
export function readJson(storage: KeyValueStorage, key: string): unknown {
  const raw = storage.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
