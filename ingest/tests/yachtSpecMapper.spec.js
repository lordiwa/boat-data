// ingest/tests/yachtSpecMapper.spec.js
//
// TASK-020: yacht spec completion mapper. Real header shape grounded in
// research/round3/yacht-specs.md (curated into knowledge/93):
//   Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max
//   Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes
// normalizedHeaders: yacht, builder, year, loa, beam_m, draft_m, gt,
// max_speed_kn, range_nm, flag, class_society, imo, notes ("Yacht" is a
// BARE header — tableParser's ALIAS_MAP only aliases "Yacht Name"/"Name"/
// "Vessel" to the canonical "name" key, not bare "Yacht" — so this guard
// deliberately reads the 'yacht' key as its own identifier, distinct from
// every other mapper's 'name' identifier).
//
// UNLIKE builderEnrichmentMapper.js (which mints ~2 new nodes for
// unmatched rows), this mapper NEVER mints a new yacht node — a row that
// doesn't resolve onto an existing yacht node is counted as unresolved and
// reported, never created (per the ticket).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapYachtSpecTables, isYachtSpecTable } from '../src/mappers/yachtSpecMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';
import { isBuilderEnrichmentTable } from '../src/mappers/builderEnrichmentMapper.js';

const FIXTURE_YACHT_SPECS = `
| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Azzam | Lürssen | 2013 | 180 | 20.8 | 4.3 | 13,136 | 32+ | | Abu Dhabi, UAE | | 9693367 | World's longest private motor yacht. |
| Al Lusail | Lürssen | 2017 | 123 | 20 [conflict: 23] | 5.5 | 8,489 | 19 max / 12 cruise | 4,500 | Qatar | Lloyd's Register | | Beam conflict between sources. |
| Yersin | Piriou | 2015 | 76.6 | 13.0 | 4.5 | 2,198 | | | Oman [conflict: Malta] | | 9666651 | Flag conflicting between sources. |
| A+ | Lürssen | 2012 | 147 | | | | | | | | | **Rename:** formerly Topaz. |
| Unknown Yacht | — | — | 50 | 10 | 3 | 500 | 20 | 3000 | Cayman Islands | | 1234567 | No matching graph node. |
`;

// Only ONE of the three yacht-spec-specific signal columns present (beam_m)
// — must NOT be claimed (guard requires >=2).
const FIXTURE_ONE_SIGNAL_ONLY = `
| Yacht | Builder | Beam (m) |
|-------|---------|----------|
| Some Yacht | Some Yard | 15 |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'yacht-spec-test-')), 'graph.db');
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

describe('isYachtSpecTable — schema guard', () => {
  it('claims the exact yacht-spec header shape (Yacht + >=2 of Beam/Draft/GT)', () => {
    const [table] = parseTables(FIXTURE_YACHT_SPECS);
    expect(isYachtSpecTable(table)).toBe(true);
  });

  it('does NOT claim a yacht-named table with only one specific signal column', () => {
    const [table] = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    expect(isYachtSpecTable(table)).toBe(false);
  });

  it('does NOT collide with the shipyard/builderEnrichment guards (no collision either direction)', () => {
    const [table] = parseTables(FIXTURE_YACHT_SPECS);
    expect(isShipyardTable(table)).toBe(false);
    expect(isBuilderEnrichmentTable(table)).toBe(false);
  });
});

describe('mapYachtSpecTables — resolves onto EXISTING yacht nodes only', () => {
  it('enriches an existing yacht node by exact name, never creating a new one', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam', attrs: { loa: { meters: 180, raw: '180m' } } });

    const tables = parseTables(FIXTURE_YACHT_SPECS);
    const result = mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    const azzam = getNode('yacht:azzam');
    expect(azzam.attrs.gt).toBe(13136);
    expect(azzam.attrs.max_speed).toBe(32);
    expect(azzam.attrs.flag).toBe('Abu Dhabi, UAE');
    expect(azzam.attrs.imo).toBe('9693367');
    expect(azzam.attrs.beam.meters).toBe(20.8);
    expect(result.matched).toBeGreaterThanOrEqual(1);
  });

  it('counts an unresolved row (no matching yacht node) rather than minting a new node', () => {
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    const result = mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    expect(getNode('yacht:unknown-yacht')).toBeNull();
    expect(result.unresolved).toBeGreaterThanOrEqual(1);
    expect(result.unresolvedNames).toContain('Unknown Yacht');
  });
});

describe('mapYachtSpecTables — numeric parsing discipline', () => {
  it('strips thousands-separator commas before parsing GT (13,136 -> 13136, not 13)', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    expect(getNode('yacht:azzam').attrs.gt).toBe(13136);
  });

  it('takes the leading number from a "X max / Y cruise" max-speed cell', () => {
    upsertNode(db, { id: 'yacht:al-lusail', type: 'yacht', name: 'Al Lusail' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    expect(getNode('yacht:al-lusail').attrs.max_speed).toBe(19);
  });

  it('rejects a digit embedded in a word (letter-adjacency guard, e.g. would reject the "8" in "V8")', () => {
    upsertNode(db, { id: 'yacht:test-v8', type: 'yacht', name: 'Test V8 Yacht' });
    const tables = parseTables(`
| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Test V8 Yacht | Test | 2020 | 50 | 10 | V8 engine, 3.5 draft actual | 500 | 20 | 3000 | Cayman Islands | | | test |
`);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    // "V8 engine, 3.5 draft actual" -> the "8" in "V8" must NOT be picked up;
    // the parser should find "3.5" instead (not adjacent to a letter).
    expect(getNode('yacht:test-v8').attrs.draft.meters).toBe(3.5);
  });
});

describe('mapYachtSpecTables — former_names (7 confirmed renames)', () => {
  it('populates former_names for a known rename (A+, formerly Topaz)', () => {
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A+' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    expect(getNode('yacht:a').attrs.former_names).toEqual(['Topaz']);
  });

  it('does NOT populate former_names for a yacht not in the rename map', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    expect(getNode('yacht:azzam').attrs.former_names).toBeUndefined();
  });
});

describe('mapYachtSpecTables — conflicting source values (curated [conflict: ...] marker)', () => {
  it('records a beam conflict rather than silently picking one value', () => {
    upsertNode(db, { id: 'yacht:al-lusail', type: 'yacht', name: 'Al Lusail' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    const node = getNode('yacht:al-lusail');
    expect(node.attrs.beam.meters).toBe(20);
    expect(node.attrs.conflicts.beam).toContain('23');
  });

  it('records a flag conflict the same way', () => {
    upsertNode(db, { id: 'yacht:yersin', type: 'yacht', name: 'Yersin' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    const node = getNode('yacht:yersin');
    expect(node.attrs.flag).toBe('Oman');
    expect(node.attrs.conflicts.flag).toContain('Malta');
  });

  it('records a conflict against a value ALREADY on the node from yachtMapper (beam disagreement across sources)', () => {
    upsertNode(db, {
      id: 'yacht:azzam',
      type: 'yacht',
      name: 'Azzam',
      attrs: { beam: { meters: 25, raw: '25m (prior source)' } },
    });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    const node = getNode('yacht:azzam');
    // First-non-empty-wins: the PRE-EXISTING value (25) is preserved...
    expect(node.attrs.beam.meters).toBe(25);
    // ...and the new, differing research value (20.8) is recorded as a conflict, not dropped.
    expect(node.attrs.conflicts.beam).toContain('20.8');
  });
});

describe('mapYachtSpecTables — LOA-based disambiguation among same-named duplicate nodes', () => {
  it('resolves onto the candidate whose existing LOA is closest to the research row\'s own LOA', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam', attrs: { loa: { meters: 60, raw: '60m' } } });
    upsertNode(db, { id: 'yacht:azzam-lurssen', type: 'yacht', name: 'Azzam', attrs: { loa: { meters: 180, raw: '180m' } } });

    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    // The fixture row's LOA is 180 -> must resolve onto yacht:azzam-lurssen, not the 60m yacht:azzam.
    expect(getNode('yacht:azzam-lurssen').attrs.gt).toBe(13136);
    expect(getNode('yacht:azzam').attrs.gt).toBeUndefined();
  });
});

describe('mapYachtSpecTables — idempotency', () => {
  it('running twice over the same input yields identical attrs (no dupes/conflicts on repeat ingest)', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');
    const first = getNode('yacht:azzam').attrs;

    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');
    const second = getNode('yacht:azzam').attrs;
    expect(second.gt).toBe(first.gt);
    expect(second.conflicts).toEqual(first.conflicts);
    expect(second.provenance).toEqual(['yacht-spec-fixture.md']);
  });
});

describe('mapYachtSpecTables — schema guard on the table pass', () => {
  it('skips a non-yacht-spec table and reports it, without touching any yacht node', () => {
    const tables = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    const result = mapYachtSpecTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.matched).toBe(0);
  });
});

describe('mapYachtSpecTables — Year column ingestion (TASK-024 item 4)', () => {
  it('ingests the Year column into attrs.year ({ value, raw }) for a yacht that had none', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    const node = getNode('yacht:azzam');
    expect(node.attrs.year.value).toBe(2013);
    expect(node.attrs.year.raw).toBe('2013');
  });

  it('leaves a pre-existing year untouched when it agrees, and records a conflict when it disagrees', () => {
    upsertNode(db, {
      id: 'yacht:azzam',
      type: 'yacht',
      name: 'Azzam',
      attrs: { year: { value: 1999, raw: '1999' } },
    });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    const node = getNode('yacht:azzam');
    // First-non-empty-wins: the PRE-EXISTING value (1999) is preserved...
    expect(node.attrs.year.value).toBe(1999);
    // ...and the differing research value (2013) is recorded as a conflict.
    expect(node.attrs.conflicts.year).toContain('2013');
  });

  it('is idempotent: running twice does not add a spurious year conflict', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    const node = getNode('yacht:azzam');
    expect(node.attrs.year.value).toBe(2013);
    expect(node.attrs.conflicts?.year).toBeUndefined();
  });
});

describe('mapYachtSpecTables — approximate ("~") values routed to conflicts, never stored as confirmed (TASK-024 item 4)', () => {
  const FIXTURE_APPROX = `
| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| De Lisle III | Gulf Craft | 2008 | 42 | 7.5 | 2.2 | ~400 (est., not published) | 10.5 | | Australia | | | GT is an estimate, not published. |
| Katara | Lürssen | 2010 | 124.4 | 19.5 | 5.3 | ~8,010 | 20 | 5000+ | Qatar | | | GT approximate. |
| Launchpad | Feadship | 2024 | 118 | ~15.2 (50 ft) | | 4999 | 24 | 6000 | Marshall Islands | | | Beam approximate. |
`;

  it('does NOT store an approximate GT (leading "~") as attrs.gt; records it in attrs.conflicts.gt instead', () => {
    upsertNode(db, { id: 'yacht:de-lisle-iii', type: 'yacht', name: 'De Lisle III' });
    const tables = parseTables(FIXTURE_APPROX);
    mapYachtSpecTables(db, tables, 'approx-fixture.md');

    const node = getNode('yacht:de-lisle-iii');
    expect(node.attrs.gt).toBeUndefined();
    expect(node.attrs.conflicts.gt[0]).toContain('~400');
  });

  it('does NOT store a "~"-prefixed GT with thousands separators (Katara) as attrs.gt', () => {
    upsertNode(db, { id: 'yacht:katara', type: 'yacht', name: 'Katara' });
    const tables = parseTables(FIXTURE_APPROX);
    mapYachtSpecTables(db, tables, 'approx-fixture.md');

    const node = getNode('yacht:katara');
    expect(node.attrs.gt).toBeUndefined();
    expect(node.attrs.conflicts.gt[0]).toContain('~8,010');
  });

  it('does NOT store an approximate beam (Launchpad) as attrs.beam', () => {
    upsertNode(db, { id: 'yacht:launchpad', type: 'yacht', name: 'Launchpad' });
    const tables = parseTables(FIXTURE_APPROX);
    mapYachtSpecTables(db, tables, 'approx-fixture.md');

    const node = getNode('yacht:launchpad');
    expect(node.attrs.beam).toBeUndefined();
    expect(node.attrs.conflicts.beam[0]).toContain('~15.2');
    // The non-approximate GT on the same row is still stored normally.
    expect(node.attrs.gt).toBe(4999);
  });

  it('still stores a normal (non-"~") GT/beam value as confirmed (regression: approx-detection must not blank ordinary values)', () => {
    upsertNode(db, { id: 'yacht:azzam', type: 'yacht', name: 'Azzam' });
    const tables = parseTables(FIXTURE_YACHT_SPECS);
    mapYachtSpecTables(db, tables, 'yacht-spec-fixture.md');

    expect(getNode('yacht:azzam').attrs.gt).toBe(13136);
    expect(getNode('yacht:azzam').attrs.beam.meters).toBe(20.8);
  });
});

describe('module importability', () => {
  it('exposes mapYachtSpecTables and isYachtSpecTable as named exports', async () => {
    const mod = await import('../src/mappers/yachtSpecMapper.js');
    expect(typeof mod.mapYachtSpecTables).toBe('function');
    expect(typeof mod.isYachtSpecTable).toBe('function');
  });
});
