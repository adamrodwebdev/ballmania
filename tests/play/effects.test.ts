import { describe, expect, it, vi } from 'vitest';
import { SoundEngine } from '@/audio/SoundEngine';
import { Vec2 } from '@/engine/geometry/Vec2';
import { CRACK_TIME, Destruction, type Burst } from '@/play/effects/Destruction';
import { GlassShards } from '@/play/cosmetics/ShardShapes';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { FrameMonitor } from '@/play/effects/FrameMonitor';
import { Shake } from '@/play/effects/Shake';
import { TimeWarp } from '@/play/effects/TimeWarp';
import { Haptics, PATTERNS } from '@/play/Haptics';

const burst = (balls: number, depth = 1): Burst => ({
  positions: Array.from({ length: balls }, (_, i) => new Vec2(100 + i * 52, 200)),
  tones: Array.from({ length: balls }, () => 2),
  points: balls * 10 * depth,
  depth,
});

/** Steps the effects in 60 fps frames. */
const run = (destruction: Destruction, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) destruction.update(1 / 60);
};

describe('EffectProfile', () => {
  it('offers three levels of spectacle', () => {
    const spectacular = EffectProfile.for('spectacular', false);
    const balanced = EffectProfile.for('balanced', false);
    const subtle = EffectProfile.for('subtle', false);
    expect(spectacular.distortion).toBe(true);
    expect(balanced.distortion).toBe(false);
    expect(spectacular.shardsPerBall).toBeGreaterThan(balanced.shardsPerBall);
    expect(balanced.maxParticles).toBeGreaterThan(subtle.maxParticles);
    expect(subtle).toMatchObject({ shake: 0, slowMotion: false, lightning: false, glow: false });
  });

  it('removes whole-screen motion when the system asks for less motion', () => {
    const reduced = EffectProfile.for('spectacular', true);
    expect(reduced).toMatchObject({ shake: 0, slowMotion: false, distortion: false });
    expect(reduced.shardsPerBall).toBe(EffectProfile.for('spectacular', false).shardsPerBall);
  });

  it('steps down one level at a time, keeping the motion preference', () => {
    const lowered = EffectProfile.for('spectacular', true).lowered();
    expect(lowered).toMatchObject({ level: 'balanced', reducedMotion: true, shake: 0 });
    expect(lowered?.lowered()?.level).toBe('subtle');
    expect(EffectProfile.for('subtle', false).lowered()).toBeNull();
  });
});

describe('TimeWarp', () => {
  it('holds the slow motion, then eases back to normal speed', () => {
    const warp = new TimeWarp();
    expect(warp.update(0.1)).toBeCloseTo(0.1);
    warp.trigger(0.25, 0.1, 0.2);
    expect(warp.update(0.05)).toBeCloseTo(0.0125);
    warp.update(0.06);
    const easing = warp.update(0.1);
    expect(easing).toBeGreaterThan(0.025);
    expect(easing).toBeLessThan(0.1);
    warp.update(0.2);
    warp.update(0.01);
    expect(warp.scale).toBe(1);
  });

  it('keeps the deepest slow motion running', () => {
    const warp = new TimeWarp();
    warp.trigger(0.2, 0.2, 0.1);
    warp.trigger(0.5, 0.2, 0.1);
    warp.update(0.01);
    expect(warp.scale).toBe(0.2);
  });
});

describe('Shake', () => {
  it('grows with trauma and fades away', () => {
    const shake = new Shake(10);
    expect(shake.offset).toBe(Vec2.ZERO);
    shake.add(1);
    shake.update(0.013);
    expect(shake.offset.length()).toBeGreaterThan(0);
    expect(shake.offset.length()).toBeLessThanOrEqual(10 * Math.SQRT2);
    shake.update(1);
    expect(shake.offset).toBe(Vec2.ZERO);
  });

  it('never moves when its amplitude is zero', () => {
    const shake = new Shake(0);
    shake.add(1);
    shake.update(0.01);
    expect(shake.offset).toBe(Vec2.ZERO);
  });
});

describe('Destruction', () => {
  const create = (level: 'spectacular' | 'balanced' | 'subtle' = 'spectacular') =>
    new Destruction(EffectProfile.for(level, false), 26, new GlassShards(), () => 0.5);

  it('cracks first, then bursts into shards', () => {
    const destruction = create();
    destruction.explode(burst(3));
    expect(destruction.particleCount).toBe(0);
    destruction.update(CRACK_TIME + 0.001);
    expect(destruction.particleCount).toBe(3 * (12 + 10));
    expect(destruction.waves).toHaveLength(1);
    expect(destruction.shakeOffset.length()).toBeGreaterThanOrEqual(0);
  });

  it('makes deeper chain reactions stronger and flash', () => {
    const shallow = create();
    shallow.explode(burst(3, 1));
    shallow.update(CRACK_TIME + 0.001);
    const deep = create();
    deep.explode(burst(3, 4));
    deep.update(CRACK_TIME + 0.001);
    expect(deep.waves[0]!.strength).toBeGreaterThan(shallow.waves[0]!.strength);
    expect(deep.flash.amount).toBeGreaterThan(0);
    expect(shallow.flash.amount).toBe(0);
  });

  it('respects the particle budget of the profile', () => {
    const destruction = create('subtle');
    for (let i = 0; i < 30; i++) destruction.explode(burst(5));
    destruction.update(CRACK_TIME + 0.001);
    expect(destruction.particleCount).toBeLessThanOrEqual(150);
    expect(destruction.waves).toHaveLength(0);
  });

  it('sucks the debris into the hole after a win, then clears everything', () => {
    const destruction = create();
    destruction.explode(burst(4, 2));
    destruction.vortex(new Vec2(500, 500), { width: 1000, height: 1000 }, [0, 1, 2]);
    destruction.defeat('#ff0000');
    expect(destruction.active).toBe(true);
    run(destruction, 3);
    expect(destruction.active).toBe(false);
    expect(destruction.particleCount).toBe(0);
  });

  it('drops the waves when distortion is switched off', () => {
    const destruction = create();
    destruction.explode(burst(3));
    destruction.update(CRACK_TIME + 0.001);
    destruction.setProfile(EffectProfile.for('balanced', false));
    expect(destruction.waves).toHaveLength(0);
  });
});

describe('FrameMonitor', () => {
  it('asks to lower the effects after two seconds of slow frames', () => {
    const monitor = new FrameMonitor();
    let lowered = false;
    for (let t = 0; t < 1.5; t += 1 / 60) lowered ||= monitor.record(1 / 60);
    for (let t = 0; t < 1.9; t += 1 / 20) lowered ||= monitor.record(1 / 20);
    expect(lowered).toBe(false);
    for (let t = 0; t < 1; t += 1 / 20) lowered ||= monitor.record(1 / 20);
    expect(lowered).toBe(true);
  });

  it('stays quiet at a good frame rate', () => {
    const monitor = new FrameMonitor();
    let lowered = false;
    for (let t = 0; t < 10; t += 1 / 60) lowered ||= monitor.record(1 / 60);
    expect(lowered).toBe(false);
  });
});

describe('Haptics', () => {
  it('vibrates more for deeper chain reactions, only when allowed', () => {
    const vibrate = vi.fn(() => true);
    const haptics = new Haptics(true, vibrate);
    haptics.explosion(1);
    haptics.explosion(3);
    expect(vibrate).toHaveBeenNthCalledWith(1, PATTERNS.explosion(1));
    expect(vibrate).toHaveBeenNthCalledWith(2, PATTERNS.reaction(3));
    haptics.setEnabled(false);
    haptics.lose();
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('does nothing without the Vibration API', () => {
    expect(() => new Haptics(true, null).win()).not.toThrow();
  });
});

describe('SoundEngine', () => {
  it('stays silent and harmless without Web Audio', () => {
    const sound = new SoundEngine(0.7, () => null);
    sound.unlock();
    expect(() => {
      sound.shoot();
      sound.explode(3, 2);
      sound.setVolume(0);
      sound.suspend();
      sound.resume();
    }).not.toThrow();
  });

  it('survives a browser that refuses to create an audio context', () => {
    const sound = new SoundEngine(0.7, () => {
      throw new Error('blocked');
    });
    expect(() => sound.unlock()).not.toThrow();
  });
});
