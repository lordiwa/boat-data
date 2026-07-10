// ingest/tests/shipyardMapper.spec.js
//
// TASK-016: shipyard/dry-dock facility mapper. Synthetic fixtures (the real
// corpus docs now live at knowledge/83-87, curated in TASK-016 Phase 2 — see
// realCorpusExport.spec.js for the end-to-end real-corpus lock) shaped
// exactly per the ticket's header spec:
//   Shipyard | Country | City | Operator | Facility Type | Dry Docks |
//   Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services |
//   Founded | Website | Notes
//
// IMPORTANT header-aliasing note (verified against tableParser.js's
// ALIAS_MAP before writing this mapper): "Shipyard" is ALREADY aliased to
// the canonical "builder" key (used elsewhere for a yacht's builder
// column), and "Country" is ALREADY aliased to the canonical "region" key
// (used elsewhere for a free-text location cell) — so this table's
// normalizedHeaders are ['builder', 'region', 'city', 'operator',
// 'facility_type', 'dry_docks', 'max_loa_m', 'max_tonnage_t',
// 'dock_dimensions', 'lift_type', 'services', 'founded', 'website',
// 'notes']. No NEW alias was added (the ticket allows it "only if needed
// and safe"; it wasn't needed here), so the guard and row-mapper below
// deliberately read the 'builder' key as the shipyard's name and the
// 'region' key as its country text.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapShipyardTables, isShipyardTable } from '../src/mappers/shipyardMapper.js';
import { isMarinaTable } from '../src/mappers/marinaMapper.js';
import { isCompanyTable } from '../src/mappers/companyMapper.js';
import { isClubTable } from '../src/mappers/clubMapper.js';
import { isEngineTable } from '../src/mappers/engineMapper.js';

// --- Synthetic fixture: two shipyards, one with a known operator (a
// builder node pre-seeded to mimic yachtMapper having already ingested a
// yacht built by "Feadship" earlier in the sorted-filename ingestion
// order), one with an unknown operator. ---
const FIXTURE_SHIPYARDS = `
| Shipyard                | Country     | City      | Operator     | Facility Type       | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type      | Services                          | Founded | Website              | Notes                       |
|--------------------------|-------------|-----------|--------------|----------------------|-----------|-------------|------------------|------------------|-----------------|------------------------------------|---------|----------------------|------------------------------|
| Feadship Aalsmeer Yard   | Netherlands | Aalsmeer  | Feadship     | Builder Yard         | 3         | 160m        | 15000            | 200m x 40m       | Syncrolift      | New build, Refit, Sea trials      | 1849    | https://feadship.nl  | Royal Dutch shipbuilder.    |
| MB92 Barcelona           | Spain       | Barcelona | MB92 Group   | Refit & Repair       | 2         | 130m        | 8000             | —                | Floating dock   | Refit, Repaint, Engineering       | 2005    | https://mb92.com     | N/A                          |
`;

// --- Synthetic fixture (HIGH regression): comma-formatted Max Tonnage
// cells, shaped like the real corpus's Grand Bahama Shipyard row (93,500t
// "East End" floating dock) — must parse to the full value, not just the
// digits before the first comma. ---
const FIXTURE_COMMA_TONNAGE = `
| Shipyard              | Country | City     | Operator            | Facility Type      | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type    | Services         | Founded | Website                     | Notes |
|------------------------|---------|----------|----------------------|---------------------|-----------|-------------|------------------|------------------|---------------|-------------------|---------|------------------------------|-------|
| Grand Bahama Shipyard | Bahamas | Freeport | Grand Bahama Shipyard Ltd | commercial dry dock | 5         | 414         | 93,500           | 357m x 76m       | floating dock | repair, conversion | 1997    | grandbahamashipyard.com     |       |
`;

// --- Synthetic fixture (MEDIUM 1 regression): Operator cells that are
// researcher prose narrating an OWNERSHIP CHANGE rather than naming the
// current operator, shaped exactly like the real corpus rows that minted
// junk company nodes (see knowledge/83's Peene-Werft Wolgast and Perini
// Navi Viareggio rows, now curated to name the current operator instead —
// this fixture proves the mapper itself also guards against the shape). ---
const FIXTURE_PROSE_OPERATOR = `
| Shipyard                  | Country | City     | Operator                                                | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services | Founded | Website      | Notes |
|----------------------------|---------|----------|----------------------------------------------------------|----------------|-----------|-------------|------------------|------------------|-----------|----------|---------|--------------|-------|
| Peene-Werft Wolgast Test  | Germany | Wolgast | Formerly Lürssen/NVL; sold to Rheinmetall in 2025       | builder yard   | 1         | 100         | 1000             | 100m dock        | slipway   | newbuild | 1948    | nvl.de       |       |
| Perini Navi Viareggio Test | Italy   | Viareggio | Sold by The Italian Sea Group to Next Yacht Group in 2024 | builder yard   | 1         | 60          | 500              | 60m dock         | slipway   | newbuild | 1983    | perininavi.it |       |
`;

// --- Synthetic fixture: a table with only ONE of the four specific
// shipyard-only signal columns (facility_type) — must NOT be claimed
// (guard requires at least 2). ---
const FIXTURE_ONE_SIGNAL_ONLY = `
| Shipyard          | Country | City   | Facility Type |
|-------------------|---------|--------|----------------|
| Some Random Yard  | Italy   | Genoa  | Builder Yard   |
`;

// --- Synthetic fixture: a marina-shaped table (real shape, from
// marinaMapper.spec.js's file-16 fixture) — must NOT be claimed by the
// shipyard guard. ---
const FIXTURE_MARINA_SHAPE = `
| Facility                      | Location | Lift Capacity       | Max LOA/Beam     | Marina Integration    | Key Services                | SSG Listed? |
|--------------------------------|----------|---------------------|-------------------|------------------------|-------------------------------|-------------|
| Safe Harbor Newport Shipyard  | Newport | 500T + 200T + 150T | 300+ ft / 36 ft  | Yes (3,500 ft docks) | Full refit, paint, rigging  | Yes        |
`;

// --- Synthetic fixture: a company-shaped table (real shape, from
// companyMapper.spec.js) — must NOT be claimed by the shipyard guard. ---
const FIXTURE_COMPANY_SHAPE = `
| Company Name         | Address (if available) | Phone/Email/Website (if available) | Brief Description/Notes        |
|-----------------------|--------------------------|--------------------------------------|----------------------------------|
| Edmiston and Company | 57 rue Grimaldi, Monaco | Not available                       | Leading superyacht brokerage.   |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shipyard-mapper-test-')), 'graph.db');
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

function edgeExists(src, rel, dst) {
  return !!db.prepare('SELECT 1 FROM edges WHERE src = ? AND rel = ? AND dst = ?').get(src, rel, dst);
}

describe('isShipyardTable — schema guard', () => {
  it('claims the exact shipyard header shape (Shipyard + >=2 of Facility Type/Dry Docks/Lift Type/Dock Dimensions)', () => {
    const [table] = parseTables(FIXTURE_SHIPYARDS);
    expect(isShipyardTable(table)).toBe(true);
  });

  it('does NOT claim a shipyard-named table with only one specific signal column', () => {
    const [table] = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    expect(isShipyardTable(table)).toBe(false);
  });

  it('does NOT claim a marina-shaped table, and the marina guard does not claim the shipyard table (no collision)', () => {
    const [marinaTable] = parseTables(FIXTURE_MARINA_SHAPE);
    expect(isShipyardTable(marinaTable)).toBe(false);

    const [shipyardTable] = parseTables(FIXTURE_SHIPYARDS);
    expect(isMarinaTable(shipyardTable)).toBe(false);
  });

  it('does NOT claim a company-shaped table, and the company guard does not claim the shipyard table (no collision)', () => {
    const [companyTable] = parseTables(FIXTURE_COMPANY_SHAPE);
    expect(isShipyardTable(companyTable)).toBe(false);

    const [shipyardTable] = parseTables(FIXTURE_SHIPYARDS);
    expect(isCompanyTable(shipyardTable)).toBe(false);
  });

  it('the club and engine guards do not claim the shipyard table (no collision)', () => {
    const [shipyardTable] = parseTables(FIXTURE_SHIPYARDS);
    expect(isClubTable(shipyardTable)).toBe(false);
    expect(isEngineTable(shipyardTable)).toBe(false);
  });
});

describe('mapShipyardTables — attribute mapping', () => {
  let result;

  beforeEach(() => {
    const tables = parseTables(FIXTURE_SHIPYARDS);
    result = mapShipyardTables(db, tables, 'shipyards-fixture.md');
  });

  it('creates one Shipyard node per row with a provenance-tagged attrs object', () => {
    expect(result.shipyards).toBe(2);
    expect(countByType('shipyard')).toBe(2);

    const feadship = getNode('shipyard:feadship-aalsmeer-yard');
    expect(feadship).not.toBeNull();
    expect(feadship.type).toBe('shipyard');
    expect(feadship.name).toBe('Feadship Aalsmeer Yard');
    expect(feadship.attrs.provenance).toEqual(['shipyards-fixture.md']);
  });

  it('parses country/city/facility_type as plain strings', () => {
    const feadship = getNode('shipyard:feadship-aalsmeer-yard');
    expect(feadship.attrs.country).toBe('Netherlands');
    expect(feadship.attrs.city).toBe('Aalsmeer');
    expect(feadship.attrs.facility_type).toBe('Builder Yard');
  });

  it('parses dry_docks as an integer and max_loa/max_tonnage as numbers', () => {
    const feadship = getNode('shipyard:feadship-aalsmeer-yard');
    expect(feadship.attrs.dry_docks).toBe(3);
    expect(feadship.attrs.max_loa).toBe(160);
    expect(feadship.attrs.max_tonnage).toBe(15000);
  });

  it('splits lift_type and services on commas into arrays', () => {
    const feadship = getNode('shipyard:feadship-aalsmeer-yard');
    expect(feadship.attrs.lift_type).toEqual(['Syncrolift']);
    expect(feadship.attrs.services).toEqual(['New build', 'Refit', 'Sea trials']);
  });

  it('omits empty cells rather than storing placeholder text (MB92\'s Dock Dimensions "—" and Notes "N/A")', () => {
    const mb92 = getNode('shipyard:mb92-barcelona');
    expect(mb92.attrs).not.toHaveProperty('dock_dimensions');
    expect(mb92.attrs).not.toHaveProperty('notes');
  });
});

describe('mapShipyardTables — numeric parsing (regression: HIGH, comma-formatted tonnage)', () => {
  it('strips thousands-separator commas before parsing Max Tonnage (93,500 -> 93500, not 93)', () => {
    const tables = parseTables(FIXTURE_COMMA_TONNAGE);
    mapShipyardTables(db, tables, 'comma-tonnage-fixture.md');

    const gbs = getNode('shipyard:grand-bahama-shipyard');
    expect(gbs).not.toBeNull();
    expect(gbs.attrs.max_tonnage).toBe(93500);
  });
});

describe('mapShipyardTables — Operator plausibility (regression: MEDIUM 1, ownership-history prose)', () => {
  it('rejects an Operator cell narrating an ownership change ("Formerly X; sold to Y") rather than minting a junk company node from it', () => {
    const tables = parseTables(FIXTURE_PROSE_OPERATOR);
    const result = mapShipyardTables(db, tables, 'prose-operator-fixture.md');

    expect(result.shipyards).toBe(2);
    // Shipyard nodes are still created (the row itself is fine)...
    expect(getNode('shipyard:peene-werft-wolgast-test')).not.toBeNull();
    // ...but no OPERATED_BY edge, and no junk company node minted from the
    // prose text.
    expect(
      db
        .prepare("SELECT COUNT(*) AS count FROM edges WHERE src = 'shipyard:peene-werft-wolgast-test' AND rel = 'operated_by'")
        .get().count
    ).toBe(0);
    expect(getNode('company:formerly-lurssen-nvl-sold-to-rheinmetall-in-2025')).toBeNull();
  });

  it('rejects a "Sold by X to Y" Operator cell the same way', () => {
    const tables = parseTables(FIXTURE_PROSE_OPERATOR);
    mapShipyardTables(db, tables, 'prose-operator-fixture.md');

    expect(
      db
        .prepare("SELECT COUNT(*) AS count FROM edges WHERE src = 'shipyard:perini-navi-viareggio-test' AND rel = 'operated_by'")
        .get().count
    ).toBe(0);
    expect(getNode('company:sold-by-the-italian-sea-group-to-next-yacht-group-in-2024')).toBeNull();
  });
});

describe('mapShipyardTables — LOCATED_IN edges', () => {
  it('resolves a Region node from the City column and links shipyard -> region', () => {
    const tables = parseTables(FIXTURE_SHIPYARDS);
    mapShipyardTables(db, tables, 'shipyards-fixture.md');

    expect(edgeExists('shipyard:feadship-aalsmeer-yard', 'located_in', 'region:aalsmeer')).toBe(true);
    expect(edgeExists('shipyard:mb92-barcelona', 'located_in', 'region:barcelona')).toBe(true);
  });
});

describe('mapShipyardTables — OPERATED_BY edges', () => {
  it('links to an existing builder node when the Operator cell matches one by normalized name', () => {
    // Simulates yachtMapper having already minted this builder node earlier
    // in the sorted-filename ingestion order (see ingest.js module header).
    upsertNode(db, { id: 'builder:feadship', type: 'builder', name: 'Feadship' });

    const tables = parseTables(FIXTURE_SHIPYARDS);
    mapShipyardTables(db, tables, 'shipyards-fixture.md');

    expect(edgeExists('shipyard:feadship-aalsmeer-yard', 'operated_by', 'builder:feadship')).toBe(true);
    // No duplicate Company node minted for an operator that already
    // resolved to a builder.
    expect(getNode('company:feadship')).toBeNull();
  });

  it('creates a new Company node (kind: "shipyard operator") when the Operator has no existing builder/company node', () => {
    const tables = parseTables(FIXTURE_SHIPYARDS);
    mapShipyardTables(db, tables, 'shipyards-fixture.md');

    const operator = getNode('company:mb92-group');
    expect(operator).not.toBeNull();
    expect(operator.type).toBe('company');
    expect(operator.attrs.kind).toBe('shipyard operator');
    expect(edgeExists('shipyard:mb92-barcelona', 'operated_by', 'company:mb92-group')).toBe(true);
  });

  it('links to an existing company node when the Operator matches one by normalized name (not just builders)', () => {
    upsertNode(db, { id: 'company:mb92-group', type: 'company', name: 'MB92 Group', attrs: { kind: 'refit specialist' } });

    const tables = parseTables(FIXTURE_SHIPYARDS);
    mapShipyardTables(db, tables, 'shipyards-fixture.md');

    expect(edgeExists('shipyard:mb92-barcelona', 'operated_by', 'company:mb92-group')).toBe(true);
    // Pre-existing attrs (kind: 'refit specialist') must not be clobbered.
    const operator = getNode('company:mb92-group');
    expect(operator.attrs.kind).toBe('refit specialist');
  });
});

describe('mapShipyardTables — idempotency', () => {
  it('running twice over the same input yields identical node/edge counts (no dupes)', () => {
    const tables = parseTables(FIXTURE_SHIPYARDS);
    mapShipyardTables(db, tables, 'shipyards-fixture.md');
    const firstShipyards = countByType('shipyard');
    const firstCompanies = countByType('company');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapShipyardTables(db, tables, 'shipyards-fixture.md');
    expect(countByType('shipyard')).toBe(firstShipyards);
    expect(countByType('company')).toBe(firstCompanies);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('mapShipyardTables — schema guard on the table pass', () => {
  it('skips a non-shipyard table and reports it, without minting any shipyard nodes', () => {
    const tables = parseTables(FIXTURE_MARINA_SHAPE);
    const result = mapShipyardTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.shipyards).toBe(0);
    expect(countByType('shipyard')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapShipyardTables and isShipyardTable as named exports', async () => {
    const mod = await import('../src/mappers/shipyardMapper.js');
    expect(typeof mod.mapShipyardTables).toBe('function');
    expect(typeof mod.isShipyardTable).toBe('function');
  });
});
