/** The commands the controls send; implemented by `PlaySession`. */
export interface PlayCommands {
  aimAt(x: number, y: number): void;
  isOnShooter(x: number, y: number): boolean;
  /** Flips the switch under this point, if any (Volcano world); true if it did. */
  flipSwitchAt(x: number, y: number): boolean;
  /** Flips the next switch the chain has not reached yet (keyboard). */
  flipNextSwitch(): void;
  /** Starts (or starts again) charging a shot; `fire` releases it. */
  charge(): void;
  fire(): void;
  swap(): void;
  turn(direction: number): void;
  togglePause(): void;
  /** Arms or disarms the magnet (Abyss world). */
  toggleMagnet(): void;
}

/** A finger moving less than this (CSS pixels) keeps charging the shot. */
const STILL = 6;

/**
 * Mouse: aim by moving, fire by releasing the main button (holding it charges
 * a powered shot), swap with the secondary one. Touch and pen: aim by
 * dragging and fire on release, so the player can adjust first
 * (specification § 3.3); holding the finger still charges the shot; a tap on
 * the shooter swaps the balls.
 */
export class PointerControls {
  private aiming: number | null = null;
  private swapping: number | null = null;
  private pressed = false;
  private still: [number, number] | null = null;
  private readonly abort = new AbortController();

  constructor(
    private readonly target: HTMLElement,
    private readonly commands: PlayCommands,
  ) {
    const options = { signal: this.abort.signal };
    target.addEventListener('pointerdown', this.down, options);
    target.addEventListener('pointermove', this.move, options);
    target.addEventListener('pointerup', this.up, options);
    target.addEventListener('pointercancel', this.cancel, options);
    target.addEventListener('contextmenu', (event) => event.preventDefault(), options);
  }

  destroy(): void {
    this.abort.abort();
  }

  private local(event: PointerEvent): [number, number] {
    const rect = this.target.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  private readonly down = (event: PointerEvent): void => {
    const [x, y] = this.local(event);
    if (event.pointerType === 'mouse') {
      if (event.button === 2) this.commands.swap();
      else if (event.button === 0 && !this.commands.flipSwitchAt(x, y)) {
        this.commands.aimAt(x, y);
        this.commands.charge();
        this.pressed = true;
      }
      return;
    }
    event.preventDefault();
    this.target.setPointerCapture(event.pointerId);
    if (this.commands.flipSwitchAt(x, y)) return;
    if (this.commands.isOnShooter(x, y)) {
      this.swapping = event.pointerId;
      return;
    }
    this.aiming = event.pointerId;
    this.commands.aimAt(x, y);
    this.commands.charge();
    this.still = [x, y];
  };

  private readonly move = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse' && event.pointerId !== this.aiming) return;
    const [x, y] = this.local(event);
    this.commands.aimAt(x, y);
    // A finger that moves is still aiming: the charge starts again once it stops.
    if (this.still && Math.hypot(x - this.still[0], y - this.still[1]) > STILL) {
      this.still = [x, y];
      this.commands.charge();
    }
  };

  private readonly up = (event: PointerEvent): void => {
    const [x, y] = this.local(event);
    if (event.pointerType === 'mouse') {
      if (event.button === 0 && this.pressed) this.commands.fire();
      this.pressed = false;
      return;
    }
    if (event.pointerId === this.swapping) {
      if (this.commands.isOnShooter(x, y)) this.commands.swap();
    } else if (event.pointerId === this.aiming) {
      this.commands.aimAt(x, y);
      this.commands.fire();
    }
    this.cancel();
  };

  private readonly cancel = (): void => {
    this.aiming = null;
    this.swapping = null;
    this.still = null;
  };
}

/** Keys of the specification § 3.3; ignored while a form field or a button has the focus. */
export class KeyboardControls {
  private readonly held = new Set<string>();
  /** Space is down: releasing it fires (holding it charges). */
  private charging = false;
  private readonly abort = new AbortController();

  constructor(
    target: Pick<Window, 'addEventListener'>,
    private readonly commands: PlayCommands,
  ) {
    const options = { signal: this.abort.signal };
    target.addEventListener('keydown', this.down, options);
    target.addEventListener('keyup', this.up, options);
    target.addEventListener('blur', this.release, options);
  }

  destroy(): void {
    this.abort.abort();
  }

  private readonly down = (event: KeyboardEvent): void => {
    if (KeyboardControls.isTyping(event.target)) return;
    switch (KeyboardControls.nameOf(event)) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this.held.add(event.code);
        this.updateTurn(event.shiftKey);
        break;
      case 'Space':
        if (event.repeat) return;
        this.commands.charge();
        this.charging = true;
        break;
      case 'KeyX':
      case 'KeyC':
        if (event.repeat) return;
        this.commands.swap();
        break;
      case 'KeyM':
        if (event.repeat) return;
        this.commands.toggleMagnet();
        break;
      case 'KeyS':
        if (event.repeat) return;
        this.commands.flipNextSwitch();
        break;
      case 'Escape':
      case 'KeyP':
        if (event.repeat) return;
        this.commands.togglePause();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  private readonly up = (event: KeyboardEvent): void => {
    if (event.code === 'Space' && this.charging) {
      this.charging = false;
      if (!KeyboardControls.isTyping(event.target)) this.commands.fire();
      return;
    }
    if (this.held.delete(event.code)) this.updateTurn(event.shiftKey);
  };

  private readonly release = (): void => {
    this.held.clear();
    this.charging = false;
    this.commands.turn(0);
  };

  private updateTurn(fine: boolean): void {
    const direction = (this.held.has('ArrowRight') ? 1 : 0) - (this.held.has('ArrowLeft') ? 1 : 0);
    this.commands.turn(direction * (fine ? 0.25 : 1));
  }

  /**
   * A letter is the one printed on the key, whatever the layout (M is M on
   * AZERTY too, where it sits elsewhere); other keys go by position.
   */
  private static nameOf(event: KeyboardEvent): string {
    const printed = typeof event.key === 'string' && event.key.length === 1 && event.key !== ' ';
    if (!printed) return event.code;
    return /^[a-z]$/i.test(event.key) ? `Key${event.key.toUpperCase()}` : event.key;
  }

  /** Form fields and buttons keep their own keys (a focused button reacts to Space). */
  private static isTyping(target: EventTarget | null): boolean {
    if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
    return (
      target.isContentEditable ||
      ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName)
    );
  }
}
