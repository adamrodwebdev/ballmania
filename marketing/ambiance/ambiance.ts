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

  /**
   * The channel's picture or banner: a frame of the mood with the mark (a thin
   * ring of orbit round a point of light) and, on the banner, the name and the
   * line under it, inside the area YouTube shows on every screen.
   */
  async brand(options: {
    width: number;
    height: number;
    t: number;
    name: string;
    tagline: string;
    banner: boolean;
    file: string;
  }) {
    const { width, height, t, name, tagline, banner, file } = options;
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600&display=block';
    document.head.append(font);
    await new Promise((resolve) => font.addEventListener('load', resolve, { once: true }));
    await document.fonts.load('600 64px "Quicksand"');
    await document.fonts.load('400 32px "Quicksand"');
    const scene = new Scene({
      width,
      height,
      mood: this.need(this.mood),
      palette: Palette.fromStyle(getComputedStyle(document.documentElement)),
      seed: this.need(this.plan).seed,
    });
    scene.draw(t, this.need(this.director).frame(t), Math.round(t * FPS));
    scene.present();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(scene.canvas, 0, 0);
    scene.destroy();
    // A dark veil behind the mark and the words, so they read on any frame; on the round
    // picture, shown at 98 px, it hides almost everything but the light.
    const veil = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * (banner ? 0.42 : 0.62),
    );
    veil.addColorStop(0, banner ? 'rgba(2,10,24,0.55)' : 'rgba(2,12,26,0.82)');
    veil.addColorStop(1, banner ? 'rgba(2,10,24,0)' : 'rgba(2,12,26,0.35)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, height);
    if (!banner) {
      this.drawMark(ctx, width / 2, height / 2, width * 0.34);
    } else {
      // The safe area: 1546 × 423 of a 2560 × 1440 banner, the group centred in it.
      const safe = { width: (width * 1546) / 2560, height: (height * 423) / 1440 };
      let unit = safe.height;
      const words = (size: number) => {
        ctx.font = `600 ${Math.round(size * 0.36)}px "Quicksand"`;
        ctx.letterSpacing = `${Math.round(size * 0.03)}px`;
        const title = ctx.measureText(name.toUpperCase()).width;
        ctx.font = `400 ${Math.round(size * 0.11)}px "Quicksand"`;
        ctx.letterSpacing = `${Math.round(size * 0.01)}px`;
        const line = ctx.measureText(tagline).width;
        return size * 1.0 + size * 0.18 + Math.max(title, line);
      };
      while (words(unit) > safe.width * 0.94) unit *= 0.96;
      const group = words(unit);
      const left = width / 2 - group / 2;
      const markX = left + unit * 0.5;
      this.drawMark(ctx, markX, height / 2, unit * 0.42);
      const textX = left + unit * 1.18;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = unit * 0.06;
      ctx.fillStyle = 'rgba(236,252,255,0.96)';
      ctx.font = `600 ${Math.round(unit * 0.36)}px "Quicksand"`;
      ctx.letterSpacing = `${Math.round(unit * 0.03)}px`;
      ctx.fillText(name.toUpperCase(), textX, height / 2 - unit * 0.1);
      ctx.font = `400 ${Math.round(unit * 0.11)}px "Quicksand"`;
      ctx.letterSpacing = `${Math.round(unit * 0.01)}px`;
      ctx.fillStyle = 'rgba(200,240,245,0.88)';
      ctx.fillText(tagline, textX + unit * 0.01, height / 2 + unit * 0.24);
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No PNG'))), 'image/png'),
    );
    await put(file, blob, false);
  }

  /** The mark: a tilted ring of orbit, brighter in front, and its point of light. */
  private drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.38);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
    glow.addColorStop(0, 'rgba(210,255,250,0.95)');
    glow.addColorStop(0.25, 'rgba(120,240,230,0.55)');
    glow.addColorStop(1, 'rgba(60,200,210,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.045);
    ctx.shadowColor = 'rgba(120,255,240,0.9)';
    ctx.shadowBlur = r * 0.12;
    // The back of the ring, fainter, then the front, brighter.
    ctx.strokeStyle = 'rgba(180,250,245,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.34, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(225,255,252,0.95)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.34, 0, 0, Math.PI);
    ctx.stroke();
    // The moon on its orbit, front right.
    const a = 0.55;
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.shadowBlur = r * 0.2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.34, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
