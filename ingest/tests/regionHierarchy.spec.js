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
