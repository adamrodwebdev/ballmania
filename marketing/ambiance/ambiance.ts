import { THEMES } from '@/audio/score';
import { Palette } from '@/play/Palette';
import { AmbientVoices } from './AmbientVoices';
import { Composer, type Plan } from './Composer';
import { Director } from './Direction';
import { FlashWatch, type FlashReport } from './FlashWatch';
import { Mood } from './Mood';
import moods from './moods.json';
import { Scene } from './Scene';
import { allNotes, serialize } from './Score';

/**
 * The ambience factory's page (specification § 3.18), driven by `render.mjs`:
 * it plans the music, renders each section's sound, draws and encodes the
 * frames, and sends every file to the factory over `/__ambiance/put`.
 * Nothing here ships with the game.
 */

export const FPS = 30;
/** A key frame every two seconds, as YouTube asks. */
const KEY_EVERY = 2 * FPS;
/** Bytes gathered before they are sent: a few megabytes per request. */
const BATCH = 4 * 1024 * 1024;

const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');

const digest = async (data: BufferSource) => hex(await crypto.subtle.digest('SHA-256', data));

const put = async (file: string, body: BufferSource | Blob, append = true) => {
  const response = await fetch(
    `/__ambiance/put?file=${encodeURIComponent(file)}&append=${append ? 1 : 0}`,
    {
      method: 'POST',
      body,
    },
  );
  if (!response.ok) throw new Error(`Could not send ${file}: ${response.status}`);
};

interface Setup {
  readonly mood: string;
  readonly seconds: number;
  readonly seed: number;
}

interface VideoJob {
  readonly scene: Scene;
  readonly encoder: VideoEncoder | null;
  readonly file: string;
  readonly watch: FlashWatch;
  readonly pending: Uint8Array[];
  pendingBytes: number;
  sent: Promise<void>;
  failure: Error | null;
}

export interface FramesRequest {
  readonly video: string;
  /** Index of the first frame of the batch, in the output. */
  readonly from: number;
  readonly count: number;
  /** Seconds of the source at output frame 0. */
  readonly offset: number;
  /** A looping Short: its length and the seconds of its seam (its end fades into its start). */
  readonly loop: { readonly seconds: number; readonly fade: number } | null;
  /** Take a fingerprint every this many frames (0: none). */
  readonly fingerprintEvery: number;
}

export interface FramesResult {
  readonly fingerprints: readonly { readonly frame: number; readonly hash: string }[];
  readonly milliseconds: number;
}

class Factory {
  private mood: Mood | null = null;
  private plan: Plan | null = null;
  private director: Director | null = null;
  private voices: AmbientVoices | null = null;
  private readonly videos = new Map<string, VideoJob>();

  setup({ mood: id, seconds, seed }: Setup) {
    const mood = Mood.parseAll(moods).find((m) => m.id === id);
    if (!mood) throw new Error(`Unknown mood "${id}"`);
    const plan = new Composer(mood).plan(seconds, seed);
    const notes = allNotes(plan);
    this.mood = mood;
    this.plan = plan;
    this.director = new Director(plan, mood, notes);
    this.voices = new AmbientVoices(plan, mood, THEMES[mood.theme].pad.wave);
    return { mood, plan, notes: serialize(notes) };
  }

  /** Renders a section's sound; sends it (left then right, 32-bit) unless only checking. */
  async audio(index: number, send: boolean) {
    const rendered = await this.need(this.voices).render(index);
    const bytes = new Uint8Array(rendered.left.length * 8);
    bytes.set(new Uint8Array(rendered.left.buffer), 0);
    bytes.set(new Uint8Array(rendered.right.buffer), rendered.left.length * 4);
    const hash = await digest(bytes);
    if (send) {
      for (let at = 0; at < bytes.length; at += BATCH) {
        await put(`pcm-${index}.f32`, bytes.subarray(at, at + BATCH), at > 0);
      }
    }
    return { index, start: rendered.start, samples: rendered.left.length, hash };
  }

  /** Opens a video: its scene and, unless only probing, its H.264 encoder. */
  async openVideo(name: string, width: number, height: number, encode: boolean) {
    const mood = this.need(this.mood);
    const scene = new Scene({
      width,
      height,
      mood,
      palette: Palette.fromStyle(getComputedStyle(document.documentElement)),
      seed: this.need(this.plan).seed,
    });
    const job: VideoJob = {
      scene,
      encoder: null,
      file: `${name}.h264`,
      watch: new FlashWatch(),
      pending: [],
      pendingBytes: 0,
      sent: Promise.resolve(),
      failure: null,
    };
    if (encode) {
      const config = await this.encoderConfig(width, height);
      const encoder = new VideoEncoder({
        output: (chunk) => {
          const data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          job.pending.push(data);
          job.pendingBytes += data.length;
          if (job.pendingBytes >= BATCH) this.send(job);
        },
        error: (error) => {
          job.failure = error;
        },
      });
      encoder.configure(config);
      (job as { encoder: VideoEncoder | null }).encoder = encoder;
    }
    this.videos.set(name, job);
    return { renderer: this.renderer(scene) };
  }

  async frames(request: FramesRequest): Promise<FramesResult> {
    const job = this.videos.get(request.video);
    if (!job) throw new Error(`No video "${request.video}"`);
    const director = this.need(this.director);
    const begun = performance.now();
    const fingerprints: { frame: number; hash: string }[] = [];
    for (let i = request.from; i < request.from + request.count; i++) {
      if (job.failure) throw job.failure;
      const u = i / FPS;
      const t = request.offset + u;
      const loop = request.loop;
      if (loop && u < loop.fade) {
        // The seam of a looping Short: its last seconds fade into its first.
        const later = t + loop.seconds;
        job.scene.draw(later, director.frame(later), i);
        job.scene.hold();
        job.scene.draw(t, director.frame(t), i);
        job.scene.presentMixed(1 - u / loop.fade);
      } else {
        job.scene.draw(t, director.frame(t), i);
        job.scene.present();
      }
      if (i % 6 === 0) {
        const { mean, cells } = job.scene.luminance();
        job.watch.push(u, mean, cells);
      }
      if (request.fingerprintEvery > 0 && i % request.fingerprintEvery === 0) {
        fingerprints.push({ frame: i, hash: (await digest(job.scene.pixels())).slice(0, 16) });
      }
      if (job.encoder) {
        while (job.encoder.encodeQueueSize > 6) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
        const frame = new VideoFrame(job.scene.canvas, {
          timestamp: Math.round((i * 1_000_000) / FPS),
          duration: Math.round(1_000_000 / FPS),
        });
        job.encoder.encode(frame, { keyFrame: i % KEY_EVERY === 0 });
        frame.close();
      }
    }
    return { fingerprints, milliseconds: performance.now() - begun };
  }

  /** Ends a video: flushes the encoder, sends what is left, and reports its flashes. */
  async closeVideo(name: string): Promise<FlashReport> {
    const job = this.videos.get(name);
    if (!job) throw new Error(`No video "${name}"`);
    if (job.encoder) {
      await job.encoder.flush();
      job.encoder.close();
    }
    this.send(job);
    await job.sent;
    job.scene.destroy();
    this.videos.delete(name);
    return job.watch.report();
  }

  /**
   * The loop of a Short: among `lengths` and `fades`, the one that changes
   * the picture least over the whole looping Short, its seam included,
   * measured as the flash check will measure it.
   * A cross-fade mixes the finished frames linearly, so the luminance of each
   * zone of the mix is the mix of the two zones' luminances.
   */
  loopPlan(
    size: { width: number; height: number },
    start: number,
    lengths: readonly number[],
    fades: readonly number[],
  ): { length: number; fade: number; worst: number } {
    const scene = new Scene({
      ...size,
      mood: this.need(this.mood),
      palette: Palette.fromStyle(getComputedStyle(document.documentElement)),
      seed: this.need(this.plan).seed,
    });
    const director = this.need(this.director);
    const cells = (t: number) => {
      scene.draw(t, director.frame(t), Math.round(t * FPS));
      scene.present();
      return Array.from(scene.luminance().cells);
    };
    const STEP = 0.2;
    const longest = Math.max(...fades);
    const steps = Math.round((longest + 1) / STEP);
    // The whole Short from its start: shared by every candidate. The Shorts are framed
    // upright, so their zones differ from the video's: every second of them is checked.
    const head = Array.from({ length: Math.ceil(Math.max(...lengths) / STEP) + 1 }, (_, i) =>
      cells(start + i * STEP),
    );
    let best = { length: lengths[0]!, fade: fades[0]!, worst: Infinity };
    for (const length of lengths) {
      // The end of the Short, one second before the loop point, then on under the seam.
      const tail = Array.from({ length: steps + 6 }, (_, i) =>
        cells(start + length + (i - 5) * STEP),
      );
      for (const fade of fades) {
        const watch = new FlashWatch();
        for (let i = -5; i * STEP < length; i++) {
          const u = i * STEP;
          const end = u <= fade ? tail[i + 5] : undefined;
          const begin = head[Math.max(0, i)]!;
          const w = u < 0 ? 0 : Math.min(1, u / fade);
          const mixed =
            end && w < 1 ? begin.map((value, k) => value * w + end[k]! * (1 - w)) : begin;
          watch.push(u, mixed.reduce((sum, v) => sum + v, 0) / mixed.length, mixed);
        }
        const report = watch.report();
        const worst = Math.max(report.frame, report.zone);
        if (worst < best.worst) best = { length, fade, worst };
      }
    }
    scene.destroy();
    return best;
  }

  /** The thumbnail: one frame as a JPEG. */
  async thumbnail(t: number, width: number, height: number, file: string) {
    const scene = new Scene({
      width,
      height,
      mood: this.need(this.mood),
      palette: Palette.fromStyle(getComputedStyle(document.documentElement)),
      seed: this.need(this.plan).seed,
    });
    scene.draw(t, this.need(this.director).frame(t), Math.round(t * FPS));
    scene.present();
    const blob = await new Promise<Blob>((resolve, reject) =>
      scene.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('No JPEG'))),
        'image/jpeg',
        0.92,
      ),
    );
    scene.destroy();
    await put(file, blob, false);
  }

  private send(job: VideoJob): void {
    if (!job.pendingBytes) return;
    const body = new Uint8Array(job.pendingBytes);
    let at = 0;
    for (const part of job.pending) {
      body.set(part, at);
      at += part.length;
    }
    job.pending.length = 0;
    job.pendingBytes = 0;
    job.sent = job.sent.then(() => put(job.file, body, true));
  }

  private async encoderConfig(width: number, height: number): Promise<VideoEncoderConfig> {
    const bitrate = Math.round(12_000_000 * Math.min(1, (width * height) / (1920 * 1080)));
    for (const codec of ['avc1.640028', 'avc1.640033', 'avc1.4d0028']) {
      for (const hardwareAcceleration of ['prefer-hardware', 'no-preference'] as const) {
        const config: VideoEncoderConfig = {
          codec,
          width,
          height,
          bitrate,
          bitrateMode: 'variable',
          framerate: FPS,
          latencyMode: 'quality',
          hardwareAcceleration,
          avc: { format: 'annexb' },
        };
        const { supported } = await VideoEncoder.isConfigSupported(config);
        if (supported) return config;
      }
    }
    throw new Error(`No H.264 encoder for ${width}×${height}`);
  }

  private renderer(scene: Scene): string {
    const gl = scene.canvas.getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  }

  private need<T>(value: T | null): T {
    if (value === null) throw new Error('Call setup() first');
    return value;
  }
}

declare global {
  interface Window {
    ambiance: Factory;
  }
}

window.ambiance = new Factory();
document.body.dataset.ready = 'true';
