<script setup lang="ts">
// app/src/views/EntityListView.vue
//
// TASK-009: one parameterized list view for all 9 node types, at
// /browse/:type. Renders a sortable, filterable, paginated DataTable using
// the type's column preset (utils/columns.ts) over rows enriched once by
// composables/useTypeRows.ts. An unknown `:type` (typo'd URL, stale link,
// etc.) renders a friendly message instead of a blank or crashing table.
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import { useTypeRows } from '@/composables/useTypeRows';
import { getColumnsForType } from '@/utils/columns';
import { isKnownNodeType } from '@/utils/nodeTypes';
import { labelForType } from '@/utils/labels';
import { slugify } from '@/utils/slug';
import { browseToQuery } from '@/query/browseBridge';
import { encodeQuery } from '@/query/urlCodec';
import { printMode } from '@/composables/printMode';
import DataTable from '@/components/DataTable.vue';
import FacetPanel from '@/components/FacetPanel.vue';
import ActiveFilterChips from '@/components/ActiveFilterChips.vue';
import {
  applyFacetSelection,
  computeFacetViews,
  geoCrumbs,
  resolveSelection,
  isImplicitDefault,
  selectedCount,
  selectionChips,
  selectionToQuery,
  type FacetSelection,
} from '@/utils/facets';
import type { NodeType } from '@/types/graph';

const props = defineProps<{ type: string }>();

const graph = useGraphStore();

const isKnown = computed(() => isKnownNodeType(props.type));
// Safe to assert once isKnown is true; useTypeRows/getColumnsForType are only
// invoked with the guarded value below (unknown types render the 404 branch
// and never reach the DataTable that consumes these).
const knownType = computed(() => props.type as NodeType);

const rows = useTypeRows(knownType);

// --- TASK-030: facet panel + navigable geography ---------------------------
// The selection lives in the route query (shareable, survives reload); the
// engine is utils/facets.ts over the per-type index memoised in the store.
const route = useRoute();
const router = useRouter();

const index = computed(() => (graph.loaded && isKnown.value ? graph.facetIndex(props.type) : null));
const hasPanel = computed(() => !!index.value && index.value.facets.size > 0);
const resolved = computed(() =>
  index.value ? resolveSelection(route.query, index.value) : { selection: {} as FacetSelection },
);
const selection = computed(() => resolved.value.selection);
const activeCount = computed(() => selectedCount(selection.value));
const matched = computed(() => (index.value ? applyFacetSelection(selection.value, index.value) : null));
const filteredRows = computed(() =>
  matched.value && activeCount.value > 0 ? rows.value.filter((r) => matched.value!.has(r.node.id)) : rows.value,
);
const views = computed(() =>
  index.value ? computeFacetViews(selection.value, index.value) : { facets: [], geo: [] },
);
const chips = computed(() => (index.value ? selectionChips(selection.value, index.value, isImplicitDefault(route.query, index.value)) : []));
const crumbs = computed(() => (index.value ? geoCrumbs(selection.value, index.value) : []));

// TASK-031: the same selection, expressed as a /query link (reverse of "Open in browse").
const refineTarget = computed(() => {
  if (!index.value || activeCount.value === 0) return null;
  const q = browseToQuery(knownType.value, route.query, index.value);
  if (!q.filters.length) return null;
  const params = encodeQuery(q);
  const query: Record<string, string | string[]> = { type: q.type, f: params.getAll('f') };
  return { path: '/query', query };
});

function setSelection(next: FacetSelection): void {
  if (!index.value) return;
  void router.replace({ query: selectionToQuery(next, index.value) });
}

function onToggle(key: string, value: string): void {
  const current = selection.value[key] ?? [];
  // A boolean facet is a switch, not a multi-select: it REPLACES the group (never 'true' + 'false').
  const isBool = index.value?.booleanKeys.has(key) ?? false;
  const next = current.includes(value) ? current.filter((v) => v !== value) : isBool ? [value] : [...current, value];
  setSelection({ ...selection.value, [key]: next });
}

function onRemove(key: string, value: string): void {
  onToggle(key, value);
}
const columns = computed(() => getColumnsForType(knownType.value));

const label = computed(() => labelForType(props.type));
const totalCount = computed(() => graph.typeCounts[props.type] ?? 0);
const isLoading = computed(() => !graph.loaded && !graph.error);

// TASK-014: export/print wiring — e.g. 'Yacht Clubs' -> 'yacht-clubs.csv'.
const exportName = computed(() => `${slugify(label.value)}.csv`);

function rowKey(row: { node: { id: string } }): string {
  return row.node.id;
}
</script>

<template>
  <div class="entity-list container">
    <template v-if="!isKnown">
      <div class="entity-list__status">
        <h1>Unknown entity type</h1>
        <p>&ldquo;{{ props.type }}&rdquo; isn&rsquo;t a type of entity in this graph.</p>
        <RouterLink to="/explore">Back to Explore</RouterLink>
      </div>
    </template>
    <template v-else>
      <!-- TASK-014: DataTable renders its own print-only title (exportTitle
           below) once printing starts, so this on-screen header would
           otherwise duplicate it on paper/PDF. -->
      <header v-if="!printMode" class="entity-list__header">
        <h1>{{ label }}</h1>
        <p v-if="graph.loaded" class="entity-list__count">{{ totalCount.toLocaleString() }} total</p>
      </header>

      <p v-if="graph.error" class="entity-list__status entity-list__status--error">
        Could not load the graph: {{ graph.error }}
      </p>
      <div v-else class="entity-list__layout" :class="{ 'entity-list__layout--panel': hasPanel }">
        <FacetPanel
          v-if="hasPanel"
          :facets="views.facets"
          :geo="views.geo"
          :active-count="activeCount"
          @toggle="onToggle"
        />
        <div class="entity-list__main">
          <nav v-if="crumbs.length" class="entity-list__crumbs" aria-label="Location">
            <template v-for="(crumb, i) in crumbs" :key="i">
              <span v-if="i > 0" aria-hidden="true"> &gt; </span>
              <span :aria-current="i === crumbs.length - 1 ? 'location' : undefined">{{ crumb }}</span>
            </template>
          </nav>
          <ActiveFilterChips :chips="chips" @remove="onRemove" @clear="setSelection({})" />
          <p v-if="refineTarget && !printMode" class="entity-list__refine">
            <RouterLink :to="refineTarget">Refine in query builder</RouterLink>
          </p>
          <DataTable
            :key="props.type"
            :rows="filteredRows"
            :columns="columns"
            :loading="isLoading"
            :row-key="rowKey"
            :empty-message="
              activeCount > 0 ? `No ${label.toLowerCase()} match the selected filters.` : `No ${label.toLowerCase()} in the graph.`
            "
            :export-name="exportName"
            :export-title="label"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.entity-list {
  padding: 2.5rem 1.5rem 4rem;
}

.entity-list__header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.entity-list__header h1 {
  margin-bottom: 0;
}

.entity-list__count {
  color: var(--color-text-muted);
  margin: 0;
}

.entity-list__layout {
  display: block;
}

.entity-list__main {
  min-width: 0;
}

.entity-list__refine {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
}

.entity-list__crumbs {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  margin-bottom: 0.75rem;
}

@media (min-width: 768px) {
  .entity-list__layout--panel {
    display: grid;
    grid-template-columns: 15rem minmax(0, 1fr);
    gap: 1.5rem;
    align-items: start;
  }
}

@media (max-width: 767.98px) {
  .entity-list__layout--panel > :first-child {
    margin-bottom: 0.75rem;
  }
}

.entity-list__status {
  color: var(--color-text-muted);
  max-width: 480px;
}

.entity-list__status--error {
  color: var(--color-accent);
}
</style>
