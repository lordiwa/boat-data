<script setup lang="ts">
// app/src/views/QueryView.vue
//
// TASK-011: the guided, no-SQL query builder — pick an entity type, add
// attribute/relation filter rows via dropdowns and inputs (no query
// language), see live results in the shared DataTable with a live count and
// a plain-English restatement above it. The whole query state round-trips
// through the URL (router.replace, so it never spams browser history) so a
// bookmarked or pasted link reproduces the same results; a malformed query
// string degrades to the default (Yachts, no filters) rather than crashing.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import { useTypeRows } from '@/composables/useTypeRows';
import { getColumnsForType } from '@/utils/columns';
import { labelForType, singularLabelForType, iconForType } from '@/utils/labels';
import { KNOWN_NODE_TYPES } from '@/utils/nodeTypes';
import DataTable from '@/components/DataTable.vue';
import { runQuery } from '@/query/engine';
import { describeQuery } from '@/query/describe';
import { decodeQuery, encodeQuery } from '@/query/urlCodec';
import { printMode } from '@/composables/printMode';
import {
  opsForValueKind,
  QUERYABLE_FIELDS,
  type AttrOp,
  type FieldMeta,
  type Filter,
  type Query,
} from '@/query/model';
import type { NodeType } from '@/types/graph';

const graph = useGraphStore();
const route = useRoute();
const router = useRouter();

const OP_LABELS: Record<AttrOp, string> = {
  eq: 'is',
  contains: 'contains',
  gte: 'is at least',
  lte: 'is at most',
  between: 'is between',
};

/** One filter row's editable UI state. A distinct shape from Filter itself so
 *  an in-progress row (field chosen but value not yet typed) can exist without
 *  producing a bogus Filter. */
interface FilterDraft {
  id: number;
  fieldSlug: string;
  op: AttrOp;
  // Vue auto-casts v-model on a `type="number"` input to a Number once it
  // holds a valid value (see DataTable.vue's own note on this), so these
  // must accept either shape even though we always initialize them as ''.
  value: string | number;
  value2: string | number;
}

/** Normalizes a v-model value that may already have been auto-cast to a Number back to text. */
function toText(value: string | number): string {
  return typeof value === 'number' ? String(value) : value;
}

let nextDraftId = 1;
function newDraft(fieldSlug = ''): FilterDraft {
  return { id: nextDraftId++, fieldSlug, op: 'eq', value: '', value2: '' };
}

const selectedType = ref<NodeType>('yacht');
const drafts = ref<FilterDraft[]>([]);

const fields = computed<FieldMeta[]>(() => QUERYABLE_FIELDS[selectedType.value] ?? []);
const attrFields = computed(() => fields.value.filter((f): f is Extract<FieldMeta, { kind: 'attr' }> => f.kind === 'attr'));
const relFields = computed(() => fields.value.filter((f): f is Extract<FieldMeta, { kind: 'rel' }> => f.kind === 'rel'));

function fieldMeta(draft: FilterDraft): FieldMeta | undefined {
  return fields.value.find((f) => f.field === draft.fieldSlug);
}

function opsFor(draft: FilterDraft): AttrOp[] {
  const meta = fieldMeta(draft);
  if (!meta || meta.kind !== 'attr') return [];
  return opsForValueKind(meta.valueKind);
}

/** Distinct neighbor names for a relation field's datalist, across all rows of the current type. */
function suggestionsFor(draft: FilterDraft): string[] {
  const meta = fieldMeta(draft);
  if (!meta || meta.kind !== 'rel') return [];
  const names = new Set<string>();
  for (const row of rows.value) {
    for (const target of row.rels?.[meta.rel] ?? []) names.add(target.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b)).slice(0, 500);
}

function onFieldChange(draft: FilterDraft) {
  const meta = fieldMeta(draft);
  draft.value = '';
  draft.value2 = '';
  if (meta && meta.kind === 'attr') {
    draft.op = opsForValueKind(meta.valueKind)[0];
  }
}

function addFilterRow() {
  const first = fields.value[0];
  drafts.value.push(newDraft(first?.field ?? ''));
}

function removeFilterRow(id: number) {
  drafts.value = drafts.value.filter((d) => d.id !== id);
}

function resetFilters() {
  drafts.value = [];
}

/** Converts a draft to a real Filter, or undefined if it's incomplete (no field chosen, no value typed yet). */
function toFilter(draft: FilterDraft): Filter | undefined {
  const meta = fieldMeta(draft);
  if (!meta) return undefined;

  if (meta.kind === 'rel') {
    const name = toText(draft.value).trim();
    if (!name) return undefined;
    return { kind: 'rel', rel: meta.rel, direction: 'out', targetName: name };
  }

  if (meta.valueKind === 'number') {
    if (draft.op === 'between') {
      const rawA = toText(draft.value).trim();
      const rawB = toText(draft.value2).trim();
      if (!rawA || !rawB) return undefined;
      const a = Number(rawA);
      const b = Number(rawB);
      if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
      return { kind: 'attr', field: meta.field, op: 'between', value: a, value2: b };
    }
    const raw = toText(draft.value).trim();
    if (!raw) return undefined;
    const n = Number(raw);
    if (Number.isNaN(n)) return undefined;
    return { kind: 'attr', field: meta.field, op: draft.op, value: n };
  }

  const text = toText(draft.value).trim();
  if (!text) return undefined;
  return { kind: 'attr', field: meta.field, op: draft.op, value: text };
}

const effectiveQuery = computed<Query>(() => ({
  type: selectedType.value,
  filters: drafts.value.map(toFilter).filter((f): f is Filter => f !== undefined),
}));

const typeRef = computed(() => selectedType.value);
const rows = useTypeRows(typeRef);
const columns = computed(() => getColumnsForType(selectedType.value));
const isLoading = computed(() => !graph.loaded && !graph.error);

function isNumberField(draft: FilterDraft): boolean {
  const meta = fieldMeta(draft);
  return !!meta && meta.kind === 'attr' && meta.valueKind === 'number';
}

const resultRows = computed(() => runQuery(rows.value, effectiveQuery.value));
const description = computed(() => describeQuery(effectiveQuery.value));
const hasActiveFilters = computed(() => effectiveQuery.value.filters.length > 0);

function rowKey(row: { node: { id: string } }): string {
  return row.node.id;
}

function selectType(type: NodeType) {
  if (type === selectedType.value) return;
  selectedType.value = type;
  drafts.value = [];
}

function draftsFromQuery(query: Query): FilterDraft[] {
  const typeFields = QUERYABLE_FIELDS[query.type] ?? [];
  const result: FilterDraft[] = [];
  for (const filter of query.filters) {
    if (filter.kind === 'rel') {
      const meta = typeFields.find((f): f is Extract<FieldMeta, { kind: 'rel' }> => f.kind === 'rel' && f.rel === filter.rel);
      if (!meta) continue;
      // urlCodec never decodes a targetId-form relation filter (see its
      // module header) — only targetName ever reaches this UI.
      result.push({
        id: nextDraftId++,
        fieldSlug: meta.field,
        op: 'eq',
        value: filter.targetName ?? '',
        value2: '',
      });
    } else {
      const meta = typeFields.find((f) => f.field === filter.field);
      if (!meta) continue;
      result.push({
        id: nextDraftId++,
        fieldSlug: filter.field,
        op: filter.op,
        value: String(filter.value ?? ''),
        value2: filter.op === 'between' ? String(filter.value2 ?? '') : '',
      });
    }
  }
  return result;
}

// Reproduce whatever query a shared/bookmarked URL encodes, on first load.
// Malformed input decodes to null and we simply keep the default (Yachts, no
// filters) — never crash, never leave a half-broken state.
let restoring = true;
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const decoded = decodeQuery(params);
  if (decoded) {
    selectedType.value = decoded.type;
    drafts.value = draftsFromQuery(decoded);
  }
  restoring = false;
});

// Keep the URL in sync with every change, via replace (not push) so typing
// in a filter's value box doesn't spam browser history.
watch(
  effectiveQuery,
  (query) => {
    if (restoring) return;
    const params = encodeQuery(query);
    const search: Record<string, string | string[]> = { type: params.get('type') ?? query.type };
    const fValues = params.getAll('f');
    if (fValues.length) search.f = fValues;
    router.replace({ path: route.path, query: search }).catch(() => {});
  },
  { deep: true },
);
</script>

<template>
  <div class="query-view container">
    <header v-if="!printMode" class="query-view__header">
      <h1>Query</h1>
      <p>Pick a type of entity, add filters, and see matching results &mdash; no query language required.</p>
    </header>

    <p v-if="graph.error" class="query-view__status query-view__status--error">
      Could not load the graph: {{ graph.error }}
    </p>

    <template v-else>
      <!-- TASK-014: the query builder itself is chrome, not a result — hidden
           during print/PDF (DataTable's own print title already restates the
           query as a plain-English sentence via `description` below). -->
      <section v-if="!printMode" class="query-view__types" aria-label="Choose an entity type">
        <button
          v-for="type in KNOWN_NODE_TYPES"
          :key="type"
          type="button"
          class="type-card"
          :class="{ 'type-card--active': type === selectedType }"
          :aria-pressed="type === selectedType"
          @click="selectType(type)"
        >
          <span class="type-card__icon" aria-hidden="true">{{ iconForType(type) }}</span>
          <span class="type-card__label">{{ labelForType(type) }}</span>
        </button>
      </section>

      <section v-if="!printMode" class="query-view__filters" aria-label="Filters">
        <div v-for="draft in drafts" :key="draft.id" class="filter-row">
          <select
            class="filter-row__field"
            v-model="draft.fieldSlug"
            aria-label="Field"
            @change="onFieldChange(draft)"
          >
            <option value="" disabled>Choose a field&hellip;</option>
            <optgroup label="Attributes">
              <option v-for="f in attrFields" :key="f.field" :value="f.field">{{ f.label }}</option>
            </optgroup>
            <optgroup v-if="relFields.length" label="Relations">
              <option v-for="f in relFields" :key="f.field" :value="f.field">{{ f.label }}</option>
            </optgroup>
          </select>

          <select
            v-if="fieldMeta(draft)?.kind === 'attr'"
            class="filter-row__op"
            v-model="draft.op"
            aria-label="Comparison"
          >
            <option v-for="op in opsFor(draft)" :key="op" :value="op">{{ OP_LABELS[op] }}</option>
          </select>
          <span v-else-if="fieldMeta(draft)?.kind === 'rel'" class="filter-row__op-label">contains</span>

          <template v-if="fieldMeta(draft)?.kind === 'rel'">
            <input
              type="text"
              class="filter-row__value"
              v-model="draft.value"
              :list="`suggestions-${draft.id}`"
              placeholder="e.g. Feadship"
              aria-label="Value"
            />
            <datalist :id="`suggestions-${draft.id}`">
              <option v-for="name in suggestionsFor(draft)" :key="name" :value="name" />
            </datalist>
          </template>
          <template v-else-if="isNumberField(draft)">
            <input type="number" class="filter-row__value filter-row__value--number" v-model="draft.value" aria-label="Value" />
            <template v-if="draft.op === 'between'">
              <span class="filter-row__and">and</span>
              <input
                type="number"
                class="filter-row__value filter-row__value--number"
                v-model="draft.value2"
                aria-label="Second value"
              />
            </template>
          </template>
          <template v-else>
            <input type="text" class="filter-row__value" v-model="draft.value" placeholder="Value" aria-label="Value" />
          </template>

          <button type="button" class="filter-row__remove" aria-label="Remove filter" @click="removeFilterRow(draft.id)">
            &times;
          </button>
        </div>

        <div class="query-view__actions">
          <button type="button" class="btn btn--secondary" @click="addFilterRow">+ Add filter</button>
          <button type="button" class="btn btn--ghost" :disabled="!drafts.length" @click="resetFilters">
            Reset filters
          </button>
        </div>
      </section>

      <p v-if="!printMode" class="query-view__describe">{{ description }}</p>
      <p v-if="!printMode && !hasActiveFilters" class="query-view__hint">
        Showing every {{ singularLabelForType(selectedType).toLowerCase() }} in the graph. Add a filter above to
        narrow the results.
      </p>

      <DataTable
        :rows="resultRows"
        :columns="columns"
        :loading="isLoading"
        :row-key="rowKey"
        :empty-message="`No ${labelForType(selectedType).toLowerCase()} match this query.`"
        export-name="query-results.csv"
        export-title="Query results"
        :print-subtitle="description"
      />
    </template>
  </div>
</template>

<style scoped>
.query-view {
  padding: 2.5rem 1.5rem 4rem;
}

.query-view__header {
  margin-bottom: 1.5rem;
}

.query-view__header p {
  color: var(--color-text-muted);
  margin: 0;
}

.query-view__status {
  color: var(--color-text-muted);
}

.query-view__status--error {
  color: var(--color-accent);
}

.query-view__types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.6rem;
  margin-bottom: 1.75rem;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem 0.5rem;
  cursor: pointer;
  font-family: var(--font-sans);
  color: var(--color-text);
}

.type-card:hover {
  border-color: var(--color-brand);
}

.type-card--active {
  background: var(--color-brand-light);
  border-color: var(--color-brand);
  color: var(--color-brand);
  font-weight: 700;
}

.type-card__icon {
  font-size: 1.3rem;
}

.type-card__label {
  font-size: 0.85rem;
  text-align: center;
}

.query-view__filters {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.4rem 0;
}

.filter-row + .filter-row {
  border-top: 1px solid var(--color-border);
}

.filter-row select,
.filter-row__value {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  color: var(--color-text);
  background: var(--color-bg);
}

.filter-row__field {
  min-width: 160px;
}

.filter-row__op {
  min-width: 120px;
}

.filter-row__op-label {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  min-width: 120px;
}

.filter-row__value--number {
  width: 6.5rem;
}

.filter-row__and {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.filter-row__remove {
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
}

.filter-row__remove:hover {
  color: var(--color-accent);
}

.query-view__actions {
  display: flex;
  gap: 0.6rem;
  padding-top: 0.75rem;
}

.btn {
  border-radius: 6px;
  padding: 0.45rem 0.9rem;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid var(--color-border);
}

.btn--secondary {
  background: var(--color-brand-light);
  color: var(--color-brand);
  border-color: var(--color-brand-light);
  font-weight: 600;
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-muted);
}

.btn--ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.query-view__describe {
  font-style: italic;
  color: var(--color-text);
  margin-bottom: 0.4rem;
}

.query-view__hint {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: -0.2rem;
}
</style>
