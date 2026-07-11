// ingest/tests/clubEnrichmentMapper.spec.js
//
// TASK-021: club enrichment mapper (third guard on clubMapper.js, mirroring
// engineMapper.js's/marinaMapper.js's dual-guard-per-file pattern). Real
// header shape grounded in research/round4/club-enrichment.md (curated
// into knowledge/96):
//   Club | City | Country | Founded | Website | Notes
// normalizedHeaders: club, city, region, founded, website, notes ("Club"
// is a bare header, distinct from clubMapper's own NAME_KEYS
// ['name','club_name']; "Country" aliases to 'region').
//
// NEVER mints a new club node (62 clubs enrich-only, per the ticket).
// Founded-year discrepancies use the conflicts convention: the EXISTING
// graph value (if any) always stays primary; the research's differing
// value is recorded in attrs.conflicts.founded, never silently applied.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapClubEnrichmentTables, isClubEnrichmentTable } from '../src/mappers/clubMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';

const FIXTURE_CLUB_ENRICHMENT = `
| Club | City | Country | Founded | Website | Notes |
|---|---|---|---|---|---|
| Chicago Yacht Club | Chicago, IL | USA | 1875 | chicagoyachtclub.org | Organized by 37 yachtsmen. |
| Royal Perth Yacht Club | Crawley (Perth), WA | Australia | 1841/1865 | rpyc.com.au | Club history cites earlier origin claims than the graph's 1876. |
| Vero Beach Yacht Club | Vero Beach, FL | USA | 1926 [conflict: 1938 per club history book] | verobeachyachtclub.com | Two conflicting club-published founding accounts. |
| No Such Club | Nowhere | USA | 1900 | — | Does not exist in the graph. |
`;

// Only ONE of the founded/website signal columns present alongside a
// non-club-specific city column — must NOT be claimed (guard requires the
// 'club' identifier plus at least one other signal; see guard test below
// for the exact boundary this project's other mappers use).
const FIXTURE_NO_SIGNAL = `
| Club | City |
|------|------|
| Some Club | Somewhere |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'club-enrichment-test-')), 'graph.db');
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

describe('isClubEnrichmentTable — schema guard', () => {
  it('claims the exact club-enrichment header shape (Club + Founded/Website signals)', () => {
    const [table] = parseTables(FIXTURE_CLUB_ENRICHMENT);
    expect(isClubEnrichmentTable(table)).toBe(true);
  });

  it('does NOT claim a club-named table with no founded/website signal', () => {
    const [table] = parseTables(FIXTURE_NO_SIGNAL);
    expect(isClubEnrichmentTable(table)).toBe(false);
  });

  it('does NOT collide with the shipyard guard (no collision either direction)', () => {
    const [table] = parseTables(FIXTURE_CLUB_ENRICHMENT);
    expect(isShipyardTable(table)).toBe(false);
  });
});

describe('mapClubEnrichmentTables — resolves onto EXISTING club nodes only', () => {
  it('enriches an existing club node by exact name, never creating a new one', () => {
    upsertNode(db, { id: 'club:chicago-yacht-club', type: 'club', name: 'Chicago Yacht Club' });

    const tables = parseTables(FIXTURE_CLUB_ENRICHMENT);
    const result = mapClubEnrichmentTables(db, tables, 'club-enrichment-fixture.md');

    const node = getNode('club:chicago-yacht-club');
    expect(node.attrs.founded.value).toBe(1875);
    expect(node.attrs.website).toBe('chicagoyachtclub.org');
    expect(node.attrs.city).toBe('Chicago, IL');
    expect(result.matched).toBeGreaterThanOrEqual(1);
  });

  it('never mints a new club node — an unresolved row is counted and reported', () => {
    const tables = parseTables(FIXTURE_CLUB_ENRICHMENT);
    const result = mapClubEnrichmentTables(db, tables, 'club-enrichment-fixture.md');

    expect(getNode('club:no-such-club')).toBeNull();
    expect(result.unresolved).toBeGreaterThanOrEqual(1);
    expect(result.unresolvedNames).toContain('No Such Club');
  });
});

describe('mapClubEnrichmentTables — founded-year conflicts convention (never silent overwrite)', () => {
  it('keeps the EXISTING founded value primary and records a differing research value as a conflict', () => {
    upsertNode(db, { id: 'club:royal-perth-yacht-club', type: 'club', name: 'Royal Perth Yacht Club', attrs: { founded: { value: 1876, raw: '1876' } } });

    const tables = parseTables(FIXTURE_CLUB_ENRICHMENT);
    mapClubEnrichmentTables(db, tables, 'club-enrichment-fixture.md');

    const node = getNode('club:royal-perth-yacht-club');
    expect(node.attrs.founded.value).toBe(1876); // unchanged, existing wins
    expect(node.attrs.conflicts.founded).toContain('1841/1865');
  });

  it('supports the curated [conflict: ...] marker when the graph has NO existing founded value to naturally disagree with', () => {
    upsertNode(db, { id: 'club:vero-beach-yacht-club', type: 'club', name: 'Vero Beach Yacht Club' });

    const tables = parseTables(FIXTURE_CLUB_ENRICHMENT);
    mapClubEnrichmentTables(db, tables, 'club-enrichment-fixture.md');

    const node = getNode('club:vero-beach-yacht-club');
    expect(node.attrs.founded.value).toBe(1926);
    expect(node.attrs.conflicts.founded).toContain('1938 per club history book');
  });

  it('sets founded directly with no conflict when the graph has no existing value and no [conflict:] marker is present', () => {
    upsertNode(db, { id: 'club:chicago-yacht-club', type: 'club', name: 'Chicago Yacht Club' });

    const tables = parseTables(FIXTURE_CLUB_ENRICHMENT);
    mapClubEnrichmentTables(db, tables, 'club-enrichment-fixture.md');

    const node = getNode('club:chicago-yacht-club');
    expect(node.attrs.founded.value).toBe(1875);
    expect(node.attrs.conflicts).toBeUndefined();
  });
});

describe('mapClubEnrichmentTables — idempotency', () => {
  it('running twice over the same input yields identical attrs (no dupes)', () => {
    upsertNode(db, { id: 'club:chicago-yacht-club', type: 'club', name: 'Chicago Yacht Club' });
    const tables = parseTables(FIXTURE_CLUB_ENRICHMENT);
    mapClubEnrichmentTables(db, tables, 'club-enrichment-fixture.md');
    const first = getNode('club:chicago-yacht-club').attrs;

    mapClubEnrichmentTables(db, tables, 'club-enrichment-fixture.md');
    const second = getNode('club:chicago-yacht-club').attrs;
    expect(second).toEqual(first);
  });
});

describe('mapClubEnrichmentTables — schema guard on the table pass', () => {
  it('skips a non-club-enrichment table and reports it, without touching any club node', () => {
    const tables = parseTables(FIXTURE_NO_SIGNAL);
    const result = mapClubEnrichmentTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.matched).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapClubEnrichmentTables and isClubEnrichmentTable as named exports', async () => {
    const mod = await import('../src/mappers/clubMapper.js');
    expect(typeof mod.mapClubEnrichmentTables).toBe('function');
    expect(typeof mod.isClubEnrichmentTable).toBe('function');
  });
});
