<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useServices } from '@/app/AppServices';
import type { Tone } from '@/engine/chain/Ball';
import { Vec2 } from '@/engine/geometry/Vec2';
import { DEFAULT_LOOK, type Cosmetic } from '@/player/catalog';
import { paintOrb } from '@/play/BallSprites';
import { resolveLook, type Look } from '@/play/cosmetics/Look';
import { NEXT_BALL_SCALE, SHOOTER_RADIUS } from '@/play/cosmetics/ShooterSkins';
import { Palette } from '@/play/Palette';
import { withAlpha } from '@/play/themes/WorldTheme';

/** A small picture of a cosmetic, drawn by the very classes the game uses. */
const props = defineProps<{ item: Cosmetic }>();
const { theme } = useServices();
const canvas = ref<HTMLCanvasElement | null>(null);

const SIZE = 112;
const BALL_RADIUS = 26;
const AIM = -Math.PI / 4;
/** The balls each launcher holds in its picture (loaded, next): colours that suit its materials. */
const SHOWCASE: Readonly<Record<string, readonly [Tone, Tone]>> = {
  'shooter-star': [3, 2],
  'shooter-orbit': [0, 3],
  'shooter-crown': [2, 0],
  'shooter-halo': [1, 4],
  'shooter-eye': [5, 1],
};

/** A launcher as the game draws it: the glow of the loaded colour, the skin, its two balls. */
function drawShooter(ctx: CanvasRenderingContext2D, palette: Palette, look: Look): void {
  const [loaded, next] = SHOWCASE[props.item.id] ?? [3, 2];
  const colour = palette.tone(loaded);
  const aura = SHOOTER_RADIUS * 2.2;
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, aura);
  glow.addColorStop(0, colour);
  glow.addColorStop(0.3, colour);
  glow.addColorStop(1, withAlpha(colour, 0));
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = glow;
  ctx.fillRect(-aura, -aura, aura * 2, aura * 2);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  look.shooter.draw(ctx, palette, AIM, BALL_RADIUS, 0.6, colour);
  ctx.save();
  ctx.translate(Math.cos(AIM) * SHOOTER_RADIUS, Math.sin(AIM) * SHOOTER_RADIUS);
  paintOrb(ctx, colour, loaded, BALL_RADIUS);
  ctx.restore();
  paintOrb(ctx, palette.tone(next), next, BALL_RADIUS * NEXT_BALL_SCALE);
}

function draw(): void {
  const element = canvas.value;
  const ctx = element?.getContext('2d');
  if (!element || !ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  element.width = SIZE * ratio;
  element.height = SIZE * ratio;
  const palette = Palette.fromStyle(getComputedStyle(document.documentElement));
  const look = resolveLook({ ...DEFAULT_LOOK, [props.item.slot]: props.item.id }, 'nebula');

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = palette.board;
  ctx.fillRect(0, 0, element.width, element.height);
  if (props.item.slot === 'board') {
    look.theme.paintBackground(ctx, element.width, element.height, palette);
    return;
  }
  // The other previews use board units: 240 units across the picture.
  const k = element.width / 240;
  ctx.setTransform(k, 0, 0, k, element.width / 2, element.height / 2);
  if (props.item.slot === 'shooter') {
    drawShooter(ctx, palette, look);
  } else if (props.item.slot === 'trail') {
    const history = Array.from({ length: 10 }, (_, i) => new Vec2(-80 + i * 16, 70 - i * 13));
    look.trail.draw(ctx, palette, 3, history, BALL_RADIUS);
    ctx.fillStyle = palette.tone(3);
    ctx.beginPath();
    ctx.arc(70, -60, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  } else {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const shape = look.shards.outline(random, 18);
      ctx.save();
      ctx.translate(Math.cos(angle) * 55, Math.sin(angle) * 55);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(shape[0]!, shape[1]!);
      for (let k2 = 2; k2 + 1 < shape.length; k2 += 2) ctx.lineTo(shape[k2]!, shape[k2 + 1]!);
      ctx.closePath();
      ctx.fillStyle = palette.tone(i % 6);
      ctx.fill();
      ctx.restore();
    }
  }
}

onMounted(draw);
watch(theme.resolved, async () => {
  await nextTick();
  draw();
});
</script>

<template>
  <canvas ref="canvas" class="preview" width="112" height="112" aria-hidden="true"></canvas>
</template>

<style scoped>
.preview {
  display: block;
  width: 100%;
  max-width: 7rem;
  aspect-ratio: 1;
  height: auto;
  margin-inline: auto;
  border-radius: var(--radius-sm);
}
</style>
