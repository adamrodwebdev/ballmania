import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '@/player/catalog';
import { readReelMessage, readReelReply, type CanvasCheck } from '@/showcase/messages';

/** The canvas a page hands over, as these tests stand for it. */
const HANDED_CANVAS = { handed: true };
const isCanvas = ((value: unknown) => value === HANDED_CANVAS) as CanvasCheck;

const COLOURS = {
  tones: ['#ff3b6b', '#ffb020', '#3ddc84', '#22d3ee', '#9d7bff', '#f472d0'],
  board: '#0a0520',
  track: '#1c1040',
  trackEdge: '#6b4ad6',
  hole: '#000000',
  danger: '#ff4d6d',
  accent: '#ffc94a',
  text: '#f4ecff',
  shooter: '#241452',
};
const PALETTES = { day: COLOURS, night: COLOURS };
const START = {
  kind: 'start',
  canvas: HANDED_CANVAS,
  palettes: PALETTES,
  equipped: DEFAULT_LOOK,
  effects: 'balanced',
  still: false,
};

/** The start message, with one field replaced. */
const startWith = (field: string, value: unknown) => ({ ...START, [field]: value });
/** The palettes, the day's colours with one field replaced. */
const daylightWith = (field: string, value: unknown) => ({
  ...PALETTES,
  day: { ...COLOURS, [field]: value },
});

describe('readReelMessage: what the page tells a reel worker', () => {
  it.each([
    { name: 'a start', message: START },
    { name: "a start in the fitting room's slot", message: { ...START, slot: 'trail' } },
    { name: 'a resize', message: { kind: 'resize', width: 390, height: 300, ratio: 2 } },
    { name: 'new palettes', message: { kind: 'palettes', palettes: PALETTES } },
    { name: 'a pause', message: { kind: 'run', running: false } },
    { name: 'a fitting', message: { kind: 'fit', slot: 'burst', equipped: DEFAULT_LOOK } },
  ])('reads $name', ({ message }) => {
    expect(readReelMessage(message, isCanvas)).toEqual(message);
  });

  it.each([
    { name: 'nothing', message: null },
    { name: 'a text', message: 'start' },
    { name: 'a kind it does not know', message: { kind: 'explode' } },
    { name: 'the prototype key as its kind', message: { kind: '__proto__' } },
    { name: 'an inherited name as its kind', message: { kind: 'toString' } },
    { name: 'a start without a canvas', message: startWith('canvas', {}) },
    { name: 'a start in an unknown slot', message: startWith('slot', 'hat') },
    { name: 'a start with an effect level it lacks', message: startWith('effects', 'max') },
    { name: 'a start still as text', message: startWith('still', 'false') },
    {
      name: 'a cosmetic of the wrong slot',
      message: startWith('equipped', { ...DEFAULT_LOOK, trail: 'board-world' }),
    },
    {
      name: 'a cosmetic that is no cosmetic',
      message: startWith('equipped', { ...DEFAULT_LOOK, shooter: 'constructor' }),
    },
    {
      name: 'a colour that is no token',
      message: startWith('palettes', daylightWith('board', 'red')),
    },
    {
      name: 'a colour hiding a script',
      message: startWith('palettes', daylightWith('hole', 'url(javascript:alert(1))')),
    },
    {
      name: 'five tones',
      message: startWith('palettes', daylightWith('tones', COLOURS.tones.slice(1))),
    },
    { name: 'a size as text', message: { kind: 'resize', width: '390', height: 300, ratio: 2 } },
    {
      name: 'a size past any screen',
      message: { kind: 'resize', width: 1e6, height: 300, ratio: 1 },
    },
    { name: 'a ratio past two', message: { kind: 'resize', width: 390, height: 300, ratio: 3 } },
    {
      name: 'NaN as its height',
      message: { kind: 'resize', width: 390, height: Number.NaN, ratio: 1 },
    },
    {
      name: 'more pixels than a canvas gets',
      message: { kind: 'resize', width: 4000, height: 4000, ratio: 2 },
    },
    { name: 'a pause as a number', message: { kind: 'run', running: 0 } },
    { name: 'a fitting without its look', message: { kind: 'fit', slot: 'burst' } },
  ])('ignores $name', ({ message }) => {
    expect(readReelMessage(message, isCanvas)).toBeNull();
  });
});

describe('readReelReply: what a reel worker tells the page', () => {
  it.each([
    { name: 'it runs', reply: { kind: 'ready' } },
    { name: 'the scene shown', reply: { kind: 'showing', index: 3 } },
  ])('reads that $name', ({ reply }) => {
    expect(readReelReply(reply)).toEqual(reply);
  });

  it.each([
    { name: 'nothing', reply: undefined },
    { name: 'a kind it does not know', reply: { kind: 'done' } },
    { name: 'a scene index as text', reply: { kind: 'showing', index: '3' } },
    { name: 'a negative index', reply: { kind: 'showing', index: -1 } },
    { name: 'half an index', reply: { kind: 'showing', index: 1.5 } },
    { name: 'an index past any lineup', reply: { kind: 'showing', index: 64 } },
  ])('ignores $name', ({ reply }) => {
    expect(readReelReply(reply)).toBeNull();
  });
});
