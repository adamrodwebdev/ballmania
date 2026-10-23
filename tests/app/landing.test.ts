import { describe, expect, it } from 'vitest';
import { isFirstVisit, landing, startsTraining } from '@/app/landing';

const newcomer = { gamesPlayed: 0, levelsFinished: 0, worldsFinished: 0 };

describe('landing', () => {
  it('drops a new player on a portal straight into the training (v1.8.0)', () => {
    expect(landing('crazygames', newcomer, false)).toBe('training');
    expect(landing('playgama', newcomer, false)).toBe('training');
    expect(landing('simulated', newcomer, false)).toBe('training');
  });

  it('opens the first level for a new player whose training is over', () => {
    expect(landing('crazygames', newcomer, true)).toBe('first-level');
  });

  it('brings back anyone who has played to the title screen', () => {
    expect(landing('crazygames', { ...newcomer, gamesPlayed: 1 }, false)).toBe('title');
    expect(landing('crazygames', { ...newcomer, levelsFinished: 1 }, false)).toBe('title');
    expect(landing('crazygames', { ...newcomer, worldsFinished: 1 }, true)).toBe('title');
  });

  it('always opens on the title screen on our own site', () => {
    expect(landing('standalone', newcomer, false)).toBe('title');
  });
});

describe('startsTraining', () => {
  it("opens the training at a newcomer's first Play, until it is over", () => {
    expect(startsTraining(newcomer, false)).toBe(true);
    expect(startsTraining(newcomer, true)).toBe(false);
    // A player of the campaign never meets it.
    expect(startsTraining({ ...newcomer, levelsFinished: 3 }, false)).toBe(false);
  });
});

describe('isFirstVisit', () => {
  it('recognises a player who has never played', () => {
    expect(isFirstVisit(newcomer)).toBe(true);
    expect(isFirstVisit({ ...newcomer, gamesPlayed: 1 })).toBe(false);
    expect(isFirstVisit({ ...newcomer, levelsFinished: 1 })).toBe(false);
  });
});
