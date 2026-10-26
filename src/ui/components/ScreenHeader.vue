<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Currency } from './Currency';
import PlayerWallet from './PlayerWallet.vue';

/**
 * The bar of a menu screen (v1.8.0): the way back, the title, the wallet at
 * the top right, and the screen's tabs when it has some (the default slot).
 * Narrow, the way back and the wallet share the first row, the title and the
 * tabs take one each; wider, the title joins the first row; widest, all of
 * it stands on one line. The bar measures its own width, not the window's.
 */
defineProps<{
  title: string;
  titleId: string;
  /** The currency this screen spends, set larger in the wallet. */
  currency?: Currency | undefined;
  /** Where the way back leads, when it is not home ("Back"), and its test id. */
  backLabel?: string | undefined;
  backId?: string | undefined;
}>();
const emit = defineEmits<{ back: [] }>();
const { t } = useI18n();
</script>

<template>
  <header class="bar">
    <div class="top" :class="{ tabbed: $slots.default }">
      <button class="btn back" type="button" :data-testid="backId ?? 'home'" @click="emit('back')">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" />
        </svg>
        <span>{{ backLabel ?? t('campaign.back') }}</span>
      </button>
      <h1 :id="titleId">{{ title }}</h1>
      <div v-if="$slots.default" class="middle"><slot /></div>
      <PlayerWallet class="wallet" :main="currency" />
    </div>
  </header>
</template>

<style scoped>
.bar {
  container: screen-bar / inline-size;
}

.top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    'back wallet'
    'title title';
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.top.tabbed {
  grid-template-areas:
    'back wallet'
    'title title'
    'middle middle';
}

.back {
  grid-area: back;
  flex-direction: row;
  gap: var(--space-1);
  padding-inline: var(--space-2) var(--space-3);
}

h1 {
  grid-area: title;
  min-width: 0;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 1.3rem + 1.5vw, 2.4rem);
  line-height: 1.05;
  text-wrap: balance;
}

.middle {
  grid-area: middle;
  min-width: 0;
}

.wallet {
  grid-area: wallet;
  justify-self: end;
}

/* Narrow bars (phones of 360 px and less): the wallet's figures without the currency's name. */
@container screen-bar (width < 22rem) {
  .wallet :deep(.unit) {
    display: none;
  }
}

/* Room for the title beside the way back: the tabs below, across. */
@container screen-bar (width >= 36rem) {
  .top {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'back title wallet';
    column-gap: var(--space-4);
  }

  .top.tabbed {
    grid-template-areas:
      'back title wallet'
      'middle middle middle';
  }

  .middle {
    justify-self: center;
    width: min(100%, 36rem);
  }
}

/*
 * Room for everything on one line: the tabs in the middle. A long title
 * breaks at its soft hyphen before the tabs get narrower than 17rem.
 */
@container screen-bar (width >= 48rem) {
  .top.tabbed {
    grid-template-columns: auto auto minmax(17rem, 1fr) auto;
    grid-template-areas: 'back title middle wallet';
  }

  .tabbed h1 {
    font-size: clamp(1.5rem, 1.1rem + 1vw, 2.2rem);
  }

  .tabbed .middle {
    width: min(100%, 32rem);
  }
}
</style>
