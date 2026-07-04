// app/src/query/__tests__/engine.spec.ts
//
// TASK-011: unit tests for the pure query engine. Fixtures are small,
// hand-built EnrichedRow objects (see composables/useTypeRows.ts) — no full
// graph, no store, no Vue — exercising each op, null-safety, relation
// matching by name/id, and combined AND semantics.
import { describe, expect, it } from 'vitest';
import { runQuery } from '../engine';
import type { EnrichedRow } from '@/composables/useTypeRows';
import type { Query } from '../model';

interface YachtFixtureOpts {
  id?: string;
  name?: string;
  loa?: number | null;
  year?: number | null;
  guests?: number | null;
  weeklyRate?: number | null;
  builderName?: string;
  builderId?: string;
  ownerName?: string;
  ownerId?: string;
}

function yacht(opts: YachtFixtureOpts = {}): EnrichedRow {
  const id = opts.id ?? `yacht-${opts.name ?? Math.random()}`;
  return {
    node: {
      id,
      type: 'yacht',
      name: opts.name ?? 'Test Yacht',
      attrs: {
        ...(opts.loa != null ? { loa: { meters: opts.loa } } : {}),
        ...(opts.year != null ? { year: { value: opts.year } } : {}),
        ...(opts.guests != null ? { guests: opts.guests } : {}),
        ...(opts.weeklyRate != null ? { weekly_rate: { amount: opts.weeklyRate } } : {}),
      },
    },
    builderName: opts.builderName ?? null,
    ownerName: opts.ownerName ?? null,
    rels: {
      built_by: opts.builderName ? [{ id: opts.builderId ?? 'builder-1', name: opts.builderName }] : [],
      owned_by: opts.ownerName ? [{ id: opts.ownerId ?? 'owner-1', name: opts.ownerName }] : [],
    },
  };
}

function query(filters: Query['filters']): Query {
  return { type: 'yacht', filters };
}

describe('runQuery: no filters', () => {
  it('returns every row, as a new array', () => {
    const rows = [yacht({ name: 'A' }), yacht({ name: 'B' })];
    const result = runQuery(rows, query([]));
    expect(result).toHaveLength(2);
    expect(result).not.toBe(rows);
  });
});

describe('runQuery: attribute filters', () => {
  it('eq (text) matches case-insensitively', () => {
    const rows = [yacht({ name: 'Aurora' }), yacht({ name: 'Zephyr' })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'name', op: 'eq', value: 'aurora' }]));
    expect(result.map((r) => r.node.name)).toEqual(['Aurora']);
  });

  it('eq (number) matches an exact numeric value', () => {
    const rows = [yacht({ name: 'A', year: 2020 }), yacht({ name: 'B', year: 2021 })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'year', op: 'eq', value: 2020 }]));
    expect(result.map((r) => r.node.name)).toEqual(['A']);
  });

  it('contains matches a case-insensitive substring', () => {
    const rows = [yacht({ name: 'Northern Star' }), yacht({ name: 'Southern Cross' })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'name', op: 'contains', value: 'STAR' }]));
    expect(result.map((r) => r.node.name)).toEqual(['Northern Star']);
  });

  it('gte matches values at or above the threshold', () => {
    const rows = [yacht({ name: 'Small', loa: 40 }), yacht({ name: 'Big', loa: 80 }), yacht({ name: 'Huge', loa: 120 })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'gte', value: 80 }]));
    expect(result.map((r) => r.node.name)).toEqual(['Big', 'Huge']);
  });

  it('lte matches values at or below the threshold', () => {
    const rows = [yacht({ name: 'Small', loa: 40 }), yacht({ name: 'Big', loa: 80 }), yacht({ name: 'Huge', loa: 120 })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'lte', value: 80 }]));
    expect(result.map((r) => r.node.name)).toEqual(['Small', 'Big']);
  });

  it('between is inclusive of both bounds', () => {
    const rows = [
      yacht({ name: 'Below', loa: 49 }),
      yacht({ name: 'LowEdge', loa: 50 }),
      yacht({ name: 'Mid', loa: 75 }),
      yacht({ name: 'HighEdge', loa: 100 }),
      yacht({ name: 'Above', loa: 101 }),
    ];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'between', value: 50, value2: 100 }]));
    expect(result.map((r) => r.node.name)).toEqual(['LowEdge', 'Mid', 'HighEdge']);
  });

  it('between tolerates reversed bounds (min/max normalized)', () => {
    const rows = [yacht({ name: 'Mid', loa: 75 }), yacht({ name: 'Out', loa: 10 })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'between', value: 100, value2: 50 }]));
    expect(result.map((r) => r.node.name)).toEqual(['Mid']);
  });
});

describe('runQuery: null-safety', () => {
  it('a row missing the filtered value never matches gte/lte/between/eq', () => {
    const rows = [yacht({ name: 'NoLoa' }), yacht({ name: 'HasLoa', loa: 80 })];
    expect(runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'gte', value: 0 }])).map((r) => r.node.name)).toEqual([
      'HasLoa',
    ]);
    expect(runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'lte', value: 1000 }])).map((r) => r.node.name)).toEqual(
      ['HasLoa'],
    );
    expect(
      runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'between', value: 0, value2: 1000 }])).map(
        (r) => r.node.name,
      ),
    ).toEqual(['HasLoa']);
    expect(runQuery(rows, query([{ kind: 'attr', field: 'loa', op: 'eq', value: 80 }])).map((r) => r.node.name)).toEqual([
      'HasLoa',
    ]);
  });

  it('contains never matches a missing text value', () => {
    const rows = [yacht({ name: 'A', builderName: undefined }), yacht({ name: 'B' })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'name', op: 'contains', value: 'nonexistent' }]));
    expect(result).toHaveLength(0);
  });

  it('an unknown field slug never matches (defensive; urlCodec should already reject it)', () => {
    const rows = [yacht({ name: 'A' })];
    const result = runQuery(rows, query([{ kind: 'attr', field: 'not_a_real_field', op: 'eq', value: 'A' }]));
    expect(result).toHaveLength(0);
  });
});

describe('runQuery: relation filters', () => {
  it('matches by resolved neighbor name, case-insensitive contains', () => {
    const rows = [
      yacht({ name: 'A', builderName: 'Feadship' }),
      yacht({ name: 'B', builderName: 'Lurssen' }),
      yacht({ name: 'C' }),
    ];
    const result = runQuery(rows, query([{ kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'feadship' }]));
    expect(result.map((r) => r.node.name)).toEqual(['A']);
  });

  it('matches by exact target id', () => {
    const rows = [
      yacht({ name: 'A', builderName: 'Feadship', builderId: 'builder-feadship' }),
      yacht({ name: 'B', builderName: 'Feadship International', builderId: 'builder-other' }),
    ];
    const result = runQuery(rows, query([{ kind: 'rel', rel: 'built_by', direction: 'out', targetId: 'builder-feadship' }]));
    expect(result.map((r) => r.node.name)).toEqual(['A']);
  });

  it('a row with no edge for that relation never matches', () => {
    const rows = [yacht({ name: 'NoBuilder' })];
    const result = runQuery(rows, query([{ kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'anything' }]));
    expect(result).toHaveLength(0);
  });
});

describe('runQuery: combined filters are AND-ed', () => {
  it('narrows to rows satisfying every filter', () => {
    const rows = [
      yacht({ name: 'Match', loa: 90, builderName: 'Feadship' }),
      yacht({ name: 'WrongBuilder', loa: 90, builderName: 'Lurssen' }),
      yacht({ name: 'TooSmall', loa: 40, builderName: 'Feadship' }),
    ];
    const result = runQuery(
      rows,
      query([
        { kind: 'attr', field: 'loa', op: 'gte', value: 80 },
        { kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'feadship' },
      ]),
    );
    expect(result.map((r) => r.node.name)).toEqual(['Match']);
  });
});
