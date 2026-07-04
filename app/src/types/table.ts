// app/src/types/table.ts
//
// TASK-009: the column-definition contract shared by DataTable.vue (the
// generic, reusable table) and its per-node-type presets in
// utils/columns.ts. Kept in its own file, rather than declared inline in
// DataTable.vue, so composables/utils can import the type without pulling
// in the component.
import type { RouteLocationRaw } from 'vue-router';

/** A cell's displayable or sortable/filterable value. Format before returning. */
export type ColumnValue = string | number | null;

export interface ColumnDef<T = any> {
  /** Unique key for this column; also used as the sort/filter state key. */
  key: string;
  /** Header label. */
  label: string;
  /** Value rendered in the cell as plain text (already formatted). */
  accessor: (row: T) => ColumnValue;
  /** Value used for sorting and numeric filtering; defaults to `accessor` when omitted. */
  sortAccessor?: (row: T) => ColumnValue;
  /** 'number' enables numeric-aware sort + a min/max filter pair; default 'text' (contains filter). */
  type?: 'text' | 'number';
  /** Whether this column shows a control in the filter row. */
  filterable?: boolean;
  /** If set, the cell renders as a RouterLink to this route (also used for whole-row click-through). */
  link?: (row: T) => RouteLocationRaw;
  /** If set, the cell renders as an external anchor to this URL (e.g. a website column). Null/empty falls back to plain text. */
  href?: (row: T) => string | null;
  /** Small pill rendered after the cell's text (e.g. an "unspecified" badge). Null/empty renders nothing. */
  badge?: (row: T) => string | null;
}
