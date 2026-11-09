import { MemoryStorage } from '@/services/KeyValueStorage';

/** What the game stored under the key, parsed: the tests read saves as the game wrote them. */
export function storedJson(storage: MemoryStorage, key: string): unknown {
  return JSON.parse(String(storage.get(key)));
}

/** A storage that holds this text under the key, as a player's browser or a portal would. */
export function storageWith(key: string, text: string): MemoryStorage {
  const storage = new MemoryStorage();
  storage.set(key, text);
  return storage;
}
