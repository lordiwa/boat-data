// app/src/utils/csv.ts
//
// TASK-014: turns any DataTable-shaped result set (rows + ColumnDef[]) into
// an RFC-4180 CSV string, and a tiny helper to trigger a client-side
// download of that string — no server, no CSV library dependency. Pure and
// framework-free so it's directly unit-testable (see __tests__/csv.spec.ts)
// without mounting DataTable.vue.
import type { ColumnDef, ColumnValue } from '@/types/table';

const CRLF = '\r\n';
const BOM = '﻿';
// The same "—" fallback DataTable.vue's cellText() renders for a missing
// value (see utils/format.ts's EMPTY constant) — many column accessors
// (formatMeters, formatMoney, etc.) already bake this glyph into their
// return value, so it isn't always caught by a plain null/undefined/''
// check. A spreadsheet should get an empty cell, not a stray em dash.
const EMPTY_GLYPH = '—';
const NEEDS_QUOTING = /[",\r\n]/;

/** The cell's plain-text CSV value: the same text a user sees on screen (via
 *  the column's accessor), except the empty-cell placeholder becomes an
 *  empty string rather than the em dash. */
function csvCellText(value: ColumnValue): string {
  if (value === null || value === undefined || value === '' || value === EMPTY_GLYPH) return '';
  return String(value);
}

/** RFC-4180 field escaping: wrap in quotes (doubling any embedded quotes)
 *  whenever the field itself contains a comma, quote, or newline. */
function csvField(raw: string): string {
  return NEEDS_QUOTING.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

/**
 * Renders `rows` through `columns` (using each column's accessor — the same
 * display text the table renders) as a CSV string: header row from column
 * labels, one row per input row, in the same order they were given (callers
 * pass already filtered+sorted rows). CRLF line endings and a UTF-8 BOM
 * prefix keep Excel happy on both Windows and macOS.
 */
export function toCsv<T = any>(rows: T[], columns: ColumnDef<T>[]): string {
  const lines: string[] = [columns.map((col) => csvField(col.label)).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => csvField(csvCellText(col.accessor(row)))).join(','));
  }
  return BOM + lines.join(CRLF) + CRLF;
}

/** Triggers a browser download of `csvString` as `filename`, via a Blob +
 *  temporary object URL — no server round-trip, no library. */
export function downloadCsv(filename: string, csvString: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
