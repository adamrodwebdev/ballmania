import { MAX_TONES } from '@/engine/chain/Ball';
import { BallSprites } from '@/play/BallSprites';
import type { Palette } from '@/play/Palette';

/** A marble of the spiral: how far it has wound in (radians) and its colour. */
interface Marble {
  theta: number;
  tone: number;
  /** The group about to burst, then gone. */
  doomed: boolean;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  life: number;
  readonly size: number;
  readonly colour: string;
}

interface Star {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly phase: number;
  readonly warm: boolean;
}

/** Turns the spiral makes, from the edge of the scene into the hole. */
const TURNS = 2.2;
/** How fast the chain winds in, in pixels per second along the spiral. */
const SPEED = 34;
/** Seconds between two bursts. */
const BURST_EVERY = 3.4;
/** Seconds the shot takes to fly to its group. */
const SHOT_TIME = 0.42;
/** Colours in runs, as the game deals them. */
const RUNS = [0, 0, 1, 1, 1, 3, 3, 4, 4, 2, 2, 2, 5, 5, 0, 0, 0, 3, 3, 1, 1, 4, 4, 4, 2, 2, 5, 5];

/**
 * The title screen's living backdrop, the covers brought to life: a chain of
 * glass marbles winds into a glowing black hole; every few seconds a shot
 * flies in and a group of three bursts into shards. Drawn on a canvas behind
 * the menu; one still frame with reduced motion.
 */
export class TitleScene {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites = new BallSprites(() => document.createElement('canvas'));
  private marbles: Marble[] = [];
  private shards: Shard[] = [];
  private stars: Star[] = [];
  private width = 1;
  private height = 1;
  private ratio = 1;
  private centre = { x: 0, y: 0 };
  private outer = 1;
  private inner = 1;
  private k = 1;
  private biggest = 1;
  private time = 0;
  private nextBurst = 1.6;
  private shot: { from: { x: number; y: number }; elapsed: number; tone: number } | null = null;
  private flash = 0;
  private flashAt = { x: 0, y: 0 };
  private flashTone = 0;
  private spawned = 0;
  private frame = 0;
  private last = 0;
  private seed = 7;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly palette: Palette,
    private readonly still: boolean,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas');
    this.ctx = ctx;
  }

  /** Fits the scene to the canvas's CSS size: the hole moves aside on wide screens. */
  resize(width: number, height: number, ratio: number): void {
    // Not laid out yet: the chain would be built for a dot.
    if (width < 40 || height < 40) return;
    this.width = width;
    this.height = height;
    this.ratio = ratio;
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    const wide = this.width / this.height > 1.15;
    // Wide: the hole on the right, clear of the menu on the left. Tall: in the middle.
    this.outer = wide
      ? Math.min(this.width * 0.26, this.height * 0.62)
      : Math.min(this.width * 0.46, this.height * 0.3);
    this.centre = wide
      ? { x: Math.min(this.width * 0.7, this.width - this.outer * 1.08), y: this.height * 0.55 }
      : { x: this.width * 0.5, y: this.height * 0.5 };
    this.inner = this.outer * 0.12;
    this.k = Math.log(this.outer / this.inner) / (TURNS * Math.PI * 2);
    this.biggest = Math.max(14, this.outer * 0.11);
    this.sprites.build(this.palette, this.biggest * ratio);
    this.stars = Array.from({ length: Math.round((this.width * this.height) / 9000) }, () => ({
      x: this.random() * this.width,
      y: this.random() * this.height,
      size: 0.6 + this.random() ** 3 * 2.2,
      phase: this.random() * Math.PI * 2,
      warm: this.random() < 0.2,
    }));
    // A new size, a new spiral: the chain is laid out again, touching from edge to hole.
    this.fill();
    this.draw();
  }

  start(): void {
    if (this.still) return;
    const tick = (now: number) => {
      const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
      this.last = now;
      if (!document.hidden) {
        this.update(dt);
        this.draw();
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.last = 0;
  }

  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  private radiusAt(theta: number): number {
    return this.outer * Math.exp(-this.k * theta);
  }

  private sizeAt(theta: number): number {
    return this.biggest * (0.3 + 0.7 * (this.radiusAt(theta) / this.outer) ** 0.9);
  }

  private positionAt(theta: number): { x: number; y: number } {
    const radius = this.radiusAt(theta);
    const angle = theta + 2.3;
    return {
      x: this.centre.x + Math.cos(angle) * radius,
      y: this.centre.y + Math.sin(angle) * radius * 0.66,
    };
  }

  /** The chain at rest: marbles touching from the edge to the hole. */
  private fill(): void {
    this.marbles = [];
    let theta = TURNS * Math.PI * 2 * 0.92;
    while (theta > 0) {
      this.marbles.push({ theta, tone: this.nextTone(), doomed: false });
      theta -= (this.sizeAt(theta) * 1.02) / this.radiusAt(theta);
    }
  }

  private nextTone(): number {
    return RUNS[this.spawned++ % RUNS.length]! % MAX_TONES;
  }

  private update(dt: number): void {
    this.time += dt;
    for (const marble of this.marbles) {
      marble.theta += (SPEED * dt) / this.radiusAt(marble.theta);
    }
    // Swallowed by the hole at the end; a new marble enters at the edge.
    this.marbles = this.marbles.filter((marble) => marble.theta < TURNS * Math.PI * 2);
    const tail = this.marbles[this.marbles.length - 1];
    if (!tail || tail.theta > (this.sizeAt(0) * 1.02) / this.outer) {
      this.marbles.push({ theta: 0, tone: this.nextTone(), doomed: false });
    }
    this.nextBurst -= dt;
    if (this.nextBurst <= 0 && !this.shot) this.aim();
    if (this.shot) {
      this.shot.elapsed += dt;
      if (this.shot.elapsed >= SHOT_TIME) this.burst();
    }
    this.flash = Math.max(0, this.flash - dt * 2.2);
    for (const shard of this.shards) {
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.vx *= 0.97;
      shard.vy = shard.vy * 0.97 + 60 * dt;
      shard.angle += shard.spin * dt;
      shard.life -= dt * 0.9;
    }
    this.shards = this.shards.filter((shard) => shard.life > 0);
  }

  /** Picks a group of three on the outer turn and sends a shot of its colour. */
  private aim(): void {
    const start = this.marbles.findIndex(
      (marble, i) =>
        marble.theta > 1.4 &&
        marble.theta < 3.4 &&
        this.marbles[i + 1] !== undefined &&
        this.marbles[i + 2] !== undefined,
    );
    if (start < 0) {
      this.nextBurst = 0.5;
      return;
    }
    const group = this.marbles.slice(start, start + 3);
    for (const marble of group) marble.doomed = true;
    const tone = group[1]!.tone;
    for (const marble of group) marble.tone = tone;
    this.shot = {
      from: { x: this.width * 1.05, y: this.height * 1.05 },
      elapsed: 0,
      tone,
    };
  }

  private burst(): void {
    const doomed = this.marbles.filter((marble) => marble.doomed);
    const middle = doomed[1] ?? doomed[0];
    if (middle) {
      const at = this.positionAt(middle.theta);
      this.flash = 1;
      this.flashAt = at;
      this.flashTone = middle.tone;
      for (let i = 0; i < 26; i++) {
        const angle = this.random() * Math.PI * 2;
        const speed = this.biggest * (3 + this.random() * 7);
        this.shards.push({
          x: at.x,
          y: at.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          spin: (this.random() - 0.5) * 12,
          angle: this.random() * Math.PI,
          life: 0.7 + this.random() * 0.5,
          size: this.biggest * (0.12 + this.random() * 0.22),
          colour: i % 3 === 0 ? '#fff6d6' : this.palette.tone(middle.tone),
        });
      }
    }
    this.marbles = this.marbles.filter((marble) => !marble.doomed);
    this.shot = null;
    this.nextBurst = BURST_EVERY;
  }

  private draw(): void {
    const { ctx, ratio } = this;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      const twinkle = this.still ? 0.7 : 0.55 + 0.45 * Math.sin(this.time * 1.6 + star.phase);
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = star.warm ? '#ffd9a8' : '#ffffff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    this.drawHole();

    // Inner marbles first, so the nearer ones overlap them.
    for (let i = this.marbles.length - 1; i >= 0; i--) this.drawMarble(this.marbles[i]!);

    if (this.shot) {
      const t = Math.min(1, this.shot.elapsed / SHOT_TIME);
      const doomed = this.marbles.find((marble) => marble.doomed);
      const target = doomed ? this.positionAt(doomed.theta) : this.centre;
      const x = this.shot.from.x + (target.x - this.shot.from.x) * t;
      const y = this.shot.from.y + (target.y - this.shot.from.y) * t;
      const tail = ctx.createLinearGradient(this.shot.from.x, this.shot.from.y, x, y);
      const colour = this.palette.tone(this.shot.tone);
      tail.addColorStop(0, 'rgba(0,0,0,0)');
      tail.addColorStop(1, colour);
      ctx.strokeStyle = tail;
      ctx.lineWidth = this.biggest * 0.6;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(x + (this.shot.from.x - x) * 0.35, y + (this.shot.from.y - y) * 0.35);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      this.drawSprite(this.shot.tone, x, y, this.biggest);
    }

    if (this.flash > 0) {
      const radius = this.biggest * (2 + (1 - this.flash) * 3);
      const glow = ctx.createRadialGradient(
        this.flashAt.x,
        this.flashAt.y,
        0,
        this.flashAt.x,
        this.flashAt.y,
        radius,
      );
      glow.addColorStop(0, `rgba(255,255,255,${this.flash})`);
      glow.addColorStop(0.4, this.withAlpha(this.palette.tone(this.flashTone), this.flash * 0.7));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.flashAt.x, this.flashAt.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${this.flash * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.flashAt.x, this.flashAt.y, radius * 0.9, radius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    for (const shard of this.shards) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, shard.life * 1.5);
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.angle);
      ctx.fillStyle = shard.colour;
      ctx.beginPath();
      ctx.moveTo(0, -shard.size);
      ctx.lineTo(shard.size * 0.7, shard.size * 0.6);
      ctx.lineTo(-shard.size * 0.5, shard.size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /** The accretion disc turning around the hole, and the hole itself. */
  private drawHole(): void {
    const { ctx, centre, inner } = this;
    const disc = this.outer * 0.5;
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, inner * 0.6, 0, 0, disc * 1.6);
    halo.addColorStop(0, 'rgba(255, 200, 120, 0.75)');
    halo.addColorStop(0.3, 'rgba(255, 110, 60, 0.3)');
    halo.addColorStop(1, 'rgba(120, 60, 255, 0)');
    ctx.fillStyle = halo;
    ctx.scale(1, 0.62);
    ctx.beginPath();
    ctx.arc(0, 0, disc * 1.6, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const radius = inner * 1.4 + i * disc * 0.16;
      ctx.strokeStyle = `hsla(${30 + i * 45}, 100%, 70%, ${0.32 - i * 0.04})`;
      ctx.lineWidth = Math.max(1, inner * 0.12);
      ctx.setLineDash([radius * 0.9, radius * 0.5]);
      ctx.lineDashOffset = -this.time * radius * (1.4 - i * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.setLineDash([]);
    const core = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, inner * 1.3);
    core.addColorStop(0, '#000');
    core.addColorStop(0.75, '#000');
    core.addColorStop(0.86, 'rgba(255, 200, 130, 0.95)');
    core.addColorStop(1, 'rgba(255, 140, 60, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, inner * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMarble(marble: Marble): void {
    const at = this.positionAt(marble.theta);
    // The last stretch: the marble shrinks and dims as the hole takes it.
    const end = TURNS * Math.PI * 2;
    const fade = Math.min(1, (end - marble.theta) / 1.2);
    this.ctx.globalAlpha = fade;
    this.drawSprite(marble.tone, at.x, at.y, this.sizeAt(marble.theta) / 2);
    this.ctx.globalAlpha = 1;
  }

  private drawSprite(tone: number, x: number, y: number, radius: number): void {
    const glow = this.sprites.glow(tone);
    if (glow && radius > this.biggest * 0.3) {
      const alpha = this.ctx.globalAlpha;
      this.ctx.globalAlpha = alpha * 0.22;
      this.ctx.drawImage(glow, x - radius * 2, y - radius * 2, radius * 4, radius * 4);
      this.ctx.globalAlpha = alpha;
    }
    const sprite = this.sprites.get(tone);
    if (sprite) this.ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  }

  private withAlpha(colour: string, alpha: number): string {
    const hex = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      .toString(16)
      .padStart(2, '0');
    return /^#[0-9a-f]{6}$/i.test(colour) ? `${colour}${hex}` : colour;
  }
}
