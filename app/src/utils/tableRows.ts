// app/src/utils/tableRows.ts
//
// TASK-014: the filter + sort logic that used to live entirely inside
// DataTable.vue's <script setup>, pulled out into a plain, unit-testable
// module. Two reasons:
//   1. CSV export (and its own tests, see __tests__/tableRows.spec.ts) needs
//      to prove that pagination never limits what gets exported —
//      filterRows/sortRows have no notion of a page size at all (only
//      DataTable's separate `pagedRows` computed slices for display), so
//      that guarantee holds by construction rather than by convention.
//   2. It lets the filter/sort algorithm be exercised directly, with plain
//      ColumnDef fixtures, without mounting a component.
// DataTable.vue imports these and composes them into its own `filteredRows`/
// `sortedRows` computeds; behavior is unchanged from before this refactor.
import type { ColumnDef, ColumnValue } from '@/types/table';

export type FilterState = Record<string, { text: string; min: string | number; max: string | number }>;
export type SortState = { key: string | null; dir: 1 | -1 };

function getSortValue<T>(col: ColumnDef<T>, row: T): ColumnValue {
  return (col.sortAccessor ?? col.accessor)(row);
}

export function isEmptyValue(value: ColumnValue): boolean {
  return value === null || value === undefined || value === '';
}

/** Parses a min/max filter box's value, which may already be a Number (Vue
 *  auto-casts v-model on a static `type="number"` input once it holds a
 *  valid value), so this must accept either shape. */
export function parseFilterBound(raw: string | number): number | undefined {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isNaN(n) ? undefined : n;
}

export function compareValues(a: ColumnValue, b: ColumnValue, numeric: boolean, dir: 1 | -1): number {
  const aEmpty = isEmptyValue(a);
  const bEmpty = isEmptyValue(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // nulls always sort last, regardless of direction
  if (bEmpty) return -1;
  if (numeric) return (Number(a) - Number(b)) * dir;
  return String(a).localeCompare(String(b)) * dir;
}

/** Applies every filterable column's active filter (text-contains or numeric min/max) to `rows`. */
export function filterRows<T>(rows: T[], columns: ColumnDef<T>[], filterState: FilterState): T[] {
  let result = rows;
  for (const col of columns) {
    if (!col.filterable) continue;
    const state = filterState[col.key];
    if (!state) continue;
    if (col.type === 'number') {
      const min = parseFilterBound(state.min);
      const max = parseFilterBound(state.max);
      if (min === undefined && max === undefined) continue;
      result = result.filter((row) => {
        const value = getSortValue(col, row);
        if (isEmptyValue(value)) return false;
        const n = Number(value);
        if (Number.isNaN(n)) return false;
        if (min !== undefined && n < min) return false;
        if (max !== undefined && n > max) return false;
        return true;
      });
    } else {
      const text = state.text.trim().toLowerCase();
      if (!text) continue;
      result = result.filter((row) => {
        const value = col.accessor(row);
        if (isEmptyValue(value)) return false;
        return String(value).toLowerCase().includes(text);
      });
    }
  }
  return result;
}

/** Sorts `rows` by the column named in `sortState.key`, or returns them unchanged if none is set. */
export function sortRows<T>(rows: T[], columns: ColumnDef<T>[], sortState: SortState): T[] {
  const col = columns.find((c) => c.key === sortState.key);
  if (!col) return rows;
  const numeric = col.type === 'number';
  const dir = sortState.dir;
  return [...rows].sort((a, b) => compareValues(getSortValue(col, a), getSortValue(col, b), numeric, dir));
}
