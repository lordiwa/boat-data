// ingest/tests/facets.spec.js
//
// TASK-029: per-type controlled-vocabulary facets (attrs.facets) + meta.facets. Seven specs, one
// per acceptance criterion (AC1..AC7 of the ticket; AC7 is the suite/score gate, so its slot holds
// the real-corpus coverage lock). Each names the harm it prevents.
//
// Fixture specs run the hook on a tiny synthetic db. Real-corpus specs read the committed
// ingest/data/graph.json (kept fresh by realCorpusExport.spec.js's freshness guard); the coverage
// spec rebuilds a db from it so it can ask the hook for its coverage stats.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { applyFacets, writeFacetsUnmappedReport } from '../src/mappers/facets.js';
import { exportGraph } from '../src/exporters/graphExporter.js';
import { FACETS, FACETED_TYPES } from '../src/mappers/facetVocabulary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = path.resolve(__dirname, '..', 'data', 'graph.json');
const APP_GRAPH_PATH = path.resolve(__dirname, '..', '..', 'app', 'public', 'data', 'graph.json');

function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'facets-test-'));
  const db = openDb(path.join(dir, 'graph.db'));
  initSchema(db);
  return { db, dir };
}

const attrsOf = (db, id) => JSON.parse(db.prepare('SELECT attrs_json FROM nodes WHERE id = ?').get(id).attrs_json);
const facetsOf = (db, id) => attrsOf(db, id).facets;
const dump = (db) => JSON.stringify(db.prepare('SELECT id, type, name, attrs_json FROM nodes ORDER BY id').all());
const loadGraph = () => JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

describe('facets (TASK-029)', () => {
  it('AC2: every node of the 11 faceted types carries attrs.facets drawn only from the closed vocabulary', () => {
    // Prevents: a filter dropdown offering a value the vocabulary does not define, or a node
    // silently missing its facet block (so it vanishes from every faceted filter).
    const graph = loadGraph();
    const typed = graph.nodes.filter((n) => FACETED_TYPES.includes(n.type));
    expect(typed.length).toBeGreaterThan(3000);
    const violations = [];
    for (const n of typed) {
      const f = n.attrs.facets;
      if (!f || typeof f !== 'object') {
        violations.push(`${n.id}: no facets`);
        continue;
      }
      for (const [facet, raw] of Object.entries(f)) {
        const spec = FACETS[n.type][facet];
        if (!spec) {
          violations.push(`${n.id}: unknown facet ${facet}`);
          continue;
        }
        const values = Array.isArray(raw) ? raw : [raw];
        if (spec.kind === 'multi' && !Array.isArray(raw)) violations.push(`${n.id}.${facet}: multi facet must be an array`);
        for (const v of values) {
          // subdivision/city have no static list: they must equal the node's own attrs.geo
          const ok = spec.values === null ? v === (n.attrs.geo && n.attrs.geo[facet]) : spec.values.includes(v);
          if (!ok) violations.push(`${n.id}.${facet}: ${JSON.stringify(v)}`);
        }
      }
    }
    expect(violations.slice(0, 10)).toEqual([]);
  });

  it('AC6: meta.facets is the sorted recount of the nodes, and the app copy is byte-identical', () => {
    // Prevents: filter counts that disagree with the data they filter, or a UI that ships a stale copy.
    const graph = loadGraph();
    const recount = {};
    for (const n of graph.nodes) {
      for (const [facet, raw] of Object.entries(n.attrs.facets || {})) {
        for (const v of new Set(Array.isArray(raw) ? raw : [raw])) {
          const bucket = ((recount[n.type] ||= {})[facet] ||= {});
          bucket[String(v)] = (bucket[String(v)] || 0) + 1;
        }
      }
    }
    expect(Object.keys(graph.meta.facets).sort()).toEqual(Object.keys(recount).sort());
    for (const [type, facets] of Object.entries(graph.meta.facets)) {
      for (const [facet, list] of Object.entries(facets)) {
        const counts = Object.fromEntries(list.map((e) => [String(e.value), e.count]));
        expect(counts, `${type}.${facet}`).toEqual(recount[type][facet]);
        const sorted = [...list].sort((a, b) => b.count - a.count || (String(a.value) < String(b.value) ? -1 : 1));
        expect(list, `${type}.${facet} order`).toEqual(sorted);
      }
    }
    // gitignored build copy: only compared where it exists (it always does after `npm run ingest`+sync)
    if (fs.existsSync(APP_GRAPH_PATH)) {
      expect(fs.readFileSync(APP_GRAPH_PATH).equals(fs.readFileSync(GRAPH_PATH))).toBe(true);
    }
  });

  it('AC1: facets are additive (original attrs byte-identical) and a second run changes nothing', () => {
    // Prevents: the hook rewriting source data (loa/year/flag) or accumulating stale facets run over run.
    const { db } = freshDb();
    const original = { loa: { meters: 52.3, feet: 171.6, raw: '52.3m' }, year: { value: 2012, raw: '2012' }, flag: 'Cayman Islands', notes: 'kept' };
    upsertNode(db, { id: 'yacht:t', type: 'yacht', name: 'T', attrs: original });
    const before = attrsOf(db, 'yacht:t');
    applyFacets(db);
    const once = dump(db);
    const { facets, ...rest } = attrsOf(db, 'yacht:t');
    expect(JSON.stringify(rest)).toBe(JSON.stringify(before));
    expect(facets).toMatchObject({ loa_band: '40-60', decade: '2010s', flag: 'Cayman Islands' });
    applyFacets(db);
    expect(dump(db)).toBe(once);
  });

  it('AC3: band boundaries fall in the UPPER band (half-open), in the stated units', () => {
    // Prevents: a 24.0 m yacht or a 1980 build landing in the wrong band and being filtered out of the right one.
    const { db } = freshDb();
    const yachts = [
      ['a', { loa: { meters: 23.99 }, year: { value: 1979 }, guests: 8 }, { loa_band: '15-24', decade: 'pre-1980', guests_band: '<=8' }],
      ['b', { loa: { meters: 24.0 }, year: { value: 1980 }, guests: 9 }, { loa_band: '24-40', decade: '1980s', guests_band: '9-12' }],
      ['c', { loa: { meters: 120 }, year: { value: 2020 }, guests: 21 }, { loa_band: '120+', decade: '2020s', guests_band: '20+' }],
    ];
    for (const [id, attrs] of yachts) upsertNode(db, { id: `yacht:${id}`, type: 'yacht', name: id, attrs });
    upsertNode(db, { id: 'engine_model:m', type: 'engine_model', name: 'M', attrs: { power_hp: 500 } });
    upsertNode(db, { id: 'marina:m', type: 'marina', name: 'Berth Marina', attrs: { berths: 150, max_loa: { meters: 60 } } });
    applyFacets(db);
    for (const [id, , expected] of yachts) expect(facetsOf(db, `yacht:${id}`)).toMatchObject(expected);
    expect(facetsOf(db, 'engine_model:m').power_band).toBe('500-2000');
    expect(facetsOf(db, 'marina:m')).toMatchObject({ berths_band: '150-400', max_loa_band: '60-100' });
  });

  it('AC5: never guesses (propulsion, unmapped text), keeps booleans honest, takes country from attrs.geo', () => {
    // Prevents: a yacht advertised as sailing/motor with no evidence, an invented free-text value
    // mapped to a real category, charter/complete flags drifting from their source, and a raw
    // attrs.country spelling leaking into the country facet.
    const { db, dir } = freshDb();
    const geo = { country_code: 'IT', country: 'Italy', subdivision: null, city: null };
    upsertNode(db, { id: 'builder:b', type: 'builder', name: 'B', attrs: { country: 'Narnia', geo, specialty: ['zorp wibble'] } });
    upsertNode(db, { id: 'yacht:none', type: 'yacht', name: 'None', attrs: { identifiability: 'fragment', weekly_rate: { amount: null, raw: 'N/A (sold)' } } });
    upsertNode(db, { id: 'yacht:sail', type: 'yacht', name: 'Sail', attrs: { features: 'Sailing performance', identifiability: 'identifiable', weekly_rate: { amount: 90000, currency: 'EUR' } } });
    upsertEdge(db, { src: 'yacht:none', rel: 'built_by', dst: 'builder:b' });
    const result = applyFacets(db);
    expect(facetsOf(db, 'yacht:none')).toMatchObject({ propulsion_type: 'unknown', complete: false, charter_available: false, builder_country: 'Italy', has_known_owner: false });
    expect(facetsOf(db, 'yacht:sail')).toMatchObject({ propulsion_type: 'sailing', complete: true, charter_available: true });
    const b = facetsOf(db, 'builder:b');
    expect(b.country).toBe('Italy');
    expect(b.segment).toBeUndefined();
    expect(result.unmapped).toContainEqual({ type: 'builder', facet: 'segment', value: 'zorp wibble', count: 1 });
    const out = writeFacetsUnmappedReport(result.unmapped, path.join(dir, 'facets-unmapped.json'));
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toContainEqual({ type: 'builder', facet: 'segment', value: 'zorp wibble', count: 1 });
  });

  it('AC4: free text collapses to the vocabulary and marinas get a category from name patterns', () => {
    // Prevents: "Syncrolift 3,000 t" and "steel and aluminium" staying invisible to a dropdown,
    // and marina categories (dry stack, club, mooring) silently collapsing to wet-slip or unclassified.
    const { db } = freshDb();
    upsertNode(db, { id: 'builder:c', type: 'builder', name: 'C', attrs: { specialty: ['Custom superyachts in steel and aluminium'] } });
    upsertNode(db, { id: 'shipyard:s', type: 'shipyard', name: 'S', attrs: { lift_type: ['Syncrolift 3,000 t'], facility_type: 'builder + refit yard' } });
    const marinas = {
      'Loggerhead Dry Stack': 'dry stack',
      'Sunset Yacht Club Marina': 'club marina',
      'Pier 66 Mooring Field': 'mooring field',
      'Plain Marina': 'wet-slip marina',
      'Quiet Cove': 'unclassified',
    };
    for (const name of Object.keys(marinas)) upsertNode(db, { id: `marina:${name}`, type: 'marina', name, attrs: {} });
    applyFacets(db);
    expect(facetsOf(db, 'builder:c').segment).toEqual(expect.arrayContaining(['custom superyacht', 'aluminium specialist']));
    expect(facetsOf(db, 'shipyard:s')).toMatchObject({ lift_type: ['shiplift/syncrolift'], facility_type: 'builder+refit' });
    for (const [name, category] of Object.entries(marinas)) expect(facetsOf(db, `marina:${name}`).facility_category, name).toBe(category);
  });

  it('AC4 (real corpus): >= 90% of the six free-text sources map and >= 60% of marinas are classified', () => {
    // Prevents: a vocabulary that looks closed but only covers a sliver of the real data
    // (dropdowns would hide most entities) and a marina category facet that is mostly "unclassified".
    // Unit: one source CELL (a node's whole attribute) counts as mapped when at least one of its
    // values maps; builder specialty lists also hold bare size ranges ("24-75m") that are not segments.
    const { db } = freshDb();
    const graph = loadGraph();
    for (const n of graph.nodes) upsertNode(db, { id: n.id, type: n.type, name: n.name, attrs: n.attrs });
    for (const e of graph.edges) upsertEdge(db, { src: e.src, rel: e.rel, dst: e.dst, attrs: e.attrs });
    const { coverage } = applyFacets(db);
    const sources = [['builder', 'segment'], ['shipyard', 'lift_type'], ['shipyard', 'facility_type'], ['engine', 'engine_type'], ['person', 'role'], ['person', 'sector']];
    for (const [type, facet] of sources) {
      const c = coverage.find((x) => x.type === type && x.facet === facet);
      expect(c.cells, `${type}.${facet} has data`).toBeGreaterThan(50);
      expect(c.cellsMapped / c.cells, `${type}.${facet}`).toBeGreaterThanOrEqual(0.9);
    }
    const marinas = graph.nodes.filter((n) => n.type === 'marina');
    const classified = marinas.filter((n) => facetsOf(db, n.id).facility_category !== 'unclassified');
    expect(classified.length / marinas.length).toBeGreaterThanOrEqual(0.6);
  });
});

// Wargaming regression locks (WG29, 2026-10-16). These go beyond the 7-spec cap on purpose: each
// pins a real wrong value the adversarial pass found in the committed graph.json.
describe('facets: wargaming hardening (WG29)', () => {
  const yacht = (db, id, attrs) => upsertNode(db, { id: `yacht:${id}`, type: 'yacht', name: id, attrs });

  it('WG29-H1: "classic" is a type only on noun/era evidence; explorer outranks sport-fish', () => {
    // Prevents: "warmer classic interior" or "Classic luxury" minting the TYPE classic (13 real yachts
    // were wrong) and an expedition yacht that carries fishing gear being filed as sport-fish.
    const { db } = freshDb();
    yacht(db, 'style', { year: { value: 2017 }, notes: 'Sailing-adjacent refit with a warmer classic interior' });
    yacht(db, 'luxury', { year: { value: 2010 }, features: 'Classic luxury' });
    yacht(db, 'beast', { features: 'Expedition, tenders, fishing' });
    yacht(db, 'noun', { year: { value: 1931 }, notes: 'classic motor yacht built 1931' });
    yacht(db, 'oldstyle', { year: { value: 1955 }, features: 'Classic elegance' });
    applyFacets(db);
    expect(facetsOf(db, 'yacht:style').propulsion_type).not.toBe('classic');
    expect(facetsOf(db, 'yacht:luxury').propulsion_type).toBe('unknown');
    expect(facetsOf(db, 'yacht:beast').propulsion_type).toBe('explorer');
    expect(facetsOf(db, 'yacht:noun').propulsion_type).toBe('classic');
    expect(facetsOf(db, 'yacht:oldstyle').propulsion_type).toBe('classic');
  });

  it('WG29-H2: founder/executive outrank a corporate "President"; government context still means politician', () => {
    // Prevents: "Founder/President, Emerson Collective" being filed as a politician, and the reverse
    // regression where a real head of state stops being one.
    const { db } = freshDb();
    const roles = {
      'Founder/President, Emerson Collective': 'founder',
      'President, Acme Holdings': 'executive',
      'President, United Arab Emirates': 'politician',
      'Prime Minister of Somewhere': 'politician',
      'Businessman, former senator': 'politician',
    };
    Object.keys(roles).forEach((role, i) => upsertNode(db, { id: `person:p${i}`, type: 'person', name: `P${i}`, attrs: { role } }));
    applyFacets(db);
    Object.values(roles).forEach((expected, i) => expect(facetsOf(db, `person:p${i}`).role, Object.keys(roles)[i]).toBe(expected));
  });

  it('WG29-M1/M2: charter needs amount > 0; an impossible year is unmapped, not "pre-1980"', () => {
    // Prevents: a 0/negative price advertising charter availability, and a year of 0 or 1799
    // (parse artifacts) filing a yacht under pre-1980.
    const { db } = freshDb();
    yacht(db, 'zero', { weekly_rate: { amount: 0 }, year: { value: 0 } });
    yacht(db, 'neg', { weekly_rate: { amount: -5 }, year: { value: 1799 } });
    yacht(db, 'ok', { weekly_rate: { amount: 1 }, year: { value: 1800 } });
    const r = applyFacets(db);
    expect(facetsOf(db, 'yacht:zero').charter_available).toBe(false);
    expect(facetsOf(db, 'yacht:neg').charter_available).toBe(false);
    expect(facetsOf(db, 'yacht:ok').charter_available).toBe(true);
    expect(facetsOf(db, 'yacht:zero').decade).toBeUndefined();
    expect(facetsOf(db, 'yacht:neg').decade).toBeUndefined();
    expect(facetsOf(db, 'yacht:ok').decade).toBe('pre-1980');
    expect(r.unmapped).toContainEqual({ type: 'yacht', facet: 'decade', value: '0', count: 1 });
  });

  it('WG29-M3: placeholder builders are ignored and builders in 2+ countries yield no builder_country', () => {
    // Prevents: builder_country picked from an arbitrary first edge (a placeholder like builder:custom,
    // or one of two real builders) and so changing with row order.
    const { db } = freshDb();
    const geo = (country_code, country) => ({ country_code, country, subdivision: null, city: null });
    upsertNode(db, { id: 'builder:a', type: 'builder', name: 'A', attrs: { geo: geo('IT', 'Italy') } });
    upsertNode(db, { id: 'builder:b', type: 'builder', name: 'B', attrs: { geo: geo('NL', 'Netherlands') } });
    upsertNode(db, { id: 'builder:custom', type: 'builder', name: 'Custom', attrs: { placeholder: true, geo: geo('US', 'United States') } });
    yacht(db, 'two', {});
    yacht(db, 'ph', {});
    upsertEdge(db, { src: 'yacht:two', rel: 'built_by', dst: 'builder:b' });
    upsertEdge(db, { src: 'yacht:two', rel: 'built_by', dst: 'builder:a' });
    upsertEdge(db, { src: 'yacht:ph', rel: 'built_by', dst: 'builder:custom' });
    upsertEdge(db, { src: 'yacht:ph', rel: 'built_by', dst: 'builder:a' });
    const r = applyFacets(db);
    expect(facetsOf(db, 'yacht:two').builder_country).toBeUndefined();
    expect(facetsOf(db, 'yacht:ph').builder_country).toBe('Italy');
    expect(r.builderCountryConflicts).toBe(1);
  });

  it('WG29-M4: meta.facets ignores non-faceted node types and out-of-vocabulary keys/values', () => {
    // Prevents: a stray attrs.facets on a size_class node (or a bogus value on a yacht) leaking into
    // the filter counts the UI will render.
    const { db, dir } = freshDb();
    upsertNode(db, { id: 'size_class:x', type: 'size_class', name: 'X', attrs: { facets: { size_class: 'yacht' } } });
    upsertNode(db, { id: 'yacht:v', type: 'yacht', name: 'V', attrs: { facets: { propulsion_type: 'bogus', made_up: 'x', complete: true } } });
    const out = path.join(dir, 'graph.json');
    exportGraph(db, out, { generatedAt: '2026-01-01T00:00:00.000Z' });
    const { facets } = JSON.parse(fs.readFileSync(out, 'utf8')).meta;
    expect(facets.size_class).toBeUndefined();
    expect(facets.yacht).toEqual({ complete: [{ value: true, count: 1 }] });
  });
});
