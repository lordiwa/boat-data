<script setup lang="ts">
// app/src/views/EntityListView.vue
//
// TASK-009: one parameterized list view for all 9 node types, at
// /browse/:type. Renders a sortable, filterable, paginated DataTable using
// the type's column preset (utils/columns.ts) over rows enriched once by
// composables/useTypeRows.ts. An unknown `:type` (typo'd URL, stale link,
// etc.) renders a friendly message instead of a blank or crashing table.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import { useTypeRows } from '@/composables/useTypeRows';
import { getColumnsForType } from '@/utils/columns';
import { isKnownNodeType } from '@/utils/nodeTypes';
import { labelForType } from '@/utils/labels';
import { slugify } from '@/utils/slug';
import { printMode } from '@/composables/printMode';
import DataTable from '@/components/DataTable.vue';
import type { NodeType } from '@/types/graph';

const props = defineProps<{ type: string }>();

const graph = useGraphStore();

const isKnown = computed(() => isKnownNodeType(props.type));
// Safe to assert once isKnown is true; useTypeRows/getColumnsForType are only
// invoked with the guarded value below (unknown types render the 404 branch
// and never reach the DataTable that consumes these).
const knownType = computed(() => props.type as NodeType);

const rows = useTypeRows(knownType);
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
      <DataTable
        v-else
        :key="props.type"
        :rows="rows"
        :columns="columns"
        :loading="isLoading"
        :row-key="rowKey"
        :empty-message="`No ${label.toLowerCase()} in the graph.`"
        :export-name="exportName"
        :export-title="label"
      />
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

.entity-list__status {
  color: var(--color-text-muted);
  max-width: 480px;
}

.entity-list__status--error {
  color: var(--color-accent);
}
</style>
