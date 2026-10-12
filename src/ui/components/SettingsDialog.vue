<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { isLocale, LOCALES } from '@/i18n/locales';
import {
  EFFECT_LEVELS,
  THEME_PREFERENCES,
  type EffectLevel,
  type ThemePreference,
} from '@/services/SettingsService';

const { t } = useI18n();
const { settings } = useServices();
const dialog = ref<HTMLDialogElement | null>(null);

const includes = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value);

const valueOf = (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement).value;

const changeLocale = (event: Event) => {
  const value = valueOf(event);
  if (isLocale(value)) settings.update({ locale: value });
};
const changeTheme = (event: Event) => {
  const value = valueOf(event);
  if (includes<ThemePreference>(THEME_PREFERENCES, value)) settings.update({ theme: value });
};
const changeEffects = (level: EffectLevel) => settings.update({ effects: level });
const changeVolume = (event: Event) => {
  const value = Number(valueOf(event)) / 100;
  if (value >= 0 && value <= 1) settings.update({ volume: value });
};
const changeVibration = (event: Event) =>
  settings.update({ vibration: (event.target as HTMLInputElement).checked });

defineExpose({
  open: () => dialog.value?.showModal(),
});
const close = () => dialog.value?.close();
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="settings-title" data-testid="settings">
    <h2 id="settings-title">{{ t('settings.title') }}</h2>
    <div class="fields">
      <label class="row">
        <span>{{ t('settings.language') }}</span>
        <select class="field" :value="settings.current.locale" @change="changeLocale">
          <option v-for="code in LOCALES" :key="code" :value="code" :lang="code">
            {{ t(`language.${code}`) }}
          </option>
        </select>
      </label>
      <label class="row">
        <span>{{ t('settings.theme') }}</span>
        <select class="field" :value="settings.current.theme" @change="changeTheme">
          <option v-for="theme in THEME_PREFERENCES" :key="theme" :value="theme">
            {{ t(`theme.${theme}`) }}
          </option>
        </select>
      </label>
      <fieldset class="group">
        <legend>{{ t('settings.effects') }}</legend>
        <label v-for="level in EFFECT_LEVELS" :key="level" class="choice">
          <input
            type="radio"
            name="effects"
            :value="level"
            :checked="settings.current.effects === level"
            :data-testid="`effects-${level}`"
            @change="changeEffects(level)"
          />
          <span>
            <strong>{{ t(`effects.${level}.name`) }}</strong>
            <small>{{ t(`effects.${level}.hint`) }}</small>
          </span>
        </label>
      </fieldset>
      <label class="row">
        <span>{{ t('settings.volume') }}</span>
        <input
          class="range"
          type="range"
          min="0"
          max="100"
          step="5"
          :value="Math.round(settings.current.volume * 100)"
          data-testid="volume"
          @input="changeVolume"
        />
      </label>
      <label class="row check">
        <span>{{ t('settings.vibration') }}</span>
        <input
          type="checkbox"
          :checked="settings.current.vibration"
          data-testid="vibration"
          @change="changeVibration"
        />
      </label>
    </div>
    <button class="btn btn-primary done" type="button" @click="close">
      {{ t('settings.done') }}
    </button>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(100% - 2rem, 28rem);
  max-height: calc(100dvh - 2rem);
  padding: var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}

.dialog::backdrop {
  background: rgb(0 0 0 / 0.55);
}

h2 {
  margin-bottom: var(--space-4);
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 1.2rem + 0.8vw, 1.75rem);
}

.fields {
  display: grid;
  gap: var(--space-4);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  min-height: var(--touch);
}

.group {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

legend {
  padding-inline: var(--space-1);
  font-weight: 700;
}

.choice {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch);
  cursor: pointer;
}

.choice span {
  display: grid;
}

.choice small {
  color: var(--text-muted);
}

input[type='radio'],
input[type='checkbox'] {
  width: 1.4rem;
  height: 1.4rem;
  accent-color: var(--accent);
}

.range {
  flex: 1 1 10rem;
  min-height: var(--touch);
  accent-color: var(--accent);
}

.done {
  width: 100%;
  margin-top: var(--space-6);
}
</style>
