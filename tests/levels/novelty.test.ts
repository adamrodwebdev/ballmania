import { describe, expect, it } from 'vitest';
import { CAMPAIGN, findLevel } from '@/levels/campaign';
import { noveltyOf, type Novelty } from '@/levels/novelty';
import en from '@/i18n/locales/en.json';

const novelty = (id: string): Novelty | null => noveltyOf(findLevel(id)!);

/** The text key a novelty is said with, or its name's. */
const nameKey = (found: Novelty): string => {
  if (found.kind === 'world') return `worlds.${found.world}.name`;
  if (found.kind === 'colossus') return `colossus.${found.world}`;
  if (found.kind === 'power') return `power.${found.power}.name`;
  return `next.mechanics.${found.hint}`;
};

/** True if the English messages hold a text at this key (precompiled: not always a string). */
const has = (key: string): boolean => {
  let node: unknown = en;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return node !== undefined && node !== null;
};

describe('noveltyOf', () => {
  it('announces the power marbles of world 1, one per teaching level', () => {
    expect(novelty('nebula-02')).toBeNull();
    expect(novelty('nebula-03')).toEqual({ kind: 'power', power: 'rewind' });
    expect(novelty('nebula-06')).toEqual({ kind: 'power', power: 'slow' });
    expect(novelty('nebula-08')).toEqual({ kind: 'power', power: 'rainbow' });
    expect(novelty('nebula-10')).toEqual({ kind: 'power', power: 'laser' });
  });

  it('announces a Colossus, a new world and its mechanics', () => {
    expect(novelty('nebula-12')).toEqual({ kind: 'colossus', world: 'nebula' });
    expect(novelty('neon-01')).toEqual({ kind: 'world', world: 'neon' });
    expect(
      CAMPAIGN.filter((level) => noveltyOf(level)?.kind === 'mechanic').length,
    ).toBeGreaterThan(10);
  });

  it('has a text for every novelty of the campaign', () => {
    for (const level of CAMPAIGN) {
      const found = noveltyOf(level);
      if (found) expect(has(nameKey(found)), `${level.id}: ${nameKey(found)}`).toBe(true);
    }
  });
});
