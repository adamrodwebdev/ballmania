<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Message, NextGame } from '@/app/modes';
import type { PlayRequest } from '@/app/PlayRequest';
import { TRAINING_STEPS } from '@/levels/training';
import { useMessage } from './useMessage';

/**
 * The end of the training (v1.8.0, § 3.13): one panel, once the young
 * Colossus has dived back into the black hole. The three showcases recalled,
 * its promise, and the only way on: the campaign's first level.
 */
const props = defineProps<{
  /** Set once the promise has played: the panel opens. */
  over: boolean;
  next: NextGame | null;
  /** Where the young Colossus waits: "1-3". */
  promised: Message;
}>();
const emit = defineEmits<{ continue: [request: PlayRequest] }>();

const { t } = useI18n();
const say = useMessage();
const dialog = ref<HTMLDialogElement | null>(null);
watch(
  () => props.over,
  (over) => {
    if (over) dialog.value?.showModal();
    else if (dialog.value?.open) dialog.value.close();
  },
  // Once drawn: its one button is there to take the focus.
  { flush: 'post' },
);
const go = () => {
  if (props.next) emit('continue', props.next.request);
};
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog victory"
    aria-labelledby="training-end-title"
    data-testid="training-end"
    @cancel.prevent
  >
    <p class="eyebrow">{{ t('training.end.title') }}</p>
    <h2 id="training-end-title">{{ t('training.end.ready') }}</h2>
    <ul class="recap">
      <li v-for="step in TRAINING_STEPS" :key="step">{{ t(`training.steps.${step}.recap`) }}</li>
    </ul>
    <p class="promise" data-testid="training-promise">
      {{ t('training.end.promise', { level: say(promised) }) }}
    </p>
    <div class="actions">
      <button
        v-if="next"
        class="btn btn-primary"
        type="button"
        autofocus
        data-testid="next"
        @click="go"
      >
        <span>{{ say(next.label) }}</span>
        <small v-if="next.detail" class="next-detail">{{ say(next.detail) }}</small>
      </button>
    </div>
  </dialog>
</template>

<style scoped src="./game-dialog.css"></style>

<style scoped>
.eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 800;
}

.recap {
  display: grid;
  gap: var(--space-1);
  margin: var(--space-4) 0 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-weight: 800;
  list-style: none;
}

/* A star in front of each showcase, as on the result's goals. */
.recap li::before {
  content: '✦';
  margin-inline-end: var(--space-2);
  color: var(--accent);
}

/* The promise of the young Colossus, in the colour of its rim. */
.promise {
  margin: var(--space-4) 0 0;
  color: var(--danger);
  font-weight: 800;
  text-wrap: balance;
}

.next-detail {
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.85;
}
</style>

<style scoped src="./victory-panel.css"></style>
