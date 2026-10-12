<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import type { LevelDefinition } from '@/levels/LevelDefinition';
import { KeyboardControls, PointerControls, type PlayCommands } from '@/play/Controls';
import { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';

const props = defineProps<{ level: LevelDefinition }>();
const emit = defineEmits<{ quit: [] }>();

const { t, locale } = useI18n();
const { theme } = useServices();

const canvas = ref<HTMLCanvasElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const pauseDialog = ref<HTMLDialogElement | null>(null);
const endDialog = ref<HTMLDialogElement | null>(null);
const session = shallowRef<PlaySession | null>(null);
const announcement = ref('');

const hud = computed(() => session.value?.hud ?? null);
const number = computed(() => new Intl.NumberFormat(locale.value));

const readPalette = () => Palette.fromStyle(getComputedStyle(document.documentElement));

let cleanups: (() => void)[] = [];

onMounted(() => {
  if (!canvas.value || !stage.value) return;
  const play = new PlaySession(canvas.value, props.level, readPalette());
  session.value = play;

  const commands: PlayCommands = {
    aimAt: (x, y) => play.aimAt(x, y),
    isOnShooter: (x, y) => play.isOnShooter(x, y),
    fire: () => play.fire(),
    swap: () => play.swap(),
    turn: (direction) => play.turn(direction),
    togglePause: () => (play.hud.paused ? play.resume() : play.pause()),
  };
  const pointer = new PointerControls(canvas.value, commands);
  const keyboard = new KeyboardControls(window, commands);

  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    play.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
  });
  observer.observe(stage.value);

  const onVisibility = () => {
    if (document.hidden) play.pause();
  };
  document.addEventListener('visibilitychange', onVisibility);

  cleanups = [
    () => pointer.destroy(),
    () => keyboard.destroy(),
    () => observer.disconnect(),
    () => document.removeEventListener('visibilitychange', onVisibility),
    () => play.destroy(),
  ];
  play.start();
  canvas.value.focus();
});

onBeforeUnmount(() => {
  for (const cleanup of cleanups) cleanup();
});

// The board follows the theme: colours are read again once <html> has switched.
watch(theme.resolved, async () => {
  await nextTick();
  session.value?.setPalette(readPalette());
});

watch(
  () => hud.value?.paused,
  (paused) => {
    if (paused) pauseDialog.value?.showModal();
    else if (pauseDialog.value?.open) {
      pauseDialog.value.close();
      canvas.value?.focus();
    }
  },
);

watch(
  () => hud.value?.over,
  (over) => {
    if (over) {
      announcement.value = t(over === 'won' ? 'game.won' : 'game.lost');
      endDialog.value?.showModal();
    } else if (endDialog.value?.open) endDialog.value.close();
  },
);

watch(
  () => hud.value?.reaction,
  (reaction) => {
    if (reaction) announcement.value = t('game.reaction', { depth: reaction.depth });
  },
);

const resume = () => session.value?.resume();
const restart = () => {
  session.value?.restart();
  canvas.value?.focus();
};
const quit = () => emit('quit');
</script>

<template>
  <section class="game" :aria-label="t('game.board')">
    <div class="bar">
      <p class="score">
        <span class="label">{{ t('game.score') }}</span>
        <span class="value" data-testid="score">{{ number.format(hud?.score ?? 0) }}</span>
      </p>
      <p v-if="(hud?.streak ?? 0) >= 2" class="streak">
        {{ t('game.streak', { count: hud?.streak ?? 0 }) }}
      </p>
      <button
        class="btn icon"
        type="button"
        :aria-label="t('game.pause')"
        data-testid="pause"
        @click="session?.pause()"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
          <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
        </svg>
      </button>
    </div>

    <div ref="stage" class="stage">
      <canvas
        ref="canvas"
        class="board"
        tabindex="0"
        :aria-label="t('game.board')"
        aria-describedby="game-help"
        data-testid="board"
      ></canvas>
    </div>

    <div class="controls">
      <button class="btn swap" type="button" data-testid="swap" @click="session?.swap()">
        <span class="dot" :class="`tone-${hud?.current ?? 0}`" aria-hidden="true"></span>
        <span class="dot small" :class="`tone-${hud?.next ?? 0}`" aria-hidden="true"></span>
        <span>{{ t('game.swap') }}</span>
      </button>
    </div>
    <p id="game-help" class="sr-only">{{ t('game.help') }}</p>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <dialog ref="pauseDialog" class="dialog" aria-labelledby="pause-title" @cancel.prevent="resume">
      <h2 id="pause-title">{{ t('game.paused') }}</h2>
      <div class="actions">
        <button class="btn btn-primary" type="button" autofocus @click="resume">
          {{ t('game.resume') }}
        </button>
        <button class="btn" type="button" @click="restart">{{ t('game.restart') }}</button>
        <button class="btn" type="button" @click="quit">{{ t('game.quit') }}</button>
      </div>
    </dialog>

    <dialog ref="endDialog" class="dialog" aria-labelledby="end-title" @cancel.prevent="quit">
      <h2 id="end-title">{{ t(hud?.over === 'won' ? 'game.won' : 'game.lost') }}</h2>
      <p class="result">{{ t('game.finalScore', { score: number.format(hud?.score ?? 0) }) }}</p>
      <p v-if="(hud?.bestDepth ?? 0) > 1">
        {{ t('game.bestDepth', { depth: hud?.bestDepth ?? 0 }) }}
      </p>
      <div class="actions">
        <button class="btn btn-primary" type="button" autofocus @click="restart">
          {{ t('game.playAgain') }}
        </button>
        <button class="btn" type="button" @click="quit">{{ t('game.home') }}</button>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.game {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100vh;
  height: 100dvh;
  width: min(100%, 64rem);
  margin-inline: auto;
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
}

.score {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-right: auto;
}

.label {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.value {
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 1.2rem + 1vw, 1.9rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.streak {
  color: var(--accent);
  font-weight: 800;
}

.icon {
  padding: 0;
}

.stage {
  position: relative;
  min-height: 0;
  padding-inline: var(--space-2);
}

.board {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--radius);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.controls {
  display: flex;
  justify-content: center;
  padding: var(--space-2) var(--space-4) max(var(--space-2), env(safe-area-inset-bottom));
}

.swap {
  flex-direction: row;
}

.dot {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
}

.dot.small {
  width: 0.8rem;
  height: 0.8rem;
  margin-left: -0.35rem;
}

.dialog {
  width: min(100% - 2rem, 24rem);
  padding: var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
  text-align: center;
}

.dialog::backdrop {
  background: rgb(0 0 0 / 0.55);
}

.dialog h2 {
  margin-bottom: var(--space-3);
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 1.2rem + 0.8vw, 1.75rem);
}

.result {
  font-size: 1.25rem;
  font-weight: 700;
}

.actions {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-6);
}
</style>
