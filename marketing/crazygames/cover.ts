import { SeededRandom } from '@/engine/core/Random';
import { BallSprites } from '@/play/BallSprites';
import type { Palette } from '@/play/Palette';

/** The typeface of the title (Google Fonts, SIL Open Font License). */
export const TITLE_FONT = 'Lilita One';

/** Where things go on a cover, as shares of its width and height. */
interface Layout {
  readonly vortex: readonly [number, number];
  /** Size of the spiral, as a share of the cover's smaller side. */
  readonly spiral: number;
  readonly title: readonly [number, number];
  /** Title height, as a share of the cover's width. */
  readonly titleSize: number;
  /** Where the shot comes from, turned from the line out of the spiral (radians). */
  readonly shotTurn: number;
}

const LAYOUTS: Record<'landscape' | 'portrait' | 'square', Layout> = {
  landscape: {
    vortex: [0.5, 0.6],
    spiral: 0.62,
    title: [0.5, 0.2],
    titleSize: 0.12,
    shotTurn: 0.5,
  },
  portrait: {
    vortex: [0.5, 0.57],
    spiral: 0.62,
    title: [0.5, 0.15],
    titleSize: 0.2,
    shotTurn: 1.05,
  },
  square: { vortex: [0.5, 0.6], spiral: 0.58, title: [0.5, 0.18], titleSize: 0.18, shotTurn: 0.5 },
};

const layoutOf = (width: number, height: number): Layout => {
  const ratio = width / height;
  if (ratio > 1.2) return LAYOUTS.landscape;
  if (ratio < 0.85) return LAYOUTS.portrait;
  return LAYOUTS.square;
};

/** The colours of the chain, in runs of two and three, as the game deals them. */
const RUNS = [0, 0, 1, 1, 1, 2, 2, 4, 4, 4, 3, 3, 0, 0, 5, 5, 5, 2, 2, 1, 1, 4, 4, 3, 3, 3];

/**
 * The cover (CrazyGames: landscape 16:9, portrait 2:3, square 1:1): not a
 * screenshot but an illustration in the game's own materials. A chain of
 * glass marbles spirals into a black hole, a group bursts in the foreground
 * as a shot flies in, under the title. No other text, no border, no logo.
 */
export function drawCover(canvas: HTMLCanvasElement, palette: Palette): void {
  const { width: W, height: H } = canvas;
  const ctx = canvas.getContext('2d')!;
  const layout = layoutOf(W, H);
  const unit = Math.min(W, H);
  const cx = layout.vortex[0] * W;
  const cy = layout.vortex[1] * H;
  const random = SeededRandom.fromString('ballmania-cover');

  // Deep space, brighter around the black hole.
  const sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.7);
  sky.addColorStop(0, '#3a1670');
  sky.addColorStop(0.35, '#1a0b3d');
  sky.addColorStop(1, '#05030d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Nebula clouds.
  ctx.globalCompositeOperation = 'lighter';
  const clouds: [number, number, number, string][] = [
    [0.15, 0.25, 0.55, 'rgba(255, 70, 170, 0.22)'],
    [0.85, 0.3, 0.5, 'rgba(60, 200, 255, 0.18)'],
    [0.3, 0.85, 0.5, 'rgba(120, 80, 255, 0.2)'],
    [0.8, 0.85, 0.45, 'rgba(255, 150, 60, 0.12)'],
  ];
  for (const [x, y, r, colour] of clouds) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * Math.max(W, H));
    g.addColorStop(0, colour);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Stars.
  for (let i = 0; i < (W * H) / 2500; i++) {
    const x = random.next() * W;
    const y = random.next() * H;
    const size = random.next() ** 3 * unit * 0.004 + unit * 0.0008;
    ctx.globalAlpha = 0.3 + random.next() * 0.7;
    ctx.fillStyle = random.next() < 0.2 ? '#ffd9a8' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The accretion disc: tilted rings of fire around the hole.
  const disc = unit * layout.spiral * 0.33;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.25);
  for (let i = 0; i < 70; i++) {
    const t = i / 70;
    const radius = disc * (0.35 + t * 0.9);
    ctx.strokeStyle = `hsla(${20 + t * 260}, 100%, ${70 - t * 25}%, ${0.16 * (1 - t) + 0.02})`;
    ctx.lineWidth = unit * 0.012 * (1 - t * 0.6);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const halo = ctx.createRadialGradient(0, 0, disc * 0.2, 0, 0, disc * 0.9);
  halo.addColorStop(0, 'rgba(255, 200, 120, 0.9)');
  halo.addColorStop(0.35, 'rgba(255, 110, 60, 0.35)');
  halo.addColorStop(1, 'rgba(120, 60, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, disc * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  // The hole itself.
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, disc * 0.34);
  core.addColorStop(0, '#000');
  core.addColorStop(0.82, '#000');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, disc * 0.34, 0, Math.PI * 2);
  ctx.fill();

  // The chain: a logarithmic spiral, marbles growing as they come closer.
  const sprites = new BallSprites(() => document.createElement('canvas'));
  const biggest = unit * 0.062;
  sprites.build(palette, biggest);
  const outer = unit * layout.spiral * 0.82;
  const inner = disc * 0.3;
  const turns = 2.35;
  const k = Math.log(outer / inner) / (turns * Math.PI * 2);
  const balls: { x: number; y: number; r: number; tone: number }[] = [];
  let theta = 0;
  let index = 0;
  // From the outside in: each marble touches the previous one.
  while (theta < turns * Math.PI * 2) {
    const radius = outer * Math.exp(-k * theta);
    const size = biggest * (0.25 + 0.75 * (radius / outer) ** 0.9);
    const angle = theta + 2.4;
    balls.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.78,
      r: size,
      tone: RUNS[index % RUNS.length]!,
    });
    index++;
    theta += (size * 2.02) / radius;
  }
  // The group that bursts: the run of three pink marbles on the outer turn, at
  // the lower right, away from the title.
  const burstAt = RUNS.indexOf(5);
  const burst = balls.slice(burstAt, burstAt + 3);
  const kept = balls.filter((_, i) => i < burstAt || i >= burstAt + 3);
  // Inner marbles first, so the nearer ones overlap them.
  for (const ball of [...kept].reverse()) {
    const glow = sprites.glow(ball.tone);
    if (glow && ball.r > biggest * 0.5) {
      ctx.globalAlpha = 0.18;
      ctx.drawImage(glow, ball.x - ball.r * 2, ball.y - ball.r * 2, ball.r * 4, ball.r * 4);
      ctx.globalAlpha = 1;
    }
    const sprite = sprites.get(ball.tone);
    if (sprite) ctx.drawImage(sprite, ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
  }

  // The burst: light, a shock ring, glass shards and sparks.
  const centre = burst[1] ?? burst[0]!;
  const tone = palette.tone(centre.tone);
  const blast = biggest * 4.2;
  ctx.globalCompositeOperation = 'lighter';
  const light = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, blast);
  light.addColorStop(0, 'rgba(255,255,255,1)');
  light.addColorStop(0.15, 'rgba(255,255,255,0.8)');
  light.addColorStop(0.4, `${tone}aa`);
  light.addColorStop(1, `${tone}00`);
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, blast, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = biggest * 0.08;
  ctx.beginPath();
  ctx.ellipse(centre.x, centre.y, blast * 0.8, blast * 0.62, -0.2, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 46; i++) {
    const angle = random.next() * Math.PI * 2;
    const distance = blast * (0.3 + random.next() * 1.1);
    const length = biggest * (0.4 + random.next() * 1.2);
    const x = centre.x + Math.cos(angle) * distance;
    const y = centre.y + Math.sin(angle) * distance;
    ctx.strokeStyle = random.next() < 0.5 ? '#fff6d6' : tone;
    ctx.lineWidth = biggest * (0.05 + random.next() * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 26; i++) {
    const angle = random.next() * Math.PI * 2;
    const distance = blast * (0.25 + random.next() * 0.9);
    const size = biggest * (0.18 + random.next() * 0.4);
    const x = centre.x + Math.cos(angle) * distance;
    const y = centre.y + Math.sin(angle) * distance;
    const from = burst[i % burst.length]!;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random.next() * Math.PI * 2);
    const glass = ctx.createLinearGradient(-size, -size, size, size);
    glass.addColorStop(0, '#ffffff');
    glass.addColorStop(0.35, palette.tone(from.tone));
    glass.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, size * 0.6);
    ctx.lineTo(-size * 0.5, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // The shot of the same colour flying in from the right, in open space, with its comet trail.
  const shotTone = centre.tone;
  // From outside the spiral, straight at the burst.
  const outward = Math.atan2(centre.y - cy, centre.x - cx) + layout.shotTurn;
  const away = { x: Math.cos(outward), y: Math.sin(outward) };
  const shot = { x: centre.x + away.x * blast * 0.9, y: centre.y + away.y * blast * 0.9 };
  const reach = blast * 1.6;
  const side = { x: -away.y * biggest * 0.95, y: away.x * biggest * 0.95 };
  const end = { x: shot.x + away.x * reach, y: shot.y + away.y * reach };
  const trail = ctx.createLinearGradient(end.x, end.y, shot.x, shot.y);
  trail.addColorStop(0, `${palette.tone(shotTone)}00`);
  trail.addColorStop(1, `${palette.tone(shotTone)}dd`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = trail;
  ctx.beginPath();
  ctx.moveTo(shot.x + side.x, shot.y + side.y);
  ctx.lineTo(end.x, end.y);
  ctx.lineTo(shot.x - side.x, shot.y - side.y);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const shotSprite = sprites.get(shotTone);
  if (shotSprite) {
    ctx.drawImage(shotSprite, shot.x - biggest, shot.y - biggest, biggest * 2, biggest * 2);
  }

  drawTitle(ctx, layout.title[0] * W, layout.title[1] * H, layout.titleSize * W);

  // A soft vignette keeps the eye in the middle.
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    unit * 0.45,
    W / 2,
    H / 2,
    Math.hypot(W, H) * 0.62,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

/** "Ballmania": gold glass letters, a deep violet outline, a glow and a little depth. */
function drawTitle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const text = 'Ballmania';
  // Drawn apart first, so the shine only lights the letters.
  const art = document.createElement('canvas');
  art.width = Math.ceil(size * 7);
  art.height = Math.ceil(size * 2.2);
  const g = art.getContext('2d')!;
  g.translate(art.width / 2, art.height / 2);
  g.font = `${size}px "${TITLE_FONT}"`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  for (let i = Math.round(size * 0.07); i > 0; i--) {
    g.fillStyle = '#3b0f63';
    g.fillText(text, i * 0.35, i);
  }
  g.lineWidth = size * 0.11;
  g.strokeStyle = '#1c0636';
  g.strokeText(text, 0, 0);
  const gold = g.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
  gold.addColorStop(0, '#fffbe6');
  gold.addColorStop(0.35, '#ffd34d');
  gold.addColorStop(0.7, '#ff8a3d');
  gold.addColorStop(1, '#ff4f8b');
  g.fillStyle = gold;
  g.fillText(text, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,255,255,0.3)';
  g.fillRect(-art.width / 2, -size * 0.5, art.width, size * 0.3);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.045);
  // Glow behind the letters.
  ctx.shadowColor = 'rgba(190, 90, 255, 0.95)';
  ctx.shadowBlur = size * 0.4;
  ctx.drawImage(art, -art.width / 2, -art.height / 2);
  ctx.shadowBlur = 0;
  ctx.drawImage(art, -art.width / 2, -art.height / 2);
  ctx.restore();
}
