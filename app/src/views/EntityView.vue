<script setup lang="ts">
// app/src/views/EntityView.vue
//
// TASK-010: the "Wikipedia article" for a single entity — replaces the
// TASK-008 placeholder. Shows a type-aware attribute panel, both directions
// of the entity's relationships (outgoing as plain links, big incoming sets
// reusing EntityListView's DataTable + column presets), a provenance list,
// and a breadcrumb back to the entity's type list. An unknown id renders a
// friendly not-found message rather than a blank page.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import { useTypeRows } from '@/composables/useTypeRows';
import type { EnrichedRow } from '@/composables/useTypeRows';
import { getColumnsForType } from '@/utils/columns';
import { labelForType } from '@/utils/labels';
import { isPlaceholderName } from '@/utils/placeholder';
import { buildConflictEntries, provenanceFiles } from '@/utils/attrs';
import { inverseGroupAnchor } from '@/utils/relAnchors';
import { slugify } from '@/utils/slug';
import AttrPanel from '@/components/AttrPanel.vue';
import DataTable from '@/components/DataTable.vue';
import QuickActions from '@/components/QuickActions.vue';
import type { ColumnDef } from '@/types/table';
import type { EdgeRel, GraphNode, NodeType } from '@/types/graph';

const props = defineProps<{ id: string }>();

const graph = useGraphStore();

const node = computed(() => graph.nodeById(props.id));

// --- Header: conflicting-source-data indicator -----------------------------
const conflictEntries = computed(() => (node.value ? buildConflictEntries(node.value.attrs.conflicts) : []));

// --- Header: data-quality warning (TASK-020: RIO/MOSAIQUE flags, and any
// future graphCleanup.js QUALITY_FLAGS entry) — a visible banner, not just
// another row in the generic attr grid (attrs.ts hides `data_quality` from
// AttrPanel for exactly this reason).
const dataQualityWarning = computed(() => {
  const value = node.value?.attrs.data_quality;
  return typeof value === 'string' && value.trim() !== '' ? value : null;
});

// --- Provenance --------------------------------------------------------
const provenance = computed(() => (node.value ? provenanceFiles(node.value.attrs) : []));

// --- Outgoing relationships, grouped by relation, in a fixed reading order --
const OUTGOING_ORDER: EdgeRel[] = [
  'built_by',
  'owned_by',
  'located_in',
  'based_in',
  'designed_by',
  'powered_by',
  'operated_by',
  'made_by',
  'oem_supplies',
  'part_of',
];

const OUTGOING_LABELS: Record<EdgeRel, string> = {
  built_by: 'Built by',
  owned_by: 'Owned by',
  located_in: 'Located in',
  based_in: 'Based in',
  designed_by: 'Designed by',
  powered_by: 'Powered by',
  // TASK-016: shipyard -> builder/company.
  operated_by: 'Operated by',
  // TASK-017: engine_model -> engine brand; engine brand -> engine brand.
  made_by: 'Made by',
  oem_supplies: 'Supplies OEM engines to',
  part_of: 'Part of',
};

interface OutgoingGroup {
  rel: EdgeRel;
  label: string;
  nodes: GraphNode[];
}

const outgoingGroups = computed<OutgoingGroup[]>(() => {
  if (!node.value) return [];
  const groups: OutgoingGroup[] = [];
  for (const rel of OUTGOING_ORDER) {
    const edges = graph.edgesFrom(node.value.id, rel);
    if (!edges.length) continue;
    const nodes = edges.map((e) => graph.nodeById(e.dst)).filter((n): n is GraphNode => Boolean(n));
    if (nodes.length) groups.push({ rel, label: OUTGOING_LABELS[rel], nodes });
  }
  return groups;
});

// --- Incoming relationships, grouped by (relation, source type) ------------
// Rows come from useTypeRows/getColumnsForType (TASK-009) — the same
// enrichment and column presets EntityListView.vue uses — filtered down to
// just the neighbors of this entity, so a builder's "yachts built here"
// table, say, is a strict subset of /browse/yacht with the same columns.
interface InverseGroupDef {
  rel: EdgeRel;
  srcType: NodeType;
  heading: string;
  /** Column key to drop — redundant once every row is known to relate to this page's entity. */
  omit?: string;
}

const INVERSE_GROUP_DEFS: InverseGroupDef[] = [
  { rel: 'built_by', srcType: 'yacht', heading: 'Yachts built here', omit: 'builder' },
  { rel: 'owned_by', srcType: 'yacht', heading: 'Yachts owned', omit: 'owner' },
  { rel: 'designed_by', srcType: 'yacht', heading: 'Yachts designed' },
  { rel: 'powered_by', srcType: 'yacht', heading: 'Yachts powered by this engine' },
  { rel: 'located_in', srcType: 'club', heading: 'Clubs here', omit: 'location' },
  { rel: 'located_in', srcType: 'marina', heading: 'Marinas here', omit: 'location' },
  { rel: 'based_in', srcType: 'company', heading: 'Companies here', omit: 'base' },
  { rel: 'located_in', srcType: 'shipyard', heading: 'Shipyards here', omit: 'location' },
  { rel: 'made_by', srcType: 'engine_model', heading: 'Engine models', omit: 'brandName' },
  { rel: 'part_of', srcType: 'region', heading: 'Sub-regions' },
  // TASK-019: a company (or, per builderEnrichmentMapper.js's resolution
  // order, occasionally another builder) that owns one or more builders —
  // mirrors engine's own TASK-017 owned_by inverse group pattern (engine
  // doesn't currently have its own inverse group listed here either; this
  // is builder's first).
  { rel: 'owned_by', srcType: 'builder', heading: 'Builders owned', omit: 'ownerName' },
];

// One lazily-evaluated (Vue computed = memoized + only runs when read) row
// set per source type used above; shared across every group of that type
// (e.g. all four yacht-sourced groups reuse the same 605-row computation).
const rowsByType: Partial<Record<NodeType, ReturnType<typeof useTypeRows>>> = {
  yacht: useTypeRows(computed(() => 'yacht' as NodeType)),
  club: useTypeRows(computed(() => 'club' as NodeType)),
  marina: useTypeRows(computed(() => 'marina' as NodeType)),
  company: useTypeRows(computed(() => 'company' as NodeType)),
  region: useTypeRows(computed(() => 'region' as NodeType)),
  shipyard: useTypeRows(computed(() => 'shipyard' as NodeType)),
  engine_model: useTypeRows(computed(() => 'engine_model' as NodeType)),
  builder: useTypeRows(computed(() => 'builder' as NodeType)),
};

interface InverseGroup {
  key: string;
  /** DOM id this group's wrapper renders with — see utils/relAnchors.ts and QuickActions.vue,
   *  which link straight to this id rather than duplicating the naming scheme. */
  anchorId: string;
  heading: string;
  rows: EnrichedRow[];
  columns: ColumnDef<EnrichedRow>[];
  useTable: boolean;
  /** TASK-014: CSV filename for this group's table, e.g. 'oceanco-yachts.csv'. */
  exportName: string;
}

/** Below this row count a plain link list reads better than a full sortable/filterable table. */
const TABLE_THRESHOLD = 4;

const inverseGroups = computed<InverseGroup[]>(() => {
  if (!node.value) return [];
  const id = node.value.id;
  const groups: InverseGroup[] = [];
  for (const def of INVERSE_GROUP_DEFS) {
    const edges = graph.edgesTo(id, def.rel).filter((e) => graph.nodeById(e.src)?.type === def.srcType);
    if (!edges.length) continue;
    const idSet = new Set(edges.map((e) => e.src));
    const allRows = rowsByType[def.srcType]?.value ?? [];
    const rows = allRows.filter((r) => idSet.has(r.node.id));
    if (!rows.length) continue;
    const columns = getColumnsForType(def.srcType).filter((c) => c.key !== def.omit);
    groups.push({
      key: `${def.rel}:${def.srcType}`,
      anchorId: inverseGroupAnchor(def.rel, def.srcType),
      heading: def.heading,
      rows,
      columns,
      useTable: rows.length >= TABLE_THRESHOLD,
      exportName: `${slugify(node.value.name)}-${slugify(labelForType(def.srcType))}.csv`,
    });
  }
  return groups;
});

const hasRelationships = computed(() => outgoingGroups.value.length > 0 || inverseGroups.value.length > 0);

function rowKey(row: EnrichedRow): string {
  return row.node.id;
}
</script>

<template>
  <div class="entity container">
    <div v-if="!graph.loaded && !graph.error" class="entity__status">Loading the knowledge graph&hellip;</div>
    <div v-else-if="graph.error" class="entity__status entity__status--error">
      Could not load the graph: {{ graph.error }}
    </div>
    <div v-else-if="!node" class="entity__status entity__not-found">
      <h1>Entity not found</h1>
      <p>No entity with id &ldquo;{{ id }}&rdquo; exists in this graph.</p>
      <p>Try the search box above, or browse by type instead.</p>
      <RouterLink to="/explore">Back to Explore</RouterLink>
    </div>
    <template v-else>
      <nav class="entity__breadcrumb" aria-label="Breadcrumb">
        <RouterLink to="/explore">Explore</RouterLink>
        <span aria-hidden="true">&rsaquo;</span>
        <RouterLink :to="`/browse/${node.type}`">{{ labelForType(node.type) }}</RouterLink>
        <span aria-hidden="true">&rsaquo;</span>
        <span class="entity__breadcrumb-current">{{ node.name }}</span>
      </nav>

      <header class="entity__header">
        <div class="entity__badges">
          <span class="entity__type-badge">{{ labelForType(node.type) }}</span>
          <span v-if="isPlaceholderName(node.name)" class="entity__unspecified-badge">unspecified</span>
        </div>
        <h1 class="entity__title">{{ node.name }}</h1>

        <p v-if="dataQualityWarning" class="entity__data-quality-warning" role="alert">
          <span class="entity__data-quality-warning-icon" aria-hidden="true">&#9888;</span>
          Data quality: {{ dataQualityWarning }}
        </p>

        <details v-if="conflictEntries.length" class="entity__conflicts">
          <summary class="entity__conflicts-summary">Has conflicting source data</summary>
          <dl class="entity__conflicts-detail">
            <template v-for="c in conflictEntries" :key="c.label">
              <dt>{{ c.label }}</dt>
              <dd>
                <ul>
                  <li v-for="(v, i) in c.values" :key="i">{{ v }}</li>
                </ul>
              </dd>
            </template>
          </dl>
        </details>
      </header>

      <QuickActions :node="node" />

      <section class="entity__section">
        <h2>Details</h2>
        <AttrPanel :attrs="node.attrs" />
      </section>

      <section v-if="hasRelationships" class="entity__section">
        <h2>Relationships</h2>

        <div v-for="group in outgoingGroups" :key="group.rel" class="entity__rel-group">
          <h3>{{ group.label }}</h3>
          <ul class="entity__rel-list">
            <li v-for="dst in group.nodes" :key="dst.id">
              <RouterLink :to="{ name: 'entity', params: { id: dst.id } }">{{ dst.name }}</RouterLink>
              <span v-if="isPlaceholderName(dst.name)" class="entity__unspecified-badge">unspecified</span>
            </li>
          </ul>
        </div>

        <div v-for="group in inverseGroups" :key="group.key" :id="group.anchorId" tabindex="-1" class="entity__rel-group">
          <h3>{{ group.heading }} <span class="entity__rel-count">({{ group.rows.length }})</span></h3>
          <DataTable
            v-if="group.useTable"
            :rows="group.rows"
            :columns="group.columns"
            :row-key="rowKey"
            :export-name="group.exportName"
            :export-title="`${node.name} — ${group.heading}`"
          />
          <ul v-else class="entity__rel-list">
            <li v-for="row in group.rows" :key="row.node.id">
              <RouterLink :to="{ name: 'entity', params: { id: row.node.id } }">{{ row.node.name }}</RouterLink>
              <span v-if="isPlaceholderName(row.node.name)" class="entity__unspecified-badge">unspecified</span>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="provenance.length" class="entity__section">
        <details class="entity__sources">
          <summary class="entity__sources-summary">Sources ({{ provenance.length }})</summary>
          <ul class="entity__sources-list">
            <li v-for="file in provenance" :key="file">{{ file }}</li>
          </ul>
        </details>
      </section>
    </template>
  </div>
</template>

<style scoped>
.entity {
  padding: 2.5rem 1.5rem 4rem;
  max-width: 860px;
}

.entity__status {
  color: var(--color-text-muted);
}

.entity__status--error {
  color: var(--color-accent);
}

.entity__not-found {
  max-width: 480px;
}

.entity__breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.entity__breadcrumb-current {
  color: var(--color-text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity__header {
  margin-bottom: 2.25rem;
}

.entity__badges {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.entity__type-badge {
  display: inline-block;
  background: var(--color-brand-light);
  color: var(--color-brand);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
}

.entity__unspecified-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--color-accent);
  background: rgba(179, 84, 30, 0.12);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  margin-left: 0.4rem;
}

.entity__title {
  margin-bottom: 0.5rem;
}

.entity__data-quality-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #7a3b00;
  background: rgba(230, 145, 30, 0.15);
  border: 1px solid rgba(230, 145, 30, 0.4);
  border-radius: var(--radius);
}

.entity__data-quality-warning-icon {
  font-size: 1.1rem;
}

.entity__conflicts {
  margin-top: 0.5rem;
}

.entity__conflicts-summary {
  cursor: pointer;
  display: inline-block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
  background: rgba(179, 84, 30, 0.1);
  border-radius: 999px;
  padding: 0.25rem 0.8rem;
}

.entity__conflicts-detail {
  margin: 0.75rem 0 0;
  padding: 0.9rem 1.1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.9rem;
}

.entity__conflicts-detail dt {
  color: var(--color-text-muted);
  font-weight: 600;
  margin-top: 0.5rem;
}

.entity__conflicts-detail dt:first-child {
  margin-top: 0;
}

.entity__conflicts-detail dd {
  margin: 0.15rem 0 0;
}

.entity__conflicts-detail ul {
  margin: 0;
  padding-left: 1.1rem;
}

.entity__section {
  margin-bottom: 2.5rem;
}

.entity__section > h2 {
  font-size: 1.15rem;
  margin-bottom: 1rem;
}

.entity__rel-group {
  margin-bottom: 1.5rem;
  /* QuickActions' anchor chips jump straight to a group's id; a little
     breathing room above the scroll target keeps the heading from landing
     flush against the viewport edge. No sticky header exists to clear. */
  scroll-margin-top: 1rem;
}

.entity__rel-group:focus {
  outline: none;
}

.entity__rel-group:last-child {
  margin-bottom: 0;
}

.entity__rel-group h3 {
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-muted);
  margin: 0 0 0.5rem;
}

.entity__rel-count {
  font-weight: 400;
}

.entity__rel-list {
  margin: 0;
  padding-left: 1.25rem;
}

.entity__rel-list li {
  margin-bottom: 0.35rem;
}

.entity__sources-summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text);
}

.entity__sources-list {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.entity__sources-list li {
  margin-bottom: 0.3rem;
}
</style>
