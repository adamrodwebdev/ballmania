<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { ACHIEVEMENTS, progressOf } from '@/player/achievements';
import ScreenHeader from '@/ui/components/ScreenHeader.vue';

const emit = defineEmits<{ home: [] }>();
const { t, locale } = useI18n();
const { player } = useServices();
const number = computed(() => new Intl.NumberFormat(locale.value));

const rows = computed(() =>
  ACHIEVEMENTS.map((achievement) => ({
    achievement,
    done: player.view.achievements.includes(achievement.id),
    progress: progressOf(achievement, player.view.stats),
  })),
);
</script>

<template>
  <section class="screen" aria-labelledby="achievements-title">
    <ScreenHeader
      :title="t('achievements.title')"
      title-id="achievements-title"
      @back="emit('home')"
    />
    <p class="intro">{{ t('achievements.intro') }}</p>
    <ul class="list">
      <li
        v-for="row in rows"
        :key="row.achievement.id"
        class="row"
        :class="{ done: row.done }"
        :data-testid="`achievement-${row.achievement.id}`"
      >
        <div class="text">
          <h2>{{ t(`achievements.list.${row.achievement.id}.name`) }}</h2>
          <p>
            {{
              t(`achievements.list.${row.achievement.id}.text`, { target: row.achievement.target })
            }}
          </p>
          <progress
            :max="row.achievement.target"
            :value="row.progress"
            :aria-label="
              t('achievements.progress', {
                current: number.format(row.progress),
                target: number.format(row.achievement.target),
              })
            "
          ></progress>
        </div>
        <p class="reward">
          <span v-if="row.done">{{ t('achievements.done') }}</span>
          <span v-else>{{ t('player.reward', { count: row.achievement.reward }) }}</span>
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.screen {
  display: grid;
  gap: var(--space-6);
  width: min(100%, 48rem);
  margin-inline: auto;
  padding: var(--space-4) var(--space-4) var(--space-12);
}

.intro {
  color: var(--text-muted);
}

.list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3) var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.row.done {
  border-color: var(--accent);
}

.text {
  display: grid;
  flex: 1 1 14rem;
  gap: var(--space-1);
}

h2 {
  font-size: 1.05rem;
}

.text p {
  color: var(--text-muted);
}

progress {
  width: 100%;
  height: 0.6rem;
  accent-color: var(--accent);
}

.reward {
  min-width: 5rem;
  color: var(--accent);
  font-weight: 800;
  text-align: right;
}
</style>
