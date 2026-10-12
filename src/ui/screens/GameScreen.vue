<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { CAMPAIGN, nextLevel, resolveLevel, starsFor, type CampaignLevel } from '@/levels/campaign';
import { frameFor } from '@/levels/tracks';
import { KeyboardControls, PointerControls, type PlayCommands } from '@/play/Controls';
import { DistortionLayer } from '@/play/effects/DistortionLayer';
import { EffectProfile } from '@/play/effects/EffectProfile';
import { sharedFeedback } from '@/play/feedback';
import { Palette } from '@/play/Palette';
import { PlaySession } from '@/play/PlaySession';
import { NebulaTheme } from '@/play/themes/WorldTheme';
import type { RecordResult } from '@/services/CampaignProgress';
import SettingsDialog from '@/ui/components/SettingsDialog.vue';
import StarRow from '@/ui/components/StarRow.vue';

const props = defineProps<{ level: CampaignLevel }>();
const emit = defineEmits<{ quit: []; next: [level: CampaignLevel] }>();

const { t, locale } = useI18n();
const { theme, settings, progress } = useServices();

const worldNumber = 1;
const following = nextLevel(props.level);
const result = shallowRef<RecordResult | null>(null);
const earned = ref(0);
const hintVisible = ref(props.level.hint !== undefined);

const canvas = ref<HTMLCanvasElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
const surface = ref<HTMLElement | null>(null);
const settingsDialog = ref<{ open: () => void } | null>(null);
const pauseDialog = ref<HTMLDialogElement | null>(null);
const endDialog = ref<HTMLDialogElement | null>(null);
const session = shallowRef<PlaySession | null>(null);
const announcement = ref('');

const hud = computed(() => session.value?.hud ?? null);
const number = computed(() => new Intl.NumberFormat(locale.value));

const readPalette = () => Palette.fromStyle(getComputedStyle(document.documentElement));

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = ref(motionQuery.matches);
const onMotionChange = (event: MediaQueryListEvent) => (reducedMotion.value = event.matches);
motionQuery.addEventListener('change', onMotionChange);
const profile = () => EffectProfile.for(settings.current.effects, reducedMotion.value);
const feedback = sharedFeedback(settings.current.volume, settings.current.vibration);

let cleanups: (() => void)[] = [];

onMounted(() => {
  if (!canvas.value || !surface.value) return;
  const box = surface.value.getBoundingClientRect();
  const play = new PlaySession({
    canvas: canvas.value,
    distortion: overlay.value ? DistortionLayer.create(overlay.value) : null,
    level: resolveLevel(props.level, frameFor(box.width, box.height)),
    palette: readPalette(),
    profile: profile(),
    feedback,
    theme: new NebulaTheme(),
  });
  session.value = play;
  if (hintVisible.value) window.setTimeout(() => (hintVisible.value = false), 6000);

  const commands: PlayCommands = {
    aimAt: (x, y) => play.aimAt(x, y),
    isOnShooter: (x, y) => play.isOnShooter(x, y),
    fire: () => play.fire(),
    swap: () => play.swap(),
    turn: (direction) => play.turn(direction),
    togglePause: () => play.togglePause(),
  };
  const pointer = new PointerControls(canvas.value, commands);
  const keyboard = new KeyboardControls(window, commands);

  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const { width, height } = entry.contentRect;
    play.resize(width, height, Math.min(window.devicePixelRatio || 1, 2));
  });
  observer.observe(surface.value);

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
    () => motionQuery.removeEventListener('change', onMotionChange),
  ];
  play.start();
  canvas.value.focus();
});

onBeforeUnmount(() => {
  for (const cleanup of cleanups) cleanup();
});

watch([() => settings.current.effects, reducedMotion], () => session.value?.setProfile(profile()));
watch(
  () => settings.current.volume,
  (volume) => feedback.sound.setVolume(volume),
);
watch(
  () => settings.current.vibration,
  (enabled) => feedback.haptics.setEnabled(enabled),
);

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

// A won level is saved at once, even if the player leaves before the dialog.
watch(
  () => hud.value?.state,
  (state) => {
    if (state !== 'won' || !hud.value) return;
    earned.value = starsFor(props.level, hud.value.score, true);
    result.value = progress.record(props.level.id, hud.value.score, earned.value);
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
  result.value = null;
  earned.value = 0;
  session.value?.restart();
  canvas.value?.focus();
};
const goNext = () => {
  if (following) emit('next', following);
};
const canGoNext = computed(
  () =>
    hud.value?.over === 'won' &&
    following !== undefined &&
    progress.isUnlocked(
      CAMPAIGN.map((level) => level.id),
      following.id,
    ),
);
const quit = () => emit('quit');
</script>

<template>
  <section class="game" :aria-label="t('game.board')">
    <div class="bar">
      <p class="level" data-testid="level">
        {{ t('campaign.levelShort', { world: worldNumber, number: level.number }) }}
      </p>
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
      <label v-if="hud?.colossus" class="colossus">
        <span>{{ t('colossus.name') }}</span>
        <progress
          class="health"
          :max="hud.colossus.maxHp"
          :value="hud.colossus.hp"
          data-testid="colossus"
        ></progress>
      </label>
    </div>

    <div class="stage">
      <div ref="surface" class="surface">
        <canvas
          ref="canvas"
          class="board"
          tabindex="0"
          :aria-label="t('game.board')"
          aria-describedby="game-help"
          data-testid="board"
        ></canvas>
        <canvas ref="overlay" class="overlay" aria-hidden="true" hidden></canvas>
        <p v-if="hintVisible && level.hint" class="hint" role="status" data-testid="hint">
          {{ t(`hints.${level.hint}`) }}
        </p>
      </div>
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
        <button
          class="btn"
          type="button"
          data-testid="open-settings"
          @click="settingsDialog?.open()"
        >
          {{ t('game.settings') }}
        </button>
        <button class="btn" type="button" @click="quit">{{ t('game.quit') }}</button>
      </div>
    </dialog>
    <SettingsDialog ref="settingsDialog" />

    <dialog ref="endDialog" class="dialog" aria-labelledby="end-title" @cancel.prevent="quit">
      <h2 id="end-title">{{ t(hud?.over === 'won' ? 'game.won' : 'game.lost') }}</h2>
      <StarRow
        v-if="hud?.over === 'won'"
        class="earned"
        size="large"
        :count="earned"
        :label="t('game.starsLabel', { count: earned }, earned)"
        data-testid="stars"
      />
      <p class="result">{{ t('game.finalScore', { score: number.format(hud?.score ?? 0) }) }}</p>
      <p v-if="(hud?.bonus ?? 0) > 0" class="detail">
        {{ t('game.bonus', { points: number.format(hud?.bonus ?? 0) }) }}
      </p>
      <p v-if="result?.newBest" class="record">{{ t('game.newBest') }}</p>
      <p v-else-if="result" class="detail">
        {{ t('game.best', { score: number.format(result.best) }) }}
      </p>
      <p v-if="(hud?.bestDepth ?? 0) > 1" class="detail">
        {{ t('game.bestDepth', { depth: hud?.bestDepth ?? 0 }) }}
      </p>
      <div class="actions">
        <button
          v-if="canGoNext"
          class="btn btn-primary"
          type="button"
          autofocus
          data-testid="next"
          @click="goNext"
        >
          {{ t('game.nextLevel') }}
        </button>
        <button
          class="btn"
          :class="{ 'btn-primary': !canGoNext }"
          type="button"
          :autofocus="!canGoNext"
          data-testid="replay"
          @click="restart"
        >
          {{ t('game.playAgain') }}
        </button>
        <button class="btn" type="button" data-testid="map" @click="quit">
          {{ t('game.map') }}
        </button>
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
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
}

.level {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--surface-2);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.colossus {
  display: flex;
  flex-basis: 100%;
  align-items: center;
  gap: var(--space-3);
  color: var(--danger);
  font-weight: 800;
}

.health {
  flex: 1;
  height: 0.75rem;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-2);
  accent-color: var(--danger);
  appearance: none;
}

.health::-webkit-progress-bar {
  background: var(--surface-2);
}

.health::-webkit-progress-value {
  background: var(--danger);
}

.health::-moz-progress-bar {
  background: var(--danger);
}

.hint {
  position: absolute;
  inset-inline: var(--space-4);
  top: var(--space-4);
  margin-inline: auto;
  width: fit-content;
  max-width: 32rem;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
  pointer-events: none;
  animation: hint 6s ease forwards;
}

@keyframes hint {
  0% {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  8%,
  85% {
    opacity: 1;
    transform: none;
  }
  100% {
    opacity: 0;
  }
}

.earned {
  justify-content: center;
  margin-bottom: var(--space-2);
}

.detail {
  color: var(--text-muted);
}

.record {
  color: var(--accent);
  font-weight: 800;
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

.surface {
  position: relative;
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--radius);
  pointer-events: none;
}

.overlay[hidden] {
  display: none;
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
