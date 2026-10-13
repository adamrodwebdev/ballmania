import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { SoundEngine } from '@/audio/SoundEngine';
import { CampaignMode } from '@/app/modes/CampaignModes';
import type { Game } from '@/engine/Game';
import { MAX_RANK, UPGRADE_IDS, type UpgradeRanks } from '@/engine/upgrades/Upgrades';
import { CAMPAIGN } from '@/levels/campaign';
import { frameFor } from '@/levels/tracks';
import { resolveLook } from '@/play/cosmetics/Look';
import { DistortionLayer } from '@/play/effects/DistortionLayer';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { Haptics } from '@/play/Haptics';
import type { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';

/** Frames per second of the trailer, and simulation steps per frame. */
const FPS = 30;
const STEPS = 2;
const DT = 1 / (FPS * STEPS);

/** A player who owns everything: every upgrade, the showiest cosmetics. */
const UPGRADES: UpgradeRanks = Object.fromEntries(UPGRADE_IDS.map((id) => [id, MAX_RANK]));
const LOOK = {
  shooter: 'shooter-crown',
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

/**
 * Plays like a sharp human, for the camera: it sweeps every angle, reads
 * the game's own preview of where the ball would land and what would burst,
 * aims a moment so the aim line shows, then fires.
 */
class CameraBot {
  private wait = 0.6;
  private aimed = false;

  step(game: Game, dt: number): void {
    if (game.state !== 'playing') return;
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
    let bestScore = -1;
    let bestAngle = game.shooter.angle;
    for (let i = 0; i < 360; i++) {
      const angle = (i / 360) * Math.PI * 2;
      game.shooter.aim(angle);
      const preview = game.preview();
      if (!preview) continue;
      // The group lists the balls already there: the shot ball makes one more.
      const bursts = preview.group.length > 0 ? preview.group.length + 1 : 0;
      const score = bursts >= 3 ? bursts + 2 * preview.reaction.length : 0.5;
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
    const definition = mode.definition(frameFor(this.width, this.height), {
      assisted: false,
      difficulty: 'explorer',
      upgrades: UPGRADES,
    });
    const session = new PlaySession({
      canvas,
      distortion: DistortionLayer.create(overlay),
      // For the camera: fewer colours and longer runs, so cascades come often.
      level: {
        ...definition,
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
    return { session, game, canvas, overlay, bot: new CameraBot() };
  }

  private static advance(take: Take): void {
    for (let i = 0; i < STEPS; i++) {
      take.bot.step(take.game, DT);
      take.session['frame'](DT);
    }
  }

  /**
   * Plays the shot once without filming, to find its moment: the seconds with
   * the most balls burst, or the end of a won game and its swallowing.
   */
  plan(shot: Shot, limit = 150): number {
    const take = this.take(shot);
    const energy: number[] = [];
    const end = { wonAt: null as number | null };
    let frame = 0;
    take.game.events.on('exploded', ({ balls, depth, by }) => {
      if (by === 'player') energy[frame] = (energy[frame] ?? 0) + balls.length * depth;
    });
    take.game.events.on('ended', ({ outcome }) => {
      if (outcome === 'won') end.wonAt = frame;
    });
    const length = Math.round(shot.seconds * FPS);
    for (; frame < limit * FPS; frame++) {
      Trailer.advance(take);
      if (take.game.state !== 'playing') break;
    }
    take.session.destroy();
    console.log(
      `${shot.level}: ${end.wonAt === null ? 'not won' : 'won'} after ${(frame / FPS).toFixed(1)} s`,
    );
    if (shot.moment === 'win' && end.wonAt !== null) {
      // The last shots, the final cascade and the board spinning into the hole,
      // cut before it is all gone: never a black screen.
      return Math.max(0, end.wonAt - length + Math.round(1.5 * FPS));
    }
    const last = frame - length - FPS;
    let best = 2 * FPS;
    let bestEnergy = -1;
    for (let start = 2 * FPS; start <= last; start++) {
      let sum = 0;
      for (let f = start; f < start + length; f++) sum += energy[f] ?? 0;
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
