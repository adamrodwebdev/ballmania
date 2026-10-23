import { describe, expect, it } from 'vitest';
import { LINEUP } from '@/showcase/lineup';
import { MOMENTS } from '@/showcase/moments';
import { FADE, Reel, type ReelHost } from '@/showcase/Reel';
import { fakeCanvas, reelStyle, type DrawCall } from './fakeCanvas';

/** A screen's frames, 60 a second, run by hand. */
class Screen implements ReelHost {
  readonly shown: number[] = [];
  requested = 0;
  private readonly callbacks = new Map<number, (now: number) => void>();
  private handle = 0;
  private now = 0;

  requestFrame(callback: (now: number) => void): number {
    this.requested++;
    this.callbacks.set(++this.handle, callback);
    return this.handle;
  }

  cancelFrame(handle: number): void {
    this.callbacks.delete(handle);
  }

  showing(index: number): void {
    this.shown.push(index);
  }

  /** Frames waiting to run. */
  get waiting(): number {
    return this.callbacks.size;
  }

  /** Runs `count` frames of the screen. */
  run(count: number): void {
    for (let i = 0; i < count; i++) {
      this.now += 1000 / 60;
      const callbacks = [...this.callbacks.values()];
      this.callbacks.clear();
      for (const callback of callbacks) callback(this.now);
    }
  }
}

/** A reel on a recorded canvas, at the size of a phone's window. */
function reel(still = false) {
  const calls: DrawCall[] = [];
  const screen = new Screen();
  const played = new Reel(
    fakeCanvas((call) => calls.push(call)),
    reelStyle(still),
    screen,
  );
  return { reel: played, screen, calls };
}

/** Screen frames a lap takes: each moment shows until the next has faded in over its end. */
const LAP = Math.ceil(MOMENTS.reduce((seconds, moment) => seconds + moment.seconds - FADE, 0) * 60);

describe('the title reel (v1.8.0)', () => {
  it('starts once the window has a size, on the first moment', () => {
    const { reel: played, screen } = reel();
    played.run(true);
    screen.run(10);
    expect(screen.shown).toEqual([]);
    played.resize(230, 135, 2);
    expect(screen.shown).toEqual([0]);
  });

  it('shows the lineup in order, then goes round again', () => {
    const { reel: played, screen } = reel();
    played.resize(230, 135, 2);
    played.run(true);
    screen.run(LAP + 60);
    expect(screen.shown).toEqual([...LINEUP.map((_, index) => index), 0]);
  });

  it('fades each moment into the next', () => {
    const { reel: played, screen, calls } = reel();
    played.resize(230, 135, 2);
    played.run(true);
    // Into the first moment's last seconds, then frame by frame.
    screen.run(Math.floor((MOMENTS[0]!.seconds - 1) * 60));
    const fading: number[] = [];
    let faded = false;
    for (let frame = 0; frame < 120 && !faded; frame++) {
      const before = calls.length;
      screen.run(1);
      const drawn = calls.slice(before);
      if (drawn.length === 2) fading.push(drawn[1]!.alpha);
      // The next one alone, once the current one is over.
      faded = fading.length > 0 && drawn.length === 1;
    }
    expect(faded).toBe(true);
    expect(screen.shown).toEqual([0, 1]);
    // The next one comes in over the current one, more and more opaque.
    expect(fading.length).toBeGreaterThan(0);
    for (let i = 1; i < fading.length; i++) expect(fading[i]!).toBeGreaterThan(fading[i - 1]!);
    expect(fading[0]!).toBeGreaterThan(0);
    expect(fading[0]!).toBeLessThan(0.5);
  });

  it('stops when it cannot be seen, and plays on from where it was', () => {
    const { reel: played, screen, calls } = reel();
    played.resize(230, 135, 2);
    played.run(true);
    screen.run(30);
    played.run(false);
    expect(screen.waiting).toBe(0);
    const drawn = calls.length;
    screen.run(30);
    expect(calls.length).toBe(drawn);
    played.run(true);
    played.run(true);
    expect(screen.waiting).toBe(1);
    screen.run(30);
    expect(calls.length).toBeGreaterThan(drawn);
  });

  it('with reduced motion, draws one still image and never asks for a frame', () => {
    const { reel: played, screen, calls } = reel(true);
    played.resize(230, 135, 2);
    played.run(true);
    screen.run(60);
    expect(screen.requested).toBe(0);
    expect(screen.shown).toEqual([0]);
    expect(calls).toEqual([{ method: 'drawImage', alpha: 1 }]);
  });
});
