<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { MAX_RANK, UPGRADE_IDS, type UpgradeId } from '@/engine/upgrades/Upgrades';

const emit = defineEmits<{ back: [] }>();
const { t, locale } = useI18n();
const { player } = useServices();

const number = computed(() => new Intl.NumberFormat(locale.value));
const announcement = ref('');

const upgrades = computed(() =>
  UPGRADE_IDS.map((id) => {
    // Read the reactive state, so the cards follow every purchase.
    const rank = player.view.upgrades[id] ?? 0;
    const cost = player.upgradeCost(id);
    return {
      id,
      rank,
      cost,
      affordable: cost !== null && cost <= player.view.fragments,
    };
  }),
);

const buy = (id: UpgradeId) => {
  if (!player.buyUpgrade(id)) return;
  announcement.value = t('observatory.bought', {
    name: t(`upgrades.${id}.name`),
    rank: player.upgradeRank(id),
  });
};
</script>

<template>
  <section class="observatory" aria-labelledby="observatory-title">
    <div class="top">
      <button class="btn back" type="button" data-testid="back" @click="emit('back')">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
        <span>{{ t('observatory.back') }}</span>
      </button>
      <h1 id="observatory-title">{{ t('observatory.title') }}</h1>
    </div>
    <p class="intro">{{ t('observatory.intro') }}</p>
    <p class="balance" data-testid="fragments">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 1l2.6 8.4H23l-6.8 5 2.6 8.4L12 17.6 5.2 22.8l2.6-8.4L1 9.4h8.4z"
        />
      </svg>
      {{ t('observatory.balance', { count: number.format(player.view.fragments) }) }}
    </p>

    <ul class="grid">
      <li
        v-for="upgrade in upgrades"
        :key="upgrade.id"
        class="card"
        :class="{ ready: upgrade.affordable, max: upgrade.cost === null }"
        :data-testid="`upgrade-${upgrade.id}`"
      >
        <h2>{{ t(`upgrades.${upgrade.id}.name`) }}</h2>
        <p class="pips" :aria-label="t('observatory.rank', { rank: upgrade.rank, max: MAX_RANK })">
          <span
            v-for="pip in MAX_RANK"
            :key="pip"
            class="pip"
            :class="{ on: pip <= upgrade.rank }"
            aria-hidden="true"
          ></span>
        </p>
        <ol class="ranks">
          <li v-for="pip in MAX_RANK" :key="pip" :class="{ owned: pip <= upgrade.rank }">
            {{ t(`upgrades.${upgrade.id}.r${pip}`) }}
          </li>
        </ol>
        <button
          v-if="upgrade.cost !== null"
          class="btn"
          :class="{ 'btn-primary': upgrade.affordable }"
          type="button"
          :disabled="!upgrade.affordable"
          :data-testid="`buy-${upgrade.id}`"
          @click="buy(upgrade.id)"
        >
          {{ t('observatory.buy', { cost: upgrade.cost }) }}
        </button>
        <p v-else class="done">{{ t('observatory.max') }}</p>
      </li>
    </ul>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.observatory {
  display: grid;
  gap: var(--space-4);
  width: min(100%, 72rem);
  margin-inline: auto;
  padding: var(--space-4) var(--space-4) var(--space-12);
}

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

.intro {
  color: var(--text-muted);
}

.balance {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-weight: 800;
}

.balance svg {
  color: var(--orb-cyan);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  transition:
    transform 0.25s ease,
    border-color 0.25s ease;
}

.card.ready {
  border-color: var(--orb-cyan);
}

.card.max {
  border-color: var(--accent);
}

h2 {
  font-family: var(--font-display);
  font-size: 1.2rem;
}

.pips {
  display: flex;
  gap: var(--space-1);
}

.pip {
  width: 1.6rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--surface-2);
}

.pip.on {
  background: var(--orb-cyan);
}

.ranks {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding-left: 1.2rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.ranks .owned {
  color: var(--text);
  font-weight: 700;
}

.done {
  color: var(--accent);
  font-weight: 800;
}

@media (prefers-reduced-motion: no-preference) {
  .card:hover {
    transform: translateY(-2px);
  }
}
</style>
