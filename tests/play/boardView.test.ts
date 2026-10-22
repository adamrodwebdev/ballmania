import { describe, expect, it } from 'vitest';
import { CAMPAIGN, findLevel } from '@/levels/campaign';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { resolveLevel } from '@/levels/resolveLevel';
import { FRAMES, type Frame } from '@/levels/tracks';
import {
  chooseFrame,
  contentBounds,
  fitBoard,
  leverReach,
  settleBoard,
  TOUCH_REACH,
  type BoardView,
  type Bounds,
  type Content,
  type Insets,
} from '@/play/BoardView';
import type { CampaignLevel } from '@/levels/campaign';

/** Playgama's frame on a phone held upright: the HUD on top, the buttons below. */
const PHONE = { width: 375, height: 768, insets: { top: 52, right: 0, bottom: 60, left: 0 } };
/** A desktop window: the HUD and the buttons in rails on the sides. */
const DESKTOP = { width: 1280, height: 720, insets: { top: 0, right: 96, bottom: 0, left: 96 } };

const contentOf = (level: CampaignLevel, frame: Frame): Content =>
  contentBounds(toLevelSetup(resolveLevel(level, frame)));

/** The level's box on screen, in CSS pixels. */
const onScreen = (content: Bounds, view: BoardView) => ({
  left: content.left * view.scale + view.offsetX,
  top: content.top * view.scale + view.offsetY,
  right: content.right * view.scale + view.offsetX,
  bottom: content.bottom * view.scale + view.offsetY,
});

const free = (width: number, height: number, insets: Insets) => ({
  left: insets.left,
  top: insets.top,
  right: width - insets.right,
  bottom: height - insets.bottom,
});

describe('BoardView', () => {
  const first = findLevel('nebula-01')!;

  it('fits what must be seen of the level: on the board, with the shooter, not the tunnel', () => {
    const setup = toLevelSetup(resolveLevel(first, FRAMES.portrait));
    const content = contentBounds(setup);
    expect(content.left).toBeGreaterThanOrEqual(0);
    expect(content.top).toBeGreaterThanOrEqual(0);
    expect(content.right).toBeLessThanOrEqual(setup.board.width);
    expect(content.bottom).toBeLessThanOrEqual(setup.board.height);
    expect(content.left).toBeLessThan(setup.shooter.x);
    expect(content.right).toBeGreaterThan(setup.shooter.x);
    // The chain comes in from off the board: its mouth is noted, not fitted.
    expect(content.entrances).toHaveLength(1);
    expect(content.entrances[0]!.top).toBeLessThan(0);
    expect(content.ball).toBe(setup.chain.ballRadius);
  });

  it('draws the level as large as the free area allows, centred in it', () => {
    for (const level of CAMPAIGN) {
      const content = contentOf(level, FRAMES.tall);
      const view = fitBoard(content, PHONE.width, PHONE.height, PHONE.insets);
      const box = onScreen(content, view);
      const area = free(PHONE.width, PHONE.height, PHONE.insets);
      expect(box.left, level.id).toBeGreaterThanOrEqual(area.left - 0.01);
      expect(box.right, level.id).toBeLessThanOrEqual(area.right + 0.01);
      expect(box.top, level.id).toBeGreaterThanOrEqual(area.top - 0.01);
      expect(box.bottom, level.id).toBeLessThanOrEqual(area.bottom + 0.01);
      // It touches the free area (but for a little air) on its limiting side, with
      // the entrances brought out from under the HUD.
      const all = [box, ...content.entrances.map((entrance) => onScreen(entrance, view))];
      const span = (from: 'left' | 'top', to: 'right' | 'bottom') =>
        Math.max(...all.map((part) => part[to])) - Math.min(...all.map((part) => part[from]));
      const fillsWidth = span('left', 'right') >= (area.right - area.left) * 0.96;
      const fillsHeight = span('top', 'bottom') >= (area.bottom - area.top) * 0.96;
      expect(fillsWidth || fillsHeight, level.id).toBe(true);
    }
  });

  it('keeps every entrance out from under the HUD', () => {
    // Level 1-1: the chain enters from the top, where the HUD stands on a phone.
    const content = contentOf(first, FRAMES.portrait);
    const view = fitBoard(content, PHONE.width, PHONE.height, PHONE.insets);
    const mouth = content.entrances[0]!;
    expect(((mouth.top + mouth.bottom) / 2) * view.scale + view.offsetY).toBeGreaterThan(
      PHONE.insets.top,
    );
  });

  it('keeps the size and the place of the board when the screen changes a little', () => {
    const content = contentOf(first, FRAMES.portrait);
    const start = settleBoard(null, content, PHONE.width, PHONE.height, PHONE.insets);
    // A browser bar folds out, then back: the level does not move.
    const shorter = settleBoard(start, content, PHONE.width, PHONE.height - 56, PHONE.insets);
    expect(shorter).toBe(start);
    expect(settleBoard(shorter, content, PHONE.width, PHONE.height, PHONE.insets)).toBe(start);
    // A frame a few pixels narrower: still the same size.
    expect(settleBoard(start, content, PHONE.width - 8, PHONE.height, PHONE.insets).scale).toBe(
      start.scale,
    );
  });

  it('refits the board after a rotation or a large change', () => {
    const content = contentOf(first, FRAMES.portrait);
    const upright = settleBoard(null, content, PHONE.width, PHONE.height, PHONE.insets);
    // On its side, the level no longer fits at its size: it is refitted.
    const turned = settleBoard(upright, content, PHONE.height, PHONE.width, SIDE_RAILS);
    expect(turned.scale).toBeLessThan(upright.scale);
    // Back upright, it takes the room again.
    const back = settleBoard(turned, content, PHONE.width, PHONE.height, PHONE.insets);
    expect(back.scale).toBeCloseTo(upright.scale);
  });

  it('picks, per level, the board shape that shows it largest, then the one that fills most', () => {
    for (const level of CAMPAIGN) {
      const scales = Object.values(FRAMES).map(
        (frame) => fitBoard(contentOf(level, frame), PHONE.width, PHONE.height, PHONE.insets).scale,
      );
      const chosen = chooseFrame(
        (frame) => contentOf(level, frame),
        PHONE.width,
        PHONE.height,
        PHONE.insets,
      );
      const scale = fitBoard(
        contentOf(level, chosen),
        PHONE.width,
        PHONE.height,
        PHONE.insets,
      ).scale;
      // On a phone, the balls are never more than 2 % smaller than on the best shape.
      expect(scale, level.id).toBeGreaterThanOrEqual(Math.max(...scales) * 0.98);
    }
    // A level that fills its board stretches along a phone and across a desktop window.
    const spiral = findLevel('nebula-03')!;
    expect(
      chooseFrame((frame) => contentOf(spiral, frame), PHONE.width, PHONE.height, PHONE.insets)
        .kind,
    ).toBe('tall');
    expect(
      chooseFrame(
        (frame) => contentOf(spiral, frame),
        DESKTOP.width,
        DESKTOP.height,
        DESKTOP.insets,
      ).kind,
    ).not.toBe('tall');
  });
});

const SIDE_RAILS: Insets = { top: 0, right: 96, bottom: 0, left: 96 };

describe('leverReach', () => {
  it('answers a tap 1.6 lever radii away on a large board', () => {
    expect(leverReach(30, 1)).toBe(48);
  });

  it('never makes a switch smaller than a 44 px touch target on a phone', () => {
    // A phone's board: about 0.37 CSS px per board unit, where 48 units are 18 px only.
    const reach = leverReach(30, 0.37);
    expect(reach * 0.37).toBeCloseTo(TOUCH_REACH);
    expect(reach * 0.37 * 2).toBeGreaterThanOrEqual(44);
  });
});
