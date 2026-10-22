import { describe, expect, it } from 'vitest';
import { FrameCap, TOUCH_FRAME_RATE } from '@/play/FrameCap';
import { MAX_CANVAS_PIXELS, pixelRatioFor } from '@/play/canvas';

/** How many of the frames of one second at `hertz` the cap lets through, from `start`. */
const admittedIn = (cap: FrameCap, hertz: number, start = 1000, jitter = () => 0): number => {
  let count = 0;
  for (let i = 0; i < hertz; i++) {
    if (cap.admits(start + (i * 1000) / hertz + jitter())) count++;
  }
  return count;
};

describe('FrameCap', () => {
  it('draws 60 frames a second on a touch screen, whatever its refresh rate', () => {
    for (const hertz of [90, 120, 144]) {
      expect(admittedIn(new FrameCap(TOUCH_FRAME_RATE), hertz)).toBeGreaterThanOrEqual(59);
      expect(admittedIn(new FrameCap(TOUCH_FRAME_RATE), hertz)).toBeLessThanOrEqual(61);
    }
  });

  it('keeps every frame of a 60 Hz screen, even when frame times jitter', () => {
    let flip = 1;
    const jitter = () => (flip = -flip) * 0.8;
    expect(admittedIn(new FrameCap(TOUCH_FRAME_RATE), 60, 1000, jitter)).toBe(60);
  });

  it('keeps a steady cadence on a 120 Hz screen: every other frame', () => {
    const cap = new FrameCap(TOUCH_FRAME_RATE);
    const drawn = Array.from({ length: 8 }, (_, i) => cap.admits(1000 + (i * 1000) / 120));
    expect(drawn).toEqual([true, false, true, false, true, false, true, false]);
  });

  it('starts again from the frame after a pause, without a burst of frames', () => {
    const cap = new FrameCap(TOUCH_FRAME_RATE);
    expect(cap.admits(1000)).toBe(true);
    // Five seconds later (a hidden tab): drawn, then the cadence goes on from there.
    expect(cap.admits(6000)).toBe(true);
    expect(cap.admits(6000 + 1000 / 120)).toBe(false);
    expect(cap.admits(6000 + 1000 / 60)).toBe(true);
  });

  it('draws every frame without a cap', () => {
    expect(admittedIn(FrameCap.none(), 144)).toBe(144);
    const cap = FrameCap.none();
    expect(cap.admits(10)).toBe(true);
    expect(cap.admits(10)).toBe(true);
  });
});

describe('pixelRatioFor', () => {
  it("follows the screen's own ratio up to 2", () => {
    expect(pixelRatioFor(390, 844, 3)).toBe(2);
    expect(pixelRatioFor(1280, 720, 1.5)).toBe(1.5);
    expect(pixelRatioFor(800, 450, 0)).toBe(1);
  });

  it('keeps a canvas filling a large screen near 4 megapixels', () => {
    for (const [width, height, dpr] of [
      [1920, 1080, 2],
      [2560, 1440, 2],
      [3840, 2160, 1],
    ] as const) {
      const ratio = pixelRatioFor(width, height, dpr);
      const pixels = Math.round(width * ratio) * Math.round(height * ratio);
      expect(pixels).toBeLessThanOrEqual(MAX_CANVAS_PIXELS * 1.002);
      expect(pixels).toBeGreaterThan(MAX_CANVAS_PIXELS * 0.99);
    }
    // A 2560 × 1440 window at its own ratio of 1 stays as it is: 3.7 megapixels.
    expect(pixelRatioFor(2560, 1440, 1)).toBe(1);
  });
});
