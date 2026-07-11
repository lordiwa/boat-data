// ingest/tests/engineModelMapper.spec.js
//
// TASK-017: engine model/series mapper. Real header shape from
// research/round1/mercury-offshore-history.md's "Engine models" table,
// curated into knowledge/88:
//   Model/Series | Brand | Years | Type | Power (hp) | Segment | Notes

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapEngineModelTables, isEngineModelTable } from '../src/mappers/engineModelMapper.js';

// --- Real-shaped fixture, curated per knowledge/88 (Brand cells cleaned to
// dedup with the canonical "Mercury Marine" engine node — see
// engineMapper.spec.js / knowledge/88's Curation notes). ---
const FIXTURE_88_ENGINE_MODELS = `
| Model/Series | Brand | Years | Type | Power (hp) | Segment | Notes |
|---|---|---|---|---|---|---|
| Verado 600 V12 | Mercury Marine | 2021- | 7.6L naturally aspirated V12 | 600 | consumer/flagship outboard | World's first V12 outboard. |
| QC4v 1650 | Mercury Racing | ~2016- | quad-cam 4-valve turbo V8 | 1,650 (race fuel) / 1,350 (pump fuel) | racing sterndrive | 552 ci, NiCom-coated bores. |
`;

// --- Synthetic fixture: only ONE of the two required signal columns present. ---
const FIXTURE_ONE_SIGNAL_ONLY = `
| Model/Series | Brand |
|--------------|-------|
| Some Model  | Acme  |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'engine-model-mapper-test-')), 'graph.db');
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

describe('isEngineModelTable — schema guard', () => {
  it('claims the real Engine models shape (Model/Series + Brand + Years)', () => {
    const [table] = parseTables(FIXTURE_88_ENGINE_MODELS);
    expect(isEngineModelTable(table)).toBe(true);
  });

  it('does NOT claim a table with only one of the two required identifier columns', () => {
    const [table] = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    expect(isEngineModelTable(table)).toBe(false);
  });
});

describe('mapEngineModelTables — attribute mapping', () => {
  let result;

  beforeEach(() => {
    result = mapEngineModelTables(db, parseTables(FIXTURE_88_ENGINE_MODELS), 'knowledge/88_fixture.md');
  });

  it('creates one engine_model node per row with provenance', () => {
    expect(result.models).toBe(2);
    const verado = getNode('engine_model:verado-600-v12');
    expect(verado).not.toBeNull();
    expect(verado.type).toBe('engine_model');
    expect(verado.name).toBe('Verado 600 V12');
    expect(verado.attrs.provenance).toEqual(['knowledge/88_fixture.md']);
  });

  it('parses brand/years/type/segment/notes as plain strings and power_hp as a number', () => {
    const verado = getNode('engine_model:verado-600-v12');
    expect(verado.attrs.brand).toBe('Mercury Marine');
    expect(verado.attrs.years).toBe('2021-');
    expect(verado.attrs.type).toBe('7.6L naturally aspirated V12');
    expect(verado.attrs.segment).toBe('consumer/flagship outboard');
    expect(verado.attrs.power_hp).toBe(600);
  });

  it('strips a thousands-separator comma before parsing Power (hp) (regression: shipyardMapper HIGH lesson)', () => {
    const qc4v = getNode('engine_model:qc4v-1650');
    expect(qc4v.attrs.power_hp).toBe(1650);
  });
});

describe('mapEngineModelTables — Power (hp) parsing: Watts-vs-hp regression', () => {
  it('prefers an explicit "X hp equiv." figure over a leading Watts number (750 W (~3.5 hp equiv.) -> 3.5, not 750)', () => {
    const tables = parseTables(`
| Model/Series | Brand | Years | Type | Power (hp) | Segment | Notes |
|---|---|---|---|---|---|---|
| Avator 7.5e | Mercury Avator | 2023- | electric, transverse-flux motor | 750 W (~3.5 hp equiv.) | electric outboard | 48V/1kWh battery |
`);
    mapEngineModelTables(db, tables, 'knowledge/88_fixture.md');

    const avator = getNode('engine_model:avator-7-5e');
    expect(avator.attrs.power_hp).toBe(3.5);
  });
});

describe('mapEngineModelTables — MADE_BY edges', () => {
  it('links to an existing engine brand node when Brand matches by normalized name', () => {
    upsertNode(db, { id: 'engine:mercury-marine', type: 'engine', name: 'Mercury Marine' });

    mapEngineModelTables(db, parseTables(FIXTURE_88_ENGINE_MODELS), 'knowledge/88_fixture.md');

    expect(edgeExists('engine_model:verado-600-v12', 'made_by', 'engine:mercury-marine')).toBe(true);
  });

  it('creates the engine brand node when it does not already exist', () => {
    mapEngineModelTables(db, parseTables(FIXTURE_88_ENGINE_MODELS), 'knowledge/88_fixture.md');

    const racing = getNode('engine:mercury-racing');
    expect(racing).not.toBeNull();
    expect(racing.type).toBe('engine');
    expect(edgeExists('engine_model:qc4v-1650', 'made_by', 'engine:mercury-racing')).toBe(true);
  });
});

describe('mapEngineModelTables — idempotency', () => {
  it('running twice yields identical node/edge counts', () => {
    const tables = parseTables(FIXTURE_88_ENGINE_MODELS);
    mapEngineModelTables(db, tables, 'knowledge/88_fixture.md');
    const firstModels = countByType('engine_model');
    const firstEngines = countByType('engine');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapEngineModelTables(db, tables, 'knowledge/88_fixture.md');
    expect(countByType('engine_model')).toBe(firstModels);
    expect(countByType('engine')).toBe(firstEngines);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('mapEngineModelTables — schema guard on the table pass', () => {
  it('skips a non-engine-model table and reports it', () => {
    const result = mapEngineModelTables(
      db,
      parseTables(`
| Category   | Length (Meters) |
|------------|------------------|
| Superyacht | 24-60m           |
`),
      'synthetic.md'
    );

    expect(result.skippedTables).toHaveLength(1);
    expect(result.models).toBe(0);
    expect(countByType('engine_model')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapEngineModelTables and isEngineModelTable as named exports', async () => {
    const mod = await import('../src/mappers/engineModelMapper.js');
    expect(typeof mod.mapEngineModelTables).toBe('function');
    expect(typeof mod.isEngineModelTable).toBe('function');
  });
});
