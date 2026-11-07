import { describe, expect, it } from 'vitest';
import { Composer } from '../../marketing/ambiance/Composer';
import { Director, GLOW, MAX_GLOWS, peakOf, SIGNATURE } from '../../marketing/ambiance/Direction';
import { FLASH_LIMIT, FlashWatch } from '../../marketing/ambiance/FlashWatch';
import { shorts, thumbnailAt } from '../../marketing/ambiance/Highlights';
import { Mood } from '../../marketing/ambiance/Mood';
import { allNotes } from '../../marketing/ambiance/Score';
import moods from '../../marketing/ambiance/moods.json';

const MOODS = Mood.parseAll(moods);
const abyss = MOODS.find((m) => m.id === 'abyss-sleep')!;
const focus = MOODS.find((m) => m.id === 'neon-focus')!;
const HOUR = 3600;

const directorOf = (mood: Mood, seconds = HOUR, seed = 1) => {
  const plan = new Composer(mood).plan(seconds, seed);
  return { plan, director: new Director(plan, mood, allNotes(plan)) };
};

/** Samples every `step` seconds of the hour. */
const sampled = (step: number) =>
  Array.from({ length: Math.floor(HOUR / step) }, (_, i) => i * step);

describe('the direction of the picture', () => {
  it('is a function of time alone: the same frame in any order', () => {
    const { director } = directorOf(abyss);
    const later = director.frame(1234.5);
    director.frame(10);
    director.frame(3000);
    expect(directorOf(abyss).director.frame(1234.5)).toEqual(later);
  });

  it('moves the camera smoothly, cross-fades included: no jump between two frames', () => {
    const { director } = directorOf(abyss);
    let before = director.frame(0).camera;
    for (const t of sampled(1 / 30).slice(0, 30 * 600)) {
      const now = director.frame(t).camera;
      expect(Math.abs(now.x - before.x), `x at ${t}`).toBeLessThan(0.002);
      expect(Math.abs(now.y - before.y), `y at ${t}`).toBeLessThan(0.002);
      expect(Math.abs(now.zoom - before.zoom), `zoom at ${t}`).toBeLessThan(0.002);
      before = now;
    }
  });

  it('swells one signature effect per section, rising over five seconds at least', () => {
    const { plan, director } = directorOf(abyss);
    for (const section of plan.sections) {
      const peak = peakOf(plan, section.index);
      expect(director.signature(peak)).toBeGreaterThan(0.5);
      const start = peak - SIGNATURE.hold / 2 - SIGNATURE.rise;
      expect(director.signature(start + 1)).toBeLessThan(0.2);
    }
  });

  it('blooms the glow of a glass note over more than a second, never more than eight at once', () => {
    const { director } = directorOf(abyss);
    for (const t of sampled(0.5)) expect(director.glows(t).length).toBeLessThanOrEqual(MAX_GLOWS);
    expect(GLOW.rise).toBeGreaterThanOrEqual(1);
  });

  it('dims the light of a sleep video by 30 % at most, and keeps a focus video lit', () => {
    const sleep = directorOf(abyss).director;
    expect(sleep.frame(60).light).toBeCloseTo(abyss.light, 9);
    expect(sleep.frame(HOUR - 60).light).toBeCloseTo(abyss.light * 0.7, 2);
    const lit = directorOf(focus).director;
    expect(lit.frame(HOUR - 60).light).toBe(focus.light);
  });

  it('grades each moment by mixing the three looks, their weights summing to one', () => {
    const { director } = directorOf(abyss);
    for (const t of sampled(7)) {
      const { calm, bright, deep } = director.frame(t).grade;
      expect(calm + bright + deep).toBeCloseTo(1, 9);
    }
  });
});

describe('the moments taken out of the video', () => {
  it('takes three Shorts from three sections, five minutes apart, clear of the fades', () => {
    const { plan } = directorOf(abyss);
    const picked = shorts(plan, abyss, 20);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((m) => m.section)).size).toBe(3);
    for (const [i, m] of picked.entries()) {
      expect(m.start).toBeGreaterThanOrEqual(abyss.fade.in);
      expect(m.start + m.seconds).toBeLessThanOrEqual(HOUR - abyss.fade.out);
      if (i > 0) expect(m.start - picked[i - 1]!.start).toBeGreaterThanOrEqual(300);
    }
  });

  it('still takes three Shorts from a one-minute smoke test, without overlap', () => {
    const plan = new Composer(abyss).plan(60, 1);
    const picked = shorts(plan, abyss, 5);
    expect(picked).toHaveLength(3);
    for (let i = 1; i < picked.length; i++) {
      expect(picked[i]!.start - picked[i - 1]!.start).toBeGreaterThanOrEqual(5);
    }
    expect(picked.at(-1)!.start + 5).toBeLessThanOrEqual(60);
  });

  it('frames the thumbnail at the opening, clear of the fade-in', () => {
    const { plan } = directorOf(abyss);
    const at = thumbnailAt(plan, abyss);
    expect(at).toBeGreaterThanOrEqual(abyss.fade.in);
    expect(at).toBeLessThan(600);
  });
});

describe('the flash check', () => {
  it('lets a slow swell pass', () => {
    const watch = new FlashWatch();
    for (let i = 0; i <= 50; i++) watch.push(i * 0.2, 0.2 + i * 0.004, [0.2 + i * 0.004]);
    expect(watch.report().frame).toBeLessThanOrEqual(FLASH_LIMIT);
  });

  it('catches the whole frame jumping by a fifth within a second', () => {
    const watch = new FlashWatch();
    [0.2, 0.2, 0.4, 0.4].forEach((mean, i) => watch.push(i * 0.2, mean, [mean]));
    expect(watch.report().frame).toBeCloseTo(0.2, 9);
    expect(watch.report().at).toBeCloseTo(0.4, 9);
  });

  it('catches one zone flashing while the frame barely moves', () => {
    const watch = new FlashWatch();
    watch.push(0, 0.2, [0.2, 0.2, 0.2, 0.2]);
    watch.push(0.2, 0.24, [0.2, 0.2, 0.2, 0.36]);
    expect(watch.report().zone).toBeGreaterThan(FLASH_LIMIT);
    expect(watch.report().frame).toBeLessThan(FLASH_LIMIT);
  });

  it('compares only within one second', () => {
    const watch = new FlashWatch();
    watch.push(0, 0.1, [0.1]);
    watch.push(1.4, 0.3, [0.3]);
    expect(watch.report().frame).toBe(0);
  });
});
