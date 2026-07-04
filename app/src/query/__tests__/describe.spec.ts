// app/src/query/__tests__/describe.spec.ts
//
// TASK-011: describeQuery renders the plain-English restatement shown above
// the results table. These tests lock in representative sentences so a
// non-technical user always sees words, never field slugs or operator codes.
import { describe, expect, it } from 'vitest';
import { describeQuery } from '../describe';
import type { Query } from '../model';

describe('describeQuery', () => {
  it('describes an empty query as "showing all"', () => {
    expect(describeQuery({ type: 'yacht', filters: [] })).toBe('Showing all yachts.');
  });

  it('describes a single numeric range filter', () => {
    const query: Query = { type: 'yacht', filters: [{ kind: 'attr', field: 'loa', op: 'gte', value: 80 }] };
    expect(describeQuery(query)).toBe('Showing yachts where Length (m) ≥ 80 m.');
  });

  it('describes a relation filter as a natural verb phrase', () => {
    const query: Query = {
      type: 'yacht',
      filters: [{ kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'Feadship' }],
    };
    expect(describeQuery(query)).toBe('Showing yachts where built by "Feadship".');
  });

  it('joins an attribute and a relation filter with a comma, matching the ticket\'s example shape', () => {
    const query: Query = {
      type: 'yacht',
      filters: [
        { kind: 'attr', field: 'loa', op: 'gte', value: 80 },
        { kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'Feadship' },
      ],
    };
    expect(describeQuery(query)).toBe('Showing yachts where Length (m) ≥ 80 m, built by "Feadship".');
  });

  it('describes an eq (text) filter', () => {
    const query: Query = { type: 'club', filters: [{ kind: 'attr', field: 'name', op: 'eq', value: 'Royal Yacht Club' }] };
    expect(describeQuery(query)).toBe('Showing yacht clubs where Name is "Royal Yacht Club".');
  });

  it('describes a between filter', () => {
    const query: Query = { type: 'yacht', filters: [{ kind: 'attr', field: 'loa', op: 'between', value: 50, value2: 100 }] };
    expect(describeQuery(query)).toBe('Showing yachts where Length (m) between 50 and 100 m.');
  });

  it('describes a relation filter matched by exact id', () => {
    const query: Query = { type: 'club', filters: [{ kind: 'rel', rel: 'located_in', direction: 'out', targetId: 'region-9' }] };
    expect(describeQuery(query)).toBe('Showing yacht clubs where located in (id "region-9").');
  });

  it('drops a filter referencing an unknown field rather than rendering garbage', () => {
    const query: Query = { type: 'yacht', filters: [{ kind: 'attr', field: 'not_real', op: 'eq', value: 'x' }] };
    expect(describeQuery(query)).toBe('Showing all yachts.');
  });
});
