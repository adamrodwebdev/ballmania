import type { GameReport } from '@/engine/Game';
import { DUEL_DIFFICULTIES, duelLevel, type DuelDifficulty } from '@/levels/arcade/duel';
import { endlessLevel } from '@/levels/arcade/endless';
import { findMode, type ArcadeModeId } from '@/levels/arcade/modes';
import { PUZZLES, puzzleLevel, puzzleStars, type Puzzle } from '@/levels/arcade/puzzles';
import { rhythmLevel, SONGS, type Song } from '@/levels/arcade/rhythm';
import { CAMPAIGN } from '@/levels/campaign';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import type { Frame } from '@/levels/tracks';
import { REWARDS } from '@/player/rewards';
import type { AppServices } from '../AppServices';
import type { PlayRequest } from '../PlayRequest';
import type { Message, PlayMode, Settlement } from './PlayMode';

const ORDER = CAMPAIGN.map((level) => level.id);

/** What every Arcade mode shares: its backdrop, its hint, no assistance, back to the Arcade. */
abstract class ArcadeMode implements PlayMode {
  readonly home = 'arcade';
  readonly alchemy = false;
  readonly seed: string | null = null;
  readonly continuable: boolean = false;
  /** No points toward stars in the Arcade: records, stages, wins, or shots for puzzles. */
  readonly stars = null;
  /** No Colossus in the Arcade. */
  readonly boss = null;

  protected constructor(
    readonly request: PlayRequest,
    private readonly mode: ArcadeModeId,
  ) {}

  get world() {
    return findMode(this.mode).world;
  }

  get hint() {
    return this.mode;
  }

  abstract readonly label: Message;
  abstract outcome(won: boolean): Message;
  abstract definition(frame: Frame): LevelDefinition;
  abstract settle(report: GameReport, services: AppServices): Settlement;

  next(_services: AppServices): { readonly request: PlayRequest; readonly label: Message } | null {
    return null;
  }

  /** Pays a game of the Arcade into the player's profile. */
  protected pay(
    report: GameReport,
    services: AppServices,
    extra: { shards: number; puzzleSolved?: boolean; duelWon?: DuelDifficulty; stars?: number },
  ) {
    return services.player.recordGame(report, {
      kind: 'arcade',
      levelId: this.mode,
      stars: extra.stars ?? 0,
      starsGained: 0,
      threeStarLevels: services.progress.threeStarCount(ORDER),
      shards: extra.shards,
      ...(extra.puzzleSolved ? { puzzleSolved: true } : {}),
      ...(extra.duelWon ? { duelWon: extra.duelWon } : {}),
    });
  }
}

/** Endless: as long as possible; the best score is the record. */
export class EndlessMode extends ArcadeMode {
  readonly label: Message = { key: 'arcade.endless.name' };
  override readonly continuable = true;

  constructor(request: Extract<PlayRequest, { kind: 'endless' }>) {
    super(request, 'endless');
  }

  outcome(): Message {
    return { key: 'arcade.endless.over' };
  }

  definition(frame: Frame): LevelDefinition {
    return endlessLevel(frame);
  }

  settle(report: GameReport, services: AppServices): Settlement {
    const record = services.arcade.recordEndless(report.score);
    const shards = Math.min(
      REWARDS.endlessMax,
      Math.floor(report.score / 1000) * REWARDS.endlessPerThousand,
    );
    return {
      stars: null,
      record: { value: record.best, newBest: record.newBest, unit: 'score' },
      rewards: this.pay(report, services, { shards }),
    };
  }
}

/** A puzzle: stars for few shots; the next puzzle opens once it is solved. */
export class PuzzleMode extends ArcadeMode {
  private readonly puzzle: Puzzle;

  constructor(override readonly request: Extract<PlayRequest, { kind: 'puzzle' }>) {
    super(request, 'puzzle');
    this.puzzle = request.puzzle;
  }

  get label(): Message {
    return this.request.day
      ? { key: 'arcade.puzzle.daily' }
      : { key: 'arcade.puzzle.short', params: { number: this.puzzle.number } };
  }

  outcome(won: boolean): Message {
    return { key: won ? 'arcade.puzzle.solved' : 'arcade.puzzle.failed' };
  }

  definition(frame: Frame): LevelDefinition {
    return puzzleLevel(this.puzzle, frame);
  }

  settle(report: GameReport, services: AppServices): Settlement {
    const won = report.outcome === 'won';
    const stars = puzzleStars(this.puzzle, report.shots, won);
    let shards = 0;
    let firstSolve = false;
    if (this.request.day) {
      const first = services.arcade.recordDailyPuzzle(this.request.day, won, report.shots);
      if (first && won) shards = REWARDS.dailyPuzzleSolved;
    } else if (won) {
      firstSolve = services.arcade.recordPuzzle(this.puzzle.id, stars, report.shots);
      if (firstSolve) shards = REWARDS.puzzleSolved + REWARDS.puzzlePerStar * stars;
    }
    return {
      stars: won ? stars : null,
      record: null,
      rewards: this.pay(report, services, { shards, stars, puzzleSolved: firstSolve }),
    };
  }

  override next(services: AppServices) {
    if (this.request.day) return null;
    const following = PUZZLES[this.puzzle.number];
    const ids = PUZZLES.map((puzzle) => puzzle.id);
    if (!following || !services.arcade.isPuzzleOpen(ids, following.id)) return null;
    return {
      request: { kind: 'puzzle', puzzle: following } as const,
      label: { key: 'arcade.puzzle.next' },
    };
  }
}

/** Rhythm: clear the track on the beat; the best score of each song is kept. */
export class RhythmMode extends ArcadeMode {
  private readonly song: Song;

  constructor(override readonly request: Extract<PlayRequest, { kind: 'rhythm' }>) {
    super(request, 'rhythm');
    this.song = request.song;
  }

  get label(): Message {
    return { key: `arcade.rhythm.songs.${this.song.id}` };
  }

  outcome(won: boolean): Message {
    return { key: won ? 'game.won' : 'game.lost' };
  }

  definition(frame: Frame): LevelDefinition {
    return rhythmLevel(this.song, frame);
  }

  settle(report: GameReport, services: AppServices): Settlement {
    const won = report.outcome === 'won';
    const record = won ? services.arcade.recordSong(this.song.id, report.score) : null;
    return {
      stars: null,
      record: record && { value: record.best, newBest: record.newBest, unit: 'score' },
      rewards: this.pay(report, services, { shards: won ? REWARDS.songCleared : 0 }),
    };
  }

  override next() {
    const following = SONGS[SONGS.indexOf(this.song) + 1];
    return following
      ? {
          request: { kind: 'rhythm', song: following } as const,
          label: { key: 'arcade.rhythm.next' },
        }
      : null;
  }
}

/** Duel: a tug of war against the computer; wins are counted by difficulty. */
export class DuelMode extends ArcadeMode {
  private readonly difficulty: DuelDifficulty;

  constructor(override readonly request: Extract<PlayRequest, { kind: 'duel' }>) {
    super(request, 'duel');
    this.difficulty = request.difficulty;
  }

  get label(): Message {
    return { key: `arcade.duel.levels.${this.difficulty}` };
  }

  outcome(won: boolean): Message {
    return { key: won ? 'arcade.duel.won' : 'arcade.duel.lost' };
  }

  definition(frame: Frame): LevelDefinition {
    return duelLevel(this.difficulty, frame);
  }

  settle(report: GameReport, services: AppServices): Settlement {
    const won = report.outcome === 'won';
    const wins = won
      ? services.arcade.recordDuel(this.difficulty)
      : services.arcade.duelsWon(this.difficulty);
    return {
      stars: null,
      record: { value: wins, newBest: false, unit: 'wins' },
      rewards: this.pay(report, services, {
        shards: won ? REWARDS.duelWon[this.difficulty] : 0,
        ...(won ? { duelWon: this.difficulty } : {}),
      }),
    };
  }

  override next() {
    const following = DUEL_DIFFICULTIES[DUEL_DIFFICULTIES.indexOf(this.difficulty) + 1];
    return following
      ? {
          request: { kind: 'duel', difficulty: following } as const,
          label: { key: 'arcade.duel.harder' },
        }
      : null;
  }
}
