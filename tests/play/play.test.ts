import { describe, expect, it, vi } from 'vitest';
import { Ball } from '@/engine/chain/Ball';
import { Chain } from '@/engine/chain/Chain';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallMotion, LANDING_TIME } from '@/play/BallMotion';
import { KeyboardControls, type PlayCommands } from '@/play/Controls';
import { Effects } from '@/play/Effects';
import { GameLoop } from '@/play/GameLoop';
import { Palette, TONE_VARIABLES } from '@/play/Palette';
import { PARAMS, straightPath } from '../engine/helpers';

describe('BallMotion', () => {
  const chainWith = (...balls: Ball[]) => new Chain(straightPath(), balls, PARAMS);

  it('glides displayed balls towards their simulated place', () => {
    const ball = new Ball(1, 0, 100);
    const chain = chainWith(ball);
    const motion = new BallMotion();
    motion.update([chain], 1 / 60);
    expect(motion.arcOf(ball)).toBe(100);
    ball.s = 140;
    motion.update([chain], 1 / 60);
    const shown = motion.arcOf(ball);
    expect(shown).toBeGreaterThan(100);
    expect(shown).toBeLessThan(140);
    for (let i = 0; i < 60; i++) motion.update([chain], 1 / 60);
    expect(motion.arcOf(ball)).toBeCloseTo(140);
  });

  it('slides a shot ball from its impact point into its slot', () => {
    const ball = new Ball(1, 0, 100);
    const chain = chainWith(ball);
    const motion = new BallMotion();
    const from = new Vec2(100, 300);
    motion.land(ball, from);
    expect(motion.positionOf(chain, ball)).toEqual(from);
    motion.update([chain], LANDING_TIME / 2);
    expect(motion.positionOf(chain, ball).y).toBeGreaterThan(100);
    motion.update([chain], LANDING_TIME);
    expect(motion.positionOf(chain, ball)).toEqual(new Vec2(100, 100));
  });

  it('forgets exploded balls and swallows the chain after a defeat', () => {
    const ball = new Ball(1, 0, 100);
    const motion = new BallMotion();
    motion.update([chainWith(ball)], 0.1);
    motion.update([chainWith()], 0.1);
    motion.drain(500, 0.1);
    expect(motion.arcOf(ball)).toBe(150);
  });
});

describe('Palette', () => {
  it('reads the design tokens, with fallbacks', () => {
    const values: Record<string, string> = { '--orb-ruby': ' #ff0000 ', '--board-bg': '#000' };
    const palette = Palette.fromStyle({ getPropertyValue: (name: string) => values[name] ?? '' });
    expect(palette.tone(0)).toBe('#ff0000');
    expect(palette.tone(6)).toBe('#ff0000');
    expect(palette.board).toBe('#000');
    expect(palette.tones).toHaveLength(TONE_VARIABLES.length);
  });
});

describe('GameLoop', () => {
  it('passes clamped frame durations until stopped', () => {
    const callbacks: FrameRequestCallback[] = [];
    const scheduler = {
      requestAnimationFrame: (callback: FrameRequestCallback) => callbacks.push(callback),
      cancelAnimationFrame: vi.fn(),
    };
    const frames: number[] = [];
    const loop = new GameLoop((dt) => frames.push(dt), scheduler);
    loop.start();
    loop.start();
    expect(callbacks).toHaveLength(1);
    const start = performance.now();
    callbacks[0]!(start + 16);
    callbacks[1]!(start + 5016);
    expect(frames[0]).toBeGreaterThan(0);
    expect(frames[1]).toBe(0.1);
    loop.stop();
    expect(loop.running).toBe(false);
    expect(scheduler.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe('Effects', () => {
  it('fades every particle and label out', () => {
    const effects = new Effects(() => 0.5);
    effects.explode([new Vec2(0, 0), new Vec2(10, 0), new Vec2(20, 0)], [1, 1, 1], 60, 2);
    expect(effects.active).toBe(true);
    for (let i = 0; i < 120; i++) effects.update(1 / 60);
    expect(effects.active).toBe(false);
  });
});

describe('KeyboardControls', () => {
  const setup = () => {
    const listeners = new Map<string, (event: KeyboardEvent) => void>();
    const target = {
      addEventListener: (type: string, listener: (event: KeyboardEvent) => void) =>
        listeners.set(type, listener),
    } as unknown as Window;
    const commands = {
      aimAt: vi.fn(),
      isOnShooter: vi.fn(() => false),
      fire: vi.fn(),
      swap: vi.fn(),
      turn: vi.fn(),
      togglePause: vi.fn(),
    } satisfies PlayCommands;
    new KeyboardControls(target, commands);
    const press = (type: 'keydown' | 'keyup', code: string, extra: Partial<KeyboardEvent> = {}) =>
      listeners.get(type)!({
        code,
        repeat: false,
        shiftKey: false,
        target: null,
        preventDefault: vi.fn(),
        ...extra,
      } as unknown as KeyboardEvent);
    return { commands, press };
  };

  it('maps the keys of the specification', () => {
    const { commands, press } = setup();
    press('keydown', 'Space');
    press('keydown', 'Space', { repeat: true });
    press('keydown', 'KeyX');
    press('keydown', 'Escape');
    expect(commands.fire).toHaveBeenCalledTimes(1);
    expect(commands.swap).toHaveBeenCalledTimes(1);
    expect(commands.togglePause).toHaveBeenCalledTimes(1);
  });

  it('turns while an arrow is held, slower with Shift', () => {
    const { commands, press } = setup();
    press('keydown', 'ArrowRight');
    expect(commands.turn).toHaveBeenLastCalledWith(1);
    press('keydown', 'ArrowLeft', { shiftKey: true });
    expect(commands.turn).toHaveBeenLastCalledWith(0);
    press('keyup', 'ArrowRight', { shiftKey: true });
    expect(commands.turn).toHaveBeenLastCalledWith(-0.25);
    press('keyup', 'ArrowLeft');
    expect(commands.turn).toHaveBeenLastCalledWith(0);
  });
});
