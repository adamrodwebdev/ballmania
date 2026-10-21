import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { SoundEngine } from '@/audio/SoundEngine';
import { CampaignMode } from '@/app/modes/CampaignModes';
import type { Game } from '@/engine/Game';
import {
  MAX_RANK,
  UPGRADE_IDS,
  type UpgradeId,
  type UpgradeRanks,
} from '@/engine/upgrades/Upgrades';
import { CAMPAIGN } from '@/levels/campaign';
import { toLevelSetup } from '@/levels/LevelDefinition';
import { resolveLook } from '@/play/cosmetics/Look';
import { DistortionLayer } from '@/play/effects/DistortionLayer';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { Haptics } from '@/play/Haptics';
import type { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';
import { chooseFrame, contentBounds } from '@/play/BoardView';

/** Frames per second of the trailer, and simulation steps per frame. */
const FPS = 30;
const STEPS = 2;
const DT = 1 / (FPS * STEPS);

/**
 * A player who owns everything: every upgrade, the showiest cosmetics, and
 * the Star heart, the game's launcher and mascot (v1.7), as on the covers.
 * Except the two upgrades that hold the chain back (Shockwave, Chronos): with
 * a sharp player they keep the board nearly empty and the level never ends.
 */
const HELD_BACK: readonly UpgradeId[] = ['shockwave', 'chronos'];
const UPGRADES: UpgradeRanks = Object.fromEntries(
  UPGRADE_IDS.map((id) => [id, HELD_BACK.includes(id) ? 0 : MAX_RANK]),
);
const LOOK = {
  shooter: 'shooter-star',
  trail: 'trail-prism',
  burst: 'burst-stars',
  board: 'board-world',
} as const;

/** One cut of the trailer: a level, its best seconds, or the seconds around the win. */
export interface Shot {
  readonly level: string;
  readonly seed: string;
  readonly seconds: number;
  readonly moment: 'action' | 'win';
}

/** Share of its track the chain rushes in to at the start, for the camera (the game: 30 %). */
const RUSH = 0.5;
/** Share of its track the chain fills before the first shot, so the board looks full. */
const FILL = 0.45;
/** Seconds after which the camera's player shoots anyway. */
const FILL_SECONDS = 10;
/** Weight of each marble on the board in the choice of a cut, per frame. */
const FULLNESS = 0.01;

/**
 * Plays like a sharp human, for the camera: it lets the chain roll in, sweeps
 * every angle, reads the game's own preview of where the ball would land and
 * what would burst (a power-up marble first), aims a moment so the aim line
 * shows, then fires.
 */
class CameraBot {
  private wait = 0.6;
  private aimed = false;
  private elapsed = 0;
  private started: boolean;

  /** Patient: lets the chain fill the board first (action cuts; the win plays at once). */
  constructor(patient: boolean) {
    this.started = !patient;
  }

  step(game: Game, dt: number): void {
    if (game.state !== 'playing') return;
    this.elapsed += dt;
    if (!this.started) {
      this.started =
        this.elapsed >= FILL_SECONDS ||
        game.chains.some((chain) => chain.front >= chain.path.length * FILL);
      if (!this.started) return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    if (!this.aimed) {
      if (this.best(game) < 3) {
        game.swap();
        if (this.best(game) < 3) game.swap();
      }
      game.shooter.aim(this.angle);
      this.aimed = true;
      this.wait = 0.18;
      return;
    }
    if (game.fire()) {
      this.aimed = false;
      this.wait = 0.38;
    }
  }

  private angle = -Math.PI / 2;

  /** Aims at the best angle for the loaded ball; returns how many balls it bursts. */
  private best(game: Game): number {
    // The power-up marbles on the board (v1.7): bursting one shows what is new.
    const powers = game.chains.flatMap((chain) =>
      chain.balls
        .filter((ball) => ball.power !== null && ball.s >= 0)
        .map((ball) => chain.positionOf(ball)),
    );
    let bestScore = -1;
    let bestAngle = game.shooter.angle;
    for (let i = 0; i < 360; i++) {
      const angle = (i / 360) * Math.PI * 2;
      game.shooter.aim(angle);
      const preview = game.preview();
      if (!preview) continue;
      // The group lists the balls already there: the shot ball makes one more.
      const bursts = preview.group.length > 0 ? preview.group.length + 1 : 0;
      const power = preview.group.some((at) => powers.some((p) => p.distanceTo(at) < 1)) ? 6 : 0;
      const score = bursts >= 3 ? bursts + 2 * preview.reaction.length + power : 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
      }
    }
    this.angle = bestAngle;
    game.shooter.aim(bestAngle);
    return bestScore;
  }
}

interface Take {
  readonly session: PlaySession;
  readonly game: Game;
  readonly canvas: HTMLCanvasElement;
  readonly overlay: HTMLCanvasElement;
  readonly bot: CameraBot;
}

export class Trailer {
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly palette: Palette,
  ) {}

  /** A fresh game of the shot's level, always the same for the same seed. */
  private take(shot: Shot): Take {
    const level = CAMPAIGN.find((candidate) => candidate.id === shot.level);
    if (!level) throw new Error(`Unknown level ${shot.level}`);
    const canvas = document.createElement('canvas');
    const overlay = document.createElement('canvas');
    const mode = new CampaignMode({ kind: 'campaign', level });
    const play = { assisted: false, difficulty: 'explorer', upgrades: UPGRADES } as const;
    // The board shape that shows the level largest in the video's frame, as in the game.
    const frame = chooseFrame(
      (shape) => contentBounds(toLevelSetup(mode.definition(shape, play))),
      this.width,
      this.height,
    );
    const definition = mode.definition(frame, play);
    const longest = Math.max(...toLevelSetup(definition).chains.map((chain) => chain.path.length));
    const session = new PlaySession({
      canvas,
      distortion: DistortionLayer.create(overlay),
      // For the camera: fewer colours and longer runs, so cascades come often; in
      // the action cuts, the chain rolls in over half its track, so the board looks
      // full (the win keeps the game's own rush, or the level may not be won).
      level: {
        ...definition,
        ...(shot.moment === 'action'
          ? { rushDistance: Math.max(definition.rushDistance ?? 0, longest * RUSH) }
          : {}),
        chains: definition.chains.map((chain) => ({
          ...chain,
          tones: Math.min(chain.tones, 4),
          repeatChance: Math.max(chain.repeatChance, 0.5),
        })),
      },
      palette: this.palette,
      profile: EffectProfile.for('spectacular', false),
      feedback: { sound: new SoundEngine(0, () => null), haptics: new Haptics(false, null) },
      look: resolveLook(LOOK, level.world),
      seed: () => shot.seed,
      aimAssist: true,
    });
    session.resize(this.width, this.height, 1);
    // The session is driven frame by frame here, never by the screen's clock.
    const game = session['game'];
    return { session, game, canvas, overlay, bot: new CameraBot(shot.moment === 'action') };
  }

  private static advance(take: Take): void {
    for (let i = 0; i < STEPS; i++) {
      take.bot.step(take.game, DT);
      take.session['frame'](DT);
    }
  }

  /**
   * Plays the shot once without filming, to find its moment: the seconds with
   * the most balls burst, or the end of a won game and its supernova.
   */
  plan(shot: Shot, limit = shot.moment === 'win' ? 300 : 90): number {
    const take = this.take(shot);
    const energy: number[] = [];
    // How many marbles are on the board: a full board films better.
    const board: number[] = [];
    const end = { wonAt: null as number | null };
    let frame = 0;
    take.game.events.on('exploded', ({ balls, depth, by }) => {
      if (by === 'player') energy[frame] = (energy[frame] ?? 0) + balls.length * depth;
    });
    // A power set off (v1.7) is worth a big burst: the cut shows what is new.
    take.game.events.on('power', () => {
      energy[frame] = (energy[frame] ?? 0) + 30;
    });
    take.game.events.on('ended', ({ outcome }) => {
      if (outcome === 'won') end.wonAt = frame;
    });
    const length = Math.round(shot.seconds * FPS);
    for (; frame < limit * FPS; frame++) {
      Trailer.advance(take);
      let shown = 0;
      for (const chain of take.game.chains) {
        for (const ball of chain.balls) if (ball.s >= 0) shown++;
      }
      board[frame] = shown;
      if (take.game.state !== 'playing') break;
    }
    take.session.destroy();
    console.log(
      `${shot.level}: ${end.wonAt === null ? 'not won' : 'won'} after ${(frame / FPS).toFixed(1)} s`,
    );
    if (shot.moment === 'win' && end.wonAt !== null) {
      // The last shots, the final cascade, then the light running to the hole
      // and its supernova (effects/Victory), cut while its rings still shine.
      return Math.max(0, end.wonAt - length + Math.round(2.3 * FPS));
    }
    const last = frame - length - FPS;
    let best = 2 * FPS;
    let bestEnergy = -1;
    for (let start = 2 * FPS; start <= last; start++) {
      let sum = 0;
      for (let f = start; f < start + length; f++) {
        sum += (energy[f] ?? 0) + FULLNESS * (board[f] ?? 0);
      }
      if (sum > bestEnergy) {
        bestEnergy = sum;
        best = start;
      }
    }
    return best;
  }

  /** Films the shot from frame `start`, handing each frame to `film`. */
  shoot(shot: Shot, start: number, film: (frame: CanvasImageSource) => Promise<void>) {
    return (async () => {
      const take = this.take(shot);
      for (let frame = 0; frame < start; frame++) Trailer.advance(take);
      const screen = document.createElement('canvas');
      screen.width = this.width;
      screen.height = this.height;
      const ctx = screen.getContext('2d')!;
      for (let frame = 0; frame < Math.round(shot.seconds * FPS); frame++) {
        Trailer.advance(take);
        ctx.drawImage(take.canvas, 0, 0, this.width, this.height);
        // The shock waves are drawn by WebGL on a layer above the board.
        if (!take.overlay.hidden) ctx.drawImage(take.overlay, 0, 0, this.width, this.height);
        await film(screen);
      }
      take.session.destroy();
    })();
  }
}

/** H.264 in an MP4 file, frame by frame, at a fixed rate: no frame is ever dropped. */
export class Recorder {
  private readonly muxer: Muxer<ArrayBufferTarget>;
  private readonly encoder: VideoEncoder;
  private frames = 0;

  private constructor(width: number, height: number, codec: string) {
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: 'avc', width, height, frameRate: FPS },
      fastStart: 'in-memory',
    });
    this.encoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (error) => {
        throw error;
      },
    });
    this.encoder.configure({ codec, width, height, bitrate: 12_000_000, framerate: FPS });
  }

  static async create(width: number, height: number): Promise<Recorder> {
    for (const codec of ['avc1.640033', 'avc1.640028', 'avc1.4d0033']) {
      const { supported } = await VideoEncoder.isConfigSupported({ codec, width, height });
      if (supported) return new Recorder(width, height, codec);
    }
    throw new Error('No H.264 encoder in this browser');
  }

  async add(image: CanvasImageSource): Promise<void> {
    const frame = new VideoFrame(image, {
      timestamp: Math.round((this.frames * 1e6) / FPS),
      duration: Math.round(1e6 / FPS),
    });
    this.encoder.encode(frame, { keyFrame: this.frames % (FPS * 2) === 0 });
    frame.close();
    this.frames++;
    while (this.encoder.encodeQueueSize > 8) await new Promise((resolve) => setTimeout(resolve, 1));
  }

  /** Holds a still image for `seconds`. */
  async hold(image: CanvasImageSource, seconds: number): Promise<void> {
    for (let i = 0; i < Math.round(seconds * FPS); i++) await this.add(image);
  }

  async finish(): Promise<ArrayBuffer> {
    await this.encoder.flush();
    this.muxer.finalize();
    return this.muxer.target.buffer;
  }
}
