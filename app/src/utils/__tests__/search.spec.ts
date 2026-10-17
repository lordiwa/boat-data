// TASK-032: global search engine (index, prefixes, "Open as filtered list" URL).
import { describe, expect, it } from 'vitest';
import { fixtureGraph, fixtureNodes } from '@/__tests__/support/facetFixture';
import { buildFacetIndex } from '@/utils/facets';
import { browseHref, buildSearchIndex, parseQuery, searchEntries } from '@/utils/search';
import type { GraphNode } from '@/types/graph';

const builder = (id: string, country: string, code: string): GraphNode => ({
  id,
  type: 'builder',
  name: id,
  attrs: { geo: { country_code: code, country, subdivision: null, city: null }, facets: { segment: ['superyacht'] } },
});
const malaga: GraphNode = { id: 'igy', type: 'marina', name: 'IGY Málaga Marina', attrs: { geo: { country_code: 'ES', country: 'España', subdivision: null, city: 'Málaga' }, facets: {} } };
const nodes = [...fixtureNodes, builder('Absolute', 'Italy', 'IT'), builder('Azimut', 'Italy', 'IT'), builder('Hinckley', 'United States', 'US'), malaga];
const { entries, vocab } = buildSearchIndex(nodes, () => '');
const run = (q: string) => searchEntries(entries, parseQuery(q.toLowerCase(), vocab)).map((e) => e.id).sort();
const facetIndexFor = (t: string) => buildFacetIndex(t, nodes.filter((n) => n.type === t), fixtureGraph().meta.facets?.[t]);

describe('global search engine', () => {
  // Harm: a city/country/facet label that is not indexed makes "marinas miami" or "italy" return nothing.
  it('AC1: finds nodes by city, country and facet label, across several words', () => {
    expect(run('miami')).toEqual(['m2']);
    expect(run('dry stack')).toEqual(['m1', 'm3']);
    expect(run('dry stack fort lauderdale')).toEqual(['m1']);
    expect(run('italy')).toEqual(['Absolute', 'Azimut']);
    expect(run('superyacht')).toEqual(['Absolute', 'Azimut', 'Hinckley']);
  });

  // Harm: a prefix that does not narrow (or an unknown one that errors) breaks the typed-query grammar.
  it('AC2: type/shorthand/country/city/in/facet prefixes narrow; unknown prefix is plain text', () => {
    expect(run('type:marina tainan')).toEqual(['m6', 'm7']);
    expect(run('marina: auck')).toEqual(['m4']);
    expect(run('country:italy')).toEqual(['Absolute', 'Azimut']);
    expect(run('country:IT')).toEqual(['Absolute', 'Azimut']);
    expect(run('city:miami')).toEqual(['m2']);
    expect(run('in:florida')).toEqual(['m1', 'm2']);
    expect(run('in:italy')).toEqual(['Absolute', 'Azimut']);
    expect(run('facility_category:dry stack')).toEqual(['m1', 'm3']);
    expect(run('loa_band:60-90')).toEqual(['y1', 'y2']);
    expect(parseQuery('foo:bar', vocab)).toEqual({ clauses: [], terms: ['foo:bar'] });
    expect(run('foo:bar')).toEqual([]);
  });

  // Harm: "type: marina" silently dropping its filter, "marinas miami" returning nothing, "Málaga" being unfindable
  // as "malaga", or a tab/NBSP paste splitting nothing sends users to an empty list for a valid query.
  it('AC2: spaced prefixes, plural type words, diacritics and any whitespace behave like the compact forms', () => {
    expect(run('type: marina tainan')).toEqual(run('type:marina tainan'));
    expect(run('marina: auck')).toEqual(run('marina:auck'));
    expect(run('marina:')).toEqual(run('marina: '));
    expect(run('country: italy')).toEqual(['Absolute', 'Azimut']);
    expect(run('city: miami')).toEqual(['m2']);
    expect(run('in: florida')).toEqual(['m1', 'm2']);
    expect(run('facility_category: dry stack')).toEqual(['m1', 'm3']);
    expect(run('marinas miami')).toEqual(['m2']);
    expect(run('marinas in miami')).toEqual(['m2']);
    expect(run('marinas: auck')).toEqual(['m4']);
    expect(parseQuery('marinas:', vocab).clauses).toEqual([{ kind: 'type', value: 'marina' }]);
    expect(parseQuery('foos bar', vocab)).toEqual({ clauses: [], terms: ['foos', 'bar'] });
    expect(run('malaga')).toEqual(['igy']);
    expect(run('MÁLAGA marina')).toEqual(['igy']);
    expect(run('city:malaga')).toEqual(['igy']);
    expect(run('dry\u00a0stack\tfort\nlauderdale')).toEqual(['m1']);
    expect(parseQuery('a '.repeat(2500), vocab).terms).toEqual(['a']);
    expect(parseQuery(Array.from({ length: 40 }, (_, i) => `w${i}`).join(' '), vocab).terms.length).toBe(16);
  });

  // Harm: a link that drops or re-encodes a filter lands the user on a different list than they asked for.
  it('AC5: Open-as-list URL only for prefix-only queries, exact /browse URL', () => {
    const href = (q: string) => browseHref(parseQuery(q, vocab), facetIndexFor);
    expect(href('marina: in:florida facility_category:dry stack')).toBe('/browse/marina?subdivision=Florida&facility_category=dry%20stack');
    expect(href('type:marina country:us')).toBe('/browse/marina?country=US');
    expect(href('marina: in:florida facility_category:dry stack fort')).toBeNull();
    expect(href('marina:')).toBeNull();
    expect(href('in:florida')).toBeNull();
    expect(href('marina: city:atlantis')).toBeNull();
    expect(href('yacht: complete:true')).toBe('/browse/yacht?complete=true');
    expect(href('yacht: complete:false')).toBe('/browse/yacht?complete=false');
    expect(href('type: marina city: miami')).toBe('/browse/marina?city=Miami');
    expect(href('marina: city:malaga')).toBe('/browse/marina?city=M%C3%A1laga');
  });
});
