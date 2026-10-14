<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';

/** One tap silences the whole game, music and effects (portals require a mute button). */
const { t } = useI18n();
const { settings } = useServices();
const silent = computed(() => settings.current.muted);
const toggle = () => settings.update({ muted: !settings.current.muted });
</script>

<template>
  <button
    class="sound"
    type="button"
    :aria-label="t(silent ? 'settings.soundOff' : 'settings.soundOn')"
    :aria-pressed="silent"
    data-testid="sound-toggle"
    @click="toggle"
  >
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path
        v-if="!silent"
        d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        v-else
        d="M16 9l5 6M21 9l-5 6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.sound {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  padding: 0;
  border: 1px solid var(--tile-edge);
  border-radius: 50%;
  background: rgb(30 14 70 / 0.8);
  color: var(--scene-text);
}
</style>
