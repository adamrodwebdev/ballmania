import type { Tone } from '@/engine/chain/Ball';
import type { Vec2 } from '@/engine/geometry/Vec2';
import type { Palette } from './Palette';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  readonly maxLife: number;
  readonly tone: Tone;
  readonly size: number;
}

interface Ring {
  readonly x: number;
  readonly y: number;
  life: number;
  readonly tone: Tone;
}

interface Label {
  readonly x: number;
  y: number;
  life: number;
  readonly text: string;
  readonly big: boolean;
}

const RING_LIFE = 0.35;
const LABEL_LIFE = 0.9;

/**
 * Lot 2 explosion feedback: a ring, sparks and the points earned. The
 * spectacular destruction of lot 3 (shards, shock waves, slow motion) will
 * replace it behind the same calls.
 */
export class Effects {
  private readonly sparks: Spark[] = [];
  private readonly rings: Ring[] = [];
  private readonly labels: Label[] = [];

  constructor(private readonly random: () => number = Math.random) {}

  get active(): boolean {
    return this.sparks.length + this.rings.length + this.labels.length > 0;
  }

  explode(positions: readonly Vec2[], tones: readonly Tone[], points: number, depth: number): void {
    positions.forEach((position, i) => {
      const tone = tones[i]!;
      this.rings.push({ x: position.x, y: position.y, life: RING_LIFE, tone });
      for (let k = 0; k < 7; k++) {
        const angle = this.random() * Math.PI * 2;
        const speed = 120 + this.random() * 260;
        const maxLife = 0.35 + this.random() * 0.35;
        this.sparks.push({
          x: position.x,
          y: position.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: maxLife,
          maxLife,
          tone,
          size: 3 + this.random() * 5,
        });
      }
    });
    const centre = positions[Math.floor(positions.length / 2)];
    if (!centre) return;
    this.labels.push({
      x: centre.x,
      y: centre.y - 30,
      life: LABEL_LIFE,
      text: `+${points}`,
      big: false,
    });
    if (depth > 1) {
      this.labels.push({
        x: centre.x,
        y: centre.y - 72,
        life: LABEL_LIFE,
        text: `×${depth}`,
        big: true,
      });
    }
  }

  update(dt: number): void {
    for (const spark of this.sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 1 - 2.5 * dt;
      spark.vy *= 1 - 2.5 * dt;
      spark.life -= dt;
    }
    for (const ring of this.rings) ring.life -= dt;
    for (const label of this.labels) {
      label.life -= dt;
      label.y -= 50 * dt;
    }
    prune(this.sparks);
    prune(this.rings);
    prune(this.labels);
  }

  draw(ctx: CanvasRenderingContext2D, palette: Palette, ballRadius: number): void {
    for (const ring of this.rings) {
      const t = 1 - ring.life / RING_LIFE;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = palette.tone(ring.tone);
      ctx.lineWidth = 6 * (1 - t) + 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ballRadius * (0.8 + t * 1.6), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const spark of this.sparks) {
      ctx.globalAlpha = spark.life / spark.maxLife;
      ctx.fillStyle = palette.tone(spark.tone);
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = palette.board;
    ctx.fillStyle = palette.text;
    for (const label of this.labels) {
      ctx.globalAlpha = Math.min(1, label.life / (LABEL_LIFE * 0.5));
      ctx.font = `800 ${label.big ? 56 : 34}px system-ui, sans-serif`;
      ctx.strokeText(label.text, label.x, label.y);
      ctx.fillText(label.text, label.x, label.y);
    }
    ctx.globalAlpha = 1;
  }
}

function prune(items: { life: number }[]): void {
  let kept = 0;
  for (const item of items) if (item.life > 0) items[kept++] = item;
  items.length = kept;
}
