import { MOMENTS } from './moments';
import { serveReel } from './reelServer';

/**
 * The title reel's worker (v1.8.0): it plays the moments on the canvas the
 * page handed it, so the page's main thread never runs the game for them.
 */
serveReel(() => MOMENTS);
