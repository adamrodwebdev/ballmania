/** Which way a key scrolls: along an axis, towards its start (-1) or its end (1). */
export interface ScrollMove {
  readonly axis: 'x' | 'y';
  readonly towards: -1 | 1;
}

const MOVES: Readonly<Record<string, ScrollMove>> = {
  ArrowUp: { axis: 'y', towards: -1 },
  ArrowDown: { axis: 'y', towards: 1 },
  PageUp: { axis: 'y', towards: -1 },
  PageDown: { axis: 'y', towards: 1 },
  Home: { axis: 'y', towards: -1 },
  End: { axis: 'y', towards: 1 },
  ArrowLeft: { axis: 'x', towards: -1 },
  ArrowRight: { axis: 'x', towards: 1 },
};

/** How a key scrolls a page, if it does one (Space goes down, Shift + Space up). */
export function scrollMove(key: string, shift: boolean): ScrollMove | null {
  if (key === ' ') return { axis: 'y', towards: shift ? -1 : 1 };
  return MOVES[key] ?? null;
}

/** Fields that use every one of these keys themselves: lists, text, sliders. */
const FIELDS = 'select, textarea, [contenteditable]:not([contenteditable="false"])';
/** Inputs that only answer Space (they toggle or press); the others take every key. */
const PRESSED = new Set(['checkbox', 'button', 'submit', 'reset', 'image', 'color', 'file']);

/** True if the element in focus answers this key itself, so its own action must stay. */
export function answersKey(target: Element, key: string): boolean {
  if (target.closest(FIELDS)) return true;
  const input = target.closest('input');
  if (input) {
    // Arrows move a radio group's choice and Space checks it; the other keys do nothing there.
    if (input.type === 'radio') return !['PageUp', 'PageDown', 'Home', 'End'].includes(key);
    return PRESSED.has(input.type) ? key === ' ' : true;
  }
  return key === ' ' && target.closest('button, summary') !== null;
}

/** True if `from`, or a box around it, can still scroll that way. */
export function canScroll(from: Element, move: ScrollMove): boolean {
  const root = from.ownerDocument.documentElement;
  for (let box: Element | null = from; box && box !== root; box = box.parentElement) {
    const style = getComputedStyle(box);
    const overflow = move.axis === 'y' ? style.overflowY : style.overflowX;
    if (overflow === 'auto' || overflow === 'scroll') {
      const position = move.axis === 'y' ? box.scrollTop : Math.abs(box.scrollLeft);
      const room =
        move.axis === 'y' ? box.scrollHeight - box.clientHeight : box.scrollWidth - box.clientWidth;
      if (room > 1 && (move.towards < 0 ? position > 0 : position < room - 1)) return true;
    }
    // A dialog or a fixed box scrolls on its own: what lies behind never takes over.
    if (box.tagName === 'DIALOG' || style.position === 'fixed') return false;
  }
  return false;
}

/** The ways a turn of the wheel scrolls; with Shift, some browsers turn it sideways. */
export function wheelMoves(
  wheel: Pick<WheelEvent, 'deltaX' | 'deltaY' | 'shiftKey'>,
): ScrollMove[] {
  const towards = (delta: number): -1 | 1 => (delta < 0 ? -1 : 1);
  const moves: ScrollMove[] = [];
  if (wheel.deltaY !== 0) {
    moves.push({ axis: 'y', towards: towards(wheel.deltaY) });
    if (wheel.shiftKey) moves.push({ axis: 'x', towards: towards(wheel.deltaY) });
  }
  if (wheel.deltaX !== 0) moves.push({ axis: 'x', towards: towards(wheel.deltaX) });
  return moves;
}

/**
 * Keeps the mouse wheel inside the game when it plays in a portal's frame
 * (v1.9.0): a turn that nothing under the pointer can scroll any further is
 * stopped, so the portal's page around the frame never slides. The page's
 * `overscroll-behavior: none` asks the same, and Chromium keeps to it, but
 * WebKit hands the turn on to the parent page (Playwright's WebKit,
 * 03/11/2026: 800 px under the title screen). Ctrl and the wheel still zoom.
 */
export class ScrollWheelGuard {
  constructor(private readonly view: Window) {
    view.addEventListener('wheel', this.onWheel, { passive: false });
  }

  destroy(): void {
    this.view.removeEventListener('wheel', this.onWheel);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (event.defaultPrevented || event.ctrlKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target && wheelMoves(event).some((move) => canScroll(target, move))) return;
    event.preventDefault();
  };
}

/** Pixels an arrow scrolls by, as browsers do; a page scrolls by most of the screen. */
const ARROW_STEP = 40;
const PAGE_SHARE = 0.875;

/**
 * Keeps the scrolling keys (arrows, Page Up and Down, Home, End, Space) inside
 * the game (v1.7.6). They scroll a screen's own lists as usual; but where the
 * game has nothing left to scroll, a browser hands them to the page around it,
 * and a portal's page would slide under the player (Playgama, CrazyGames).
 * The keys the game plays with (aiming, firing) are handled before this guard.
 */
export class ScrollKeyGuard {
  constructor(private readonly view: Window) {
    view.addEventListener('keydown', this.onKey);
  }

  destroy(): void {
    this.view.removeEventListener('keydown', this.onKey);
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const move = scrollMove(event.key, event.shiftKey);
    if (!move) return;
    const { body, documentElement } = this.view.document;
    const target = event.target instanceof Element ? event.target : null;
    const focused = target && target !== body && target !== documentElement ? target : null;
    if (focused && (answersKey(focused, event.key) || canScroll(focused, move))) return;
    event.preventDefault();
    // Nothing has the focus: the key scrolls the screen, as it would a page.
    if (!focused) this.scrollScreen(event.key, move);
  };

  private scrollScreen(key: string, move: ScrollMove): void {
    const screen = this.view.document.querySelector('main');
    if (!screen || move.axis !== 'y' || !canScroll(screen, move)) return;
    const step = key.startsWith('Arrow') ? ARROW_STEP : screen.clientHeight * PAGE_SHARE;
    const top =
      key === 'Home'
        ? 0
        : key === 'End'
          ? screen.scrollHeight
          : screen.scrollTop + move.towards * step;
    const still = this.view.matchMedia('(prefers-reduced-motion: reduce)').matches;
    screen.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
  }
}
