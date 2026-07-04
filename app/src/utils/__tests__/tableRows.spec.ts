// app/src/utils/__tests__/tableRows.spec.ts
//
// TASK-014: filterRows/sortRows are the exact functions DataTable.vue's CSV
// export composes over `props.rows` — with no notion of a page size at all
// (only DataTable's separate `pagedRows` computed slices for on-screen
// display). These tests lock in that guarantee directly: exporting reflects
// every filtered/sorted row, not just the current page, by construction
// rather than convention.
import { describe, expect, it } from 'vitest';
import { filterRows, sortRows } from '../tableRows';
import type { ColumnDef } from '@/types/table';
import type { FilterState, SortState } from '../tableRows';

interface Fixture {
  name: string;
  loa: number | null;
}

const COLUMNS: ColumnDef<Fixture>[] = [
  { key: 'name', label: 'Name', accessor: (r) => r.name, type: 'text', filterable: true },
  { key: 'loa', label: 'LOA (m)', accessor: (r) => r.loa, type: 'number', filterable: true },
];

const PAGE_SIZE = 50; // mirrors DataTable.vue's own constant

function makeRows(n: number): Fixture[] {
  return Array.from({ length: n }, (_, i) => ({ name: `Yacht ${i}`, loa: i }));
}

describe('filterRows / sortRows (the pagination-agnostic export source)', () => {
  it('returns every matching row, not capped at DataTable\'s 50-row page size', () => {
    const rows = makeRows(120).map((r, i) => ({ ...r, name: i % 2 === 0 ? 'Sea Breeze' : 'Other' }));
    const filterState: FilterState = { name: { text: 'sea', min: '', max: '' } };
    const filtered = filterRows(rows, COLUMNS, filterState);
    expect(filtered.length).toBe(60);
    expect(filtered.length).toBeGreaterThan(PAGE_SIZE);
  });

  it('sorts the full filtered set, independent of pagination', () => {
    const rows = makeRows(120);
    const sortState: SortState = { key: 'loa', dir: -1 };
    const sorted = sortRows(rows, COLUMNS, sortState);
    expect(sorted.length).toBe(120);
    expect(sorted[0].loa).toBe(119);
    expect(sorted[sorted.length - 1].loa).toBe(0);
  });

  it('applies a numeric min/max filter across the whole set', () => {
    const rows = makeRows(120);
    const filterState: FilterState = { loa: { text: '', min: 100, max: '' } };
    const filtered = filterRows(rows, COLUMNS, filterState);
    expect(filtered.every((r) => (r.loa ?? -1) >= 100)).toBe(true);
    expect(filtered.length).toBe(20); // loa 100..119
  });

  it('sorts nulls last regardless of direction', () => {
    const rows: Fixture[] = [{ name: 'A', loa: null }, { name: 'B', loa: 10 }, { name: 'C', loa: 5 }];
    const asc = sortRows(rows, COLUMNS, { key: 'loa', dir: 1 });
    expect(asc.map((r) => r.name)).toEqual(['C', 'B', 'A']);
    const desc = sortRows(rows, COLUMNS, { key: 'loa', dir: -1 });
    expect(desc.map((r) => r.name)).toEqual(['B', 'C', 'A']);
  });

  it('leaves rows unchanged when no sort key is set', () => {
    const rows = makeRows(5);
    expect(sortRows(rows, COLUMNS, { key: null, dir: 1 })).toEqual(rows);
  });
});
