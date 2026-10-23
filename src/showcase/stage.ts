import type { Game } from '@/engine/Game';
import type { PlaySession } from '@/play/PlaySession';

/**
 * Where a moment of the title's reel plays (v1.8.0): a game, and a player's
 * commands. A play session on a canvas in the reel; a bare game, without a
 * screen, in the tests that time each moment's peak.
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
  /** Moves on by `dt` seconds (and draws, on a screen). */
  advance(dt: number): void;
}

/** A play session: what the reel shows, with the game's own feedback. */
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

  advance(dt: number): void {
    this.session.advance(dt);
  }
}

/** A bare game: the same moment, without a screen (tests). */
export class GameStage implements Stage {
  constructor(readonly game: Game) {}

  aim(angle: number): void {
    this.game.shooter.aim(angle);
  }

  fire(): void {
    this.game.fire();
  }

  pull(): void {
    this.game.pull();
  }

  swap(): void {
    this.game.swap();
  }

  flip(): void {
    const next = this.game.switches().find((view) => !view.locked);
    if (next) this.game.toggleSwitch(next.chain, next.fork);
  }

  advance(dt: number): void {
    this.game.update(dt);
  }
}
