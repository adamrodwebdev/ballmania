import { TOUCH_FRAME_RATE } from '@/play/FrameCap';

/**
 * Most frames a second the game draws on this screen: 60 on a touch screen,
 * which may refresh up to 120 times a second (v1.7.6); null, every frame,
 * elsewhere.
 */
export function frameRateCap(): number | null {
  return window.matchMedia('(pointer: coarse)').matches ? TOUCH_FRAME_RATE : null;
}
