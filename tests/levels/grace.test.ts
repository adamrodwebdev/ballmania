import { describe, expect, it } from 'vitest';
import { findLevel } from '@/levels/campaign';
import { GRACE_FROM } from '@/levels/grace';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { resolveLevel } from '@/levels/resolveLevel';
import { FRAMES } from '@/levels/tracks';
import { TRAINING_HALT, trainingDefinition, trainingLevel } from '@/levels/training';
import { ALARM_FROM, MUSIC_FROM, rise } from '@/play/dangerCues';

/**
 * The danger cues and the grace zone (v1.8.0, step 6): the music tenses from
 * half way, the alarm (red hole, heartbeat, announcement) plays from two
 * thirds, and in the last fifth the campaign's chain slows down while it does.
 */
describe('the danger cues and the grace zone (v1.8.0)', () => {
  it('rise in order along the track: music, then the alarm, then the grace zone', () => {
    expect(MUSIC_FROM).toBe(0.5);
    expect(ALARM_FROM).toBeGreaterThanOrEqual(0.65);
    expect(ALARM_FROM).toBeLessThanOrEqual(0.7);
    expect(GRACE_FROM).toBeGreaterThan(ALARM_FROM);
    // The training's chain stops where the alarm plays, short of the hole.
    expect(TRAINING_HALT).toBeGreaterThan(ALARM_FROM);
  });

  it('rise from nothing at their start to full at the hole', () => {
    expect(rise(0.4, MUSIC_FROM)).toBe(0);
    expect(rise(0.75, MUSIC_FROM)).toBeCloseTo(0.5);
    expect(rise(1, ALARM_FROM)).toBe(1);
    expect(rise(1.2, ALARM_FROM)).toBe(1);
  });

  it('give the first worlds a deeper respite than the last, and none in Legend', () => {
    const graceOf = (id: string, difficulty: 'explorer' | 'pilot' | 'legend') =>
      toLevelSetup(resolveLevel(findLevel(id)!, FRAMES.square, { difficulty })).chain.grace;
    expect(graceOf('nebula-05', 'pilot')).toEqual({ from: GRACE_FROM, factor: 0.5 });
    expect(graceOf('abyss-03', 'explorer')).toEqual({ from: GRACE_FROM, factor: 0.5 });
    expect(graceOf('jewel-03', 'pilot')).toEqual({ from: GRACE_FROM, factor: 0.7 });
    expect(graceOf('singularity-12', 'pilot')).toEqual({ from: GRACE_FROM, factor: 0.7 });
    expect(graceOf('nebula-05', 'legend')).toBeUndefined();
  });

  it('leave the training as it was: its chain stops short of the hole instead', () => {
    const setup = toLevelSetup(trainingDefinition(trainingLevel(3), FRAMES.square)).chain;
    expect(setup.halt).toBe(TRAINING_HALT);
    expect(setup.grace).toBeUndefined();
  });
});
