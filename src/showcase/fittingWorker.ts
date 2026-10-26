import { FITTINGS } from './fittings';
import { serveReel } from './reelServer';

/**
 * The Workshop fitting room's worker (v1.8.0): the scene of the slot tried
 * on, in a loop, on the canvas the page handed it. Loaded only once the
 * Workshop opens.
 */
serveReel((slot) => [FITTINGS[slot ?? 'shooter']]);
