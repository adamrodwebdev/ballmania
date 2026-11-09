import { describe, expect, it } from 'vitest';
import { InvalidInput, readNumber, type InputRecord } from '@/rules/input';
import { MemoryStorage, UNREADABLE, type KeyValueStorage } from '@/services/KeyValueStorage';
import { readList, readMap, SaveSlot } from '@/services/SaveSlot';
import { storageWith } from './stored';

const KEY = 'ballmania:test';
const FORMAT = { key: KEY, maxLength: 64 } as const;

/** Reads the field `level` of a save of version 1; any other version is refused as a whole. */
const readLevel = (save: InputRecord) => {
  save.choice('version', [1]);
  return save.number('level', { min: 1, max: 99, integer: true });
};
const FRESH = () => 0;

/** A storage that holds a value the game never wrote: what a portal may hand over. */
const holding = (value: unknown): KeyValueStorage => ({ get: () => value, set: () => undefined });

describe('SaveSlot', () => {
  it('reads what was saved, and starts afresh when nothing was', () => {
    expect(
      new SaveSlot(storageWith(KEY, '{"version":1,"level":7}'), FORMAT).load(readLevel, FRESH),
    ).toBe(7);
    expect(new SaveSlot(new MemoryStorage(), FORMAT).load(readLevel, FRESH)).toBe(0);
  });

  it.each([
    { name: 'a number', value: 7 },
    { name: 'an object a portal parsed', value: { version: 1, level: 7 } },
    { name: 'a value the storage could not hand over', value: UNREADABLE },
  ])('starts afresh on $name', ({ value }) => {
    expect(new SaveSlot(holding(value), FORMAT).load(readLevel, FRESH)).toBe(0);
  });

  it.each([
    { name: 'another version', text: '{"version":2,"level":7}' },
    { name: 'a text cut short', text: '{"version":1,"lev' },
    {
      name: 'a text longer than its limit',
      text: `{"version":1,"level":7,"x":"${'x'.repeat(64)}"}`,
    },
  ])('keeps $name from what the game notes by itself', ({ text }) => {
    const storage = storageWith(KEY, text);
    const slot = new SaveSlot(storage, FORMAT);
    slot.load(readLevel, FRESH);
    slot.note({ version: 1, level: 1 });
    expect(storage.get(KEY)).toBe(text);
  });

  it("saves the player's progress over a value it could not read, then the notes again", () => {
    const storage = storageWith(KEY, '{"version":2}');
    const slot = new SaveSlot(storage, FORMAT);
    slot.load(readLevel, FRESH);
    slot.write({ version: 1, level: 3 });
    expect(storage.get(KEY)).toBe('{"version":1,"level":3}');
    slot.note({ version: 1, level: 4 });
    expect(storage.get(KEY)).toBe('{"version":1,"level":4}');
  });

  it('notes over a save it could read, and over nothing', () => {
    const storage = new MemoryStorage();
    const slot = new SaveSlot(storage, FORMAT);
    slot.load(readLevel, FRESH);
    slot.note({ version: 1, level: 2 });
    expect(storage.get(KEY)).toBe('{"version":1,"level":2}');
  });

  it('never writes a text it could not read back', () => {
    const storage = storageWith(KEY, '{"version":1,"level":7}');
    new SaveSlot(storage, FORMAT).write({ version: 1, level: 8, pad: 'x'.repeat(64) });
    expect(storage.get(KEY)).toBe('{"version":1,"level":7}');
  });

  it('lets a programming error through, never taking it for a save it cannot read', () => {
    const broken = () => {
      throw new TypeError('a bug');
    };
    const slot = new SaveSlot(storageWith(KEY, '{"version":1}'), FORMAT);
    expect(() => slot.load(broken, FRESH)).toThrow(TypeError);
  });

  it('refuses through a reader only what it means to', () => {
    const slot = new SaveSlot(storageWith(KEY, '{"version":1}'), FORMAT);
    const refuse = () => {
      throw new InvalidInput('test', 'not-a-choice');
    };
    expect(slot.load(refuse, FRESH)).toBe(0);
  });
});

describe('readMap and readList: what a save keys by data, and its lists', () => {
  const save = (text: string) => {
    const slot = new SaveSlot(storageWith(KEY, text), { key: KEY, maxLength: 1_000 });
    return slot.load(
      (record) => record,
      () => null,
    );
  };
  const DIGITS = (key: string) => /^\d+$/.test(key);

  it('keeps the entries it can read, and leaves out the others', () => {
    const record = save('{"map":{"1":4,"2":"x","x":5,"3":6}}')!;
    const counts = readMap(record, 'map', {
      maxKeys: 10,
      isKey: DIGITS,
      entry: (map, key) => map.number(key, { min: 0, max: 9, integer: true }),
    });
    expect(counts).toEqual({ 1: 4, 3: 6 });
  });

  it('reads no entry from a map with more names than allowed', () => {
    const record = save('{"map":{"1":1,"2":2,"3":3}}')!;
    const counts = readMap(record, 'map', {
      maxKeys: 2,
      isKey: DIGITS,
      entry: (map, key) => map.number(key, { min: 0, max: 9, integer: true }),
    });
    expect(counts).toEqual({});
  });

  it('keeps the items it can read, and leaves out the others', () => {
    const record = save('{"list":[1,"2",3,null,4]}')!;
    const items = readList(record, 'list', {
      maxItems: 10,
      item: (value, field) => readNumber(value, { min: 0, max: 9, integer: true }, field),
    });
    expect(items).toEqual([1, 3, 4]);
  });
});
