// ingest/tests/engineMapper.spec.js
//
// TASK-004: engine-maker mapper. Fixture is a real excerpt copied verbatim
// from the /knowledge corpus:
//   - 07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md, lines
//     1375-1379 (Tier | Manufacturer | Parent/Brand | Strengths &
//     Reputation | Best For | Power Range | Notes — the file is titled
//     "Maritime Certifications" but its Grok conversation drifted into an
//     engine-manufacturer tier comparison table partway through).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import {
  mapEngineTables,
  mapEngineManufacturerTables,
  isEngineManufacturerTable,
} from '../src/mappers/engineMapper.js';

// --- Real fixture: file 07, lines 1375-1379 ---
const FIXTURE_07_ENGINES = `
| Tier | Manufacturer          | Parent/Brand          | Strengths & Reputation                          | Best For                     | Power Range          | Notes |
|------|-----------------------|-----------------------|-------------------------------------------------|------------------------------|----------------------|-------|
| 1    | MTU                   | Rolls-Royce           | Best power-to-weight, high performance, low vibration, premium choice | Superyachts, Megayachts, Gigayachts, performance yachts | 500 – 10,000+ kW    | Often considered #1 for large luxury yachts |
| 2    | Caterpillar (CAT)     | Caterpillar Inc.      | Extremely reliable, global service network, robust | All sizes, especially US market, commercial & yachts | 100 – 8,000+ hp     | Top reliability & parts availability |
`;

// --- Real fixture: file 07, lines 1430-1435 ("Market Position / Notes"
// header variant, and MTU recurring under a re-tiered later table) ---
const FIXTURE_07_ENGINES_VARIANT = `
| Tier | Manufacturer              | Parent/Brand              | Strengths & Reputation                                                                 | Best For                                      | Power Range              | Market Position / Notes |
|------|---------------------------|---------------------------|----------------------------------------------------------------------------------------|------------------------------------------------|--------------------------|-------------------------|
| 1    | MTU                       | Rolls-Royce Power Systems | Best power-to-weight ratio in the industry, exceptional performance, very low vibration & noise, premium engineering | Gigayachts, Megayachts, Superyachts, high-performance yachts | 500 – 10,000+ kW        | Often considered the #1 choice for large luxury yachts. Dominant in European builds (Lürssen, Feadship, etc.). |
`;

// --- Real-shaped fixture (TASK-017): research/round1/engine-manufacturers.md's
// "Manufacturers" directory table (Brand | Parent Company | Country |
// Founded | Engine Types | Power Range | Notable Models | Segment | Status
// | Website | Notes) — a DIFFERENT real header shape than file 07's
// Tier/Manufacturer tier-comparison table above, identifying engine BRANDS
// by a 'brand' column (not 'manufacturer'). Curated per knowledge/89's
// brand-cell cleanup: "MTU" (not "MTU (Rolls-Royce Power Systems)") so it
// merges into the SAME node file 07 already created. ---
const FIXTURE_89_MANUFACTURERS = `
| Brand | Parent Company | Country | Founded | Engine Types | Power Range | Notable Models | Segment | Status | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| MTU | Rolls-Royce plc | Germany | 1909 | inboard diesel | Series 2000: to ~2,222 mhp | Series 2000, Series 4000 | yacht, superyacht | active | mtu-solutions.com | Part of Rolls-Royce Power Systems since 2014. |
| Selva Marine | Selva S.p.A. | Italy | 1959 | outboard | 2.5-300 hp | Selva Marine 2-stroke/4-stroke range | recreational | active | selvamarine.com | Family business based in Tirano. |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'engine-mapper-test-')), 'graph.db');
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

describe('mapEngineTables — real fixture (file 07 engine tier table)', () => {
  it('creates EngineMaker nodes with tier/parent_brand/power_range/notes and provenance', () => {
    const tables = parseTables(FIXTURE_07_ENGINES);
    const result = mapEngineTables(db, tables, '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md');

    expect(result.engines).toBe(2);
    const mtu = getNode('engine:mtu');
    expect(mtu).not.toBeNull();
    expect(mtu.type).toBe('engine');
    expect(mtu.attrs.tier).toBe('1');
    expect(mtu.attrs.parent_brand).toBe('Rolls-Royce');
    expect(mtu.attrs.power_range).toBe('500 – 10,000+ kW');
    expect(mtu.attrs.notes).toBe('Often considered #1 for large luxury yachts');
    expect(mtu.attrs.provenance).toEqual(['07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md']);

    const cat = getNode('engine:caterpillar-cat');
    expect(cat).not.toBeNull();
    expect(cat.attrs.parent_brand).toBe('Caterpillar Inc.');
  });
});

describe('mapEngineTables — "Market Position / Notes" header variant merges into the same MTU node', () => {
  it('merges a second appearance of MTU (different table shape, same manufacturer) rather than creating a duplicate', () => {
    mapEngineTables(db, parseTables(FIXTURE_07_ENGINES), '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md');
    const before = countByType('engine');

    mapEngineTables(
      db,
      parseTables(FIXTURE_07_ENGINES_VARIANT),
      '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md'
    );

    expect(countByType('engine')).toBe(before); // no new node for MTU
    const mtu = getNode('engine:mtu');
    // First non-empty value wins: parent_brand stays "Rolls-Royce" (from
    // the first table), not "Rolls-Royce Power Systems" (from the second).
    expect(mtu.attrs.parent_brand).toBe('Rolls-Royce');
  });
});

describe('mapEngineTables — schema guard', () => {
  it('skips a table with no manufacturer column', () => {
    const tables = parseTables(`
| Category       | Length (Meters)     | Length (Feet)      |
|----------------|---------------------|--------------------|
| Superyacht     | 24–60m             | 79–197ft          |
`);
    const result = mapEngineTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.engines).toBe(0);
    expect(countByType('engine')).toBe(0);
  });
});

describe('mapEngineTables — idempotency', () => {
  it('running twice over the same input yields identical node counts', () => {
    const tables = parseTables(FIXTURE_07_ENGINES);
    mapEngineTables(db, tables, '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md');
    const first = countByType('engine');

    mapEngineTables(db, tables, '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md');
    expect(countByType('engine')).toBe(first);
  });
});

describe('isEngineManufacturerTable — schema guard (TASK-017)', () => {
  it('claims the real Manufacturers directory shape (Brand + Engine Types/Notable Models/Segment/Status)', () => {
    const [table] = parseTables(FIXTURE_89_MANUFACTURERS);
    expect(isEngineManufacturerTable(table)).toBe(true);
  });

  it('does NOT claim the existing file-07 Tier/Manufacturer table (no "brand" column)', () => {
    const [table] = parseTables(FIXTURE_07_ENGINES);
    expect(isEngineManufacturerTable(table)).toBe(false);
  });

  it('does NOT claim a table with "brand" but only one specific signal column', () => {
    const [table] = parseTables(`
| Brand | Segment |
|-------|---------|
| Acme  | recreational |
`);
    expect(isEngineManufacturerTable(table)).toBe(false);
  });
});

describe('mapEngineManufacturerTables — attribute mapping and dedup (TASK-017)', () => {
  it('merges into the SAME engine node file 07 already created (dedup: one Mercury/MTU node)', () => {
    mapEngineTables(db, parseTables(FIXTURE_07_ENGINES), '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md');
    const before = countByType('engine');

    const result = mapEngineManufacturerTables(
      db,
      parseTables(FIXTURE_89_MANUFACTURERS),
      '89_Global_Marine_Engine_Manufacturer_Directory.md'
    );

    // MTU already existed (file 07); Selva Marine is new.
    expect(result.engines).toBe(2);
    expect(countByType('engine')).toBe(before + 1);

    const mtu = getNode('engine:mtu');
    expect(mtu.attrs.tier).toBe('1'); // original file-07 attrs preserved
    expect(mtu.attrs.country).toBe('Germany'); // new attrs merged in
    expect(mtu.attrs.founded).toBe('1909');
    expect(mtu.attrs.engine_types).toEqual(['inboard diesel']);
    expect(mtu.attrs.notable_models).toEqual(['Series 2000', 'Series 4000']);
    expect(mtu.attrs.segment).toBe('yacht, superyacht');
    expect(mtu.attrs.status).toBe('active');
    expect(mtu.attrs.website).toBe('mtu-solutions.com');
    expect(mtu.attrs.provenance).toEqual([
      '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md',
      '89_Global_Marine_Engine_Manufacturer_Directory.md',
    ]);
  });

  it('creates an OWNED_BY edge to a new Company node when Parent Company differs from Brand', () => {
    mapEngineManufacturerTables(db, parseTables(FIXTURE_89_MANUFACTURERS), '89_fixture.md');

    const selva = getNode('company:selva-s-p-a');
    expect(selva).not.toBeNull();
    expect(selva.type).toBe('company');
    expect(edgeExists('engine:selva-marine', 'owned_by', 'company:selva-s-p-a')).toBe(true);
  });

  it('resolves Parent Company to an existing builder/company node instead of minting a duplicate', () => {
    upsertNode(db, { id: 'company:rolls-royce-plc', type: 'company', name: 'Rolls-Royce plc' });
    mapEngineManufacturerTables(db, parseTables(FIXTURE_89_MANUFACTURERS), '89_fixture.md');

    expect(edgeExists('engine:mtu', 'owned_by', 'company:rolls-royce-plc')).toBe(true);
    expect(countByType('company')).toBe(2); // rolls-royce-plc (pre-seeded) + selva-s-p-a (minted)
  });

  it('is idempotent: running twice yields identical node/edge counts', () => {
    mapEngineManufacturerTables(db, parseTables(FIXTURE_89_MANUFACTURERS), '89_fixture.md');
    const firstEngines = countByType('engine');
    const firstCompanies = countByType('company');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapEngineManufacturerTables(db, parseTables(FIXTURE_89_MANUFACTURERS), '89_fixture.md');
    expect(countByType('engine')).toBe(firstEngines);
    expect(countByType('company')).toBe(firstCompanies);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });

  it('skips a non-manufacturer-shaped table and reports it', () => {
    const result = mapEngineManufacturerTables(db, parseTables(FIXTURE_07_ENGINES), 'synthetic.md');
    expect(result.skippedTables).toHaveLength(1);
    expect(result.engines).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapEngineTables as a named export', async () => {
    const mod = await import('../src/mappers/engineMapper.js');
    expect(typeof mod.mapEngineTables).toBe('function');
  });

  it('exposes mapEngineManufacturerTables and isEngineManufacturerTable (TASK-017)', async () => {
    const mod = await import('../src/mappers/engineMapper.js');
    expect(typeof mod.mapEngineManufacturerTables).toBe('function');
    expect(typeof mod.isEngineManufacturerTable).toBe('function');
  });
});
