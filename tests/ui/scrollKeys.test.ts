import { describe, expect, it } from 'vitest';
import { scrollMove, wheelMoves } from '@/ui/ScrollKeys';

describe('scrollMove', () => {
  it('knows which keys scroll a page, and which way', () => {
    expect(scrollMove('ArrowDown', false)).toEqual({ axis: 'y', towards: 1 });
    expect(scrollMove('PageUp', false)).toEqual({ axis: 'y', towards: -1 });
    expect(scrollMove('End', false)).toEqual({ axis: 'y', towards: 1 });
    expect(scrollMove('ArrowLeft', false)).toEqual({ axis: 'x', towards: -1 });
  });

  it('scrolls down on Space, up on Shift + Space', () => {
    expect(scrollMove(' ', false)).toEqual({ axis: 'y', towards: 1 });
    expect(scrollMove(' ', true)).toEqual({ axis: 'y', towards: -1 });
  });

  it('leaves the other keys alone', () => {
    expect(scrollMove('Enter', false)).toBeNull();
    expect(scrollMove('x', false)).toBeNull();
    expect(scrollMove('Tab', false)).toBeNull();
  });
});

describe('wheelMoves', () => {
  it('scrolls down a turn towards the player, up a turn away', () => {
    expect(wheelMoves({ deltaX: 0, deltaY: 120, shiftKey: false })).toEqual([
      { axis: 'y', towards: 1 },
    ]);
    expect(wheelMoves({ deltaX: 0, deltaY: -3, shiftKey: false })).toEqual([
      { axis: 'y', towards: -1 },
    ]);
  });

  it('also scrolls sideways with Shift, as some browsers turn it', () => {
    expect(wheelMoves({ deltaX: 0, deltaY: 120, shiftKey: true })).toEqual([
      { axis: 'y', towards: 1 },
      { axis: 'x', towards: 1 },
    ]);
  });

  it('follows a trackpad both ways at once, and nothing on a still wheel', () => {
    expect(wheelMoves({ deltaX: -8, deltaY: 30, shiftKey: false })).toEqual([
      { axis: 'y', towards: 1 },
      { axis: 'x', towards: -1 },
    ]);
    expect(wheelMoves({ deltaX: 0, deltaY: 0, shiftKey: false })).toEqual([]);
  });
});
