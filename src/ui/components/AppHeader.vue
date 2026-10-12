<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import logo from '@/assets/logo.svg';
import SettingsBar from './SettingsBar.vue';
import SettingsDialog from './SettingsDialog.vue';

const { t } = useI18n();
/** What the settings dialog exposes. */
const dialog = ref<{ open: () => void } | null>(null);
</script>

<template>
  <header class="header">
    <a class="brand" href="./" :aria-label="t('nav.home')">
      <img class="logo" :src="logo" alt="" width="32" height="32" />
      <span>{{ t('app.name') }}</span>
    </a>
    <div class="tools">
      <SettingsBar />
      <button
        class="btn gear"
        type="button"
        :aria-label="t('settings.open')"
        data-testid="open-settings"
        @click="dialog?.open()"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.7 7.7 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.7 7.7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"
            transform="translate(-1 0)"
          />
        </svg>
      </button>
    </div>
    <SettingsDialog ref="dialog" />
  </header>
</template>

<style scoped>
.tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.gear {
  padding: 0;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  width: min(100%, 72rem);
  margin-inline: auto;
  padding: var(--space-2) var(--space-4);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch);
  color: var(--text);
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 800;
  text-decoration: none;
}
</style>
