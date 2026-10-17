<script setup lang="ts">
// app/src/components/FacetPanel.vue
//
// TASK-030: left-hand facet panel for /browse/:type. Purely presentational:
// it renders the view model from utils/facets.ts (computeFacetViews) and emits
// `toggle` (facet key + value); EntityListView owns the selection (route query).
//   - list facets: checkbox lists with live counts ("Dry stack (12)")
//   - band facets: button group with aria-pressed (never min/max inputs)
//   - boolean facets: a single switch
//   - zero-count values are rendered disabled, not hidden
// Below 768 px the panel collapses into a "Filters (n)" button that opens a
// modal drawer (focus trap, Escape closes, focus returns to the button).
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { FacetView } from '@/utils/facets';

const props = defineProps<{
  facets: FacetView[];
  geo: FacetView[];
  /** Number of selected values; shown in the "Filters (n)" button. */
  activeCount: number;
}>();

const emit = defineEmits<{ (e: 'toggle', key: string, value: string): void }>();

const MOBILE_QUERY = '(max-width: 767.98px)';
const isMobile = ref(false);
const open = ref(false);
const drawer = ref<HTMLElement | null>(null);
const openButton = ref<HTMLButtonElement | null>(null);
let mql: MediaQueryList | null = null;

function syncMobile(): void {
  isMobile.value = !!mql?.matches;
  if (!isMobile.value) open.value = false;
}

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mql = window.matchMedia(MOBILE_QUERY);
    mql.addEventListener?.('change', syncMobile);
    syncMobile();
  }
});
onBeforeUnmount(() => mql?.removeEventListener?.('change', syncMobile));

function focusables(): HTMLElement[] {
  if (!drawer.value) return [];
  return Array.from(
    drawer.value.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]'),
  );
}

watch(open, async (isOpen) => {
  await nextTick();
  if (isOpen) focusables()[0]?.focus();
  else openButton.value?.focus();
});

function onKeydown(event: KeyboardEvent): void {
  if (!(isMobile.value && open.value)) return;
  if (event.key === 'Escape') {
    event.stopPropagation();
    open.value = false;
    return;
  }
  if (event.key !== 'Tab') return;
  const items = focusables();
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function toggle(key: string, value: string): void {
  emit('toggle', key, value);
}

function trueOption(view: FacetView) {
  return view.options.find((o) => o.value === 'true');
}
</script>

<template>
  <div class="facet-panel" :class="{ 'facet-panel--mobile': isMobile }">
    <button
      v-if="isMobile"
      ref="openButton"
      type="button"
      class="facet-panel__open"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="open = true"
    >
      Filters ({{ props.activeCount }})
    </button>
    <div v-if="isMobile && open" class="facet-panel__backdrop" data-testid="facet-backdrop" @click="open = false"></div>

    <section
      v-show="!isMobile || open"
      ref="drawer"
      class="facet-panel__body"
      :class="{ 'facet-panel__body--drawer': isMobile }"
      :role="isMobile ? 'dialog' : undefined"
      :aria-modal="isMobile ? 'true' : undefined"
      aria-label="Filters"
      @keydown="onKeydown"
    >
      <div class="facet-panel__head">
        <h2 class="facet-panel__title">Filters</h2>
        <button v-if="isMobile" type="button" class="facet-panel__close" @click="open = false">Close</button>
      </div>

      <div v-if="props.geo.length" class="facet-panel__geo">
        <h3 class="facet-panel__group-title">Geography</h3>
        <fieldset v-for="view in props.geo" :key="view.key" class="facet-panel__fieldset">
          <legend>{{ view.label }}</legend>
          <ul class="facet-panel__list">
            <li v-for="opt in view.options" :key="opt.value">
              <label :class="{ 'facet-panel__option--disabled': opt.disabled }">
                <input
                  type="checkbox"
                  :checked="opt.selected"
                  :disabled="opt.disabled"
                  @change="toggle(view.key, opt.value)"
                />
                <span class="facet-panel__label">{{ opt.label }}</span>
                <span class="facet-panel__count">({{ opt.count.toLocaleString() }})</span>
              </label>
            </li>
          </ul>
        </fieldset>
      </div>

      <fieldset v-for="view in props.facets" :key="view.key" class="facet-panel__fieldset" :data-facet="view.key">
        <legend>{{ view.label }}</legend>

        <div v-if="view.kind === 'band'" class="facet-panel__bands">
          <button
            v-for="opt in view.options"
            :key="opt.value"
            type="button"
            class="facet-panel__band"
            :aria-pressed="opt.selected ? 'true' : 'false'"
            :disabled="opt.disabled"
            @click="toggle(view.key, opt.value)"
          >
            {{ opt.label }} <span class="facet-panel__count">({{ opt.count.toLocaleString() }})</span>
          </button>
        </div>

        <label
          v-else-if="view.kind === 'boolean' && trueOption(view)"
          class="facet-panel__switch"
          :class="{ 'facet-panel__option--disabled': trueOption(view)!.disabled }"
        >
          <input
            type="checkbox"
            role="switch"
            :checked="trueOption(view)!.selected"
            :disabled="trueOption(view)!.disabled"
            @change="toggle(view.key, 'true')"
          />
          <span class="facet-panel__label">Yes</span>
          <span class="facet-panel__count">({{ trueOption(view)!.count.toLocaleString() }})</span>
        </label>

        <ul v-else class="facet-panel__list">
          <li v-for="opt in view.options" :key="opt.value">
            <label :class="{ 'facet-panel__option--disabled': opt.disabled }">
              <input
                type="checkbox"
                :checked="opt.selected"
                :disabled="opt.disabled"
                @change="toggle(view.key, opt.value)"
              />
              <span class="facet-panel__label">{{ opt.label }}</span>
              <span class="facet-panel__count">({{ opt.count.toLocaleString() }})</span>
            </label>
          </li>
        </ul>
      </fieldset>
    </section>
  </div>
</template>

<style scoped>
.facet-panel__title {
  font-size: 1.1rem;
  margin: 0;
}

.facet-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.facet-panel__group-title {
  font-size: 1rem;
  margin: 0 0 0.5rem;
}

.facet-panel__fieldset {
  border: 0;
  border-top: 1px solid var(--color-border);
  margin: 0;
  padding: 0.6rem 0 0.75rem;
  min-width: 0;
}

.facet-panel__fieldset legend {
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0 0.25rem 0 0;
}

.facet-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 12rem;
  overflow-y: auto;
}

.facet-panel__list label,
.facet-panel__switch {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  padding: 0.15rem 0;
  font-size: 0.9rem;
  cursor: pointer;
}

.facet-panel__label {
  overflow-wrap: anywhere;
}

.facet-panel__count {
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.facet-panel__option--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.facet-panel__bands {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.facet-panel__band {
  font: inherit;
  font-size: 0.85rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.facet-panel__band[aria-pressed='true'] {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: #fff;
}

.facet-panel__band[aria-pressed='true'] .facet-panel__count {
  color: #fff;
}

.facet-panel__band:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.facet-panel__band:focus-visible,
.facet-panel__open:focus-visible,
.facet-panel__close:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

.facet-panel__open,
.facet-panel__close {
  font: inherit;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--color-brand);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-brand);
  cursor: pointer;
}

.facet-panel__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 20, 20, 0.45);
  z-index: 40;
}

.facet-panel__body--drawer {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: min(20rem, 88vw);
  overflow-y: auto;
  background: var(--color-surface);
  padding: 1rem;
  z-index: 50;
  box-shadow: var(--shadow-md);
}

@media print {
  .facet-panel {
    display: none;
  }
}
</style>
