// ingest/tests/sizeClassMapper.spec.js
//
// TASK-017: yacht/superyacht/megayacht/gigayacht size-classification
// mapper. Real header shape from research/round1/parts-and-classes.md's
// "Size classes" table, curated into knowledge/90:
//   Class | Length Threshold | GT Range | Typical Crew | Definition Used By
//   | Example Vessels | Notes
//
// Per the recorded project decision ("never encode one broker's boundary
// as truth"), every attr here is stored VERBATIM (raw text), never parsed
// into a single number — competing conventions (e.g. "60m+ ... by one
// convention; 80m+ ... by another") are preserved as-is on the node rather
// than collapsed into one authoritative threshold.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapSizeClassTables, isSizeClassTable } from '../src/mappers/sizeClassMapper.js';

// --- Real-shaped fixture (verbatim rows from research/round1/parts-and-classes.md). ---
const FIXTURE_90_SIZE_CLASSES = `
| Class      | Length Threshold                                    | GT Range                                                        | Typical Crew                                    | Definition Used By                                                                                  | Example Vessels                                                             | Notes |
|------------|------------------------------------------------------|-------------------------------------------------------------------|--------------------------------------------------|------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-------|
| Superyacht | 24m+ (79ft+); some sources start at 30m (98ft)       | ~500-3,000 GT (varies)                                            | 3-16 depending on size                            | Most common convention (YachtBuyer, Burgess, Camper & Nicholsons legacy usage); SYBAss uses 40m+ (motor) / 30m+ (sailing) | 24-30m: entry-level superyachts; up to ~60m e.g. Amels 60, Heesen 50m models  | Conflict: some outlets put the practical "true superyacht" start at 30m rather than 24m. |
| Megayacht  | ~60m+ (197ft+) by one convention; ~80m+ (260ft+) by another | ~3,000-8,000 GT (YachtBuyer); "3,000 GT" cited generally (Burgess) | 15-50+; Burgess cites "minimum of 25 crew" for 80m+ | YachtBuyer (60m+); Burgess (80m+ or 3,000 GT)                                                        | Rising Sun (138m/7,841 GT), Octopus (126m/9,932 GT)                            | Direct conflict: 60m vs 80m as the boundary — no consensus. |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'size-class-mapper-test-')), 'graph.db');
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

describe('isSizeClassTable — schema guard', () => {
  it('claims the real Size classes shape (Class + Length Threshold + GT Range)', () => {
    const [table] = parseTables(FIXTURE_90_SIZE_CLASSES);
    expect(isSizeClassTable(table)).toBe(true);
  });

  it('does NOT claim the Regulatory thresholds table (Threshold | Regime | What Changes | Source — no "class" column)', () => {
    const [table] = parseTables(`
| Threshold | Regime | What Changes | Source |
|---|---|---|---|
| 24m load line length | Red Ensign Group | Vessel becomes a "large yacht" | REG Yacht Code |
`);
    expect(isSizeClassTable(table)).toBe(false);
  });
});

describe('mapSizeClassTables — attribute mapping (verbatim, no numeric parsing)', () => {
  let result;

  beforeEach(() => {
    result = mapSizeClassTables(db, parseTables(FIXTURE_90_SIZE_CLASSES), '90_Boat_Yacht_Parts_Anatomy.md');
  });

  it('creates one size_class node per row with provenance', () => {
    expect(result.classes).toBe(2);
    const superyacht = getNode('size_class:superyacht');
    expect(superyacht).not.toBeNull();
    expect(superyacht.type).toBe('size_class');
    expect(superyacht.name).toBe('Superyacht');
    expect(superyacht.attrs.provenance).toEqual(['90_Boat_Yacht_Parts_Anatomy.md']);
  });

  it('keeps competing-convention text verbatim rather than parsing a single threshold number', () => {
    const megayacht = getNode('size_class:megayacht');
    expect(megayacht.attrs.length_threshold).toBe(
      '~60m+ (197ft+) by one convention; ~80m+ (260ft+) by another'
    );
    expect(megayacht.attrs.gt_range).toContain('3,000-8,000 GT');
    expect(megayacht.attrs.notes).toContain('Direct conflict: 60m vs 80m');
  });

  it('parses typical_crew/definition_used_by/example_vessels as plain strings', () => {
    const superyacht = getNode('size_class:superyacht');
    expect(superyacht.attrs.typical_crew).toBe('3-16 depending on size');
    expect(superyacht.attrs.definition_used_by).toMatch(/YachtBuyer/);
    expect(superyacht.attrs.example_vessels).toMatch(/Amels 60/);
  });
});

describe('mapSizeClassTables — idempotency', () => {
  it('running twice yields identical node counts (no dupes)', () => {
    const tables = parseTables(FIXTURE_90_SIZE_CLASSES);
    mapSizeClassTables(db, tables, '90_fixture.md');
    const first = countByType('size_class');

    mapSizeClassTables(db, tables, '90_fixture.md');
    expect(countByType('size_class')).toBe(first);
  });
});

describe('mapSizeClassTables — schema guard on the table pass', () => {
  it('skips a non-size-class table and reports it', () => {
    const result = mapSizeClassTables(
      db,
      parseTables(`
| Part | Category | Applies To |
|------|----------|------------|
| Bow  | hull     | all        |
`),
      'synthetic.md'
    );

    expect(result.skippedTables).toHaveLength(1);
    expect(result.classes).toBe(0);
    expect(countByType('size_class')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapSizeClassTables and isSizeClassTable as named exports', async () => {
    const mod = await import('../src/mappers/sizeClassMapper.js');
    expect(typeof mod.mapSizeClassTables).toBe('function');
    expect(typeof mod.isSizeClassTable).toBe('function');
  });
});
