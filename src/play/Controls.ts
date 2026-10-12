/** The commands the controls send; implemented by `PlaySession`. */
export interface PlayCommands {
  aimAt(x: number, y: number): void;
  isOnShooter(x: number, y: number): boolean;
  fire(): void;
  swap(): void;
  turn(direction: number): void;
  togglePause(): void;
}

/**
 * Mouse: aim by moving, fire with the main button, swap with the secondary one.
 * Touch and pen: aim by dragging and fire on release, so the player can adjust
 * first (specification § 3.3); a tap on the shooter swaps the balls.
 */
export class PointerControls {
  private aiming: number | null = null;
  private swapping: number | null = null;
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
      else if (event.button === 0) {
        this.commands.aimAt(x, y);
        this.commands.fire();
      }
      return;
    }
    event.preventDefault();
    this.target.setPointerCapture(event.pointerId);
    if (this.commands.isOnShooter(x, y)) {
      this.swapping = event.pointerId;
      return;
    }
    this.aiming = event.pointerId;
    this.commands.aimAt(x, y);
  };

  private readonly move = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' || event.pointerId === this.aiming) {
      const [x, y] = this.local(event);
      this.commands.aimAt(x, y);
    }
  };

  private readonly up = (event: PointerEvent): void => {
    const [x, y] = this.local(event);
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
  };
}

/** Keys of the specification § 3.3; ignored while a form field or a button has the focus. */
export class KeyboardControls {
  private readonly held = new Set<string>();
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
    switch (event.code) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this.held.add(event.code);
        this.updateTurn(event.shiftKey);
        break;
      case 'Space':
        if (event.repeat) return;
        this.commands.fire();
        break;
      case 'KeyX':
      case 'KeyC':
        if (event.repeat) return;
        this.commands.swap();
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
    if (this.held.delete(event.code)) this.updateTurn(event.shiftKey);
  };

  private readonly release = (): void => {
    this.held.clear();
    this.commands.turn(0);
  };

  private updateTurn(fine: boolean): void {
    const direction = (this.held.has('ArrowRight') ? 1 : 0) - (this.held.has('ArrowLeft') ? 1 : 0);
    this.commands.turn(direction * (fine ? 0.25 : 1));
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
