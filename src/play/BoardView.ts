import type { LevelSetup } from '@/engine/Game';
import { FRAMES, type Frame } from '@/levels/tracks';
import { SHOOTER_RADIUS } from './cosmetics/ShooterSkins';

/** A rectangle of the board, in board units. */
export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * What must be seen of a level: its bounds, and the mouths of the tunnels the
 * balls come in from, off the board (kept out from under the HUD).
 */
export interface Content extends Bounds {
  readonly entrances: readonly Bounds[];
  /** A ball's radius, in board units. */
  readonly ball: number;
}

/** Room the interface takes along each edge of the screen (top bar, buttons), in CSS pixels. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Where the board is drawn: board units to CSS pixels. */
export interface BoardView {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/** Half the width of a track's glow beyond its balls (the renderer's track layer). */
const TRACK_GLOW = 17;
/** Air left between the level and the free area, on each side, as a share of it. */
const AIR = 0.015;
/** A screen that grew by less than this keeps the board's size. */
const GROWTH = 1.15;
/**
 * Board shapes that show the level almost as large as the best one compete on
 * the room they fill. On a phone, almost means 2 % (every pixel of a ball
 * counts); once the balls are this large (CSS pixels of radius), 12 %.
 */
const CLOSE_SMALL = 0.98;
const CLOSE_LARGE = 0.88;
const LARGE_BALL = 14;

/**
 * The part of the board the player must see: the tracks as far as they run on
 * the board (the entrance tunnels come from off-screen), every branch of the
 * switches, the shooter and its ring, the mirrors. The rest of the board is
 * margin: drawn when the screen has room for it, never fitted.
 */
export function contentBounds(setup: LevelSetup): Content {
  const { board, chain, chains, orbit, shooter } = setup;
  const radius = chain.ballRadius;
  const entrances: Bounds[] = [];
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const take = (x: number, y: number, margin: number) => {
    left = Math.min(left, x - margin);
    top = Math.min(top, y - margin);
    right = Math.max(right, x + margin);
    bottom = Math.max(bottom, y + margin);
  };
  for (const { path, route } of chains) {
    const paths = [path];
    if (route) {
      paths.push(route.build(Array.from({ length: route.forkCount }, () => 'long' as const)).path);
    }
    const mouth = path.pointAt(0);
    const offBoard = mouth.x < 0 || mouth.x > board.width || mouth.y < 0 || mouth.y > board.height;
    if (offBoard) {
      const margin = radius + TRACK_GLOW;
      entrances.push({
        left: mouth.x - margin,
        top: mouth.y - margin,
        right: mouth.x + margin,
        bottom: mouth.y + margin,
      });
    }
    for (const candidate of paths) {
      for (const point of candidate.sample(12)) {
        const onBoard =
          point.x >= 0 && point.x <= board.width && point.y >= 0 && point.y <= board.height;
        if (onBoard) take(point.x, point.y, radius + TRACK_GLOW);
      }
    }
  }
  const reach = SHOOTER_RADIUS + radius;
  if (orbit) {
    take(orbit.centre.x - orbit.radiusX, orbit.centre.y - orbit.radiusY, reach);
    take(orbit.centre.x + orbit.radiusX, orbit.centre.y + orbit.radiusY, reach);
  } else {
    take(shooter.x, shooter.y, reach);
  }
  for (const reflector of setup.reflectors ?? []) {
    if (reflector.kind === 'prism') {
      // A turning prism sweeps its whole disc.
      take(reflector.centre.x, reflector.centre.y, reflector.radius + radius);
    } else {
      take(reflector.from.x, reflector.from.y, radius);
      take(reflector.to.x, reflector.to.y, radius);
    }
  }
  if (!Number.isFinite(left)) {
    return { left: 0, top: 0, right: board.width, bottom: board.height, entrances, ball: radius };
  }
  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
    right: Math.min(board.width, right),
    bottom: Math.min(board.height, bottom),
    entrances,
    ball: radius,
  };
}

/**
 * The board shape that shows this level largest on this screen (bigger balls
 * read better on a phone); between shapes that show it about as large, the
 * one that fills the most of the screen. `levelOn` lays the level out on a
 * shape and returns what must be seen of it.
 */
export function chooseFrame(
  levelOn: (frame: Frame) => Content,
  width: number,
  height: number,
  insets: Insets = NO_INSETS,
): Frame {
  const options = Object.values(FRAMES).map((frame) => {
    const content = levelOn(frame);
    const { view, box } = layout(content, width, height, insets);
    const area = (box.right - box.left) * (box.bottom - box.top) * view.scale * view.scale;
    return { frame, scale: view.scale, ball: content.ball * view.scale, area };
  });
  const best = options.reduce((a, b) => (b.scale > a.scale ? b : a));
  const close = best.ball >= LARGE_BALL ? CLOSE_LARGE : CLOSE_SMALL;
  return options
    .filter((option) => option.ball >= best.ball * close)
    .reduce((a, b) => (b.area > a.area ? b : a)).frame;
}

/** The level as large as the free area of the screen allows, centred in it. */
export function fitBoard(
  content: Content,
  width: number,
  height: number,
  insets: Insets = NO_INSETS,
): BoardView {
  return layout(content, width, height, insets).view;
}

/**
 * The board keeps its size, and its place while the whole level stays on the
 * screen, when the screen changes a little (a browser bar folding, a portal
 * resizing its frame): only a rotation or a large change refits it, so the
 * level never jumps while it is played.
 */
export function settleBoard(
  previous: BoardView | null,
  content: Content,
  width: number,
  height: number,
  insets: Insets = NO_INSETS,
): BoardView {
  const { view: ideal, box } = layout(content, width, height, insets);
  if (previous === null) return ideal;
  const fits =
    (box.right - box.left) * previous.scale <= width &&
    (box.bottom - box.top) * previous.scale <= height;
  if (!fits || ideal.scale / previous.scale >= GROWTH) return ideal;
  const stays =
    box.left * previous.scale + previous.offsetX >= 0 &&
    box.right * previous.scale + previous.offsetX <= width &&
    box.top * previous.scale + previous.offsetY >= 0 &&
    box.bottom * previous.scale + previous.offsetY <= height;
  return stays ? previous : placeBoard(box, previous.scale, width, height, insets);
}

/**
 * The view, and the part of the board it fits: the level, and every entrance
 * the HUD or the buttons would otherwise cover (the player sees where the
 * balls come from; an entrance off a bare edge of the screen may stay off it).
 */
function layout(
  content: Content,
  width: number,
  height: number,
  insets: Insets,
): { view: BoardView; box: Bounds } {
  let box: Bounds = content;
  const first = fitBox(box, width, height, insets);
  for (const entrance of content.entrances) {
    const x = ((entrance.left + entrance.right) / 2) * first.scale + first.offsetX;
    const y = ((entrance.top + entrance.bottom) / 2) * first.scale + first.offsetY;
    const covered =
      (insets.top > 0 && y < insets.top) ||
      (insets.bottom > 0 && y > height - insets.bottom) ||
      (insets.left > 0 && x < insets.left) ||
      (insets.right > 0 && x > width - insets.right);
    if (covered) {
      box = {
        left: Math.min(box.left, entrance.left),
        top: Math.min(box.top, entrance.top),
        right: Math.max(box.right, entrance.right),
        bottom: Math.max(box.bottom, entrance.bottom),
      };
    }
  }
  return { view: box === content ? first : fitBox(box, width, height, insets), box };
}

function fitBox(box: Bounds, width: number, height: number, insets: Insets): BoardView {
  const free = freeArea(width, height, insets);
  const scale =
    Math.min(free.width / (box.right - box.left), free.height / (box.bottom - box.top)) *
    (1 - 2 * AIR);
  return placeBoard(box, scale, width, height, insets);
}

function freeArea(width: number, height: number, insets: Insets) {
  return {
    width: Math.max(1, width - insets.left - insets.right),
    height: Math.max(1, height - insets.top - insets.bottom),
  };
}

/** The content centred in the free area, or on the whole screen when it overflows the free area. */
function placeBoard(
  content: Bounds,
  scale: number,
  width: number,
  height: number,
  insets: Insets,
): BoardView {
  const free = freeArea(width, height, insets);
  const centreX =
    (content.right - content.left) * scale <= free.width ? insets.left + free.width / 2 : width / 2;
  const centreY =
    (content.bottom - content.top) * scale <= free.height
      ? insets.top + free.height / 2
      : height / 2;
  return {
    scale,
    offsetX: centreX - ((content.left + content.right) / 2) * scale,
    offsetY: centreY - ((content.top + content.bottom) / 2) * scale,
  };
}
