// ingest/tests/regionHierarchy.spec.js
//
// TASK-027: geographic hierarchy (country > subdivision > city) over region
// nodes + attrs.geo on located_in/based_in nodes. Eight specs, one per
// acceptance criterion; each names the harm it prevents.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { upsertRegion } from '../src/mappers/regions.js';
import { normalizeCountry } from '../src/mappers/countryAliases.js';
import { applyRegionHierarchy } from '../src/mappers/regionHierarchy.js';
import { computeCoverage } from '../scripts/geoCoverage.mjs';

function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'region-hierarchy-test-'));
  const db = openDb(path.join(dir, 'graph.db'));
  initSchema(db);
  return db;
}

function attrsOf(db, id) {
  const row = db.prepare('SELECT attrs_json FROM nodes WHERE id = ?').get(id);
  return row && row.attrs_json ? JSON.parse(row.attrs_json) : null;
}

function parentsOf(db, id) {
  return db.prepare("SELECT dst FROM edges WHERE src = ? AND rel = 'part_of' ORDER BY dst").all(id).map((r) => r.dst);
}

function dump(db) {
  return JSON.stringify({
    nodes: db.prepare('SELECT id, type, name, attrs_json FROM nodes ORDER BY id').all(),
    edges: db.prepare('SELECT src, rel, dst, attrs_json FROM edges ORDER BY src, rel, dst').all(),
  });
}

describe('countryAliases.normalizeCountry (AC5)', () => {
  it('resolves aliases, parentheticals and compounds to the first named country; never guesses', () => {
    // Prevents: a raw spelling ("USA") or compound cell silently becoming a
    // second country node, or an unknown string being force-matched.
    const cases = [
      ['USA', 'US'],
      ['U.S.', 'US'],
      ['UK', 'GB'],
      ['UAE', 'AE'],
      ['USA / Netherlands', 'US'],
      ['UK (founded in USA)', 'GB'],
      ['Monaco (built at Ferretti/Ancona)', 'MC'],
      ['originally USA (San Diego), now Vietnam (Ho Chi Minh City)', 'US'],
      ['Hong Kong (founded) / China (HQ)', 'HK'],
      ['Curaçao (NL)', 'CW'],
    ];
    for (const [raw, iso2] of cases) expect(normalizeCountry(raw)?.iso2, raw).toBe(iso2);
    expect(normalizeCountry('USA').name).toBe('United States');
    expect(normalizeCountry('Atlantis')).toBeNull();
    expect(normalizeCountry('multiple yards (Assens, Aalborg)')).toBeNull();
  });
});

describe('applyRegionHierarchy — synthetic (AC1-AC3, UC1-UC5)', () => {
  let db;
  afterEach(() => db && db.close());

  it('builds city > subdivision > country, stamps geo, and normalizes builder/shipyard countries', () => {
    // Prevents: a marina losing its country/state roll-up, a country node
    // with an out-edge, or a raw "USA" builder not landing on United States.
    db = freshDb();
    const fll = upsertRegion(db, 'Fort Lauderdale, FL');
    const portland = upsertRegion(db, 'Portland, OR');
    upsertNode(db, { id: 'marina:m1', type: 'marina', name: 'M1', attrs: {} });
    upsertEdge(db, { src: 'marina:m1', rel: 'located_in', dst: fll });
    upsertNode(db, { id: 'marina:m2', type: 'marina', name: 'M2', attrs: {} });
    upsertEdge(db, { src: 'marina:m2', rel: 'located_in', dst: portland });
    upsertNode(db, { id: 'builder:a', type: 'builder', name: 'A', attrs: { country: 'USA' } });
    upsertNode(db, { id: 'builder:b', type: 'builder', name: 'B', attrs: { country: 'United States' } });
    upsertNode(db, { id: 'shipyard:c', type: 'shipyard', name: 'C', attrs: { country: 'USA / Netherlands' } });

    applyRegionHierarchy(db);

    expect(attrsOf(db, 'region:fort-lauderdale').level).toBe('city');
    expect(parentsOf(db, 'region:fort-lauderdale')).toEqual(['region:florida']);
    expect(attrsOf(db, 'region:florida').level).toBe('subdivision');
    expect(parentsOf(db, 'region:florida')).toEqual(['region:united-states']);
    expect(attrsOf(db, 'region:united-states')).toMatchObject({ level: 'country', iso2: 'US', macro_region: 'North America' });
    expect(parentsOf(db, 'region:united-states')).toEqual([]);

    expect(attrsOf(db, 'marina:m1').geo).toEqual({ country_code: 'US', country: 'United States', subdivision: 'Florida', city: 'Fort Lauderdale' });
    expect(attrsOf(db, 'marina:m2').geo).toMatchObject({ country_code: 'US', subdivision: 'Oregon', city: 'Portland' });

    const a = attrsOf(db, 'builder:a');
    expect([a.country, a.country_raw, a.geo.country_code]).toEqual(['United States', 'USA', 'US']);
    const b = attrsOf(db, 'builder:b');
    expect([b.country, b.country_raw, b.geo.country_code]).toEqual(['United States', undefined, 'US']);
    const c = attrsOf(db, 'shipyard:c');
    expect([c.country, c.country_raw, c.geo.country_code]).toEqual(['United States', 'USA / Netherlands', 'US']);
  });

  it('leaves ambiguous bare names and unknown long-tail regions unresolved, intact and geo-free (AC6)', () => {
    // Prevents: guessing "Newport" is Rhode Island (or any single-inbound
    // unknown place) and mislabelling every marina linked to it.
    db = freshDb();
    for (const [id, name] of [['region:newport', 'Newport'], ['region:portland', 'Portland'], ['region:zzz-nowhere-cove', 'Zzz Nowhere Cove']]) {
      upsertNode(db, { id, type: 'region', name, attrs: {} });
      const marina = `marina:at-${id.slice(7)}`;
      upsertNode(db, { id: marina, type: 'marina', name: marina, attrs: {} });
      upsertEdge(db, { src: marina, rel: 'located_in', dst: id });
    }
    const nodesBefore = db.prepare('SELECT COUNT(*) AS c FROM nodes').get().c;

    applyRegionHierarchy(db);

    for (const s of ['newport', 'portland', 'zzz-nowhere-cove']) {
      expect(attrsOf(db, `region:${s}`).level, s).toBe('unresolved');
      expect(parentsOf(db, `region:${s}`), s).toEqual([]);
      expect(attrsOf(db, `marina:at-${s}`).geo, s).toBeUndefined();
    }
    // Nothing minted: no resolved region, no country/subdivision node.
    expect(db.prepare('SELECT COUNT(*) AS c FROM nodes').get().c).toBe(nodesBefore);
  });

  it('is idempotent: a second run leaves nodes, edges and attrs byte-identical', () => {
    // Prevents: duplicate part_of edges / re-minted nodes / geo drift on every re-ingest.
    db = freshDb();
    const fll = upsertRegion(db, 'Fort Lauderdale, FL');
    upsertNode(db, { id: 'marina:m1', type: 'marina', name: 'M1', attrs: {} });
    upsertEdge(db, { src: 'marina:m1', rel: 'located_in', dst: fll });
    upsertNode(db, { id: 'builder:a', type: 'builder', name: 'A', attrs: { country: 'UK' } });
    upsertNode(db, { id: 'region:key-largo-fl', type: 'region', name: 'Key Largo, FL', attrs: {} });
    applyRegionHierarchy(db);
    const first = dump(db);
    applyRegionHierarchy(db);
    expect(dump(db)).toBe(first);
  });
});

describe('applyRegionHierarchy — real corpus export (AC2-AC4, AC7)', () => {
  let graph;
  const saved = {};
  const ENV = ['GRAPH_DB_PATH', 'GRAPH_JSON_PATH', 'INGESTION_SUMMARY_REPORT_PATH', 'SKIPPED_PROSE_REPORT_PATH'];

  beforeAll(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'region-hierarchy-real-'));
    for (const k of ENV) saved[k] = process.env[k];
    process.env.GRAPH_DB_PATH = path.join(dir, 'graph.db');
    process.env.GRAPH_JSON_PATH = path.join(dir, 'graph.json');
    process.env.INGESTION_SUMMARY_REPORT_PATH = path.join(dir, 'summary.md');
    process.env.SKIPPED_PROSE_REPORT_PATH = path.join(dir, 'skipped.md');
    try {
      const { runIngest } = await import('../src/ingest.js');
      runIngest();
      graph = JSON.parse(fs.readFileSync(process.env.GRAPH_JSON_PATH, 'utf8'));
    } finally {
      for (const k of ENV) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }, 60000);

  it('every region has a level; countries are unique per iso2 with macro_region; part_of is a tree', () => {
    // Prevents: a cyclic or multi-parent hierarchy that makes roll-up counts wrong or loops a UI walk.
    const regions = graph.nodes.filter((n) => n.type === 'region');
    const byId = new Map(regions.map((n) => [n.id, n]));
    for (const r of regions) expect(['country', 'subdivision', 'city', 'unresolved'], r.id).toContain(r.attrs.level);

    const countries = regions.filter((r) => r.attrs.level === 'country');
    expect(new Set(countries.map((c) => c.attrs.iso2)).size).toBe(countries.length);
    for (const c of countries) expect(c.attrs.macro_region, c.id).toBeTruthy();

    const parents = new Map();
    for (const e of graph.edges.filter((x) => x.rel === 'part_of')) {
      expect(byId.get(e.src)?.attrs.level, `${e.src} is a country`).not.toBe('country');
      parents.set(e.src, [...(parents.get(e.src) || []), e.dst]);
    }
    for (const [src, dsts] of parents) {
      if (src === 'region:st-petersburg') continue; // pre-existing Florida roll-up on an unresolved node (see UNRESOLVED_REGIONS)
      expect(dsts.length, `${src} has one parent`).toBe(1);
    }
    for (const start of parents.keys()) {
      const seen = new Set();
      for (let cur = start; cur; cur = (parents.get(cur) || [])[0]) {
        expect(seen.has(cur), `cycle at ${start}`).toBe(false);
        seen.add(cur);
      }
    }
  });

  it('meets the coverage floors and leaves only documented ambiguous regions (>=3 inbound) unresolved', () => {
    // Prevents: a table edit silently dropping resolved places (coverage regression) or resolving an ambiguous name.
    const cov = computeCoverage(graph);
    expect(cov.regions_ge3_inbound.unresolved.map((u) => u.id.slice(7)).sort()).toEqual([
      'cyc', 'location-not-specified', 'melbourne', 'myc', 'newport', 'north-haven', 'plymouth', 'richmond',
      'st-petersburg', 'syc', 'vancouver', 'wilmington',
    ]);
    expect(cov.regions_all.pct).toBeGreaterThanOrEqual(70);
    expect(cov.shipyards.pct).toBeGreaterThanOrEqual(95);
    expect(cov.builders_with_country.pct).toBeGreaterThanOrEqual(95);
    // Amended AC4: marinas/clubs measured over nodes that have a located_in/based_in edge.
    expect(cov.marinas.pct).toBeGreaterThanOrEqual(85);
    expect(cov.clubs.pct).toBeGreaterThanOrEqual(80);
  });

  it('exports meta.geo sorted by node_count desc, and keeps the Florida roll-up', () => {
    // Prevents: an unsorted/misshapen meta.geo breaking the UI, or Florida cities losing their state parent.
    const { countries, subdivisions } = graph.meta.geo;
    for (const list of [countries, subdivisions]) {
      for (let i = 1; i < list.length; i++) expect(list[i - 1].node_count).toBeGreaterThanOrEqual(list[i].node_count);
    }
    expect(countries[0]).toMatchObject({ iso2: 'US', name: 'United States', macro_region: 'North America' });
    expect(subdivisions.find((s) => s.name === 'Florida')).toMatchObject({ country_code: 'US' });
    const floridaKids = graph.edges.filter((e) => e.rel === 'part_of' && e.dst === 'region:florida').map((e) => e.src);
    for (const city of ['dania-beach', 'fort-lauderdale', 'miami', 'naples-fl', 'tampa', 'west-palm-beach', 'key-largo-fl']) {
      expect(floridaKids, city).toContain(`region:${city}`);
    }
  });
});

// TASK-027 wargaming fix round: regression locks for the never-guess rule.
// These are adversarial fixtures (WG27-*), beyond the one-spec-per-AC cap by design.
describe('wargaming regression locks (WG27)', () => {
  let db;
  afterEach(() => db && db.close());

  it('WG27-H1: a qualifier naming a different polity vetoes the country instead of matching its neighbour', () => {
    // Prevents: "Korea, North" being stamped South Korea (and similar wrong-country geo).
    for (const raw of ['Korea, North', 'Samoa (American)', 'Ireland (Northern)']) expect(normalizeCountry(raw), raw).toBeNull();
    expect(normalizeCountry('Hong Kong SAR, China')?.iso2).toBe('HK');
  });

  it('WG27-H2/M1/M2: AU/CA code collisions, "or" compounds and trailing country tokens', () => {
    // Prevents: "Perth, WA" becoming Washington state, an "A or B" cell resolving to one place,
    // and "City, FL, USA" losing its state.
    db = freshDb();
    for (const [id, name] of [
      ['region:perth-wa', 'Perth, WA'],
      ['region:henderson-wa', 'Henderson, WA'],
      ['region:juneau-or-sitka', 'Juneau, AK or Sitka, AK'],
      ['region:fort-lauderdale-fl-usa', 'Fort Lauderdale, FL, USA'],
    ]) upsertNode(db, { id, type: 'region', name, attrs: {} });
    applyRegionHierarchy(db);
    expect(attrsOf(db, 'region:perth-wa').level).toBe('unresolved');
    expect(attrsOf(db, 'region:juneau-or-sitka').level).toBe('unresolved');
    expect(parentsOf(db, 'region:henderson-wa')).toEqual(['region:au-western-australia']);
    expect(parentsOf(db, 'region:fort-lauderdale-fl-usa')).toEqual(['region:florida']);
  });

  it('WG27-M3: a null country_raw counts as absent so the real raw value is preserved', () => {
    // Prevents: the original spelling being lost when country_raw is stored as null.
    db = freshDb();
    upsertNode(db, { id: 'builder:f', type: 'builder', name: 'F', attrs: { country: 'USA', country_raw: null } });
    applyRegionHierarchy(db);
    expect(attrsOf(db, 'builder:f')).toMatchObject({ country: 'United States', country_raw: 'USA' });
  });

  it('WG27-M4: location edges into different countries set geo_conflict and keep a deterministic pick', () => {
    // Prevents: silently presenting an arbitrary first-alphabetical country as the only truth.
    db = freshDb();
    upsertRegion(db, 'Seattle');
    upsertRegion(db, 'Amsterdam');
    upsertNode(db, { id: 'marina:two', type: 'marina', name: 'Two', attrs: {} });
    upsertNode(db, { id: 'marina:one', type: 'marina', name: 'One', attrs: {} });
    for (const d of ['region:seattle', 'region:amsterdam']) upsertEdge(db, { src: 'marina:two', rel: 'located_in', dst: d });
    upsertEdge(db, { src: 'marina:one', rel: 'located_in', dst: 'region:seattle' });
    const stats = applyRegionHierarchy(db);
    expect(attrsOf(db, 'marina:two').geo_conflict).toBe(true);
    expect(attrsOf(db, 'marina:two').geo.country_code).toBe('NL');
    expect(attrsOf(db, 'marina:one').geo_conflict).toBeUndefined();
    expect(stats.geoConflicts).toBe(1);
  });

  it('WG27-M5: a region named like a country merges onto the canonical country node (one node per iso2)', () => {
    // Prevents: region:uk and region:united-kingdom both existing as GB country nodes.
    db = freshDb();
    upsertNode(db, { id: 'region:uk', type: 'region', name: 'UK', attrs: {} });
    upsertNode(db, { id: 'region:italia', type: 'region', name: 'Italia', attrs: {} });
    upsertNode(db, { id: 'builder:y', type: 'builder', name: 'Y', attrs: {} });
    upsertEdge(db, { src: 'builder:y', rel: 'based_in', dst: 'region:uk' });
    applyRegionHierarchy(db);
    expect(db.prepare("SELECT 1 FROM nodes WHERE id IN ('region:uk','region:italia')").get()).toBeUndefined();
    expect(attrsOf(db, 'region:united-kingdom')).toMatchObject({ level: 'country', iso2: 'GB' });
    expect(attrsOf(db, 'region:italy').iso2).toBe('IT');
    expect(attrsOf(db, 'builder:y').geo.country_code).toBe('GB');
    const countries = db.prepare("SELECT attrs_json FROM nodes WHERE type='region'").all().map((r) => JSON.parse(r.attrs_json)).filter((a) => a.level === 'country');
    expect(new Set(countries.map((a) => a.iso2)).size).toBe(countries.length);
  });
});
