import { describe, expect, it } from 'vitest';
import { scrollMove } from '@/ui/ScrollKeys';

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
