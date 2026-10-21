import { describe, expect, it } from 'vitest';
import { landing } from '@/app/landing';

const newcomer = { gamesPlayed: 0, levelsFinished: 0, worldsFinished: 0 };

describe('landing', () => {
  it('drops a new player on a portal straight into the first level', () => {
    expect(landing('crazygames', newcomer)).toBe('first-level');
    expect(landing('playgama', newcomer)).toBe('first-level');
    expect(landing('simulated', newcomer)).toBe('first-level');
  });

  it('brings back anyone who has played to the title screen', () => {
    expect(landing('crazygames', { ...newcomer, gamesPlayed: 1 })).toBe('title');
    expect(landing('crazygames', { ...newcomer, levelsFinished: 1 })).toBe('title');
    expect(landing('crazygames', { ...newcomer, worldsFinished: 1 })).toBe('title');
  });

  it('always opens on the title screen on our own site', () => {
    expect(landing('standalone', newcomer)).toBe('title');
  });
});
