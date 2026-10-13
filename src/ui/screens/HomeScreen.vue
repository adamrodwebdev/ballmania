<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useServices } from '@/app/AppServices';
import { WORLDS } from '@/levels/campaign';
import { ACHIEVEMENTS } from '@/player/achievements';
import { ARCADE_MODES } from '@/levels/arcade/modes';
import { DailyChallenge } from '@/player/DailyChallenge';

const { t, locale } = useI18n();
const { player, today } = useServices();
const emit = defineEmits<{
  play: [];
  daily: [challenge: DailyChallenge];
  arcade: [];
  observatory: [];
  shop: [];
  achievements: [];
}>();

const challenge = DailyChallenge.of(today());
const record = computed(() => player.daily(challenge.day));
const number = computed(() => new Intl.NumberFormat(locale.value));
const worldOf = (id: string) => WORLDS.findIndex((world) => world.id === id) + 1;
const openModes = computed(
  () => ARCADE_MODES.filter((mode) => player.view.worlds.includes(mode.unlockedBy)).length,
);

/** A decorative chain of orbs along a wave: position and colour of each orb. */
const ORBS = [
  { x: 24, y: 78, tone: 'ruby' },
  { x: 62, y: 62, tone: 'ruby' },
  { x: 100, y: 52, tone: 'amber' },
  { x: 140, y: 50, tone: 'cyan' },
  { x: 180, y: 56, tone: 'cyan' },
  { x: 220, y: 66, tone: 'cyan' },
  { x: 260, y: 72, tone: 'violet' },
  { x: 300, y: 70, tone: 'lime' },
  { x: 336, y: 60, tone: 'rose' },
] as const;
</script>

<template>
  <section class="hero" aria-labelledby="home-title">
    <svg class="chain" viewBox="0 0 360 120" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="orb-shine" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stop-color="#fff" stop-opacity="0.9" />
          <stop offset="0.35" stop-color="#fff" stop-opacity="0.15" />
          <stop offset="1" stop-color="#000" stop-opacity="0.35" />
        </radialGradient>
      </defs>
      <path class="path" d="M0 90 C 80 30, 160 40, 220 66 S 330 80, 360 50" />
      <g v-for="(orb, index) in ORBS" :key="index" :class="['orb', `orb-${orb.tone}`]">
        <circle :cx="orb.x" :cy="orb.y" r="17" />
        <circle :cx="orb.x" :cy="orb.y" r="17" fill="url(#orb-shine)" />
      </g>
    </svg>
    <h1 id="home-title" class="title">{{ t('app.name') }}</h1>
    <p class="tagline">{{ t('home.tagline') }}</p>
    <p class="pitch">{{ t('home.pitch') }}</p>
    <p class="wallet" data-testid="wallet">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />
      </svg>
      {{ t('player.balance', { count: number.format(player.view.shards) }) }}
    </p>
    <div class="actions">
      <button class="btn btn-primary main" type="button" data-testid="play" @click="emit('play')">
        <span>{{ t('home.play') }}</span>
        <small>{{ t('home.demo') }}</small>
      </button>
      <button class="btn" type="button" data-testid="daily" @click="emit('daily', challenge)">
        <span>{{ t('daily.title') }}</span>
        <small v-if="record">
          {{ t('daily.done', { score: number.format(record.score) }) }}
        </small>
        <small v-else>
          {{
            t('daily.todo', {
              level: t('campaign.levelShort', {
                world: worldOf(challenge.level.world),
                number: challenge.level.number,
              }),
            })
          }}
        </small>
      </button>
      <button class="btn" type="button" data-testid="arcade" @click="emit('arcade')">
        <span>{{ t('arcade.title') }}</span>
        <small>
          {{ t('arcade.open', { count: openModes, total: ARCADE_MODES.length }) }}
        </small>
      </button>
      <button class="btn" type="button" data-testid="observatory" @click="emit('observatory')">
        <span>
          {{ t('observatory.title') }}
          <span v-if="player.upgradeAffordable" class="badge" data-testid="upgrade-ready">
            {{ t('observatory.ready') }}
          </span>
        </span>
        <small>{{
          t('observatory.balance', { count: number.format(player.view.fragments) })
        }}</small>
      </button>
      <button class="btn" type="button" data-testid="shop" @click="emit('shop')">
        <span>{{ t('shop.title') }}</span>
        <small>{{ t('shop.pitch') }}</small>
      </button>
      <button class="btn" type="button" data-testid="achievements" @click="emit('achievements')">
        <span>{{ t('achievements.title') }}</span>
        <small>
          {{
            t('achievements.count', {
              done: player.view.achievements.length,
              total: ACHIEVEMENTS.length,
            })
          }}
        </small>
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  width: min(100%, 48rem);
  margin-inline: auto;
  padding: var(--space-8) var(--space-4) var(--space-12);
  text-align: center;
}

.chain {
  width: min(100%, 30rem);
  height: auto;
  aspect-ratio: 3 / 1;
  overflow: visible;
}

.path {
  fill: none;
  stroke: var(--path);
  stroke-width: 22;
  stroke-linecap: round;
}

.orb {
  animation: float 4s ease-in-out infinite;
}

.orb:nth-child(odd) {
  animation-delay: -2s;
}

.orb-ruby {
  fill: var(--orb-ruby);
}
.orb-amber {
  fill: var(--orb-amber);
}
.orb-lime {
  fill: var(--orb-lime);
}
.orb-cyan {
  fill: var(--orb-cyan);
}
.orb-violet {
  fill: var(--orb-violet);
}
.orb-rose {
  fill: var(--orb-rose);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(2.75rem, 2rem + 5vw, 5rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.tagline {
  color: var(--accent);
  font-size: clamp(1.15rem, 1rem + 1vw, 1.6rem);
  font-weight: 700;
}

.pitch {
  max-width: 36rem;
  color: var(--text-muted);
}

.wallet {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  font-weight: 800;
}

.wallet svg {
  color: var(--star-edge);
}

.actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr));
  gap: var(--space-3);
  width: min(100%, 34rem);
  margin-top: var(--space-2);
}

.badge {
  display: inline-block;
  margin-left: var(--space-1);
  padding: 0 var(--space-2);
  border-radius: 999px;
  background: var(--orb-cyan);
  color: #04131a;
  font-size: 0.75rem;
  font-weight: 800;
  vertical-align: middle;
}

.main {
  grid-column: 1 / -1;
  font-size: 1.15rem;
}

@keyframes float {
  50% {
    transform: translateY(-4px);
  }
}
</style>
