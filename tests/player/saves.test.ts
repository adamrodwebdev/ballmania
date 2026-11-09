import { describe, expect, it } from 'vitest';
import type { GameReport } from '@/engine/Game';
import { EMPTY_STATS } from '@/player/achievements';
import { DEFAULT_LOOK } from '@/player/catalog';
import { PLAYER_KEY, PlayerProfile, type GameContext } from '@/player/PlayerProfile';
import { COUNT_LIMITS, SAVE_LIMITS } from '@/rules/limits';
import { storageWith, storedJson } from '../services/stored';

/*
 * The profile read back at the door (9 Nov 2026): every format the game wrote still loads, a
 * tampered field falls back to its default while the rest of the profile stays, and a profile
 * the game cannot read is kept until the player's own progress replaces it.
 */

/** The profile read back from this saved text. */
const profileFrom = (text: string) => new PlayerProfile(storageWith(PLAYER_KEY, text));
/** A profile of version 2 with this one field, written as it is, and 40 shards. */
const savedWith = (field: string, json: string) => `{"version":2,"shards":40,"${field}":${json}}`;

const STATS = { ...EMPTY_STATS, gamesPlayed: 31, levelsWon: 18, ballsDestroyed: 2410 };

/** As 1.0.0 to 1.6.0 wrote it: the first launcher by default, fragments and upgrades from 1.4. */
const VERSION_1 = JSON.stringify({
  version: 1,
  shards: 340,
  owned: ['shooter-orbit', 'trail-none', 'burst-glass', 'board-world', 'trail-comet', 'board-neon'],
  equipped: {
    shooter: 'shooter-orbit',
    trail: 'trail-comet',
    burst: 'burst-glass',
    board: 'board-world',
  },
  stats: STATS,
  achievements: ['first-win', 'chain-3', 'world-nebula'],
  worlds: ['nebula'],
  daily: { '20261013': { score: 2310, stars: 2, won: true } },
  failures: { 'neon-04': 3 },
  fragments: 7,
  upgrades: { eye: 1 },
});

/** As 1.7.0 to 1.8.1 wrote it: version 2, the gift's streak, the tips seen, the training. */
const VERSION_2 = JSON.stringify({
  version: 2,
  shards: 125,
  owned: [
    'shooter-star',
    'shooter-orbit',
    'trail-none',
    'burst-glass',
    'board-world',
    'board-nebula',
  ],
  equipped: {
    shooter: 'shooter-orbit',
    trail: 'trail-none',
    burst: 'burst-glass',
    board: 'board-world',
  },
  stats: STATS,
  achievements: ['first-win'],
  worlds: [],
  daily: { '20261030': { score: 1840.0000000000002, stars: 1, won: true } },
  failures: {},
  fragments: 12,
  upgrades: { nova: 2, shield: 3 },
  gift: { last: '20261031', streak: 4 },
  tips: ['observatory'],
  training: { step: 3, done: true },
});

const won: GameReport = {
  outcome: 'won',
  score: 1500,
  seconds: 60,
  ballsDestroyed: 40,
  bestDepth: 1,
  bestStreak: 2,
  bestBounce: 0,
  swaps: 3,
  pulls: 0,
  fusions: 0,
  switches: 0,
  curves: 0,
  shots: 30,
  chargedShots: 0,
  ballsLeft: 0,
  colossus: null,
  bestGroove: 1,
  stage: 0,
  rivalScore: 0,
  fragments: 0,
  danger: 0.5,
  colossusDefeated: false,
};
const CAMPAIGN: GameContext = {
  kind: 'campaign',
  levelId: 'nebula-04',
  stars: 2,
  starsGained: 2,
  threeStarLevels: 0,
};

/** JSON that outside hands could put where a count goes. */
const NOT_COUNTS = [
  { name: 'a number as text', json: '"12"' },
  { name: 'a number past any other', json: '1e999' },
  { name: 'a negative number', json: '-1' },
  { name: 'a fraction', json: '12.5' },
  { name: 'two to the 53rd', json: '9007199254740992' },
  { name: 'a list', json: '[12]' },
  { name: 'an object', json: '{}' },
  { name: 'null', json: 'null' },
  { name: 'a boolean', json: 'true' },
];

describe('PlayerProfile reads every profile the game ever wrote', () => {
  it('reads a profile of version 1 whole, and gives it the Star heart', () => {
    const profile = profileFrom(VERSION_1);
    expect(profile.view).toMatchObject({
      shards: 340,
      stats: STATS,
      achievements: ['first-win', 'chain-3', 'world-nebula'],
      worlds: ['nebula'],
      daily: { '20261013': { score: 2310, stars: 2, won: true } },
      failures: { 'neon-04': 3 },
      fragments: 7,
      upgrades: { eye: 1 },
      gift: { last: null, streak: 0 },
      tips: [],
      training: { step: 1, done: false },
    });
    expect(profile.equipped('shooter')).toBe(DEFAULT_LOOK.shooter);
    expect(profile.equipped('trail')).toBe('trail-comet');
    expect(profile.owns('board-neon')).toBe(true);
  });

  it('reads a profile of version 2 whole, its first launcher worn by choice', () => {
    const profile = profileFrom(VERSION_2);
    expect(profile.view).toMatchObject({
      shards: 125,
      daily: { '20261030': { score: 1840, stars: 1, won: true } },
      fragments: 12,
      upgrades: { nova: 2, shield: 3 },
      gift: { last: '20261031', streak: 4 },
      tips: ['observatory'],
      training: { step: 3, done: true },
    });
    expect(profile.equipped('shooter')).toBe('shooter-orbit');
  });

  it('writes back what it read, nothing lost', () => {
    const storage = storageWith(PLAYER_KEY, VERSION_2);
    new PlayerProfile(storage).recordGame(won, CAMPAIGN);
    expect(storedJson(storage, PLAYER_KEY)).toMatchObject({
      version: 2,
      upgrades: { nova: 2, shield: 3 },
      gift: { last: '20261031', streak: 4 },
      training: { step: 3, done: true },
      daily: { '20261030': { score: 1840, stars: 1, won: true } },
    });
  });
});

describe('PlayerProfile reads a tampered profile field by field', () => {
  it.each(
    ['shards', 'fragments'].flatMap((field) => NOT_COUNTS.map((value) => ({ field, ...value }))),
  )('counts no $field for $name, and keeps the rest', ({ field, json }) => {
    const profile = profileFrom(`{"version":2,"${field}":${json},"tips":["observatory"]}`);
    expect(profile.view).toMatchObject({ [field]: 0, tips: ['observatory'] });
  });

  it.each(NOT_COUNTS)('counts no games played for $name, and keeps the other stats', ({ json }) => {
    const profile = profileFrom(savedWith('stats', `{"gamesPlayed":${json},"levelsWon":4}`));
    expect(profile.view.stats).toMatchObject({ gamesPlayed: 0, levelsWon: 4 });
  });

  it.each([
    { name: 'an id the catalog lacks', json: '"trail-gold"' },
    { name: 'the prototype key', json: '"__proto__"' },
    { name: 'an inherited name', json: '"toString"' },
    { name: 'a number', json: '7' },
    { name: 'a list', json: '["trail-comet"]' },
    { name: 'another case', json: '"TRAIL-COMET"' },
  ])('leaves out an owned item that is $name, and keeps the others', ({ json }) => {
    const profile = profileFrom(savedWith('owned', `[${json},"board-neon"]`));
    expect(profile.owns('board-neon')).toBe(true);
    expect(profile.view.owned).not.toContain('trail-gold');
  });

  it('owns nothing beyond the starter items when the list is longer than any catalog', () => {
    const items = Array.from({ length: COUNT_LIMITS.owned + 1 }, () => '"board-neon"');
    expect(profileFrom(savedWith('owned', `[${items.join(',')}]`)).owns('board-neon')).toBe(false);
  });

  it.each([
    { name: 'an item it does not own', json: '{"trail":"trail-comet"}' },
    { name: 'an item of another slot', json: '{"trail":"board-world"}' },
    { name: 'the prototype key', json: '{"trail":"__proto__"}' },
    { name: 'a number', json: '{"trail":3}' },
    { name: 'a list', json: '["trail-none"]' },
  ])('wears the default trail for $name', ({ json }) => {
    expect(profileFrom(savedWith('equipped', json)).equipped('trail')).toBe(DEFAULT_LOOK.trail);
  });

  it.each([
    { name: 'a month that does not exist', day: '20261399' },
    { name: 'the 30th of February', day: '20260230' },
    { name: 'a date with dashes', day: '2026-10-12' },
    { name: 'Arabic-Indic digits', day: '٢٠٢٦١٠١٢' },
    { name: 'the prototype key', day: '__proto__' },
  ])('leaves out a daily challenge saved under $name, and keeps the others', ({ day }) => {
    const daily = `{"${day}":{"score":9,"stars":1,"won":true},"20261012":{"score":5,"stars":0,"won":false}}`;
    expect(profileFrom(savedWith('daily', daily)).view.daily).toEqual({
      '20261012': { score: 5, stars: 0, won: false },
    });
  });

  it.each([
    {
      name: 'stars as text',
      record: '{"score":5,"stars":"3","won":true}',
      kept: { score: 5, stars: 0, won: true },
    },
    {
      name: 'four stars',
      record: '{"score":5,"stars":4,"won":true}',
      kept: { score: 5, stars: 0, won: true },
    },
    {
      name: 'a score past any number',
      record: '{"score":1e999,"stars":2,"won":true}',
      kept: { score: 0, stars: 2, won: true },
    },
    {
      name: 'an outcome as text',
      record: '{"score":5,"stars":2,"won":"true"}',
      kept: { score: 5, stars: 2, won: false },
    },
  ])('keeps the attempt of a day with $name, its other fields read', ({ record, kept }) => {
    const profile = profileFrom(savedWith('daily', `{"20261012":${record}}`));
    expect(profile.daily('20261012')).toEqual(kept);
  });

  it.each([
    { name: 'a rank past the best', json: '4' },
    { name: 'a negative rank', json: '-1' },
    { name: 'a rank as text', json: '"2"' },
    { name: 'half a rank', json: '1.5' },
  ])('owns no rank of an upgrade for $name, and keeps the others', ({ json }) => {
    const profile = profileFrom(savedWith('upgrades', `{"eye":${json},"nova":2}`));
    expect(profile.view.upgrades).toEqual({ nova: 2 });
  });

  it.each([
    { name: 'a day that does not exist', gift: '{"last":"20261332","streak":3}' },
    { name: 'a day as a number', gift: '{"last":20261031,"streak":3}' },
    { name: 'no day yet', gift: '{"last":null,"streak":0}' },
    { name: 'a list', gift: '["20261031",3]' },
  ])('starts the gift over for $name', ({ gift }) => {
    expect(profileFrom(savedWith('gift', gift)).view.gift).toEqual({ last: null, streak: 0 });
  });

  it.each([
    { name: 'past the seventh day', json: '8' },
    { name: 'before the first day', json: '0' },
    { name: 'as text', json: '"3"' },
    { name: 'a fraction', json: '1.5' },
  ])('starts the streak at day 1 when its day is $name, and keeps the gift taken', ({ json }) => {
    const profile = profileFrom(savedWith('gift', `{"last":"20261031","streak":${json}}`));
    expect(profile.view.gift).toEqual({ last: '20261031', streak: 1 });
  });

  it.each([
    { name: 'a step past the last one', training: '{"step":4,"done":false}' },
    { name: 'a step as text', training: '{"step":"2","done":false}' },
    { name: 'an end as text', training: '{"step":1,"done":"yes"}' },
    { name: 'a list', training: '[3,true]' },
  ])('starts the training over for $name', ({ training }) => {
    expect(profileFrom(savedWith('training', training)).training).toEqual({ step: 1, done: false });
  });

  it.each([
    { name: 'an unknown tip', json: '["shop"]' },
    { name: 'the prototype key', json: '["__proto__"]' },
    { name: 'a text', json: '"observatory"' },
  ])('has seen no tip for $name', ({ json }) => {
    expect(profileFrom(savedWith('tips', json)).view.tips).toEqual([]);
  });

  it.each([
    { name: 'markup', json: '"<img src=x onerror=alert(1)>"' },
    { name: 'an id one character over its limit', json: `"${'a'.repeat(33)}"` },
    { name: 'a number', json: '3' },
  ])('leaves out an achievement that is $name, and keeps the others', ({ json }) => {
    const profile = profileFrom(savedWith('achievements', `[${json},"first-win"]`));
    expect(profile.view.achievements).toEqual(['first-win']);
  });

  it('keeps an achievement whose id is exactly as long as its limit', () => {
    const id = 'a'.repeat(32);
    expect(profileFrom(savedWith('achievements', `["${id}"]`)).view.achievements).toEqual([id]);
  });
});

describe('PlayerProfile keeps a profile it cannot read', () => {
  const longer = JSON.stringify({ version: 2, pad: 'x'.repeat(SAVE_LIMITS.player) });

  it.each([
    { name: 'a newer version', text: '{"version":3,"shards":900}' },
    { name: 'its version as text', text: '{"version":"2","shards":900}' },
    { name: 'a text cut short', text: VERSION_2.slice(0, -10) },
    { name: 'a list', text: '[{"version":2}]' },
    { name: 'a text longer than any profile', text: longer },
  ])('starts afresh on $name, and never replaces it for a tip shown', ({ text }) => {
    const storage = storageWith(PLAYER_KEY, text);
    const profile = new PlayerProfile(storage);
    profile.markTipSeen('observatory');
    expect(profile.shards).toBe(0);
    expect(storage.get(PLAYER_KEY)).toBe(text);
  });

  it("replaces it with the player's own progress, a game played", () => {
    const storage = storageWith(PLAYER_KEY, '{"version":3,"shards":900}');
    new PlayerProfile(storage).recordGame(won, CAMPAIGN);
    expect(storedJson(storage, PLAYER_KEY)).toMatchObject({ version: 2, stats: { levelsWon: 1 } });
  });
});
