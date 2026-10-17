// TASK-031: facet/geo conditions in the query builder: engine semantics, URL codec (arrays + backward
// compatibility), plain-English description, and the /browse <-> /query bridge.
import { describe, expect, it } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import { runQuery } from '../engine';
import { decodeQuery, encodeQuery } from '../urlCodec';
import { describeQuery } from '../describe';
import { browseToQuery, queryToBrowse } from '../browseBridge';
import { routes } from '@/router';
import { buildFacetIndex } from '@/utils/facets';
import { fixtureGraph, fixtureNodes } from '@/__tests__/support/facetFixture';
import type { EnrichedRow } from '@/composables/useTypeRows';
import type { FacetFilter, Query } from '../model';

function row(id: string, attrs: Record<string, unknown>): EnrichedRow {
  return { node: { id, type: 'marina', name: id, attrs }, rels: {} };
}
const fac = (key: string, op: 'in' | 'not', values: string[], group: 'facet' | 'geo' = 'facet'): FacetFilter => ({
  kind: 'facet',
  group,
  key,
  op,
  values,
});
const q = (type: Query['type'], filters: Query['filters']): Query => ({ type, filters });
const ids = (rows: EnrichedRow[]) => rows.map((r) => r.node.id);

describe('facet/geo engine (AC2, AC6)', () => {
  const rows = [
    row('a', { facets: { facility_category: 'dry stack', services: ['fuel', 'repair'] } }),
    row('b', { facets: { facility_category: 'boatyard', services: ['fuel'] } }),
    row('c', { facets: { facility_category: 'fuel dock' } }),
    row('d', {}),
  ];

  // Harm: an OR facet that drops multi-valued rows, or a "not" that drops rows with no facet, silently hides results.
  it("'in' is OR over values incl. multi-valued facets; 'not' excludes only the listed values and keeps rows without the facet", () => {
    expect(ids(runQuery(rows, q('marina', [fac('facility_category', 'in', ['dry stack', 'boatyard'])])))).toEqual(['a', 'b']);
    expect(ids(runQuery(rows, q('marina', [fac('services', 'in', ['repair'])])))).toEqual(['a']);
    expect(ids(runQuery(rows, q('marina', [fac('facility_category', 'not', ['dry stack'])])))).toEqual(['b', 'c', 'd']);
  });

  // Harm: reading attrs.country (raw ingest text) puts Dutch marinas under Italy (TASK-027 reviewer finding).
  it('geo conditions read attrs.geo only: attrs.country Italy + attrs.geo.country Netherlands matches Netherlands, not Italy', () => {
    const r = [row('x', { country: 'Italy', geo: { country_code: 'NL', country: 'Netherlands' } })];
    expect(ids(runQuery(r, q('marina', [fac('country', 'in', ['Netherlands'], 'geo')])))).toEqual(['x']);
    expect(ids(runQuery(r, q('marina', [fac('country', 'in', ['Italy'], 'geo')])))).toEqual([]);
  });
});

describe('urlCodec arrays + backward compatibility (AC3)', () => {
  // Harm: an unescaped comma splits "Anping, Tainan" into two values and a shared link returns different rows.
  it('round-trips arrays stably, including a value with a comma', () => {
    const query = q('marina', [
      fac('facility_category', 'in', ['dry stack', 'boatyard']),
      fac('city', 'not', ['Anping, Tainan', '100%'], 'geo'),
    ]);
    const params = encodeQuery(query);
    expect(params.getAll('f')).toEqual(['cat_facility_category.in.dry stack,boatyard', 'geo_city.not.Anping%2C Tainan,100%25']);
    expect(decodeQuery(params)).toEqual(query);
  });

  // Harm: a new token grammar that reinterprets an old bookmarked link silently changes its results.
  it('five pre-existing links decode to the same models as before the facet work', () => {
    const attr = (field: string, op: 'eq' | 'contains' | 'gte' | 'lte' | 'between', value: string | number, value2?: number) => ({
      kind: 'attr' as const,
      field,
      op,
      value,
      ...(value2 === undefined ? {} : { value2 }),
    });
    const rel = (r: 'built_by' | 'located_in', targetName: string) => ({
      kind: 'rel' as const,
      rel: r,
      direction: 'out' as const,
      targetName,
    });
    const corpus: [string, Query][] = [
      ['type=yacht&f=loa.gte.80', q('yacht', [attr('loa', 'gte', 80)])],
      ['type=yacht&f=loa.between.50,120&f=builder.contains.feadship', q('yacht', [attr('loa', 'between', 50, 120), rel('built_by', 'feadship')])],
      ['type=club&f=name.contains.St.%20Regis', q('club', [attr('name', 'contains', 'St. Regis')])],
      ['type=marina&f=berths.gte.100&f=location.contains.Florida', q('marina', [attr('berths', 'gte', 100), rel('located_in', 'Florida')])],
      ['type=shipyard&f=facility_type.eq.boatyard&f=max_loa.lte.60&f=bogus.eq.x', q('shipyard', [attr('facility_type', 'eq', 'boatyard'), attr('max_loa', 'lte', 60)])],
    ];
    for (const [link, model] of corpus) expect(decodeQuery(new URLSearchParams(link))).toEqual(model);
  });
});

describe('describeQuery for facet/geo (AC4)', () => {
  // Harm: a restatement that shows slugs or wrong grouping makes a user trust a query that means something else.
  it('renders facet and geo conditions in plain English', () => {
    expect(describeQuery(q('marina', [fac('facility_category', 'in', ['dry stack', 'boatyard'])]))).toBe(
      'Showing marinas where Facility type is any of Dry stack, Boatyard.',
    );
    expect(
      describeQuery(
        q('marina', [
          fac('facility_category', 'not', ['dry stack']),
          fac('country', 'in', ['Netherlands'], 'geo'),
          fac('services', 'not', ['fuel', 'repair']),
        ]),
      ),
    ).toBe('Showing marinas where Facility type is not Dry stack, Country is Netherlands, Services is none of Fuel, Repair.');
  });
});

describe('Open in browse / Refine in query builder (AC5)', () => {
  const g = fixtureGraph();
  const index = buildFacetIndex('marina', fixtureNodes.filter((n) => n.type === 'marina'), g.meta.facets!.marina);
  const router = createRouter({ history: createMemoryHistory(), routes });

  // Harm: if the two hops disagree, "Refine" lands on a different row set than the page the user came from.
  it('browse URL -> query -> browse URL is identical (CU8), and queries browse cannot express get no target', () => {
    const url = '/browse/marina?subdivision=Florida&facility_category=dry%20stack&country=US';
    const original = router.resolve(url);
    const query = browseToQuery('marina', original.query, index);
    expect(query.filters.map((f) => (f as FacetFilter).values)).toEqual([['Florida'], ['dry stack'], ['United States']]);
    const target = queryToBrowse(decodeQuery(encodeQuery(query))!, index)!;
    expect(router.resolve(target).fullPath).toBe(router.resolve({ path: original.path, query: original.query }).fullPath);
    expect(queryToBrowse(q('marina', [fac('facility_category', 'not', ['dry stack'])]), index)).toBeNull();
    expect(queryToBrowse(q('marina', [{ kind: 'rel', rel: 'located_in', direction: 'out', targetName: 'x' }]), index)).toBeNull();
    expect(queryToBrowse(q('marina', [fac('facility_category', 'in', ['no such value'])]), index)).toBeNull();
  });
});
