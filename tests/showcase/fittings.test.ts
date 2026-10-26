import { describe, expect, it } from 'vitest';
import { SLOTS, type CosmeticSlot } from '@/player/catalog';
import { FITTINGS } from '@/showcase/fittings';
import { Take } from '@/showcase/Take';
import { fakeCanvas, reelStyle } from './fakeCanvas';

/** A fitting played to its end as the Workshop shows it, in a phone's fitting room. */
function play(slot: CosmeticSlot) {
  const take = new Take({ scene: FITTINGS[slot], canvas: fakeCanvas(), style: reelStyle() });
  take.resize(358, 201, 2);
  take.run.settle();
  const crop = take.crop();
  const canvas = { width: take.canvas.width, height: take.canvas.height };
  while (!take.run.over) take.run.step();
  take.destroy();
  return { run: take.run, crop, canvas };
}

describe("the Workshop's fitting room (v1.8.0)", () => {
  it('has a scene of three to four seconds for every slot', () => {
    for (const slot of SLOTS) {
      expect(FITTINGS[slot].seconds, slot).toBeGreaterThanOrEqual(3);
      expect(FITTINGS[slot].seconds, slot).toBeLessThanOrEqual(4);
    }
  });

  it.each(SLOTS)('%s reaches its peak within three seconds', (slot) => {
    expect(FITTINGS[slot].peakBy).toBeLessThan(3);
    const { run } = play(slot);
    expect(run.peak).not.toBeNull();
    expect(run.peak!).toBeLessThanOrEqual(FITTINGS[slot].peakBy);
  });

  it.each(SLOTS)('%s plays the same every time', (slot) => {
    expect(play(slot).run.peak).toBe(play(slot).run.peak);
  });

  it('comes closer to the action, the window always within the picture', () => {
    for (const slot of SLOTS) {
      const { crop, canvas } = play(slot);
      // The window shows a part of the board, all of it within the picture.
      expect(crop.width, slot).toBe(716);
      expect(crop.width, slot).toBeLessThan(canvas.width);
      expect(crop.x, slot).toBeGreaterThanOrEqual(0);
      expect(crop.y, slot).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.width, slot).toBeLessThanOrEqual(canvas.width);
      expect(crop.y + crop.height, slot).toBeLessThanOrEqual(canvas.height);
    }
  });
});
