/**
 * Just enough of Web Audio to hear what the sound engine plays, without a
 * sound card: every oscillator made is kept, with the pitch it starts on and
 * the audio time it starts at. The clock moves only when a test moves it.
 */

/** An AudioParam that remembers its value and the first value it was given. */
class FakeParam {
  private current: number;
  /** The first value set (an oscillator's pitch as it starts), or null. */
  first: number | null = null;

  constructor(value: number) {
    this.current = value;
  }

  get value(): number {
    return this.current;
  }

  set value(value: number) {
    this.give(value);
  }

  setValueAtTime(value: number): this {
    this.give(value);
    return this;
  }

  exponentialRampToValueAtTime(value: number): this {
    this.current = value;
    return this;
  }

  linearRampToValueAtTime(value: number): this {
    this.current = value;
    return this;
  }

  setTargetAtTime(value: number): this {
    this.current = value;
    return this;
  }

  cancelScheduledValues(): this {
    return this;
  }

  private give(value: number): void {
    this.first ??= value;
    this.current = value;
  }
}

class FakeNode {
  connect(): void {}
  disconnect(): void {}
}

export class FakeOscillator extends FakeNode {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeParam(440);
  readonly detune = new FakeParam(0);
  /** The audio time it starts at, once started. */
  startedAt: number | null = null;

  start(at = 0): void {
    this.startedAt = at;
  }

  stop(): void {}
}

export class FakeAudioContext {
  currentTime = 0;
  readonly sampleRate = 48_000;
  state: AudioContextState = 'running';
  readonly destination = new FakeNode();
  /** Every oscillator made, in order. */
  readonly oscillators: FakeOscillator[] = [];

  createGain() {
    return Object.assign(new FakeNode(), { gain: new FakeParam(1) });
  }

  createOscillator(): FakeOscillator {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createBiquadFilter() {
    return Object.assign(new FakeNode(), {
      type: 'lowpass',
      frequency: new FakeParam(350),
      Q: new FakeParam(1),
    });
  }

  createBufferSource() {
    return Object.assign(new FakeNode(), { buffer: null, start() {}, stop() {} });
  }

  createConvolver() {
    return Object.assign(new FakeNode(), { buffer: null });
  }

  createDynamicsCompressor() {
    return Object.assign(new FakeNode(), {
      threshold: new FakeParam(-24),
      knee: new FakeParam(30),
      ratio: new FakeParam(12),
      attack: new FakeParam(0.003),
      release: new FakeParam(0.25),
    });
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return { numberOfChannels: channels, length, sampleRate, getChannelData: () => data };
  }

  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }

  /** As an AudioContext, for the code under test. */
  get asContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}
