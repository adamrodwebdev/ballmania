import type { Context2D } from '../canvas';
import type { Palette } from '../Palette';

/** Radius of the shooter's body, in board units (also used to detect a tap on it). */
export const SHOOTER_RADIUS = 58;
/** The next ball waits in the shooter's socket, at this share of a ball's radius. */
export const NEXT_BALL_SCALE = 0.6;

/**
 * The look of the launcher (specification § 3.6). Drawn centred on the
 * shooter, unrotated; `angle` is where it aims, `loaded` the colour of the
 * ball about to fly (when the game knows it).
 */
export interface ShooterSkin {
  draw(
    ctx: Context2D,
    palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded?: string,
  ): void;
}

const TAU = Math.PI * 2;
/** The Star heart's own gold: the launcher looks the same on every board and in both themes. */
const GOLD = '#ffc94a';
/** Polished gold, light to shadow, and its dark edge: the cradles of the Star heart, Crown and Eye. */
const GOLD_METAL = ['#ffe680', '#ffbf2e', '#f2801c'] as const;
const GOLD_EDGE = '#8a3a0c';

/**
 * The cradle wrapping the back of the ball about to fly: a dark edge, then
 * the metal, lit from above. Drawn in the aiming frame.
 */
function cradle(
  ctx: Context2D,
  ballRadius: number,
  metal: readonly [string, string, string],
  edge: string,
): void {
  const reach = ballRadius + 5.3;
  ctx.beginPath();
  ctx.arc(SHOOTER_RADIUS, 0, reach, (100 * Math.PI) / 180, (260 * Math.PI) / 180);
  ctx.lineCap = 'round';
  ctx.lineWidth = 9.5;
  ctx.strokeStyle = edge;
  ctx.stroke();
  const shine = ctx.createLinearGradient(0, -reach, 0, reach);
  shine.addColorStop(0, metal[0]);
  shine.addColorStop(0.52, metal[1]);
  shine.addColorStop(1, metal[2]);
  ctx.lineWidth = 6.1;
  ctx.strokeStyle = shine;
  ctx.stroke();
}

/** The socket in the middle that holds the next ball, with its rim. */
function socket(ctx: Context2D, rim: string, depth: string): void {
  ctx.beginPath();
  ctx.arc(0, 0, 20.1, 0, TAU);
  ctx.fillStyle = depth;
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = rim;
  ctx.stroke();
}

/** A small round stone in the loaded colour, with its glint. */
function gem(ctx: Context2D, x: number, y: number, radius: number, colour: string) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.35, radius * 0.32, 0, TAU);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fill();
}

/**
 * The Star heart (v1.7), the default launcher and the mascot of the covers:
 * an astrolabe ring of gold ticks turning slowly, five crystal petals whose
 * tips light up in the loaded colour, a violet heart holding the next ball,
 * and a gold cradle behind the ball about to fly.
 */
export class StarHeartSkin implements ShooterSkin {
  draw(
    ctx: Context2D,
    _palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded: string = GOLD,
  ): void {
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, 0, 68.7, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 5.6;
    ctx.setLineDash([1.8, 14.88]);
    ctx.lineDashOffset = -time * 4;
    ctx.beginPath();
    ctx.arc(0, 0, 63.7, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.rotate(angle);
    // Five crystal petals around the heart; the sixth place is the cradle's.
    for (let k = 1; k < 6; k++) {
      ctx.save();
      ctx.rotate((k * Math.PI) / 3);
      const crystal = ctx.createLinearGradient(16.8, 0, 52.5, 0);
      crystal.addColorStop(0, '#2d1680');
      crystal.addColorStop(1, '#c4afff');
      ctx.beginPath();
      ctx.moveTo(16.8, 0);
      ctx.lineTo(33.5, -11.7);
      ctx.lineTo(52.5, 0);
      ctx.lineTo(33.5, 11.7);
      ctx.closePath();
      ctx.fillStyle = crystal;
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = 'rgba(230, 220, 255, 0.7)';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(21.2, 0);
      ctx.lineTo(48, 0);
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(255, 201, 74, 0.85)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(52.5, 0, 3.1, 0, TAU);
      ctx.fillStyle = loaded;
      ctx.fill();
      ctx.restore();
    }

    const heart = ctx.createRadialGradient(0, 0, 0, 0, 0, 33.5);
    heart.addColorStop(0, '#3d1c93');
    heart.addColorStop(1, '#12072e');
    ctx.beginPath();
    ctx.arc(0, 0, 33.5, 0, TAU);
    ctx.fillStyle = heart;
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = 'rgba(190, 160, 255, 0.6)';
    ctx.stroke();
    socket(ctx, GOLD, '#0a0420');
    cradle(ctx, ballRadius, GOLD_METAL, GOLD_EDGE);
    ctx.restore();
  }
}

/** Brushed silver, light to shadow, and the Orbit's ice. */
const SILVER = ['#f2fbff', '#a9c9dd', '#4d7391'] as const;
const ICE = '#7fe7ff';
/**
 * The Orbit's two rings: the wide one, a broad band nearly flat like a ringed
 * planet's, carries a moon in the loaded colour; the narrow one, steeper, a
 * small silver moon. Size, width at the sides, tilt, speed of the moon
 * (radians a second), its start.
 */
const RINGS = [
  { rx: 62, ry: 18, width: 10, banded: true, tilt: -0.3, speed: 0.8, phase: 0.6, moon: 5.8 },
  { rx: 47, ry: 15, width: 3, banded: false, tilt: 0.85, speed: -1.15, phase: 2.4, moon: 3.6 },
] as const;

/**
 * The Orbit, redrawn (v1.7.1): a ringed steel planet. Its wide ring and a
 * steeper one pass behind it and in front of it; the moon of the wide ring
 * is lit in the loaded colour, a silver moon rides the other; a cradle of
 * brushed silver.
 */
export class OrbitSkin implements ShooterSkin {
  draw(
    ctx: Context2D,
    _palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded: string = ICE,
  ): void {
    ctx.save();
    // Half of each ring, and its moon if it is on that half: behind the planet, or in front.
    const half = (front: boolean) => {
      RINGS.forEach((ring, i) => {
        ctx.save();
        ctx.rotate(ring.tilt + Math.sin(time * 0.3 + i) * 0.04);
        // A circle squashed into the ring's ellipse: the band thins where it turns away.
        ctx.save();
        ctx.scale(1, ring.ry / ring.rx);
        ctx.globalAlpha = front ? 1 : 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, ring.rx, front ? 0 : Math.PI, front ? Math.PI : TAU);
        ctx.lineWidth = ring.width + 2;
        ctx.strokeStyle = 'rgba(10, 22, 40, 0.55)';
        ctx.stroke();
        if (ring.banded) {
          // Ice inside, a bright band outside, and the dark edge left showing between them.
          const lane = ring.width * 0.45;
          for (const [r, colour] of [
            [ring.rx - ring.width / 2 + lane / 2, 'rgba(127, 231, 255, 0.55)'],
            [ring.rx + ring.width / 2 - lane / 2, 'rgba(225, 247, 255, 0.95)'],
          ] as const) {
            ctx.beginPath();
            ctx.arc(0, 0, r, front ? 0 : Math.PI, front ? Math.PI : TAU);
            ctx.lineWidth = lane;
            ctx.strokeStyle = colour;
            ctx.stroke();
          }
        } else {
          ctx.lineWidth = ring.width;
          ctx.strokeStyle = 'rgba(190, 238, 255, 0.95)';
          ctx.stroke();
        }
        ctx.restore();
        const a = time * ring.speed + ring.phase;
        if (Math.sin(a) > 0 === front) {
          const colour = i === 0 ? loaded : '#e8f6ff';
          gem(ctx, Math.cos(a) * ring.rx, Math.sin(a) * ring.ry, ring.moon, colour);
        }
        ctx.restore();
      });
    };
    half(false);
    const steel = ctx.createRadialGradient(-10, -12, 4, 0, 0, 36);
    steel.addColorStop(0, '#6a8aab');
    steel.addColorStop(0.55, '#22324f');
    steel.addColorStop(1, '#0b1224');
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, TAU);
    ctx.fillStyle = steel;
    ctx.fill();
    // Bands of a gas giant, in ice, across the planet.
    ctx.save();
    ctx.clip();
    ctx.rotate(-0.3);
    ctx.lineWidth = 3;
    for (const [y, alpha] of [
      [-22, 0.18],
      [-12, 0.12],
      [12, 0.14],
      [23, 0.2],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(0, y, 40, 5, 0, 0, TAU);
      ctx.strokeStyle = `rgba(127, 231, 255, ${alpha})`;
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, TAU);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(205, 238, 255, 0.8)';
    ctx.stroke();
    // An equator of ice round the socket.
    ctx.beginPath();
    ctx.arc(0, 0, 27.5, 0, TAU);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = 'rgba(127, 231, 255, 0.6)';
    ctx.stroke();
    socket(ctx, ICE, '#050a18');
    half(true);
    ctx.rotate(angle);
    cradle(ctx, ballRadius, SILVER, '#1c3248');
    ctx.restore();
  }
}

/**
 * The Crown, redrawn (v1.7.1): seven faceted gold points turning slowly round
 * a ruby heart ringed with gold filigree, a gem at each tip lit in the loaded
 * colour; a gold cradle.
 */
export class CrownSkin implements ShooterSkin {
  draw(
    ctx: Context2D,
    _palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded: string = GOLD,
  ): void {
    ctx.save();
    ctx.save();
    ctx.rotate(time * 0.25);
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.rotate((i / 7) * TAU);
      // Each point in two facets: the lit one, and the one in shadow.
      const lit = ctx.createLinearGradient(30, 0, 66, 0);
      lit.addColorStop(0, '#ffcf4d');
      lit.addColorStop(1, '#fff6cf');
      ctx.beginPath();
      ctx.moveTo(30, -11);
      ctx.lineTo(66, 0);
      ctx.lineTo(30, 0);
      ctx.closePath();
      ctx.fillStyle = lit;
      ctx.fill();
      const shade = ctx.createLinearGradient(30, 0, 66, 0);
      shade.addColorStop(0, '#a8440d');
      shade.addColorStop(1, '#f2a21c');
      ctx.beginPath();
      ctx.moveTo(30, 11);
      ctx.lineTo(66, 0);
      ctx.lineTo(30, 0);
      ctx.closePath();
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(30, -11);
      ctx.lineTo(66, 0);
      ctx.lineTo(30, 11);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(90, 30, 0, 0.65)';
      ctx.stroke();
      gem(ctx, 58, 0, 3.8, loaded);
      ctx.restore();
    }
    ctx.restore();
    const ruby = ctx.createRadialGradient(-9, -10, 3, 0, 0, 34);
    ruby.addColorStop(0, '#ff7a93');
    ruby.addColorStop(0.45, '#c41e45');
    ruby.addColorStop(1, '#3a0414');
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, TAU);
    ctx.fillStyle = ruby;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    // The filigree turns the other way.
    ctx.save();
    ctx.rotate(-time * 0.4);
    ctx.setLineDash([3, 4.5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 214, 110, 0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, 27.5, 0, TAU);
    ctx.stroke();
    ctx.restore();
    socket(ctx, GOLD, '#1a0208');
    ctx.rotate(angle);
    cradle(ctx, ballRadius, GOLD_METAL, GOLD_EDGE);
    ctx.restore();
  }
}

/** The Halo's light: a warm white. */
const LIGHT = '#fff3c4';

/**
 * The Halo, redrawn (v1.7.1): a pearl heart in a band of light that breathes,
 * four blades of light turning against a cyan ring, their tips lit in the
 * loaded colour; a crescent of light for a cradle. A veil of night behind it
 * keeps the light readable on a light board.
 */
export class HaloSkin implements ShooterSkin {
  draw(
    ctx: Context2D,
    _palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded: string = LIGHT,
  ): void {
    ctx.save();
    const night = ctx.createRadialGradient(0, 0, 20, 0, 0, 66);
    night.addColorStop(0, 'rgba(58, 30, 120, 0.7)');
    night.addColorStop(1, 'rgba(24, 12, 60, 0.8)');
    ctx.beginPath();
    ctx.arc(0, 0, 66, 0, TAU);
    ctx.fillStyle = night;
    ctx.fill();
    const breath = 0.5 + 0.5 * Math.sin(time * 2.2);
    const band = ctx.createRadialGradient(0, 0, 50, 0, 0, 69);
    band.addColorStop(0, 'rgba(255, 243, 196, 0)');
    band.addColorStop(0.5, `rgba(255, 243, 196, ${0.5 + 0.3 * breath})`);
    band.addColorStop(1, 'rgba(255, 243, 196, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, 69, 0, TAU);
    ctx.arc(0, 0, 50, 0, TAU, true);
    ctx.fillStyle = band;
    ctx.fill();
    ctx.save();
    ctx.rotate(time * 0.5);
    ctx.setLineDash([22, 9]);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255, 252, 235, 0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, 59.5, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(-time * 0.35);
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.rotate(Math.PI / 4 + (k * Math.PI) / 2);
      // A wide faint blade under a bright one: light that glows without a blur.
      for (const [spread, alpha] of [
        [14, 0.28],
        [8, 1],
      ] as const) {
        const blade = ctx.createLinearGradient(28, 0, 66, 0);
        blade.addColorStop(0, `rgba(255, 252, 235, ${alpha})`);
        blade.addColorStop(1, `rgba(255, 243, 196, ${alpha * 0.25})`);
        ctx.beginPath();
        ctx.moveTo(26, 0);
        ctx.quadraticCurveTo(44, -spread, 66, 0);
        ctx.quadraticCurveTo(44, spread, 26, 0);
        ctx.fillStyle = blade;
        ctx.fill();
      }
      gem(ctx, 62, 0, 3.2, loaded);
      ctx.restore();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, 41, 0, TAU);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(160, 235, 255, 0.85)';
    ctx.stroke();
    const pearl = ctx.createRadialGradient(-9, -11, 2, 0, 0, 31);
    pearl.addColorStop(0, '#ffffff');
    pearl.addColorStop(0.5, '#e6defc');
    pearl.addColorStop(1, '#8c7fc9');
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, TAU);
    ctx.fillStyle = pearl;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(42, 22, 96, 0.55)';
    ctx.stroke();
    socket(ctx, '#ffe9a8', '#1a1040');
    ctx.rotate(angle);
    cradle(ctx, ballRadius, ['#ffffff', '#fff1c2', '#e0b85c'], 'rgba(42, 22, 96, 0.6)');
    ctx.restore();
  }
}

/** Seconds between two half-blinks of the Eye, and how long one lasts. */
const BLINK_EVERY = 7;
const BLINK = 0.28;

/**
 * The Eye, redrawn (v1.7.1): an obsidian eye rimmed with gold that looks
 * where it aims; its iris swirls in the loaded colour round the pupil, which
 * holds the next ball; gold lashes, a half-blink now and then, a gold cradle
 * at its outer corner.
 */
export class EyeSkin implements ShooterSkin {
  draw(
    ctx: Context2D,
    _palette: Palette,
    angle: number,
    ballRadius: number,
    time: number,
    loaded: string = '#ff4f8b',
  ): void {
    ctx.save();
    ctx.rotate(angle);
    const t = time % BLINK_EVERY;
    const lid = t < BLINK ? 1 - 0.45 * Math.sin((t / BLINK) * Math.PI) : 1;
    const half = 40 * lid;
    const almond = () => {
      ctx.beginPath();
      ctx.moveTo(-66, 0);
      ctx.quadraticCurveTo(0, -2 * half, 66, 0);
      ctx.quadraticCurveTo(0, 2 * half, -66, 0);
      ctx.closePath();
    };
    almond();
    const obsidian = ctx.createLinearGradient(0, -half, 0, half);
    obsidian.addColorStop(0, '#2a1650');
    obsidian.addColorStop(0.5, '#0d0620');
    obsidian.addColorStop(1, '#1d0f3c');
    ctx.fillStyle = obsidian;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const iris = ctx.createRadialGradient(0, 0, 17, 0, 0, 36);
    iris.addColorStop(0, '#05020d');
    iris.addColorStop(0.18, loaded);
    iris.addColorStop(1, '#1a0b3d');
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, TAU);
    ctx.fillStyle = iris;
    ctx.fill();
    ctx.save();
    ctx.rotate(time * 0.2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
      ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, TAU);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(255, 201, 74, 0.6)';
    ctx.stroke();
    // A glint on the eye's surface.
    ctx.beginPath();
    ctx.ellipse(-14, -half * 0.45, 9, 4, -0.35, 0, TAU);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fill();
    ctx.restore();
    almond();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    // Five gold lashes along the upper lid.
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(255, 214, 110, 0.9)';
    for (let i = -2; i <= 2; i++) {
      const x = i * 17;
      const y = -half * (1 - (x / 66) ** 2);
      ctx.beginPath();
      ctx.moveTo(x, y - 1);
      ctx.quadraticCurveTo(x * 1.08, y - 8, x * 1.2, y - 12);
      ctx.stroke();
    }
    socket(ctx, 'rgba(255, 201, 74, 0.75)', '#05020d');
    cradle(ctx, ballRadius, GOLD_METAL, GOLD_EDGE);
    ctx.restore();
  }
}
