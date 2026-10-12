<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { useServices } from '@/app/AppServices';
import { Vec2 } from '@/engine/geometry/Vec2';
import { DEFAULT_LOOK, type Cosmetic } from '@/player/catalog';
import { resolveLook } from '@/play/cosmetics/Look';
import { Palette } from '@/play/Palette';

/** A small picture of a cosmetic, drawn by the very classes the game uses. */
const props = defineProps<{ item: Cosmetic }>();
const { theme } = useServices();
const canvas = ref<HTMLCanvasElement | null>(null);

const SIZE = 112;

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
    look.shooter.draw(ctx, palette, -Math.PI / 4, 26, 0.6);
  } else if (props.item.slot === 'trail') {
    const history = Array.from({ length: 10 }, (_, i) => new Vec2(-80 + i * 16, 70 - i * 13));
    look.trail.draw(ctx, palette, 3, history, 26);
    ctx.fillStyle = palette.tone(3);
    ctx.beginPath();
    ctx.arc(70, -60, 26, 0, Math.PI * 2);
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
