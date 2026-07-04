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
import { openDb, initSchema } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapEngineTables } from '../src/mappers/engineMapper.js';

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

describe('module importability', () => {
  it('exposes mapEngineTables as a named export', async () => {
    const mod = await import('../src/mappers/engineMapper.js');
    expect(typeof mod.mapEngineTables).toBe('function');
  });
});
