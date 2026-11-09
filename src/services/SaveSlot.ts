import { keysOf } from '@/rules/formats';
import { InputRecord, InvalidInput, orElse, type ListRule } from '@/rules/input';
import type { KeyValueStorage } from './KeyValueStorage';

/** Where a save lives: its key, and the longest text read back from it (`SAVE_LIMITS`). */
export interface SaveFormat {
  readonly key: string;
  readonly maxLength: number;
}

/** How a map keyed by data is read: which names it may hold, how many, and each entry. */
export interface MapRule<T> {
  readonly maxKeys: number;
  readonly isKey: (key: string) => boolean;
  /** Reads one entry; a refusal (an `InvalidInput`) leaves that entry out, and the others stay. */
  readonly entry: (map: InputRecord, key: string) => T;
}

/**
 * The entries of the map saved under `field` (levels by id, records by day), each read on its
 * own: a name that is not one, or an entry its reader refuses, is left out and the others stay.
 * No entries when the field is not a map, or holds more names than `maxKeys`.
 */
export function readMap<T>(save: InputRecord, field: string, rule: MapRule<T>): Record<string, T> {
  const entries: Record<string, T> = {};
  const map = orElse(() => save.record(field), null);
  if (!map) return entries;
  for (const key of keysOf(map, rule.maxKeys, rule.isKey)) {
    const entry = orElse<T | null>(() => rule.entry(map, key), null);
    if (entry !== null) entries[key] = entry;
  }
  return entries;
}

/**
 * The items of the list saved under `field`, each read on its own: an item its reader refuses is
 * left out and the others stay. None when the field is not a list, or holds more than `maxItems`.
 */
export function readList<T>(save: InputRecord, field: string, rule: ListRule<T>): T[] {
  const lenient: ListRule<T | null> = {
    maxItems: rule.maxItems,
    item: (value, path) => orElse<T | null>(() => rule.item(value, path), null),
  };
  return orElse(() => save.list(field, lenient), []).filter((item): item is T => item !== null);
}

/**
 * One save under its key, read back through the door (the rule of 9 Nov 2026): a text no longer
 * than the save's limit, then JSON, then a record that its owner reads field by field, each bad
 * field falling back to its default while the rest of the save stays.
 *
 * A stored value it cannot read as a whole (not text, too long, not JSON, not a record, of a
 * version the owner does not know, or one the platform could not hand over) is kept: the game
 * plays on from a fresh state, and only the player's own progress is saved over it (a game, a
 * purchase, a choice), never what the game notes by itself (a tip shown). A text over the limit
 * is never written: the game could not read it back.
 */
export class SaveSlot {
  /** The stored value could not be read: it stays until the player's progress replaces it. */
  private kept = false;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly format: SaveFormat,
  ) {}

  /**
   * What was saved, as `read` reads it from the save's record, or `fresh()` when nothing was. Only
   * a save that `read` cannot read as a whole makes it throw an `InvalidInput` (another version):
   * that save is kept, and the game starts from `fresh()` too.
   */
  load<T>(read: (save: InputRecord) => T, fresh: () => T): T {
    const stored = this.storage.get(this.format.key);
    if (stored === null || stored === undefined) return fresh();
    try {
      return read(InputRecord.parse(stored, this.format.maxLength, this.format.key));
    } catch (error) {
      if (!(error instanceof InvalidInput)) throw error;
      this.kept = true;
      return fresh();
    }
  }

  /** The player's own progress: saved, even over a value that could not be read. */
  write(value: unknown): void {
    this.store(value, true);
  }

  /** What the game notes by itself: saved, but never over a value that could not be read. */
  note(value: unknown): void {
    this.store(value, false);
  }

  private store(value: unknown, progress: boolean): void {
    if (this.kept && !progress) return;
    const text = JSON.stringify(value);
    if (text.length > this.format.maxLength) return;
    this.kept = false;
    this.storage.set(this.format.key, text);
  }
}
