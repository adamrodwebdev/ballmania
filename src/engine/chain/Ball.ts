/** Colour index of a ball, from 0 to `MAX_TONES - 1`; the theme decides the actual colour. */
export type Tone = number;

export const MAX_TONES = 6;

/** What the outside world may read of a ball: never its position setter. */
export interface BallView {
  readonly id: number;
  readonly tone: Tone;
  /** Arc length along the path; negative while still in the entrance tunnel. */
  readonly s: number;
  /** Covered in frost (biting cold): a chain reaction shatters it too. */
  readonly frozen: boolean;
}

/** A ball of a chain. Only `Chain` moves it (and, in the Jewel world, recolours it). */
export class Ball implements BallView {
  frozen = false;

  constructor(
    readonly id: number,
    private toneValue: Tone,
    public s: number,
  ) {}

  get tone(): Tone {
    return this.toneValue;
  }

  /** Takes another colour (Jewel world: two primaries fused). */
  recolour(tone: Tone): void {
    this.toneValue = tone;
  }
}

/** Gives every ball of a game a unique id, so the renderer can follow it. */
export class BallFactory {
  private nextId = 1;

  create(tone: Tone, s = 0): Ball {
    return new Ball(this.nextId++, tone, s);
  }
}
