import { afterEach, describe, expect, it, vi } from 'vitest';
import { fontsFor } from '@/app/fonts';

/** A page whose font loads take `delay` ms; records the faces asked for. */
const page = (delay: number) => {
  const asked: string[] = [];
  vi.stubGlobal('document', {
    fonts: {
      load: (face: string) => {
        asked.push(face);
        return new Promise((resolve) => setTimeout(resolve, delay));
      },
    },
  });
  return asked;
};

describe('fontsFor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('asks for nothing in a language the game faces already cover', async () => {
    const asked = page(0);
    await fontsFor('en');
    await fontsFor('fr');
    expect(asked).toEqual([]);
  });

  it('waits for the Russian faces before the first paint', async () => {
    vi.useFakeTimers();
    const asked = page(200);
    let done = false;
    void fontsFor('ru').then(() => (done = true));
    await vi.advanceTimersByTimeAsync(199);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
    expect(asked).toContain('400 1em "Ballmania Russian Display"');
    expect(asked.some((face) => face.endsWith('"Ballmania Russian"'))).toBe(true);
  });

  it('never holds the game longer than its limit on a slow network', async () => {
    vi.useFakeTimers();
    page(10_000);
    let done = false;
    void fontsFor('ru', 1500).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(1500);
    expect(done).toBe(true);
  });
});
