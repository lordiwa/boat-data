// ingest/tests/builderEnrichmentMapper.spec.js
//
// TASK-019: builder enrichment mapper. Real header shape grounded in
// research/round2/builder-enrichment.md (curated into knowledge/91):
//   Builder | Country | City | Founded | Specialty | Status | Parent
//   Company | Website | Notes
// "Builder" aliases to the canonical 'builder' key (tableParser.js's
// ALIAS_MAP: builder: ['Builder', 'Shipyard', 'Yard'] — the SAME key
// shipyardMapper.js reads its own facility name from), and "Country"
// aliases to 'region' — so this table's normalizedHeaders are ['builder',
// 'region', 'city', 'founded', 'specialty', 'status', 'parent_company',
// 'website', 'notes']. This mapper resolves onto EXISTING builder nodes by
// exact-then-normalized name (per the ticket: "only create a new builder
// node if no match — expected ~0 new"), rather than yachtMapper's usual
// "always mint if missing" convention.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapBuilderEnrichmentTables, isBuilderEnrichmentTable } from '../src/mappers/builderEnrichmentMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';
import { isEngineManufacturerTable } from '../src/mappers/engineMapper.js';
import { isCompanyTable } from '../src/mappers/companyMapper.js';

const FIXTURE_BUILDER_ENRICHMENT = `
| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Lurssen | Germany | Bremen-Vegesack | 1875 | custom steel/aluminium megayachts, naval vessels | active | family-owned (Lürssen family) | lurssen.com | 51 yachts in graph |
| Heesen | Netherlands | Oss | 1978 | fast aluminium & steel superyachts | active | privately held | heesenyachts.com | matches existing node "Heesen" (curated from "Heesen Yachts") |
| Brand New Yard | Italy | Genoa | 2010 | custom sport yachts | active | — | brandnewyard.com | no existing node — expected to mint one |
`;

// A Parent Company cell narrating an ownership CHANGE in prose (same shape
// as the TASK-016/017 regression fixtures) — must not mint a junk company
// node from it.
const FIXTURE_PROSE_PARENT = `
| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Test Yard | UK | Poole | 1969 | production motoryachts | active | Formerly Acme Holdings; sold to Beta Corp in 2024 | testyard.com | prose parent cell |
`;

// Only ONE of the three builder-enrichment-specific signal columns present
// (specialty) — must NOT be claimed (guard requires >=2).
const FIXTURE_ONE_SIGNAL_ONLY = `
| Builder | Country | City | Specialty |
|---------|---------|------|-----------|
| Some Yard | Italy | Genoa | custom motoryachts |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'builder-enrichment-test-')), 'graph.db');
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

describe('isBuilderEnrichmentTable — schema guard', () => {
  it('claims the exact builder-enrichment header shape (Builder + >=2 of Specialty/Status/Parent Company)', () => {
    const [table] = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    expect(isBuilderEnrichmentTable(table)).toBe(true);
  });

  it('does NOT claim a builder-named table with only one specific signal column', () => {
    const [table] = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    expect(isBuilderEnrichmentTable(table)).toBe(false);
  });

  it('does NOT collide with the shipyard/engineManufacturer/company guards (no collision either direction)', () => {
    const [table] = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    expect(isShipyardTable(table)).toBe(false);
    expect(isEngineManufacturerTable(table)).toBe(false);
    expect(isCompanyTable(table)).toBe(false);

    const [shipyardTable] = parseTables(`
| Shipyard                | Country     | City      | Operator     | Facility Type       | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type      | Services                          | Founded | Website              | Notes                       |
|--------------------------|-------------|-----------|--------------|----------------------|-----------|-------------|------------------|------------------|-----------------|------------------------------------|---------|----------------------|------------------------------|
| Feadship Aalsmeer Yard   | Netherlands | Aalsmeer  | Feadship     | Builder Yard         | 3         | 160m        | 15000            | 200m x 40m       | Syncrolift      | New build, Refit, Sea trials      | 1849    | https://feadship.nl  | Royal Dutch shipbuilder.    |
`);
    expect(isBuilderEnrichmentTable(shipyardTable)).toBe(false);
  });
});

describe('mapBuilderEnrichmentTables — resolves onto EXISTING builder nodes', () => {
  it('resolves onto an existing builder node by EXACT name (no new node minted)', () => {
    upsertNode(db, { id: 'builder:lurssen', type: 'builder', name: 'Lurssen' });
    upsertNode(db, { id: 'builder:heesen', type: 'builder', name: 'Heesen' });

    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    const result = mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    expect(countByType('builder')).toBe(3); // Lurssen + Heesen (existing) + Brand New Yard (minted)
    const lurssen = getNode('builder:lurssen');
    expect(lurssen.attrs.country).toBe('Germany');
    expect(lurssen.attrs.founded).toBe('1875');
    expect(lurssen.attrs.specialty).toEqual(['custom steel/aluminium megayachts', 'naval vessels']);
    expect(lurssen.attrs.provenance).toEqual(['builder-enrichment-fixture.md']);
    expect(result.matched).toBe(2);
    expect(result.created).toBe(1);
  });

  it('resolves onto an existing builder node by NORMALIZED name when no exact match exists', () => {
    upsertNode(db, { id: 'builder:heesen', type: 'builder', name: 'HEESEN' }); // differs by case only

    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    const heesen = getNode('builder:heesen');
    expect(heesen.name).toBe('HEESEN'); // pre-existing name preserved, not overwritten
    expect(heesen.attrs.country).toBe('Netherlands');
    expect(heesen.attrs.city).toBe('Oss');
  });

  it('mints a new builder node only when no existing node matches by exact-or-normalized name', () => {
    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    const created = getNode('builder:brand-new-yard');
    expect(created).not.toBeNull();
    expect(created.type).toBe('builder');
    expect(created.name).toBe('Brand New Yard');
    expect(created.attrs.country).toBe('Italy');
  });
});

describe('mapBuilderEnrichmentTables — attribute mapping', () => {
  it('splits Specialty on commas into an array and stores status/website/notes as plain strings', () => {
    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    const lurssen = getNode('builder:brand-new-yard');
    expect(lurssen.attrs.specialty).toEqual(['custom sport yachts']);
    expect(lurssen.attrs.status).toBe('active');
    expect(lurssen.attrs.website).toBe('brandnewyard.com');
    expect(lurssen.attrs.notes).toBe('no existing node — expected to mint one');
  });

  it('omits Parent Company from the stored attrs (it only drives the owned_by edge, per engineMapper\'s precedent)', () => {
    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    const lurssen = getNode('builder:brand-new-yard');
    expect(lurssen.attrs).not.toHaveProperty('parent_company');
  });
});

describe('mapBuilderEnrichmentTables — LOCATED_IN edges', () => {
  it('resolves a Region node from City and links builder -> region', () => {
    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    expect(edgeExists('builder:brand-new-yard', 'located_in', 'region:genoa')).toBe(true);
  });
});

describe('mapBuilderEnrichmentTables — OWNED_BY edges (Parent Company, reusing TASK-017 discipline)', () => {
  it('resolves an existing builder node as the parent when the Parent Company cell matches one', () => {
    upsertNode(db, { id: 'builder:acme-group', type: 'builder', name: 'Acme Group' });

    const tables = parseTables(`
| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Sub Yard | Italy | Ancona | 1990 | custom yachts | active | Acme Group | subyard.com | |
`);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    expect(edgeExists('builder:sub-yard', 'owned_by', 'builder:acme-group')).toBe(true);
  });

  it('creates a minimal Company node (kind: "builder parent company") when the Parent Company has no existing node', () => {
    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    const lurssenFamily = getNode('company:family-owned-lurssen-family');
    expect(lurssenFamily).not.toBeNull();
    expect(lurssenFamily.attrs.kind).toBe('builder parent company');
    expect(edgeExists('builder:lurssen', 'owned_by', 'company:family-owned-lurssen-family')).toBe(true);
  });

  it('rejects a Parent Company cell narrating an ownership change ("Formerly X; sold to Y") rather than minting a junk node', () => {
    const tables = parseTables(FIXTURE_PROSE_PARENT);
    mapBuilderEnrichmentTables(db, tables, 'prose-parent-fixture.md');

    expect(
      db
        .prepare("SELECT COUNT(*) AS count FROM edges WHERE src = 'builder:test-yard' AND rel = 'owned_by'")
        .get().count
    ).toBe(0);
    expect(getNode('company:formerly-acme-holdings-sold-to-beta-corp-in-2024')).toBeNull();
  });

  it('does not create a self-referential owned_by edge when Parent Company normalizes to the same name as the builder', () => {
    const tables = parseTables(`
| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Solo Yard | Spain | Vigo | 1990 | custom yachts | active | Solo Yard | soloyard.com | |
`);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');

    expect(
      db.prepare("SELECT COUNT(*) AS count FROM edges WHERE src = 'builder:solo-yard' AND rel = 'owned_by'").get().count
    ).toBe(0);
  });
});

describe('mapBuilderEnrichmentTables — idempotency', () => {
  it('running twice over the same input yields identical node/edge counts (no dupes)', () => {
    const tables = parseTables(FIXTURE_BUILDER_ENRICHMENT);
    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');
    const firstBuilders = countByType('builder');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapBuilderEnrichmentTables(db, tables, 'builder-enrichment-fixture.md');
    expect(countByType('builder')).toBe(firstBuilders);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('mapBuilderEnrichmentTables — schema guard on the table pass', () => {
  it('skips a non-builder-enrichment table and reports it, without minting any builder nodes', () => {
    const tables = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    const result = mapBuilderEnrichmentTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.matched + result.created).toBe(0);
    expect(countByType('builder')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapBuilderEnrichmentTables and isBuilderEnrichmentTable as named exports', async () => {
    const mod = await import('../src/mappers/builderEnrichmentMapper.js');
    expect(typeof mod.mapBuilderEnrichmentTables).toBe('function');
    expect(typeof mod.isBuilderEnrichmentTable).toBe('function');
  });
});
