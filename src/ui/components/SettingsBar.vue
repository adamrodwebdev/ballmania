<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { isLocale, LOCALES } from '@/i18n/locales';
import { THEME_PREFERENCES, type ThemePreference } from '@/services/SettingsService';

const { t } = useI18n();
const { settings } = useServices();

const isThemePreference = (value: string): value is ThemePreference =>
  (THEME_PREFERENCES as readonly string[]).includes(value);

const changeLocale = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (isLocale(value)) settings.update({ locale: value });
};

const changeTheme = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (isThemePreference(value)) settings.update({ theme: value });
};
</script>

<template>
  <div class="settings">
    <label class="setting">
      <span class="sr-only">{{ t('settings.language') }}</span>
      <select
        class="field"
        :value="settings.current.locale"
        data-testid="locale"
        @change="changeLocale"
      >
        <option v-for="code in LOCALES" :key="code" :value="code" :lang="code">
          {{ t(`language.${code}`) }}
        </option>
      </select>
    </label>
    <label class="setting">
      <span class="sr-only">{{ t('settings.theme') }}</span>
      <select
        class="field"
        :value="settings.current.theme"
        data-testid="theme"
        @change="changeTheme"
      >
        <option v-for="theme in THEME_PREFERENCES" :key="theme" :value="theme">
          {{ t(`theme.${theme}`) }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.setting {
  display: flex;
}
</style>
