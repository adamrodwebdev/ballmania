import type { Game } from '@/engine/Game';
import type { PlaySession } from '@/play/PlaySession';

/**
 * Where a moment of the title's reel plays (v1.8.0): a game, and a player's
 * commands. The scripted hand knows only this, not the screen it plays on.
 */
export interface Stage {
  /** For the hand to plan its shots: read only. */
  readonly game: Game;
  aim(angle: number): void;
  fire(): void;
  /** Pulls the ball the aim meets out of its chain (Abyss world). */
  pull(): void;
  /** Swaps the loaded ball with the next one. */
  swap(): void;
  /** Flips the next switch the chain has not reached (Volcano world). */
  flip(): void;
  /** Moves on by `dt` seconds, and draws the frame if it is `shown`. */
  advance(dt: number, shown: boolean): void;
}

/** A play session: the game with its own renderer and effects, as the reel shows it. */
export class SessionStage implements Stage {
  constructor(private readonly session: PlaySession) {}

  get game(): Game {
    return this.session.playing;
  }

  aim(angle: number): void {
    this.session.aimAngle(angle);
  }

  fire(): void {
    this.session.fire();
  }

  pull(): void {
    this.session.toggleMagnet();
    this.session.fire();
  }

  swap(): void {
    this.session.swap();
  }

  flip(): void {
    this.session.flipNextSwitch();
  }

  advance(dt: number, shown: boolean): void {
    this.session.advance(dt, shown);
  }
}
