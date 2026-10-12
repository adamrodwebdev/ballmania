import { SeededRandom } from '@/engine/core/Random';
import type { Palette } from '../Palette';
import { withAlpha, type WorldTheme } from './WorldTheme';

/**
 * World 4's backdrop, unlocked by finishing the Abyss: a jeweller's velvet
 * with a gold filigree border, facet reflections and scattered glints.
 */
export class JewelTheme implements WorldTheme {
  paintBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    palette: Palette,
  ): void {
    const random = new SeededRandom(404);
    const dark = palette.dark;
    const gold = palette.tone(1);
    const velvet = palette.tone(dark ? 4 : 5);

    ctx.fillStyle = palette.board;
    ctx.fillRect(0, 0, width, height);
    const cushion = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.1,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75,
    );
    cushion.addColorStop(0, withAlpha(velvet, dark ? 0.3 : 0.18));
    cushion.addColorStop(1, withAlpha(velvet, dark ? 0.04 : 0.02));
    ctx.fillStyle = cushion;
    ctx.fillRect(0, 0, width, height);

    // Facet reflections: large pale triangles, as if light fell through a cut stone.
    for (let i = 0; i < 9; i++) {
      const x = random.next() * width;
      const y = random.next() * height;
      const r = Math.min(width, height) * (0.12 + 0.18 * random.next());
      const a = random.next() * Math.PI * 2;
      ctx.fillStyle = withAlpha(i % 2 === 0 ? gold : palette.tone(3), dark ? 0.05 : 0.07);
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const angle = a + (k / 3) * Math.PI * 2;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Gold filigree border.
    const inset = Math.min(width, height) * 0.025;
    ctx.strokeStyle = withAlpha(gold, dark ? 0.6 : 0.75);
    ctx.lineWidth = Math.max(1.5, width / 500);
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.lineWidth = Math.max(1, width / 1000);
    ctx.strokeRect(inset * 1.6, inset * 1.6, width - inset * 3.2, height - inset * 3.2);
    for (const [cx, cy] of [
      [inset * 1.3, inset * 1.3],
      [width - inset * 1.3, inset * 1.3],
      [width - inset * 1.3, height - inset * 1.3],
      [inset * 1.3, height - inset * 1.3],
    ] as const) {
      ctx.beginPath();
      ctx.arc(cx, cy, inset * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glints: four-pointed sparkles.
    const count = Math.round((width * height) / 30000);
    const scale = Math.max(1, Math.min(width, height) / 600);
    ctx.fillStyle = dark ? '#ffffff' : gold;
    for (let i = 0; i < count; i++) {
      const x = random.next() * width;
      const y = random.next() * height;
      const r = (2 + random.next() * 5) * scale;
      ctx.globalAlpha = 0.3 + random.next() * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.25, y - r * 0.25);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x + r * 0.25, y + r * 0.25);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r * 0.25, y + r * 0.25);
      ctx.lineTo(x - r, y);
      ctx.lineTo(x - r * 0.25, y - r * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
