// app/src/query/__tests__/urlCodec.spec.ts
//
// TASK-011: round-trip and error-handling tests for the URL codec. The
// contract under test: a valid Query survives encode -> decode unchanged;
// a missing/unknown `type` invalidates the whole query (null); an
// unknown/malformed individual filter is dropped rather than fatal, so a
// partially-garbled shared URL still reproduces whatever part is valid.
// Relation filters only round-trip in their targetName (contains) form —
// encodeQuery never emits a targetId-form token, and decodeQuery treats a
// hand-crafted `.id.` token as an unrecognized op for a relation field (see
// urlCodec.ts's module header for why: the UI has no control for it, and
// silently reinterpreting an id as a name search would return wrong,
// confusing results).
import { describe, expect, it } from 'vitest';
import { decodeQuery, encodeQuery } from '../urlCodec';
import type { Query } from '../model';

describe('encodeQuery / decodeQuery round-trip', () => {
  it('round-trips a simple numeric filter', () => {
    const query: Query = { type: 'yacht', filters: [{ kind: 'attr', field: 'loa', op: 'gte', value: 80 }] };
    const params = encodeQuery(query);
    expect(params.toString()).toBe('type=yacht&f=loa.gte.80');
    expect(decodeQuery(params)).toEqual(query);
  });

  it('round-trips a text contains filter', () => {
    const query: Query = { type: 'club', filters: [{ kind: 'attr', field: 'name', op: 'contains', value: 'Royal' }] };
    const params = encodeQuery(query);
    expect(decodeQuery(params)).toEqual(query);
  });

  it('round-trips a between filter', () => {
    const query: Query = { type: 'yacht', filters: [{ kind: 'attr', field: 'loa', op: 'between', value: 50, value2: 120 }] };
    const params = encodeQuery(query);
    expect(decodeQuery(params)).toEqual(query);
  });

  it('round-trips a relation filter by name', () => {
    const query: Query = {
      type: 'yacht',
      filters: [{ kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'Feadship' }],
    };
    const params = encodeQuery(query);
    expect(params.toString()).toBe('type=yacht&f=builder.contains.Feadship');
    expect(decodeQuery(params)).toEqual(query);
  });

  it('round-trips multiple filters, preserving order', () => {
    const query: Query = {
      type: 'yacht',
      filters: [
        { kind: 'attr', field: 'loa', op: 'gte', value: 80 },
        { kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'feadship' },
      ],
    };
    const params = encodeQuery(query);
    expect(decodeQuery(params)).toEqual(query);
  });

  it('round-trips a value containing a literal dot', () => {
    const query: Query = { type: 'club', filters: [{ kind: 'attr', field: 'name', op: 'contains', value: 'St. Regis' }] };
    const params = encodeQuery(query);
    expect(decodeQuery(params)).toEqual(query);
  });

  it('a query with no filters round-trips to an empty filter list', () => {
    const query: Query = { type: 'marina', filters: [] };
    const params = encodeQuery(query);
    expect(decodeQuery(params)).toEqual(query);
  });

  it('never encodes a targetId-form relation filter (no UI path produces one; dropped rather than emitted wrong)', () => {
    const query: Query = {
      type: 'club',
      filters: [{ kind: 'rel', rel: 'located_in', direction: 'out', targetId: 'region-42' }],
    };
    const params = encodeQuery(query);
    expect(params.toString()).toBe('type=club');
    expect(decodeQuery(params)).toEqual({ type: 'club', filters: [] });
  });
});

describe('decodeQuery: malformed / invalid input never crashes', () => {
  it('returns null when type is missing', () => {
    expect(decodeQuery(new URLSearchParams('f=loa.gte.80'))).toBeNull();
  });

  it('returns null when type is unknown', () => {
    expect(decodeQuery(new URLSearchParams('type=submarine&f=loa.gte.80'))).toBeNull();
  });

  it('drops an unknown field but keeps the rest of the query', () => {
    const params = new URLSearchParams('type=yacht&f=not_a_field.eq.x&f=loa.gte.80');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [{ kind: 'attr', field: 'loa', op: 'gte', value: 80 }] });
  });

  it('drops an unknown op for a known field', () => {
    const params = new URLSearchParams('type=yacht&f=loa.frobnicate.80');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [] });
  });

  it('drops a text-only op applied to a number field', () => {
    const params = new URLSearchParams('type=yacht&f=loa.contains.80');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [] });
  });

  it('drops a numeric filter with a non-numeric value', () => {
    const params = new URLSearchParams('type=yacht&f=loa.gte.notanumber');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [] });
  });

  it('drops a between filter missing its second bound', () => {
    const params = new URLSearchParams('type=yacht&f=loa.between.50');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [] });
  });

  it('drops a token with no dots at all', () => {
    const params = new URLSearchParams('type=yacht&f=garbage');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [] });
  });

  it('drops an empty f token', () => {
    const params = new URLSearchParams('type=yacht&f=');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [] });
  });

  it('never throws on a completely empty query string', () => {
    expect(() => decodeQuery(new URLSearchParams(''))).not.toThrow();
    expect(decodeQuery(new URLSearchParams(''))).toBeNull();
  });

  it('drops a hand-crafted targetId-form (`.id.`) token for a relation field rather than reinterpreting it as a name search', () => {
    const params = new URLSearchParams('type=yacht&f=builder.id.builder:feadship');
    expect(decodeQuery(params)).toEqual({ type: 'yacht', filters: [] });
  });
});
