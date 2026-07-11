<script setup lang="ts">
// app/src/views/ReportsView.vue
//
// TASK-013: pre-built reports & dashboard, at /reports. Each report is a
// card with a title, one-line description, an (optional data-quality) note,
// a hand-rolled SVG chart (src/components/charts) and a compact top-N table
// — both the chart and the table drill down to a filtered /query view or an
// entity page wherever the report defines a link. All aggregation lives in
// src/reports/definitions.ts as pure functions over the graph store, which
// satisfies the small GraphLike interface those functions need structurally
// (nodesByType/nodeById/edgesFrom/edgesTo), so there is no adapter here.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useGraphStore } from '@/stores/graph';
import { getAllReports, type ReportResult } from '@/reports/definitions';
import BarChartH from '@/components/charts/BarChartH.vue';
import BarChartV from '@/components/charts/BarChartV.vue';
import { toCsv, downloadCsv } from '@/utils/csv';
import { slugify } from '@/utils/slug';
import { printMode, triggerPrint } from '@/composables/printMode';
import type { ColumnDef } from '@/types/table';

const graph = useGraphStore();

const reports = computed<ReportResult[]>(() => (graph.loaded ? getAllReports(graph) : []));
const isLoading = computed(() => !graph.loaded && !graph.error);

// TASK-014: per-report CSV export. report.table.rows don't carry a rank —
// it's purely the row's position in the (already-sorted) top-N list — so
// build a small export-only row shape with it baked in rather than
// threading an index through a ColumnDef accessor, which only ever sees one
// row at a time.
interface ReportCsvRow {
  rank: number;
  label: string;
  displayValue: string;
}

function reportCsvColumns(report: ReportResult): ColumnDef<ReportCsvRow>[] {
  return [
    { key: 'rank', label: '#', accessor: (r) => r.rank },
    { key: 'name', label: 'Name', accessor: (r) => r.label },
    { key: 'value', label: report.table.valueLabel, accessor: (r) => r.displayValue },
  ];
}

function onDownloadReportCsv(report: ReportResult) {
  const csvRows: ReportCsvRow[] = report.table.rows.map((row, index) => ({
    rank: index + 1,
    label: row.label,
    displayValue: row.displayValue,
  }));
  const csv = toCsv(csvRows, reportCsvColumns(report));
  downloadCsv(`${slugify(report.title)}.csv`, csv);
}

function onPrintReports() {
  triggerPrint().catch(() => {});
}
</script>

<template>
  <div class="reports container">
    <header class="reports__header">
      <div class="reports__header-row">
        <h1>Reports</h1>
        <button
          v-if="!printMode && reports.length > 0"
          type="button"
          class="reports__print-btn"
          @click="onPrintReports"
        >
          Print view
        </button>
      </div>
      <p>Pre-built reports over the whole knowledge graph &mdash; rankings, distributions, and where the data comes up short.</p>
    </header>

    <p v-if="graph.error" class="reports__status reports__status--error">
      Could not load the graph: {{ graph.error }}
    </p>
    <p v-else-if="isLoading" class="reports__status">Loading&hellip;</p>

    <div v-else class="reports__grid">
      <article v-for="report in reports" :key="report.id" class="report-card">
        <h2 class="report-card__title">{{ report.title }}</h2>
        <p class="report-card__description">{{ report.description }}</p>
        <p v-if="report.note" class="report-card__note">{{ report.note }}</p>

        <div class="report-card__chart">
          <BarChartH
            v-if="report.chart.kind === 'bar-h'"
            :items="report.chart.items"
            :unit="report.chart.unit"
            :title="report.title"
            :description="report.description"
          />
          <BarChartV
            v-else
            :buckets="report.chart.buckets"
            :unit="report.chart.unit"
            :title="report.title"
            :description="report.description"
          />
        </div>

        <div v-if="!printMode && report.table.rows.length > 0" class="report-card__toolbar">
          <button type="button" class="report-card__csv-btn" @click="onDownloadReportCsv(report)">
            Download CSV
          </button>
        </div>

        <table class="report-card__table">
          <caption class="sr-only">{{ report.title }} &mdash; top entries</caption>
          <thead>
            <tr>
              <th scope="col" class="report-card__rank-col">#</th>
              <th scope="col">Name</th>
              <th scope="col">{{ report.table.valueLabel }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in report.table.rows" :key="row.label + index">
              <td class="report-card__rank-col">{{ index + 1 }}</td>
              <td>
                <RouterLink v-if="row.link" :to="row.link" class="report-card__row-link">{{ row.label }}</RouterLink>
                <span v-else>{{ row.label }}</span>
              </td>
              <td>{{ row.displayValue }}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  </div>
</template>

<style scoped>
.reports {
  padding: 2.5rem 1.5rem 4rem;
}

.reports__header {
  margin-bottom: 1.75rem;
}

.reports__header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.reports__header-row h1 {
  margin-bottom: 0;
}

.reports__print-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 6px;
  padding: 0.35rem 0.8rem;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.reports__print-btn:hover {
  background: var(--color-brand-light);
  color: var(--color-brand);
}

.reports__header p {
  color: var(--color-text-muted);
  margin: 0;
}

.reports__status {
  color: var(--color-text-muted);
}

.reports__status--error {
  color: var(--color-accent);
}

.reports__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 1.5rem;
}

.report-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.25rem 1.25rem 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.report-card__title {
  font-size: 1.15rem;
  margin: 0;
}

.report-card__description {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.report-card__note {
  /* TASK-018: --color-accent-text (not --color-accent) — see style.css's
     comment on that token; plain --color-accent only reaches ~4.5:1 here,
     right at the AA boundary with no safety margin. */
  color: var(--color-accent-text);
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  background: rgba(179, 84, 30, 0.08);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
}

.report-card__chart {
  margin: 0.25rem 0 0.5rem;
}

.report-card__toolbar {
  display: flex;
  justify-content: flex-end;
}

.report-card__csv-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.report-card__csv-btn:hover {
  background: var(--color-brand-light);
  color: var(--color-brand);
}

.report-card__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.report-card__table th,
.report-card__table td {
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.report-card__table th {
  color: var(--color-text-muted);
  font-weight: 700;
  white-space: nowrap;
}

.report-card__rank-col {
  width: 2rem;
  color: var(--color-text-muted);
}

.report-card__row-link {
  color: var(--color-brand);
  font-weight: 600;
}

/* .sr-only is now a global utility class (see src/style.css) — TASK-018. */
</style>
