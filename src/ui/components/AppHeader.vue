<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import logo from '@/assets/logo.svg';
import SettingsBar from './SettingsBar.vue';

const { t } = useI18n();
</script>

<template>
  <header class="header">
    <a class="brand" href="./" :aria-label="t('nav.home')">
      <img class="logo" :src="logo" alt="" width="32" height="32" />
      <span>{{ t('app.name') }}</span>
    </a>
    <SettingsBar />
  </header>
</template>

<style scoped>
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
