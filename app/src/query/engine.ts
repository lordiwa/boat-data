// app/src/query/engine.ts
//
// TASK-011: the pure, unit-testable no-SQL query engine. runQuery filters an
// array of EnrichedRow (see composables/useTypeRows.ts) against a Query
// (src/query/model.ts) — no Vue, no Pinia, no graph store: every relation
// filter matches against the row's precomputed `rels` bag, so this module
// can be exercised with plain object fixtures (see __tests__/engine.spec.ts).
//
// Null-safety contract: a missing/unparseable value NEVER matches a filter
// (including 'contains' against undefined text and every numeric op against
// a non-number) — rows with incomplete data simply drop out rather than
// producing false positives or throwing.
import type { EnrichedRow } from '@/composables/useTypeRows';
import { findField, type AttrFilter, type Filter, type Query, type RelFilter } from './model';

function isEmpty(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || value === '';
}

function matchesAttr(row: EnrichedRow, filter: AttrFilter, type: Query['type']): boolean {
  const field = findField(type, filter.field);
  if (!field || field.kind !== 'attr') return false;
  const value = field.get(row);
  if (isEmpty(value)) return false;

  switch (filter.op) {
    case 'eq': {
      if (isEmpty(filter.value)) return false;
      if (field.valueKind === 'number') {
        const n = Number(value);
        const target = Number(filter.value);
        return !Number.isNaN(n) && !Number.isNaN(target) && n === target;
      }
      return String(value).toLowerCase() === String(filter.value).toLowerCase();
    }
    case 'contains': {
      if (isEmpty(filter.value)) return false;
      return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
    }
    case 'gte': {
      if (isEmpty(filter.value)) return false;
      const n = Number(value);
      const target = Number(filter.value);
      return !Number.isNaN(n) && !Number.isNaN(target) && n >= target;
    }
    case 'lte': {
      if (isEmpty(filter.value)) return false;
      const n = Number(value);
      const target = Number(filter.value);
      return !Number.isNaN(n) && !Number.isNaN(target) && n <= target;
    }
    case 'between': {
      if (isEmpty(filter.value) || isEmpty(filter.value2)) return false;
      const n = Number(value);
      const a = Number(filter.value);
      const b = Number(filter.value2);
      if (Number.isNaN(n) || Number.isNaN(a) || Number.isNaN(b)) return false;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return n >= lo && n <= hi;
    }
    default:
      return false;
  }
}

function matchesRel(row: EnrichedRow, filter: RelFilter): boolean {
  const targets = row.rels?.[filter.rel];
  if (!targets || targets.length === 0) return false;

  if (filter.targetId) {
    return targets.some((t) => t.id === filter.targetId);
  }
  if (filter.targetName && filter.targetName.trim() !== '') {
    const needle = filter.targetName.trim().toLowerCase();
    return targets.some((t) => t.name.toLowerCase().includes(needle));
  }
  return false;
}

function matchesFilter(row: EnrichedRow, filter: Filter, type: Query['type']): boolean {
  return filter.kind === 'attr' ? matchesAttr(row, filter, type) : matchesRel(row, filter);
}

/** Filters `rows` against every filter in `query`, AND-combined. Empty filters mean "match everything". */
export function runQuery(rows: EnrichedRow[], query: Query): EnrichedRow[] {
  if (!query.filters.length) return rows.slice();
  return rows.filter((row) => query.filters.every((filter) => matchesFilter(row, filter, query.type)));
}
