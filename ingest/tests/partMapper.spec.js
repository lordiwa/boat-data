// ingest/tests/partMapper.spec.js
//
// TASK-017: boat/yacht parts anatomy mapper. Real header shape from
// research/round1/parts-and-classes.md's "Parts" table, curated into
// knowledge/90:
//   Part | Category | Location | Description | Applies To

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapPartTables, isPartTable } from '../src/mappers/partMapper.js';

// --- Real-shaped fixture (verbatim rows from research/round1/parts-and-classes.md). ---
const FIXTURE_90_PARTS = `
| Part  | Category         | Location                       | Description                                                                 | Applies To |
|-------|------------------|---------------------------------|-------------------------------------------------------------------------------|------------|
| Bow   | hull & structure | forward-most point of the hull | The front-most part of the hull, where the vessel first meets the water.     | all        |
| Cockpit | deck & exterior | aft, open steering/seating well | A recessed, sheltered outdoor area used for steering, seating, or sail-handling controls. | powerboat, sailing yacht |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'part-mapper-test-')), 'graph.db');
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

describe('isPartTable — schema guard', () => {
  it('claims the real Parts table shape (Part + Category + Applies To)', () => {
    const [table] = parseTables(FIXTURE_90_PARTS);
    expect(isPartTable(table)).toBe(true);
  });

  it('does NOT claim a table with only "Part" and no Category/Applies To', () => {
    const [table] = parseTables(`
| Part | Description |
|------|-------------|
| Bow  | The front.  |
`);
    expect(isPartTable(table)).toBe(false);
  });
});

describe('mapPartTables — attribute mapping', () => {
  let result;

  beforeEach(() => {
    result = mapPartTables(db, parseTables(FIXTURE_90_PARTS), '90_Boat_Yacht_Parts_Anatomy.md');
  });

  it('creates one part node per row with provenance', () => {
    expect(result.parts).toBe(2);
    const bow = getNode('part:bow');
    expect(bow).not.toBeNull();
    expect(bow.type).toBe('part');
    expect(bow.name).toBe('Bow');
    expect(bow.attrs.provenance).toEqual(['90_Boat_Yacht_Parts_Anatomy.md']);
  });

  it('parses category/location/description as plain strings', () => {
    const bow = getNode('part:bow');
    expect(bow.attrs.category).toBe('hull & structure');
    expect(bow.attrs.location).toBe('forward-most point of the hull');
    expect(bow.attrs.description).toBe('The front-most part of the hull, where the vessel first meets the water.');
  });

  it('splits Applies To on commas into an array, including single-value cells', () => {
    const bow = getNode('part:bow');
    expect(bow.attrs.applies_to).toEqual(['all']);

    const cockpit = getNode('part:cockpit');
    expect(cockpit.attrs.applies_to).toEqual(['powerboat', 'sailing yacht']);
  });
});

describe('mapPartTables — idempotency', () => {
  it('running twice yields identical node counts (no dupes)', () => {
    const tables = parseTables(FIXTURE_90_PARTS);
    mapPartTables(db, tables, '90_fixture.md');
    const first = countByType('part');

    mapPartTables(db, tables, '90_fixture.md');
    expect(countByType('part')).toBe(first);
  });
});

describe('mapPartTables — schema guard on the table pass', () => {
  it('skips a non-part table and reports it', () => {
    const result = mapPartTables(
      db,
      parseTables(`
| Category   | Length (Meters) |
|------------|------------------|
| Superyacht | 24-60m           |
`),
      'synthetic.md'
    );

    expect(result.skippedTables).toHaveLength(1);
    expect(result.parts).toBe(0);
    expect(countByType('part')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapPartTables and isPartTable as named exports', async () => {
    const mod = await import('../src/mappers/partMapper.js');
    expect(typeof mod.mapPartTables).toBe('function');
    expect(typeof mod.isPartTable).toBe('function');
  });
});
