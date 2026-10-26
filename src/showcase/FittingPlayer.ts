import type { CosmeticSlot } from '@/player/catalog';
import type { FittingPlayer, ReelOpening } from './ReelPlayer';
import type { ReelStyle } from './Take';

/**
 * Opens the Workshop's fitting room on `canvas` (v1.8.0): the scene of the
 * slot tried on, played by the game's own engine, in a worker where the
 * browser can hand it the canvas, in the page otherwise. Nothing of it is
 * loaded before the Workshop opens; the players it shares with the title's
 * reel come in lazily too, so the title screen keeps loading them in one go.
 */
export async function openFitting(
  canvas: HTMLCanvasElement,
  style: ReelStyle,
  slot: CosmeticSlot,
  showing: (index: number) => void,
): Promise<FittingPlayer> {
  const opening: ReelOpening = { style, slot, showing };
  const { pageHost, PageReel, startWorker, WorkerReel } = await import('./ReelPlayer');
  const worker =
    'transferControlToOffscreen' in canvas
      ? await startWorker(
          () => new Worker(new URL('./fittingWorker.ts', import.meta.url), { type: 'module' }),
        )
      : null;
  if (worker) return new WorkerReel(worker, canvas, opening);
  const [{ Reel }, { FITTINGS }] = await Promise.all([import('./Reel'), import('./fittings')]);
  const lineup = (tried: CosmeticSlot | undefined) => [FITTINGS[tried ?? slot]];
  return new PageReel(new Reel(canvas, style, pageHost(showing), lineup(slot)), lineup);
}
