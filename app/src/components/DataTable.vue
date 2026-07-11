<script setup lang="ts">
// app/src/components/DataTable.vue
//
// TASK-009: a generic, reusable table used by EntityListView.vue for every
// node type. Sorting, per-column filtering and pagination all happen here,
// client-side, over whatever `rows`/`columns` the caller passes in — the
// component itself has no notion of "yacht" or "marina". Pagination (fixed
// 50 rows/page) rather than virtual scroll keeps this simple and robust
// for the largest type (605 yachts, 893 marinas) without measuring row
// heights or listening to scroll events.
//
// TASK-014: adds a "Download CSV" + "Print view" toolbar. Both act on
// `sortedRows` (the full filtered+sorted set, from utils/tableRows.ts) —
// never `pagedRows` — so export/print reflect the exact current view, not
// just whichever 50-row page happens to be showing. Print view flips the
// shared `printMode` ref (composables/printMode.ts) before calling
// `window.print()`, which this component uses to render every row (instead
// of the current page) and to swap the toolbar/filter row/pagination
// controls for a print-only title block.
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import type { ColumnDef } from '@/types/table';
import { filterRows, sortRows } from '@/utils/tableRows';
import { downloadCsv, toCsv } from '@/utils/csv';
import { printMode, triggerPrint } from '@/composables/printMode';

const props = withDefaults(
  defineProps<{
    rows: any[];
    columns: ColumnDef[];
    /** Row identity for :key and click-through; defaults to the row's index. */
    rowKey?: (row: any, index: number) => string | number;
    loading?: boolean;
    /** Shown when `rows` is empty and not loading. */
    emptyMessage?: string;
    /** CSV download filename, e.g. 'yachts.csv', 'query-results.csv'. */
    exportName?: string;
    /** Print view's h1; falls back to a generic "Results" when omitted. */
    exportTitle?: string;
    /** Optional line under the print title, e.g. the query builder's plain-English sentence. */
    printSubtitle?: string;
  }>(),
  {
    rowKey: (_row: any, index: number) => index,
    loading: false,
    emptyMessage: 'No data available.',
    exportName: 'export.csv',
    exportTitle: '',
    printSubtitle: '',
  },
);

const router = useRouter();

const PAGE_SIZE = 50;

const sortState = reactive<{ key: string | null; dir: 1 | -1 }>({ key: null, dir: 1 });
// Note: Vue auto-casts v-model on a static `type="number"` input to a Number
// once it holds a valid value (no `.number` modifier needed), so min/max can
// be either a string (initial/empty) or a number — parseFilterBound below
// handles both.
const filterState = reactive<Record<string, { text: string; min: string | number; max: string | number }>>({});
const page = ref(1);

// Whenever the caller swaps in a different column set (i.e. the entity type
// changed), sort/filter/page state from the previous type is meaningless —
// reset it rather than leaving stale filters silently applied.
watch(
  () => props.columns,
  (cols) => {
    sortState.key = null;
    sortState.dir = 1;
    page.value = 1;
    for (const key of Object.keys(filterState)) delete filterState[key];
    for (const col of cols) {
      if (col.filterable) filterState[col.key] = { text: '', min: '', max: '' };
    }
  },
  { immediate: true },
);

// Filtering/sorting themselves live in utils/tableRows.ts — a plain,
// pagination-agnostic module — so CSV export can use the exact same
// filtered+sorted set the table displays, and its own tests can prove
// pagination never limits what gets exported.
const filteredRows = computed(() => filterRows(props.rows, props.columns, filterState));
const sortedRows = computed(() => sortRows(filteredRows.value, props.columns, sortState));

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / PAGE_SIZE)));

// Reset to page 1 whenever filtering/sorting narrows the result set enough
// that the current page no longer exists.
watch(totalPages, (pages) => {
  if (page.value > pages) page.value = 1;
});
watch(filterState, () => {
  page.value = 1;
});
watch(
  () => [sortState.key, sortState.dir],
  () => {
    page.value = 1;
  },
);

const pagedRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE;
  return sortedRows.value.slice(start, start + PAGE_SIZE);
});

// Print mode disables pagination: the printed/PDF'd table is every
// filtered+sorted row, not just whatever page happened to be showing when
// "Print view" was clicked.
const displayRows = computed(() => (printMode.value ? sortedRows.value : pagedRows.value));

const hasRows = computed(() => props.rows.length > 0);

const generatedOn = computed(() =>
  new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
);

function onDownloadCsv() {
  const csv = toCsv(sortedRows.value, props.columns);
  downloadCsv(props.exportName, csv);
}

function onPrintClick() {
  triggerPrint().catch(() => {});
}

function onHeaderClick(col: ColumnDef) {
  if (sortState.key === col.key) {
    sortState.dir = sortState.dir === 1 ? -1 : 1;
  } else {
    sortState.key = col.key;
    sortState.dir = 1;
  }
}

function ariaSort(col: ColumnDef): 'ascending' | 'descending' | 'none' {
  if (sortState.key !== col.key) return 'none';
  return sortState.dir === 1 ? 'ascending' : 'descending';
}

function rowLinkColumn(): ColumnDef | undefined {
  return props.columns.find((c) => c.link);
}

function rowLink(row: any): RouteLocationRaw | null {
  const col = rowLinkColumn();
  return col?.link ? col.link(row) : null;
}

function onRowClick(row: any, event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('a, button, input')) return;
  const to = rowLink(row);
  if (to) router.push(to).catch(() => {});
}

function cellHref(col: ColumnDef, row: any): string | null {
  return col.href ? col.href(row) : null;
}

function cellBadge(col: ColumnDef, row: any): string | null {
  return col.badge ? col.badge(row) : null;
}

/** The cell's display text, matching the '—' fallback previously inlined in the template. */
function cellText(col: ColumnDef, row: any): string {
  const value = col.accessor(row);
  return value === null || value === undefined || value === '' ? '—' : String(value);
}
</script>

<template>
  <div class="data-table">
    <div v-if="!loading && !printMode" class="data-table__toolbar">
      <span class="data-table__count">
        {{ sortedRows.length.toLocaleString() }} of {{ rows.length.toLocaleString() }} results
      </span>
      <span v-if="hasRows" class="data-table__actions">
        <button type="button" class="data-table__action-btn" @click="onDownloadCsv">Download CSV</button>
        <button type="button" class="data-table__action-btn" @click="onPrintClick">Print view</button>
      </span>
    </div>

    <!-- Print-only title block: rendered in place of the toolbar above once
         "Print view" flips printMode on (see composables/printMode.ts). A
         plain CSS @media print rule can't render dynamic per-view text (the
         export title, the query builder's plain-English sentence), so this
         is JS-driven rather than pure CSS like the chrome-hiding rules in
         style.css. -->
    <div v-if="printMode" class="data-table__print-title">
      <h1>{{ exportTitle || 'Results' }}</h1>
      <p v-if="printSubtitle" class="data-table__print-subtitle">{{ printSubtitle }}</p>
      <p class="data-table__print-meta">DataYacht &mdash; generated {{ generatedOn }}</p>
    </div>

    <div v-if="loading" class="data-table__status">Loading&hellip;</div>
    <div v-else-if="rows.length === 0" class="data-table__status">{{ emptyMessage }}</div>
    <template v-else>
      <div class="data-table__scroll">
        <table class="data-table__table">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.key" scope="col" :aria-sort="ariaSort(col)" class="data-table__th">
                <!-- TASK-018: a real <button> inside an untouched <th scope="col">,
                     not role="button" on the <th> itself — overriding a th's
                     implicit columnheader role with "button" loses the column
                     semantics screen readers rely on when navigating the table
                     by column. A native button also gets Enter/Space activation
                     and focus styling for free, so no keydown handlers here. -->
                <button type="button" class="data-table__th-btn" @click="onHeaderClick(col)">
                  {{ col.label }}
                  <span v-if="sortState.key === col.key" class="data-table__sort-indicator" aria-hidden="true">
                    {{ sortState.dir === 1 ? '▲' : '▼' }}
                  </span>
                </button>
              </th>
            </tr>
            <tr v-if="!printMode" class="data-table__filter-row">
              <td v-for="col in columns" :key="col.key">
                <template v-if="col.filterable && col.type === 'number' && filterState[col.key]">
                  <div class="data-table__range">
                    <input
                      type="number"
                      class="data-table__filter-input data-table__filter-input--number"
                      placeholder="Min"
                      :aria-label="`Minimum ${col.label}`"
                      v-model="filterState[col.key].min"
                    />
                    <input
                      type="number"
                      class="data-table__filter-input data-table__filter-input--number"
                      placeholder="Max"
                      :aria-label="`Maximum ${col.label}`"
                      v-model="filterState[col.key].max"
                    />
                  </div>
                </template>
                <template v-else-if="col.filterable && filterState[col.key]">
                  <input
                    type="text"
                    class="data-table__filter-input"
                    placeholder="Filter…"
                    :aria-label="`Filter ${col.label}`"
                    v-model="filterState[col.key].text"
                  />
                </template>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr v-if="displayRows.length === 0">
              <td :colspan="columns.length" class="data-table__no-match">No rows match your filters.</td>
            </tr>
            <tr
              v-for="(row, index) in displayRows"
              :key="rowKey(row, index)"
              class="data-table__row"
              :class="{ 'data-table__row--linked': !!rowLink(row) }"
              @click="onRowClick(row, $event)"
            >
              <td v-for="col in columns" :key="col.key" class="data-table__td">
                <RouterLink
                  v-if="col.link"
                  :to="col.link(row)"
                  class="data-table__link data-table__cell-text"
                  :title="cellText(col, row)"
                >
                  {{ cellText(col, row) }}
                </RouterLink>
                <a
                  v-else-if="col.href && cellHref(col, row)"
                  :href="cellHref(col, row)!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="data-table__link data-table__cell-text"
                  :title="cellText(col, row)"
                  @click.stop
                >
                  {{ cellText(col, row) }}
                </a>
                <span v-else class="data-table__cell-text" :title="cellText(col, row)">{{ cellText(col, row) }}</span>
                <span v-if="cellBadge(col, row)" class="data-table__badge">{{ cellBadge(col, row) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!printMode" class="data-table__pagination">
        <button type="button" :disabled="page <= 1" @click="page--">Prev</button>
        <span class="data-table__page-indicator">Page {{ page }} of {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="page++">Next</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.data-table {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.data-table__toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  gap: 0.75rem;
}

.data-table__actions {
  display: flex;
  gap: 0.5rem;
}

.data-table__action-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.data-table__action-btn:hover {
  background: var(--color-brand-light);
  color: var(--color-brand);
}

.data-table__action-btn:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 1px;
}

/* Only ever rendered while printMode is on (see the script's printMode
   import), so no `display: none` toggle is needed here — it simply isn't
   in the DOM otherwise. */
.data-table__print-title {
  margin-bottom: 0.5rem;
}

.data-table__print-title h1 {
  margin-bottom: 0.15rem;
}

.data-table__print-subtitle {
  font-style: italic;
  margin: 0 0 0.15rem;
}

.data-table__print-meta {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 0 0 1rem;
}

.data-table__status {
  color: var(--color-text-muted);
  padding: 2rem 0;
  text-align: center;
}

.data-table__scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
}

.data-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

.data-table__th {
  text-align: left;
  padding: 0;
  background: var(--color-brand-light);
  color: var(--color-text);
  font-weight: 700;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-border);
}

/* TASK-018: the button fills the th and is styled to look exactly like the
   old clickable th did — padding/font/colors moved here from .data-table__th
   above, which now only carries table-cell-level styling. */
.data-table__th-btn {
  display: block;
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

.data-table__th-btn:hover {
  background: var(--color-border);
}

.data-table__th-btn:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: -2px;
}

.data-table__sort-indicator {
  font-size: 0.7rem;
  margin-left: 0.25rem;
  color: var(--color-brand);
}

.data-table__filter-row td {
  padding: 0.4rem 0.6rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.data-table__filter-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  font-size: 0.85rem;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-bg);
}

.data-table__filter-input:focus-visible {
  /* TASK-018: was outline: none + border-color only — a 1px border-color
     swap alone is too subtle a focus indicator (WCAG 2.4.7); pair it with a
     visible outline, matching the ring style every other focusable control
     in the app uses. */
  border-color: var(--color-brand);
  outline: 2px solid var(--color-brand);
  outline-offset: 1px;
}

.data-table__range {
  display: flex;
  gap: 0.35rem;
}

.data-table__range .data-table__filter-input--number {
  width: 4.5rem;
}

.data-table__row {
  border-bottom: 1px solid var(--color-border);
}

.data-table__row:last-child {
  border-bottom: none;
}

.data-table__row:hover {
  background: var(--color-brand-light);
}

.data-table__row--linked {
  cursor: pointer;
}

.data-table__td {
  padding: 0.55rem 0.85rem;
  white-space: nowrap;
}

/* Fast-follow to TASK-011 review: an unusually long value (e.g. an
   aggregated-listing yacht name) used to render with no width limit, which
   forced every other column off-screen. Cap and ellipsize at the cell-text
   level (rather than on .data-table__td, which auto table layout mostly
   ignores) and keep the full value available via the `title` tooltip. */
.data-table__cell-text {
  display: inline-block;
  max-width: 28ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.data-table__link {
  color: var(--color-brand);
  font-weight: 600;
}

.data-table__badge {
  display: inline-block;
  margin-left: 0.4rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  /* TASK-018: --color-accent-text (not --color-accent) — see style.css's
     comment on that token; plain --color-accent only reaches ~4.2:1 here. */
  color: var(--color-accent-text);
  background: rgba(179, 84, 30, 0.12);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
}

.data-table__no-match {
  text-align: center;
  color: var(--color-text-muted);
  padding: 1.5rem 0.85rem;
}

.data-table__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.data-table__pagination button {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 6px;
  padding: 0.35rem 0.9rem;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}

.data-table__pagination button:hover:not(:disabled) {
  background: var(--color-brand-light);
}

.data-table__pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Belt-and-suspenders for a raw browser Ctrl+P (i.e. without clicking "Print
   view" first, so printMode never flips on): the scroll clip and card
   shadow shouldn't survive onto paper even though pagination/full-row-set
   behavior in that path is unchanged (that part genuinely needs printMode's
   JS toggle — see the component's script header comment). */
@media print {
  .data-table__scroll {
    overflow: visible;
    border: none;
    box-shadow: none;
  }

  .data-table__th {
    background: none !important;
    color: #000;
  }

  thead {
    display: table-header-group;
  }

  .data-table__row {
    page-break-inside: avoid;
  }
}
</style>
