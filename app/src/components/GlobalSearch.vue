<script setup lang="ts">
// app/src/components/GlobalSearch.vue
//
// TASK-008: a Wikipedia-style global search box, mounted once in App.vue's
// header so it's present on every page. As-you-type (debounced) results are
// grouped by entity type, capped per group, keyboard-navigable, and dismiss
// on Escape / outside click / route change. Matching is a simple
// case-insensitive substring search over the graph store's precomputed
// `searchIndex` (see stores/graph.ts) — fast enough for 3k+ nodes without
// any special-case caching here.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import type { SearchEntry } from '@/stores/graph';
import { labelForType } from '@/utils/labels';
import { isPlaceholderName } from '@/utils/placeholder';

/** Order entity-type groups should appear in the results panel. Any type not
 * listed (e.g. one added upstream later) is appended after these. */
const GROUP_ORDER = ['yacht', 'builder', 'marina', 'club', 'person', 'company', 'region', 'engine', 'designer'];

/** Results shown per group before collapsing into a "+N more" row. */
const MAX_PER_GROUP = 8;

/** Debounce delay between keystrokes and running the search, in ms. */
const DEBOUNCE_MS = 120;

interface ScoredEntry extends SearchEntry {
  /** 0 = name starts with query, 1 = name contains query, 2 = only the extra (e.g. builder) field matches. */
  score: number;
}

interface ResultGroup {
  type: string;
  label: string;
  total: number;
  items: ScoredEntry[];
  overflow: number;
}

const graph = useGraphStore();
const router = useRouter();

const query = ref('');
const debouncedQuery = ref('');
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value;
  }, DEBOUNCE_MS);
});

const normalizedQuery = computed(() => debouncedQuery.value.trim().toLowerCase());
const hasQuery = computed(() => normalizedQuery.value.length > 0);

const isOpen = ref(false);
const activeIndex = ref(-1);
const inputRef = ref<HTMLInputElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);

const groups = computed<ResultGroup[]>(() => {
  const q = normalizedQuery.value;
  if (!q) return [];
  const byType = new Map<string, ScoredEntry[]>();
  for (const entry of graph.searchIndex) {
    let score = -1;
    if (entry.nameLower.startsWith(q)) score = 0;
    else if (entry.nameLower.includes(q)) score = 1;
    else if (entry.extra && entry.extra.includes(q)) score = 2;
    if (score === -1) continue;
    let list = byType.get(entry.type);
    if (!list) {
      list = [];
      byType.set(entry.type, list);
    }
    list.push({ ...entry, score });
  }
  const knownTypes = GROUP_ORDER.filter((t) => byType.has(t));
  const otherTypes = [...byType.keys()].filter((t) => !GROUP_ORDER.includes(t)).sort();
  return [...knownTypes, ...otherTypes].map((type) => {
    const list = byType.get(type) ?? [];
    list.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    return {
      type,
      label: labelForType(type),
      total: list.length,
      items: list.slice(0, MAX_PER_GROUP),
      overflow: Math.max(0, list.length - MAX_PER_GROUP),
    };
  });
});

const flatResults = computed<ScoredEntry[]>(() => groups.value.flatMap((g) => g.items));
const hasResults = computed(() => flatResults.value.length > 0);
const activeId = computed(() => flatResults.value[activeIndex.value]?.id ?? null);

watch(flatResults, (list) => {
  activeIndex.value = list.length > 0 ? 0 : -1;
});

function openPanel() {
  if (query.value.trim()) isOpen.value = true;
}

function onInput() {
  isOpen.value = true;
}

function closePanel() {
  isOpen.value = false;
  activeIndex.value = -1;
}

function moveActive(delta: number) {
  if (!flatResults.value.length) return;
  isOpen.value = true;
  const count = flatResults.value.length;
  activeIndex.value = (activeIndex.value + delta + count) % count;
}

function setActiveByEntry(entry: ScoredEntry) {
  activeIndex.value = flatResults.value.findIndex((e) => e.id === entry.id);
}

function selectEntry(entry: SearchEntry) {
  closePanel();
  query.value = '';
  debouncedQuery.value = '';
  router.push({ name: 'entity', params: { id: entry.id } });
}

function onEnter() {
  const entry = flatResults.value[activeIndex.value];
  if (entry) selectEntry(entry);
}

function onEscape() {
  closePanel();
  inputRef.value?.blur();
}

function onOutsideClick(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    closePanel();
  }
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== '/') return;
  if (document.activeElement === inputRef.value) return;
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
  event.preventDefault();
  inputRef.value?.focus();
}

let unregisterAfterEach: (() => void) | undefined;

onMounted(() => {
  document.addEventListener('click', onOutsideClick);
  document.addEventListener('keydown', onGlobalKeydown);
  unregisterAfterEach = router.afterEach(() => closePanel());
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onOutsideClick);
  document.removeEventListener('keydown', onGlobalKeydown);
  if (debounceTimer) clearTimeout(debounceTimer);
  unregisterAfterEach?.();
});

interface NamePart {
  text: string;
  match: boolean;
}

/** Splits `name` into [before, match, after] around the first case-insensitive occurrence of `q`. */
function highlightParts(name: string, q: string): NamePart[] {
  if (!q) return [{ text: name, match: false }];
  const idx = name.toLowerCase().indexOf(q);
  if (idx === -1) return [{ text: name, match: false }];
  const parts: NamePart[] = [];
  if (idx > 0) parts.push({ text: name.slice(0, idx), match: false });
  parts.push({ text: name.slice(idx, idx + q.length), match: true });
  if (idx + q.length < name.length) parts.push({ text: name.slice(idx + q.length), match: false });
  return parts;
}
</script>

<template>
  <div ref="rootRef" class="global-search">
    <div class="global-search__input-wrap">
      <span class="global-search__icon" aria-hidden="true">&#128269;</span>
      <input
        ref="inputRef"
        v-model="query"
        type="search"
        class="global-search__input"
        placeholder="Search yachts, builders, marinas, people&hellip; (press /)"
        aria-label="Search DataYacht"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="isOpen && hasQuery"
        aria-controls="global-search-panel"
        :aria-activedescendant="activeId ? `global-search-option-${activeId}` : undefined"
        autocomplete="off"
        @input="onInput"
        @focus="openPanel"
        @keydown.down.prevent="moveActive(1)"
        @keydown.up.prevent="moveActive(-1)"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="onEscape"
      />
    </div>

    <div v-if="isOpen && hasQuery" id="global-search-panel" class="global-search__panel" role="listbox">
      <template v-if="hasResults">
        <div v-for="group in groups" :key="group.type" class="global-search__group">
          <div class="global-search__group-header">
            <span>{{ group.label }}</span>
            <span class="global-search__group-count">{{ group.total }}</span>
          </div>
          <button
            v-for="item in group.items"
            :id="`global-search-option-${item.id}`"
            :key="item.id"
            type="button"
            role="option"
            :aria-selected="item.id === activeId"
            class="global-search__item"
            :class="{ 'global-search__item--active': item.id === activeId }"
            @mousedown.prevent="selectEntry(item)"
            @mouseenter="setActiveByEntry(item)"
          >
            <span class="global-search__item-name">
              <template v-for="(part, i) in highlightParts(item.name, normalizedQuery)" :key="i">
                <mark v-if="part.match">{{ part.text }}</mark>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
            <span v-if="isPlaceholderName(item.name)" class="global-search__badge">unspecified</span>
          </button>
          <div v-if="group.overflow > 0" class="global-search__more">+{{ group.overflow }} more</div>
        </div>
      </template>
      <div v-else class="global-search__empty">No matches for &ldquo;{{ debouncedQuery.trim() }}&rdquo;</div>
    </div>
  </div>
</template>

<style scoped>
.global-search {
  position: relative;
  flex: 1;
  max-width: 480px;
  min-width: 0;
}

.global-search__input-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.4rem 0.75rem;
}

.global-search__input-wrap:focus-within {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px var(--color-brand-light);
}

.global-search__icon {
  font-size: 0.9rem;
  opacity: 0.6;
  flex: none;
}

.global-search__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.95rem;
  color: var(--color-text);
  font-family: var(--font-sans);
}

.global-search__input::-webkit-search-cancel-button {
  cursor: pointer;
}

.global-search__panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  left: 0;
  right: 0;
  max-height: 70vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  z-index: 40;
  padding: 0.4rem 0;
}

.global-search__group {
  padding: 0.25rem 0;
}

.global-search__group + .global-search__group {
  border-top: 1px solid var(--color-border);
}

.global-search__group-header {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.global-search__group-count {
  font-weight: 500;
}

.global-search__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 0.45rem 0.9rem;
  font-size: 0.95rem;
  color: var(--color-text);
  cursor: pointer;
  font-family: var(--font-sans);
}

.global-search__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-search__item mark {
  background: var(--color-brand-light);
  color: var(--color-brand);
  border-radius: 3px;
  padding: 0 1px;
}

.global-search__item--active,
.global-search__item:hover {
  background: var(--color-brand-light);
}

.global-search__badge {
  flex: none;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  /* TASK-018: --color-accent-text (not --color-accent) — see style.css's
     comment on that token; plain --color-accent only reaches ~4.2:1 here. */
  color: var(--color-accent-text);
  background: rgba(179, 84, 30, 0.12);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}

.global-search__more {
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.global-search__empty {
  padding: 0.75rem 0.9rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .global-search {
    max-width: none;
    flex-basis: 100%;
  }
}
</style>
