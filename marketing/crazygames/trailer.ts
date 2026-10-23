import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { FRAMES, type Frame } from '@/levels/tracks';
import { DistortionLayer } from '@/play/effects/DistortionLayer';
import type { Palette } from '@/play/Palette';
import { MOMENTS } from '@/showcase/moments';
import { REEL_FPS } from '@/showcase/MomentRun';
import { Take, type ReelStyle } from '@/showcase/Take';
import { COVER_SECONDS, CROSSFADE, type Cut } from './cuts';

/** Frames per second of the trailer: the reel's own, so its moments play as on the title screen. */
const FPS = REEL_FPS;

/**
 * What the trailer's player wears: the Star heart, the game's launcher and
 * mascot (v1.7), with the showiest trail and bursts, as on the covers.
 */
const EQUIPPED = {
  shooter: 'shooter-star',
  trail: 'trail-prism',
  burst: 'burst-stars',
  board: 'board-world',
} as const;

/** A part of the trailer: the still cover, or a cut being filmed. */
interface Clip {
  /** Frames it has left to show. */
  readonly left: number;
  /** Draws its next frame over what is there, at `alpha`. */
  draw(ctx: CanvasRenderingContext2D, alpha: number): void;
  end(): void;
}

/** The cover, held still. */
class Still implements Clip {
  constructor(
    private readonly image: CanvasImageSource,
    private remaining: number,
  ) {}

  get left(): number {
    return this.remaining;
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.image, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;
    this.remaining--;
  }

  end(): void {}
}

/** A cut: a moment of the reel, played on as it is filmed. */
class Shot implements Clip {
  constructor(
    private readonly take: Take,
    /** The layer the shock waves bend the picture on, with WebGL, above the board. */
    private readonly overlay: HTMLCanvasElement,
    private remaining: number,
  ) {}

  get left(): number {
    return this.remaining;
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.take.run.step();
    const { width, height } = ctx.canvas;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.take.canvas, 0, 0, width, height);
    if (!this.overlay.hidden) ctx.drawImage(this.overlay, 0, 0, width, height);
    ctx.globalAlpha = 1;
    this.remaining--;
  }

  end(): void {
    this.take.destroy();
  }
}

/**
 * The portal trailers (v1.8.0): after the cover, the title reel's own
 * moments, filmed one after the other at the video's size, each fading into
 * the next. The game's engine and renderer play them frame by frame: the
 * same scenes as on the title screen, the same every time.
 */
export class Trailer {
  private readonly style: ReelStyle;

  constructor(
    private readonly width: number,
    private readonly height: number,
    palette: Palette,
  ) {
    this.style = {
      palettes: { day: palette, night: palette },
      equipped: EQUIPPED,
      effects: 'spectacular',
      still: false,
    };
  }

  /** The board's shape: the reel's wide one, or a phone's tall one in a portrait video. */
  private get frame(): Frame {
    return this.width >= this.height ? FRAMES.wide : FRAMES.tall;
  }

  /** Films the cover, then the cuts, handing each frame of the video to `record`. */
  async shoot(
    cover: CanvasImageSource,
    cuts: readonly Cut[],
    record: (frame: CanvasImageSource) => Promise<void>,
  ): Promise<void> {
    const screen = document.createElement('canvas');
    screen.width = this.width;
    screen.height = this.height;
    const ctx = screen.getContext('2d')!;
    const fade = Math.round(CROSSFADE * FPS);
    let current: Clip = new Still(cover, Math.round(COVER_SECONDS * FPS));
    for (const cut of cuts) {
      while (current.left > fade) {
        current.draw(ctx, 1);
        await record(screen);
      }
      // The next cut fades in over the end of this one.
      const next = this.shot(cut);
      for (let frame = 1; frame <= fade; frame++) {
        current.draw(ctx, 1);
        next.draw(ctx, frame / fade);
        await record(screen);
      }
      current.end();
      current = next;
    }
    while (current.left > 0) {
      current.draw(ctx, 1);
      await record(screen);
    }
    current.end();
  }

  /** A cut's moment, its chain settled, on canvases of the video's size. */
  private shot(cut: Cut): Shot {
    const moment = MOMENTS.find((candidate) => candidate.id === cut.moment);
    if (!moment) throw new Error(`Unknown moment ${cut.moment}`);
    const overlay = document.createElement('canvas');
    const take = new Take({
      moment,
      canvas: document.createElement('canvas'),
      style: this.style,
      frame: this.frame,
      distortion: DistortionLayer.create(overlay),
    });
    take.resize(this.width, this.height, 1);
    take.run.settle();
    return new Shot(take, overlay, Math.round(cut.seconds * FPS));
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

  async finish(): Promise<ArrayBuffer> {
    await this.encoder.flush();
    this.muxer.finalize();
    return this.muxer.target.buffer;
  }
}
