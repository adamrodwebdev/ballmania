<script setup lang="ts" generic="Id extends string">
import type { TabItem } from './tabs';

/**
 * A screen's tabs (v1.8.0): an icon, a name and a count each, the open one
 * lifted. The arrows move along them (and wrap), Home and End jump to the
 * ends, and the tab reached opens; only the open tab takes the focus by Tab.
 */
const props = defineProps<{
  tabs: readonly TabItem<Id>[];
  /** What the tabs sort, for screen readers ("Workshop departments"). */
  label: string;
  /** The id of the panel the tabs fill. */
  panelId: string;
}>();
const selected = defineModel<Id>({ required: true });

/** The tab each key leads to, from the one in focus. */
const KEYS: Readonly<Record<string, (index: number, count: number) => number>> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_, count) => count - 1,
};

const tabId = (id: Id) => `${props.panelId}-${id}`;
const move = (event: KeyboardEvent, index: number) => {
  const to = KEYS[event.key];
  if (!to) return;
  const next = to(index, props.tabs.length);
  const tab = props.tabs[next];
  if (!tab) return;
  event.preventDefault();
  selected.value = tab.id;
  // The buttons stand in the tabs' order.
  const list = (event.currentTarget as HTMLElement).parentElement;
  (list?.children[next] as HTMLElement | undefined)?.focus();
};
</script>

<template>
  <div class="tabs" role="tablist" :aria-label="label">
    <button
      v-for="(tab, index) in tabs"
      :id="tabId(tab.id)"
      :key="tab.id"
      class="tab"
      type="button"
      role="tab"
      :aria-selected="tab.id === selected"
      :aria-controls="panelId"
      :tabindex="tab.id === selected ? 0 : -1"
      :data-testid="`tab-${tab.id}`"
      @click="selected = tab.id"
      @keydown="move($event, index)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="tab.icon" /></svg>
      <span class="name">{{ tab.label }}</span>
      <span class="count" aria-hidden="true">{{ tab.count }}</span>
      <span class="sr-only">{{ tab.countLabel }}</span>
      <template v-if="tab.ready">
        <span class="dot" aria-hidden="true"></span>
        <span class="sr-only">{{ tab.readyLabel }}</span>
      </template>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: 1.1rem;
  background: var(--surface-2);
}

.tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  min-width: 0;
  min-height: 3.4rem;
  padding: var(--space-1) 0.15rem;
  border: 0;
  border-radius: 0.85rem;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.tab svg {
  width: 1.4rem;
  height: 1.4rem;
  flex: none;
}

.tab path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* A long name breaks at a syllable rather than overflowing its tab (320 px wide). */
.name {
  max-width: 100%;
  overflow-wrap: anywhere;
  hyphens: auto;
}

.count {
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

.tab[aria-selected='true'] {
  background: var(--surface);
  color: var(--text);
  box-shadow:
    inset 0 -3px 0 var(--accent),
    0 2px 8px rgb(0 0 0 / 0.18);
}

/* Something within reach in this tab: a lit dot by its icon. */
.dot {
  position: absolute;
  top: 0.4rem;
  right: calc(50% - 1.25rem);
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--orb-cyan);
  box-shadow: 0 0 0.5rem var(--orb-cyan);
}

@media (hover: hover) {
  .tab:hover:not([aria-selected='true']) {
    color: var(--text);
  }
}

/* Short frames (portals, phones on their side): flatter tabs. */
@media (height < 34rem) {
  .tab {
    min-height: var(--touch);
    padding-block: 0.15rem;
  }

  .tab svg {
    width: 1.2rem;
    height: 1.2rem;
  }
}

/* The shortest (phones on their side with the browser's bars): icon, name and count on one line. */
@media (height < 23rem) and (width >= 40rem) {
  .tab {
    flex-direction: row;
    gap: 0.35rem;
  }
}
</style>
