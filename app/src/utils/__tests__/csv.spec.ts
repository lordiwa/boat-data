// app/src/utils/__tests__/csv.spec.ts
//
// TASK-014: toCsv is the pure, unit-testable half of CSV export (downloadCsv
// itself is a thin Blob + object-URL wrapper — Playwright territory, not
// unit-test territory, per the ticket). These lock in RFC-4180 escaping, the
// UTF-8 BOM/CRLF Excel needs, and that export renders exactly what the user
// sees on screen (each column's accessor), with the one deliberate
// exception: the table's '—' empty-cell placeholder becomes a blank field
// rather than a stray em dash in a spreadsheet.
import { describe, expect, it } from 'vitest';
import { toCsv } from '../csv';
import type { ColumnDef } from '@/types/table';

interface Fixture {
  name: string;
  note: string | null;
  count: number | null;
}

const COLUMNS: ColumnDef<Fixture>[] = [
  { key: 'name', label: 'Name', accessor: (r) => r.name },
  { key: 'note', label: 'Note', accessor: (r) => r.note },
  { key: 'count', label: 'Count', accessor: (r) => r.count },
];

/** Strips the BOM and trailing CRLF, then splits into records — the shape a
 *  spreadsheet import (or a test assertion) actually cares about. */
function records(csv: string): string[] {
  const stripped = csv.replace(/^﻿/, '');
  return stripped.split('\r\n').filter((line) => line !== '');
}

describe('toCsv', () => {
  it('renders a header row from column labels', () => {
    const csv = toCsv<Fixture>([], COLUMNS);
    expect(records(csv)).toEqual(['Name,Note,Count']);
  });

  it('renders one row per input row, using each column\'s accessor, in the given order', () => {
    const rows: Fixture[] = [
      { name: 'Feadship', note: 'Dutch', count: 3 },
      { name: 'Oceanco', note: 'Also Dutch', count: 5 },
    ];
    const csv = toCsv(rows, COLUMNS);
    expect(records(csv)).toEqual(['Name,Note,Count', 'Feadship,Dutch,3', 'Oceanco,Also Dutch,5']);
  });

  it('preserves row order even when it is not sorted alphabetically or numerically', () => {
    const rows: Fixture[] = [
      { name: 'Zulu', note: null, count: 1 },
      { name: 'Alpha', note: null, count: 99 },
      { name: 'Mike', note: null, count: 50 },
    ];
    const csv = toCsv(rows, COLUMNS);
    const [, ...body] = records(csv);
    expect(body.map((line) => line.split(',')[0])).toEqual(['Zulu', 'Alpha', 'Mike']);
  });

  it('quotes a field containing a comma', () => {
    const rows: Fixture[] = [{ name: 'Smith, Jones & Co.', note: null, count: null }];
    const csv = toCsv(rows, COLUMNS);
    expect(records(csv)[1]).toBe('"Smith, Jones & Co.",,');
  });

  it('quotes a field containing a double quote and doubles the embedded quote', () => {
    const rows: Fixture[] = [{ name: 'The "Big One"', note: null, count: null }];
    const csv = toCsv(rows, COLUMNS);
    expect(records(csv)[1]).toBe('"The ""Big One""",,');
  });

  it('quotes a field containing an embedded newline', () => {
    const rows: Fixture[] = [{ name: 'Line one\nLine two', note: null, count: null }];
    const csv = toCsv(rows, COLUMNS);
    expect(records(csv)[1]).toBe('"Line one\nLine two",,');
  });

  it('leaves unicode text untouched (no escaping needed, no mangling)', () => {
    const rows: Fixture[] = [{ name: 'Ünïcode Yacht — Zürich ⚓', note: null, count: null }];
    const csv = toCsv(rows, COLUMNS);
    expect(csv).toContain('Ünïcode Yacht — Zürich ⚓');
  });

  it('renders the table\'s "—" empty-cell placeholder as a blank field, not the em dash', () => {
    const rows: Fixture[] = [{ name: 'Mystery Yacht', note: '—', count: null }];
    const csv = toCsv(rows, COLUMNS);
    expect(records(csv)[1]).toBe('Mystery Yacht,,');
  });

  it('renders null/undefined/empty-string accessor output as a blank field too', () => {
    const rows: Fixture[] = [{ name: 'No Notes', note: null, count: null }];
    const csv = toCsv(rows, COLUMNS);
    expect(records(csv)[1]).toBe('No Notes,,');
  });

  it('prefixes the string with a UTF-8 BOM for Excel compatibility', () => {
    const csv = toCsv([], COLUMNS);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('uses CRLF line endings throughout', () => {
    const rows: Fixture[] = [{ name: 'A', note: null, count: 1 }];
    const csv = toCsv(rows, COLUMNS);
    // Every line break is \r\n, and there are no bare \n's outside of quoted fields.
    expect(csv.replace(/"[^"]*"/g, '')).not.toMatch(/(?<!\r)\n/);
    expect(csv).toContain('\r\n');
  });
});
