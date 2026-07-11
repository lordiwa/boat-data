// ingest/tests/marinaEnrichmentMapper.spec.js
//
// TASK-020: marina enrichment mapper (second guard on marinaMapper.js,
// mirroring engineMapper.js's TASK-017 dual-guard-per-file pattern). Real
// header shape grounded in research/round3/marina-enrichment.md (curated
// into knowledge/94):
//   Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel
//   Dock | Website | Notes
// normalizedHeaders: marina, region, city, berths, max_loa_m, max_draft_m,
// fuel_dock, website, notes ("Marina" is a bare header, not aliased to any
// existing 'name'/'facility'/'marina_name' key — a deliberately distinct
// identifier from the original marinaMapper.js guard).
//
// COLLISION GUARD (hard requirement, tested): the graph's existing
// "Portofino Hotel & Marina" node is in Redondo Beach, California — a
// same-name row describing the REAL Italian Portofino marina (different
// country) must NOT enrich it. Resolution matches on name AND country
// (via the existing node's located_in region) when the existing node has
// a resolvable location.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapMarinaEnrichmentTables, isMarinaEnrichmentTable } from '../src/mappers/marinaMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';

const FIXTURE_MARINA_ENRICHMENT = `
| Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel Dock | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Marina Ibiza | Spain | Ibiza Town, Balearic Islands | 85 | 60 | 10 | Yes | marinaibiza.com | Formerly "Ibiza Magna." |
| Port Hercule | Monaco | Monaco (La Condamine) | 700 | 135 | 6.5 | Yes | — | Hosts the Monaco Yacht Show. |
`;

// Deliberately shaped to collide by EXACT name with an existing California
// marina node — proves the country guard, not just that our real curated
// data happens to avoid the collision.
const FIXTURE_PORTOFINO_COLLISION = `
| Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel Dock | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Portofino Hotel & Marina | Italy | Portofino | 14 | 80 | — | Yes | portofinoyachtmarina.com | The real Italian marina, not the California hotel/marina of the same name. |
`;

const FIXTURE_YACHT_HAVEN_COLLISION = `
| Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel Dock | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Yacht Haven Marina | USVI (USA) | Charlotte Amalie, St Thomas | 46 | 200 | 7.6 | Yes | igymarinas.com | The real USVI Yacht Haven Grande facility, not the Pacific NW marina of the same name. |
`;

// Only ONE of the three marina-enrichment-specific signal columns present
// (berths) — must NOT be claimed (guard requires >=2).
const FIXTURE_ONE_SIGNAL_ONLY = `
| Marina | Country | Berths |
|--------|---------|--------|
| Some Marina | Spain | 100 |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'marina-enrichment-test-')), 'graph.db');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(path.dirname(tmpDbPath), { recursive: true, force: true });
});

function getNode(id) {
  const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, attrs: row.attrs_json ? JSON.parse(row.attrs_json) : null };
}

function countByType(type) {
  return db.prepare('SELECT COUNT(*) AS count FROM nodes WHERE type = ?').get(type).count;
}

describe('isMarinaEnrichmentTable — schema guard', () => {
  it('claims the exact marina-enrichment header shape (Marina + >=2 of Berths/Max LOA/Max Draft)', () => {
    const [table] = parseTables(FIXTURE_MARINA_ENRICHMENT);
    expect(isMarinaEnrichmentTable(table)).toBe(true);
  });

  it('does NOT claim a marina-named table with only one specific signal column', () => {
    const [table] = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    expect(isMarinaEnrichmentTable(table)).toBe(false);
  });

  it('does NOT collide with the shipyard guard (no collision either direction)', () => {
    const [table] = parseTables(FIXTURE_MARINA_ENRICHMENT);
    expect(isShipyardTable(table)).toBe(false);
  });
});

describe('mapMarinaEnrichmentTables — enriches existing + creates new marina nodes', () => {
  it('enriches an existing marina node by exact name', () => {
    upsertNode(db, { id: 'marina:marina-ibiza', type: 'marina', name: 'Marina Ibiza', attrs: { berths: 425 } });

    const tables = parseTables(FIXTURE_MARINA_ENRICHMENT);
    const result = mapMarinaEnrichmentTables(db, tables, 'marina-enrichment-fixture.md');

    const node = getNode('marina:marina-ibiza');
    expect(node.attrs.max_loa.meters).toBe(60);
    expect(node.attrs.max_draft.meters).toBe(10);
    expect(node.attrs.fuel_dock).toBe(true);
    expect(node.attrs.website).toBe('marinaibiza.com');
    expect(result.matched).toBeGreaterThanOrEqual(1);
  });

  it('creates a new marina node when none exists', () => {
    const tables = parseTables(FIXTURE_MARINA_ENRICHMENT);
    const result = mapMarinaEnrichmentTables(db, tables, 'marina-enrichment-fixture.md');

    const node = getNode('marina:port-hercule');
    expect(node).not.toBeNull();
    expect(node.type).toBe('marina');
    expect(node.attrs.berths).toBe(700);
    expect(result.created).toBeGreaterThanOrEqual(1);
  });

  it('links a LOCATED_IN edge to a canonical Region resolved from City', () => {
    const tables = parseTables(FIXTURE_MARINA_ENRICHMENT);
    mapMarinaEnrichmentTables(db, tables, 'marina-enrichment-fixture.md');

    expect(
      db.prepare("SELECT 1 FROM edges WHERE src = 'marina:port-hercule' AND rel = 'located_in'").get()
    ).toBeTruthy();
  });
});

describe('mapMarinaEnrichmentTables — collision guards (hard requirement)', () => {
  it('does NOT enrich the California "Portofino Hotel & Marina" node with Italian Portofino data (name matches, country does not)', () => {
    upsertNode(db, { id: 'marina:portofino-hotel-marina', type: 'marina', name: 'Portofino Hotel & Marina', attrs: {} });
    upsertNode(db, { id: 'region:redondo-beach', type: 'region', name: 'Redondo Beach' });
    upsertEdge(db, { src: 'marina:portofino-hotel-marina', rel: 'located_in', dst: 'region:redondo-beach' });

    const tables = parseTables(FIXTURE_PORTOFINO_COLLISION);
    mapMarinaEnrichmentTables(db, tables, 'portofino-collision-fixture.md');

    // The California node must be untouched (no berths/max_loa written onto it).
    const california = getNode('marina:portofino-hotel-marina');
    expect(california.attrs.berths).toBeUndefined();
    expect(california.attrs.max_loa).toBeUndefined();

    // A distinct node must exist for the real Italian marina instead.
    expect(countByType('marina')).toBe(2);
    const italian = db
      .prepare("SELECT * FROM nodes WHERE type = 'marina' AND id != 'marina:portofino-hotel-marina'")
      .get();
    expect(italian).toBeTruthy();
    const italianAttrs = JSON.parse(italian.attrs_json);
    expect(italianAttrs.berths).toBe(14);
  });

  it('does NOT enrich the Pacific NW "Yacht Haven Marina" node with USVI Yacht Haven Grande data', () => {
    upsertNode(db, { id: 'marina:yacht-haven-marina', type: 'marina', name: 'Yacht Haven Marina', attrs: {} });
    upsertNode(db, { id: 'region:wilmington', type: 'region', name: 'Wilmington' });
    upsertEdge(db, { src: 'marina:yacht-haven-marina', rel: 'located_in', dst: 'region:wilmington' });

    const tables = parseTables(FIXTURE_YACHT_HAVEN_COLLISION);
    mapMarinaEnrichmentTables(db, tables, 'yacht-haven-collision-fixture.md');

    const pnw = getNode('marina:yacht-haven-marina');
    expect(pnw.attrs.berths).toBeUndefined();
    expect(countByType('marina')).toBe(2);
  });

  it('DOES enrich an existing node by exact name when country is compatible (no false-positive rejection)', () => {
    upsertNode(db, { id: 'marina:marina-ibiza', type: 'marina', name: 'Marina Ibiza', attrs: {} });
    // Region id must match exactly what resolveRegion('Ibiza Town, Balearic
    // Islands') itself would compute (region:ibiza-town-balearic-islands),
    // since locationCompatible() compares against that canonical id.
    upsertNode(db, { id: 'region:ibiza-town-balearic-islands', type: 'region', name: 'Ibiza Town, Balearic Islands' });
    upsertEdge(db, { src: 'marina:marina-ibiza', rel: 'located_in', dst: 'region:ibiza-town-balearic-islands' });

    const tables = parseTables(FIXTURE_MARINA_ENRICHMENT);
    mapMarinaEnrichmentTables(db, tables, 'marina-enrichment-fixture.md');

    expect(getNode('marina:marina-ibiza').attrs.berths).toBe(85);
    expect(countByType('marina')).toBe(2); // Marina Ibiza (enriched) + Port Hercule (new)
  });

  it('DOES enrich when the existing region is a fuller/messier real-world string than the incoming City cell (granularity mismatch, not a real disagreement)', () => {
    // Real-corpus regression: "Marina Port Vell"'s existing located_in
    // region is named "Barcelona, Catalonia" (fuller than this research
    // pass's own simple "Barcelona" City cell) — a strict canonical-region-
    // id equality check incorrectly treated these as incompatible and
    // minted a duplicate "marina:marina-port-vell-barcelona" node instead
    // of enriching the real one.
    upsertNode(db, { id: 'marina:marina-port-vell', type: 'marina', name: 'Marina Port Vell', attrs: {} });
    upsertNode(db, { id: 'region:barcelona-catalonia', type: 'region', name: 'Barcelona, Catalonia' });
    upsertEdge(db, { src: 'marina:marina-port-vell', rel: 'located_in', dst: 'region:barcelona-catalonia' });

    const tables = parseTables(`
| Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel Dock | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Marina Port Vell | Spain | Barcelona | 151 | 190 | 10 | Yes | oneoceanportvell.com | |
`);
    mapMarinaEnrichmentTables(db, tables, 'port-vell-fixture.md');

    expect(getNode('marina:marina-port-vell').attrs.berths).toBe(151);
    expect(countByType('marina')).toBe(1);
  });
});

describe('mapMarinaEnrichmentTables — idempotency', () => {
  it('running twice over the same input yields identical node/edge counts (no dupes)', () => {
    const tables = parseTables(FIXTURE_MARINA_ENRICHMENT);
    mapMarinaEnrichmentTables(db, tables, 'marina-enrichment-fixture.md');
    const firstMarinas = countByType('marina');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapMarinaEnrichmentTables(db, tables, 'marina-enrichment-fixture.md');
    expect(countByType('marina')).toBe(firstMarinas);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('mapMarinaEnrichmentTables — schema guard on the table pass', () => {
  it('skips a non-marina-enrichment table and reports it, without minting any marina nodes', () => {
    const tables = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    const result = mapMarinaEnrichmentTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.matched + result.created).toBe(0);
    expect(countByType('marina')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapMarinaEnrichmentTables and isMarinaEnrichmentTable as named exports', async () => {
    const mod = await import('../src/mappers/marinaMapper.js');
    expect(typeof mod.mapMarinaEnrichmentTables).toBe('function');
    expect(typeof mod.isMarinaEnrichmentTable).toBe('function');
  });
});
