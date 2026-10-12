<script setup lang="ts">
import { useI18n } from 'vue-i18n';

/** Title of a secondary screen, with a way back home. */
defineProps<{ title: string; titleId: string }>();
const emit = defineEmits<{ back: [] }>();
const { t } = useI18n();
</script>

<template>
  <div class="top">
    <button class="btn back" type="button" data-testid="home" @click="emit('back')">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" />
      </svg>
      <span>{{ t('campaign.back') }}</span>
    </button>
    <h1 :id="titleId">{{ title }}</h1>
    <slot />
  </div>
</template>

<style scoped>
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}

.back {
  flex-direction: row;
  padding-inline: var(--space-3);
}

h1 {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 1.4rem + 2vw, 2.6rem);
}
</style>
