import type { Tone } from '@/engine/chain/Ball';
import { Vec2 } from '@/engine/geometry/Vec2';
import type { BallSprites } from '../BallSprites';
import type { Palette } from '../Palette';
import type { EffectProfile } from './EffectProfile';
import { Shake } from './Shake';

/** An explosion as the effects need it. */
export interface Burst {
  readonly positions: readonly Vec2[];
  readonly tones: readonly Tone[];
  readonly points: number;
  readonly depth: number;
}

/** A shock wave, in board units, for the distortion pass. */
export interface Wave {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly strength: number;
}

/** Seconds a ball cracks before it bursts. */
export const CRACK_TIME = 0.08;
const WAVE_SPEED = 1100;
const WAVE_LIFE = 0.55;
const RING_LIFE = 0.4;
const GLOW_LIFE = 0.35;
const LABEL_LIFE = 0.9;

interface Cracking {
  readonly x: number;
  readonly y: number;
  readonly tone: Tone;
  readonly group: number;
  readonly cracks: readonly number[];
  age: number;
}

interface Group {
  readonly id: number;
  readonly depth: number;
  readonly size: number;
  readonly centre: Vec2;
  readonly points: number;
  shattered: boolean;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  readonly spin: number;
  life: number;
  readonly maxLife: number;
  readonly tone: Tone;
  /** Triangle around the centre, in board units. */
  readonly shape: readonly number[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  readonly maxLife: number;
  readonly tone: Tone;
}

interface Fading {
  readonly x: number;
  y: number;
  life: number;
  readonly maxLife: number;
  readonly tone: Tone;
  readonly size: number;
  readonly text?: string;
}

interface LiveWave {
  readonly x: number;
  readonly y: number;
  readonly strength: number;
  age: number;
}

/**
 * The destruction of balls, the signature of the game (specification § 3.5):
 * a group cracks and is bound by electric arcs, then every ball bursts into
 * glass shards and light, with a ring, a halo, a shock wave and a shake that
 * grow with the depth of the chain reaction. Everything is drawn in board
 * units, under the transform set by the renderer.
 */
export class Destruction {
  private readonly cracking: Cracking[] = [];
  private readonly groups = new Map<number, Group>();
  private readonly shards: Shard[] = [];
  private readonly sparks: Spark[] = [];
  private readonly rings: Fading[] = [];
  private readonly glows: Fading[] = [];
  private readonly labels: Fading[] = [];
  private readonly liveWaves: LiveWave[] = [];
  private readonly shaker: Shake;
  private flashAmount = 0;
  private flashColour = '';
  private nextGroup = 1;

  constructor(
    private profile: EffectProfile,
    private readonly ballRadius: number,
    private readonly random: () => number = Math.random,
  ) {
    this.shaker = new Shake(profile.shake);
  }

  setProfile(profile: EffectProfile): void {
    this.profile = profile;
    this.shaker.setAmplitude(profile.shake);
    if (!profile.distortion) this.liveWaves.length = 0;
  }

  get active(): boolean {
    return (
      this.cracking.length +
        this.shards.length +
        this.sparks.length +
        this.rings.length +
        this.glows.length +
        this.labels.length +
        this.liveWaves.length >
        0 || this.flashAmount > 0
    );
  }

  get particleCount(): number {
    return this.shards.length + this.sparks.length;
  }

  get shakeOffset(): Vec2 {
    return this.shaker.offset;
  }

  /** Full-screen flash: colour and opacity (0 = none). */
  get flash(): { readonly colour: string; readonly amount: number } {
    return { colour: this.flashColour, amount: this.flashAmount };
  }

  get waves(): Wave[] {
    return this.liveWaves.map((wave) => {
      const t = wave.age / WAVE_LIFE;
      return {
        x: wave.x,
        y: wave.y,
        radius: wave.age * WAVE_SPEED,
        strength: wave.strength * (1 - t) * (1 - t),
      };
    });
  }

  /** A group starts cracking; it bursts `CRACK_TIME` later. */
  explode(burst: Burst): void {
    const id = this.nextGroup++;
    const middle = burst.positions[Math.floor(burst.positions.length / 2)] ?? Vec2.ZERO;
    this.groups.set(id, {
      id,
      depth: burst.depth,
      size: burst.positions.length,
      centre: middle,
      points: burst.points,
      shattered: false,
    });
    burst.positions.forEach((position, i) => {
      const cracks = Array.from(
        { length: 3 + Math.floor(this.random() * 3) },
        () => this.random() * Math.PI * 2,
      );
      this.cracking.push({
        x: position.x,
        y: position.y,
        tone: burst.tones[i] ?? 0,
        group: id,
        cracks,
        age: 0,
      });
    });
  }

  /** The last balls are gone: one big burst of light from `centre`. */
  finale(centre: Vec2, tones: readonly Tone[], colour: string): void {
    this.flashAmount = Math.max(this.flashAmount, 0.55);
    this.flashColour = colour;
    this.shaker.add(0.8);
    if (this.profile.distortion) {
      this.liveWaves.push({ x: centre.x, y: centre.y, strength: 70, age: 0 });
    }
    this.rings.push({
      x: centre.x,
      y: centre.y,
      life: 0.9,
      maxLife: 0.9,
      tone: tones[0] ?? 0,
      size: 9,
    });
    const count = Math.min(80, this.budget());
    for (let i = 0; i < count; i++) {
      this.addSpark(centre.x, centre.y, tones[i % Math.max(1, tones.length)] ?? 0, 1.8);
    }
  }

  /** The chain reached the hole: a dull red jolt. */
  defeat(colour: string): void {
    this.flashAmount = Math.max(this.flashAmount, 0.35);
    this.flashColour = colour;
    this.shaker.add(0.6);
  }

  update(dt: number): void {
    for (const ball of this.cracking) ball.age += dt;
    for (let i = this.cracking.length - 1; i >= 0; i--) {
      const ball = this.cracking[i]!;
      if (ball.age < CRACK_TIME) continue;
      this.cracking.splice(i, 1);
      this.shatter(ball);
    }
    for (const id of this.groups.keys()) {
      if (!this.cracking.some((ball) => ball.group === id)) this.groups.delete(id);
    }

    const drag = Math.exp(-3.2 * dt);
    for (const shard of this.shards) {
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.vx *= drag;
      shard.vy *= drag;
      shard.angle += shard.spin * dt;
      shard.life -= dt;
    }
    const sparkDrag = Math.exp(-5 * dt);
    for (const spark of this.sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= sparkDrag;
      spark.vy *= sparkDrag;
      spark.life -= dt;
    }
    for (const ring of this.rings) ring.life -= dt;
    for (const glow of this.glows) glow.life -= dt;
    for (const label of this.labels) {
      label.life -= dt;
      label.y -= 55 * dt;
    }
    for (const wave of this.liveWaves) wave.age += dt;
    prune(this.shards);
    prune(this.sparks);
    prune(this.rings);
    prune(this.glows);
    prune(this.labels);
    for (let i = this.liveWaves.length - 1; i >= 0; i--) {
      if (this.liveWaves[i]!.age >= WAVE_LIFE) this.liveWaves.splice(i, 1);
    }
    this.flashAmount = Math.max(0, this.flashAmount - 2.8 * dt);
    this.shaker.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D, palette: Palette, sprites: BallSprites): void {
    const base = ctx.getTransform();
    const additive = palette.dark ? 'lighter' : 'source-over';
    const r = this.ballRadius;

    ctx.globalCompositeOperation = additive;
    for (const glow of this.glows) {
      const sprite = sprites.glow(glow.tone);
      if (!sprite) continue;
      const t = glow.life / glow.maxLife;
      const size = r * glow.size * (1.4 - 0.4 * t);
      ctx.globalAlpha = t * (palette.dark ? 1 : 0.7);
      ctx.drawImage(sprite, glow.x - size, glow.y - size, size * 2, size * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    for (const ring of this.rings) {
      const t = 1 - ring.life / ring.maxLife;
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = palette.tone(ring.tone);
      ctx.lineWidth = 8 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r * (0.9 + t * ring.size * 0.7), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    this.drawCracking(ctx, palette, sprites, additive);

    for (const shard of this.shards) {
      const t = shard.life / shard.maxLife;
      ctx.setTransform(base);
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.angle);
      const scale = 0.55 + 0.45 * t;
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.min(1, t * 1.6);
      const [ax, ay, bx, by, cx, cy] = shard.shape as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = palette.tone(shard.tone);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.setTransform(base);

    ctx.globalCompositeOperation = additive;
    ctx.lineCap = 'round';
    for (const spark of this.sparks) {
      const t = spark.life / spark.maxLife;
      ctx.globalAlpha = t;
      ctx.strokeStyle = palette.dark ? '#ffffff' : palette.tone(spark.tone);
      ctx.lineWidth = 3.5 * t + 1;
      ctx.beginPath();
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x - spark.vx * 0.03, spark.y - spark.vy * 0.03);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = palette.board;
    ctx.fillStyle = palette.text;
    for (const label of this.labels) {
      ctx.globalAlpha = Math.min(1, label.life / (LABEL_LIFE * 0.5));
      ctx.font = `800 ${label.size}px system-ui, sans-serif`;
      ctx.strokeText(label.text ?? '', label.x, label.y);
      ctx.fillText(label.text ?? '', label.x, label.y);
    }
    ctx.globalAlpha = 1;
  }

  /** Swelling balls with white cracks, bound by flickering arcs. */
  private drawCracking(
    ctx: CanvasRenderingContext2D,
    palette: Palette,
    sprites: BallSprites,
    additive: GlobalCompositeOperation,
  ): void {
    const r = this.ballRadius;
    for (const ball of this.cracking) {
      const t = Math.min(1, ball.age / CRACK_TIME);
      const size = r * (1 + 0.18 * t);
      const sprite = sprites.get(ball.tone);
      if (sprite) ctx.drawImage(sprite, ball.x - size, ball.y - size, size * 2, size * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.4 + 0.6 * t;
      ctx.beginPath();
      for (const angle of ball.cracks) {
        const reach = size * (0.35 + 0.65 * t);
        ctx.moveTo(ball.x, ball.y);
        const bend = angle + 0.35;
        ctx.lineTo(ball.x + Math.cos(bend) * reach * 0.5, ball.y + Math.sin(bend) * reach * 0.5);
        ctx.lineTo(ball.x + Math.cos(angle) * reach, ball.y + Math.sin(angle) * reach);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (!this.profile.lightning) return;

    ctx.globalCompositeOperation = additive;
    ctx.lineJoin = 'round';
    for (let i = 1; i < this.cracking.length; i++) {
      const a = this.cracking[i - 1]!;
      const b = this.cracking[i]!;
      if (a.group !== b.group) continue;
      const points = this.arc(a.x, a.y, b.x, b.y);
      for (const [width, colour, alpha] of [
        [9, palette.tone(a.tone), 0.45],
        [3, '#ffffff', 0.95],
      ] as const) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.beginPath();
        points.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** A jagged line between two points, new at every frame so it flickers. */
  private arc(ax: number, ay: number, bx: number, by: number): [number, number][] {
    const steps = 6;
    const nx = -(by - ay);
    const ny = bx - ax;
    const length = Math.hypot(nx, ny) || 1;
    return Array.from({ length: steps + 1 }, (_, i): [number, number] => {
      const t = i / steps;
      const jitter = i === 0 || i === steps ? 0 : (this.random() - 0.5) * this.ballRadius * 0.9;
      return [
        ax + (bx - ax) * t + (nx / length) * jitter,
        ay + (by - ay) * t + (ny / length) * jitter,
      ];
    });
  }

  private shatter(ball: Cracking): void {
    const group = this.groups.get(ball.group);
    const depth = group?.depth ?? 1;
    const power = 1 + 0.18 * (depth - 1);
    const r = this.ballRadius;

    const shards = Math.min(this.profile.shardsPerBall, this.budget());
    for (let i = 0; i < shards; i++) {
      const angle = this.random() * Math.PI * 2;
      const speed = (260 + this.random() * 420) * power;
      const life = 0.55 + this.random() * 0.55;
      const size = r * (0.3 + this.random() * 0.3);
      const a = this.random() * Math.PI * 2;
      this.shards.push({
        x: ball.x + Math.cos(angle) * r * 0.4,
        y: ball.y + Math.sin(angle) * r * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: this.random() * Math.PI * 2,
        spin: (this.random() - 0.5) * 24,
        life,
        maxLife: life,
        tone: ball.tone,
        shape: [
          Math.cos(a) * size,
          Math.sin(a) * size,
          Math.cos(a + 2.2) * size * 0.7,
          Math.sin(a + 2.2) * size * 0.7,
          Math.cos(a + 4.1) * size * 0.85,
          Math.sin(a + 4.1) * size * 0.85,
        ],
      });
    }
    const sparks = Math.min(this.profile.sparksPerBall, this.budget());
    for (let i = 0; i < sparks; i++) this.addSpark(ball.x, ball.y, ball.tone, power);

    if (this.profile.glow) {
      this.glows.push({
        x: ball.x,
        y: ball.y,
        life: GLOW_LIFE,
        maxLife: GLOW_LIFE,
        tone: ball.tone,
        size: 2.6 * power,
      });
    }
    this.rings.push({
      x: ball.x,
      y: ball.y,
      life: RING_LIFE,
      maxLife: RING_LIFE,
      tone: ball.tone,
      size: 3 * power,
    });

    // Once per group: the shake, the wave, the flash and the points.
    if (!group || group.shattered) return;
    group.shattered = true;
    this.shaker.add(0.18 + 0.04 * group.size + 0.1 * (depth - 1));
    if (this.profile.distortion) {
      this.liveWaves.push({
        x: group.centre.x,
        y: group.centre.y,
        strength: 14 + 3 * group.size + 9 * (depth - 1),
        age: 0,
      });
    }
    if (depth >= 3) {
      this.flashAmount = Math.max(this.flashAmount, Math.min(0.35, 0.1 * (depth - 1)));
      this.flashColour = '#ffffff';
    }
    this.labels.push({
      x: group.centre.x,
      y: group.centre.y - 34,
      life: LABEL_LIFE,
      maxLife: LABEL_LIFE,
      tone: ball.tone,
      size: 34,
      text: `+${group.points}`,
    });
    if (depth > 1) {
      this.labels.push({
        x: group.centre.x,
        y: group.centre.y - 80,
        life: LABEL_LIFE,
        maxLife: LABEL_LIFE,
        tone: ball.tone,
        size: 44 + 8 * Math.min(depth, 5),
        text: `×${depth}`,
      });
    }
  }

  private addSpark(x: number, y: number, tone: Tone, power: number): void {
    const angle = this.random() * Math.PI * 2;
    const speed = (520 + this.random() * 700) * power;
    const life = 0.22 + this.random() * 0.3;
    this.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      tone,
    });
  }

  /** Particles still allowed by the profile. */
  private budget(): number {
    return Math.max(0, this.profile.maxParticles - this.particleCount);
  }
}

function prune(items: { life: number }[]): void {
  let kept = 0;
  for (const item of items) if (item.life > 0) items[kept++] = item;
  items.length = kept;
}
