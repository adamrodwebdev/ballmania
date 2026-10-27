import { describe, expect, it, vi } from 'vitest';
import { Ball } from '@/engine/chain/Ball';
import { Chain } from '@/engine/chain/Chain';
import { Vec2 } from '@/engine/geometry/Vec2';
import { BallMotion, LANDING_TIME } from '@/play/BallMotion';
import { KeyboardControls, PointerControls, type PlayCommands } from '@/play/Controls';
import { FrameCap } from '@/play/FrameCap';
import { GameLoop } from '@/play/GameLoop';
import { luminance, Palette, TONE_VARIABLES } from '@/play/Palette';
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
    expect(palette.dark).toBe(true);
  });

  it('measures how light a colour is', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1);
    expect(luminance('#000')).toBe(0);
    expect(luminance('rebeccapurple')).toBe(0.5);
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

  it('skips the frames its cap holds back, and gives their time to the next one', () => {
    const callbacks: FrameRequestCallback[] = [];
    const scheduler = {
      requestAnimationFrame: (callback: FrameRequestCallback) => callbacks.push(callback),
      cancelAnimationFrame: vi.fn(),
    };
    const frames: number[] = [];
    const loop = new GameLoop((dt) => frames.push(dt), scheduler, new FrameCap(60));
    loop.start();
    const start = performance.now();
    // A 120 Hz screen: every other frame is drawn, each covering two refreshes.
    for (let i = 1; i <= 8; i++) callbacks[i - 1]!(start + (i * 1000) / 120);
    expect(frames).toHaveLength(4);
    expect(frames[2]).toBeCloseTo(2 / 120);
    // The loop keeps asking for frames, drawn or not.
    expect(callbacks).toHaveLength(9);
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
      flipSwitchAt: vi.fn(() => false),
      flipNextSwitch: vi.fn(),
      charge: vi.fn(),
      fire: vi.fn(),
      swap: vi.fn(),
      turn: vi.fn(),
      togglePause: vi.fn(),
      toggleMagnet: vi.fn(),
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
    expect(commands.charge).toHaveBeenCalledTimes(1);
    expect(commands.fire).not.toHaveBeenCalled();
    press('keyup', 'Space');
    press('keydown', 'KeyX');
    // Escape belongs to the browser (fullscreen): only P pauses.
    press('keydown', 'Escape');
    expect(commands.togglePause).not.toHaveBeenCalled();
    press('keydown', 'KeyP');
    press('keydown', 'KeyM');
    press('keydown', 'KeyS');
    expect(commands.flipNextSwitch).toHaveBeenCalledTimes(1);
    expect(commands.toggleMagnet).toHaveBeenCalledTimes(1);
    expect(commands.fire).toHaveBeenCalledTimes(1);
    expect(commands.swap).toHaveBeenCalledTimes(1);
    expect(commands.togglePause).toHaveBeenCalledTimes(1);
  });

  it('reads letters as printed on the keyboard, whatever its layout (AZERTY)', () => {
    const { commands, press } = setup();
    // AZERTY: M sits where QWERTY has the semicolon, and that key prints a comma.
    press('keydown', 'Semicolon', { key: 'm' });
    press('keydown', 'KeyM', { key: ',' });
    expect(commands.toggleMagnet).toHaveBeenCalledTimes(1);
    press('keydown', 'KeyP', { key: 'P' });
    expect(commands.togglePause).toHaveBeenCalledTimes(1);
  });

  it('reads the letters of another alphabet by position (Russian layout)', () => {
    const { commands, press } = setup();
    // ЙЦУКЕН: the X key prints Ч and the P key prints З, beside their Latin letters.
    press('keydown', 'KeyX', { key: 'ч' });
    press('keydown', 'KeyP', { key: 'з' });
    press('keydown', 'KeyM', { key: 'ь' });
    expect(commands.swap).toHaveBeenCalledTimes(1);
    expect(commands.togglePause).toHaveBeenCalledTimes(1);
    expect(commands.toggleMagnet).toHaveBeenCalledTimes(1);
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

describe('PointerControls', () => {
  const setup = () => {
    const listeners = new Map<string, (event: PointerEvent) => void>();
    const target = {
      addEventListener: (type: string, listener: (event: PointerEvent) => void) =>
        listeners.set(type, listener),
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      setPointerCapture: vi.fn(),
    } as unknown as HTMLElement;
    const commands = {
      aimAt: vi.fn(),
      isOnShooter: vi.fn(() => false),
      flipSwitchAt: vi.fn(() => false),
      flipNextSwitch: vi.fn(),
      charge: vi.fn(),
      fire: vi.fn(),
      swap: vi.fn(),
      turn: vi.fn(),
      togglePause: vi.fn(),
      toggleMagnet: vi.fn(),
    } satisfies PlayCommands;
    new PointerControls(target, commands);
    const send = (type: string, x: number, y: number, at: number, pointerType = 'touch') =>
      listeners.get(type)!({
        pointerType,
        pointerId: 1,
        button: 0,
        clientX: x,
        clientY: y,
        timeStamp: at,
        preventDefault: vi.fn(),
      } as unknown as PointerEvent);
    /** Where the shot went: the last aim given before firing. */
    const shot = () => commands.aimAt.mock.calls.at(-1);
    return { commands, send, shot };
  };

  it('fires a finger where it lifts when it held still', () => {
    const { commands, send, shot } = setup();
    send('pointerdown', 100, 400, 0);
    send('pointermove', 180, 300, 200);
    send('pointermove', 181, 301, 320);
    send('pointerup', 182, 300, 400);
    expect(commands.fire).toHaveBeenCalledTimes(1);
    expect(shot()).toEqual([182, 300]);
  });

  it('keeps the aim from before a finger slides as it lifts (v1.8.1)', () => {
    const { send, shot } = setup();
    send('pointerdown', 100, 400, 0);
    send('pointermove', 180, 300, 200);
    send('pointermove', 180, 300, 330);
    // The contact point slips 12 px in the last 30 ms.
    send('pointermove', 186, 296, 380);
    send('pointerup', 192, 290, 410);
    expect(shot()).toEqual([180, 300]);
  });

  it('fires a quick flick from where it started', () => {
    const { send, shot } = setup();
    send('pointerdown', 100, 400, 0);
    send('pointermove', 130, 360, 30);
    send('pointerup', 160, 320, 60);
    expect(shot()).toEqual([100, 400]);
  });

  it('leaves the mouse as it was: the shot goes where the button is released', () => {
    const { commands, send, shot } = setup();
    send('pointerdown', 100, 400, 0, 'mouse');
    send('pointermove', 180, 300, 330, 'mouse');
    send('pointermove', 192, 290, 380, 'mouse');
    send('pointerup', 192, 290, 410, 'mouse');
    expect(commands.fire).toHaveBeenCalledTimes(1);
    expect(shot()).toEqual([192, 290]);
  });
});
