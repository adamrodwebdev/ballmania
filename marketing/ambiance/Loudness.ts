/**
 * The sound checks of the ambience factory (specification § 3.18), on raw
 * 32-bit stereo samples at 48 kHz, chunk by chunk so an hour never sits in
 * memory: loudness after ITU-R BS.1770-4 (integrated, range, highest
 * momentary), true peak oversampled four times, a look-ahead limiter, and
 * detectors of clicks and of digital silence. Pure.
 */

export const SAMPLE_RATE = 48_000;

const dB = (power: number) => (power > 0 ? 10 * Math.log10(power) : -Infinity);
export const fromDecibels = (decibels: number) => 10 ** (decibels / 20);
export const toDecibels = (linear: number) => (linear > 0 ? 20 * Math.log10(linear) : -Infinity);

/** A second-order filter, direct form I, with its state. */
class Biquad {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    private readonly b: readonly [number, number, number],
    private readonly a: readonly [number, number],
  ) {}

  /** A high-pass filter (Butterworth) at `frequency`. */
  static highPass(frequency: number, rate = SAMPLE_RATE): Biquad {
    const w = (2 * Math.PI * frequency) / rate;
    const alpha = Math.sin(w) / Math.SQRT2;
    const cos = Math.cos(w);
    const a0 = 1 + alpha;
    return new Biquad(
      [(1 + cos) / 2 / a0, -(1 + cos) / a0, (1 + cos) / 2 / a0],
      [(-2 * cos) / a0, (1 - alpha) / a0],
    );
  }

  step(x: number): number {
    const y =
      this.b[0] * x +
      this.b[1] * this.x1 +
      this.b[2] * this.x2 -
      this.a[0] * this.y1 -
      this.a[1] * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** The K-weighting of BS.1770 at 48 kHz: a high shelf, then a high-pass. */
class KWeighting {
  private readonly shelf = new Biquad(
    [1.53512485958697, -2.69169618940638, 1.19839281085285],
    [-1.69065929318241, 0.73248077421585],
  );
  private readonly pass = new Biquad([1, -2, 1], [-1.99004745483398, 0.99007225036621]);

  step(x: number): number {
    return this.pass.step(this.shelf.step(x));
  }
}

/** 100 ms of samples: the hop of the 400 ms blocks and of the 3 s windows. */
const HOP = SAMPLE_RATE / 10;

export interface LoudnessReading {
  /** Integrated loudness, LUFS (gated). */
  readonly integrated: number;
  /** Loudness range, LU (EBU Tech 3342). */
  readonly range: number;
  /** The loudest 400 ms block, LUFS. */
  readonly momentaryMax: number;
}

/** BS.1770-4 loudness of a stereo signal, fed chunk by chunk. */
export class LoudnessMeter {
  private readonly left = new KWeighting();
  private readonly right = new KWeighting();
  private hopSum = 0;
  private hopCount = 0;
  /** Mean square of each 100 ms hop (both channels summed). */
  private readonly hops: number[] = [];

  push(left: Float32Array, right: Float32Array): void {
    for (let i = 0; i < left.length; i++) {
      const l = this.left.step(left[i]!);
      const r = this.right.step(right[i]!);
      this.hopSum += l * l + r * r;
      if (++this.hopCount === HOP) {
        this.hops.push(this.hopSum / HOP);
        this.hopSum = 0;
        this.hopCount = 0;
      }
    }
  }

  reading(): LoudnessReading {
    const blocks = this.windows(4);
    const integrated = gatedLoudness(blocks, -10);
    const shortTerm = this.windows(30).filter((power) => dB(power) - 0.691 > -70);
    const relative = mean(shortTerm);
    const kept = shortTerm
      .filter((power) => dB(power) - 0.691 > dB(relative) - 0.691 - 20)
      .map((power) => dB(power) - 0.691)
      .sort((a, b) => a - b);
    const range = kept.length > 1 ? quantile(kept, 0.95) - quantile(kept, 0.1) : 0;
    const momentaryMax = blocks.reduce((max, power) => Math.max(max, dB(power) - 0.691), -Infinity);
    return { integrated, range, momentaryMax };
  }

  /** Mean power of windows of `size` hops, one per hop. */
  private windows(size: number): number[] {
    const out: number[] = [];
    let sum = 0;
    this.hops.forEach((hop, i) => {
      sum += hop;
      if (i >= size) sum -= this.hops[i - size]!;
      if (i >= size - 1) out.push(sum / size);
    });
    return out;
  }
}

const mean = (values: readonly number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const quantile = (sorted: readonly number[], q: number) => {
  const at = (sorted.length - 1) * q;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (at - low);
};

/** The gated loudness of 400 ms blocks: absolute gate −70 LUFS, then `relative` LU. */
function gatedLoudness(blocks: readonly number[], relative: number): number {
  const loud = (power: number) => dB(power) - 0.691;
  const above = blocks.filter((power) => loud(power) > -70);
  if (!above.length) return -Infinity;
  const gate = loud(mean(above)) + relative;
  return loud(mean(above.filter((power) => loud(power) > gate)));
}

/** Taps of the 4× interpolator: a Kaiser-windowed sinc, 12 taps per phase. */
const PHASES = 4;
const TAPS = 12;
const INTERPOLATOR: readonly (readonly number[])[] = (() => {
  const bessel = (x: number) => {
    let sum = 1;
    let term = 1;
    for (let k = 1; k < 30; k++) {
      term *= (x / (2 * k)) ** 2;
      sum += term;
    }
    return sum;
  };
  const beta = 6;
  const length = PHASES * TAPS;
  const centre = (length - 1) / 2;
  const phases: number[][] = Array.from({ length: PHASES }, () => []);
  for (let n = 0; n < length; n++) {
    const x = (n - centre) / PHASES;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const ratio = (n - centre) / centre;
    const window = bessel(beta * Math.sqrt(Math.max(0, 1 - ratio * ratio))) / bessel(beta);
    phases[n % PHASES]!.push(sinc * window);
  }
  return phases;
})();

/** The true peak of one channel: the highest absolute value, oversampled four times. */
export class TruePeak {
  private readonly history = new Float64Array(TAPS);
  private at = 0;
  private peak = 0;

  /** The true peak around this sample (the highest of its four interpolated points). */
  step(x: number): number {
    this.history[this.at] = x;
    this.at = (this.at + 1) % TAPS;
    let local = 0;
    for (const taps of INTERPOLATOR) {
      let y = 0;
      for (let k = 0; k < TAPS; k++) y += taps[k]! * this.history[(this.at + k) % TAPS]!;
      local = Math.max(local, Math.abs(y));
    }
    this.peak = Math.max(this.peak, local);
    return local;
  }

  get highest(): number {
    return this.peak;
  }
}

/**
 * A look-ahead limiter (5 ms): the gain falls before a peak arrives, as a
 * ramp, so it never clicks, and rises again slowly. The output is delayed by
 * the look-ahead; `flush()` gives the last samples.
 */
export class Limiter {
  private readonly lookahead: number;
  private readonly delayLeft: Float32Array;
  private readonly delayRight: Float32Array;
  private readonly needs: Float64Array;
  private readonly smooth: Float64Array;
  private readonly peaks = [new TruePeak(), new TruePeak()];
  private readonly deque: number[] = [];
  private index = 0;
  private held = 1;
  private smoothSum = 0;
  private readonly release: number;

  constructor(
    private readonly ceiling: number,
    lookaheadSeconds = 0.005,
  ) {
    this.lookahead = Math.max(1, Math.round(lookaheadSeconds * SAMPLE_RATE));
    this.delayLeft = new Float32Array(this.lookahead);
    this.delayRight = new Float32Array(this.lookahead);
    this.needs = new Float64Array(this.lookahead);
    this.smooth = new Float64Array(this.lookahead).fill(1);
    this.smoothSum = this.lookahead;
    this.release = 1 - Math.exp(-1 / (0.15 * SAMPLE_RATE));
  }

  /** Limits a chunk in place (delayed by the look-ahead). */
  process(left: Float32Array, right: Float32Array): void {
    for (let i = 0; i < left.length; i++) {
      const [l, r] = this.step(left[i]!, right[i]!);
      left[i] = l;
      right[i] = r;
    }
  }

  /** The samples still held by the look-ahead, once the input has ended. */
  flush(): { left: Float32Array; right: Float32Array } {
    const left = new Float32Array(this.lookahead);
    const right = new Float32Array(this.lookahead);
    this.process(left, right);
    return { left, right };
  }

  private step(l: number, r: number): [number, number] {
    const n = this.index++;
    const slot = n % this.lookahead;
    const peak = Math.max(this.peaks[0]!.step(l), this.peaks[1]!.step(r));
    const need = peak > this.ceiling ? this.ceiling / peak : 1;
    // The lowest gain needed over the look-ahead window (a monotonic queue). The
    // sample leaving the window shares this slot: drop it before the slot is reused.
    while (this.deque.length && this.deque[0]! <= n - this.lookahead) this.deque.shift();
    this.needs[slot] = need;
    while (
      this.deque.length &&
      this.needs[this.deque[this.deque.length - 1]! % this.lookahead]! >= need
    ) {
      this.deque.pop();
    }
    this.deque.push(n);
    const lowest = this.needs[this.deque[0]! % this.lookahead]!;
    this.held = Math.min(lowest, this.held + (1 - this.held) * this.release);
    // A moving average over the look-ahead turns the step into a ramp.
    this.smoothSum += this.held - this.smooth[slot]!;
    this.smooth[slot] = this.held;
    const gain = this.smoothSum / this.lookahead;
    const outL = this.delayLeft[slot]! * gain;
    const outR = this.delayRight[slot]! * gain;
    this.delayLeft[slot] = l;
    this.delayRight[slot] = r;
    return [outL, outR];
  }
}

/** Clicks: high-frequency bursts far above what the moment held just before. */
export class ClickDetector {
  private readonly filters = [Biquad.highPass(12_000), Biquad.highPass(12_000)];
  private average = 0;
  private sample = 0;
  private last = -Infinity;
  private readonly found: number[] = [];
  private readonly smoothing = 1 - Math.exp(-1 / (0.05 * SAMPLE_RATE));

  push(left: Float32Array, right: Float32Array): void {
    for (let i = 0; i < left.length; i++, this.sample++) {
      const l = this.filters[0]!.step(left[i]!);
      const r = this.filters[1]!.step(right[i]!);
      const power = Math.max(l * l, r * r);
      if (
        power > 1e-7 &&
        power > 400 * this.average &&
        this.sample - this.last > SAMPLE_RATE / 100
      ) {
        this.found.push(this.sample / SAMPLE_RATE);
        this.last = this.sample;
      }
      this.average += (power - this.average) * this.smoothing;
    }
  }

  /** Seconds at which a click was heard. */
  get clicks(): readonly number[] {
    return this.found;
  }
}

/** Digital silence: whole seconds below −60 dBFS. */
export class SilenceDetector {
  private sum = 0;
  private count = 0;
  private second = 0;
  private readonly found: number[] = [];

  push(left: Float32Array, right: Float32Array): void {
    for (let i = 0; i < left.length; i++) {
      this.sum += (left[i]! * left[i]! + right[i]! * right[i]!) / 2;
      if (++this.count === SAMPLE_RATE) {
        if (dB(this.sum / SAMPLE_RATE) < -60) this.found.push(this.second);
        this.second++;
        this.sum = 0;
        this.count = 0;
      }
    }
  }

  /** The silent seconds, leaving out the first and last `margin` seconds of `total`. */
  silences(total: number, margin = 2): readonly number[] {
    return this.found.filter((s) => s >= margin && s + 1 <= total - margin);
  }
}

export interface SoundReport {
  readonly integrated: number;
  readonly range: number;
  readonly momentaryMax: number;
  /** dBTP. */
  readonly truePeak: number;
  /** LU lost when both channels are summed to mono (a phone's one speaker). */
  readonly monoLoss: number;
  readonly clicks: readonly number[];
  readonly silences: readonly number[];
}

/** Every check of a finished sound, fed chunk by chunk. */
export class SoundAnalyzer {
  private readonly stereo = new LoudnessMeter();
  private readonly mono = new LoudnessMeter();
  private readonly peaks = [new TruePeak(), new TruePeak()];
  private readonly clickDetector = new ClickDetector();
  private readonly silenceDetector = new SilenceDetector();
  private samples = 0;

  push(left: Float32Array, right: Float32Array): void {
    this.stereo.push(left, right);
    const sum = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      sum[i] = (left[i]! + right[i]!) / 2;
      this.peaks[0]!.step(left[i]!);
      this.peaks[1]!.step(right[i]!);
    }
    this.mono.push(sum, sum);
    this.clickDetector.push(left, right);
    this.silenceDetector.push(left, right);
    this.samples += left.length;
  }

  report(): SoundReport {
    const stereo = this.stereo.reading();
    const mono = this.mono.reading();
    return {
      integrated: stereo.integrated,
      range: stereo.range,
      momentaryMax: stereo.momentaryMax,
      truePeak: toDecibels(Math.max(this.peaks[0]!.highest, this.peaks[1]!.highest)),
      monoLoss: stereo.integrated - mono.integrated,
      clicks: this.clickDetector.clicks,
      silences: this.silenceDetector.silences(this.samples / SAMPLE_RATE),
    };
  }
}

/** The gain, linear, that brings `measured` LUFS to `target`. */
export const gainTo = (measured: number, target: number): number =>
  Number.isFinite(measured) ? fromDecibels(target - measured) : 1;

/** The fade of the whole video at `t` seconds: equal-power in and out. */
export function fadeAt(t: number, total: number, fade: { in: number; out: number }): number {
  const rise = Math.min(1, Math.max(0, t / fade.in));
  const fall = Math.min(1, Math.max(0, (total - t) / fade.out));
  return Math.sin((Math.PI / 2) * rise) * Math.sin((Math.PI / 2) * fall);
}
