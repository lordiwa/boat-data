// ingest/tests/designerMapper.spec.js
//
// TASK-019: designer directory mapper. Real header shape grounded in
// research/round2/designer-directory.md (curated into knowledge/92):
//   Designer | Country | City | Founded | Discipline | Notable Yachts |
//   Status | Website | Notes
// "Designer" aliases to the canonical 'designer' key (tableParser.js's
// ALIAS_MAP: designer: ['Designer']) and "Country" aliases to 'region', so
// this table's normalizedHeaders are ['designer', 'region', 'city',
// 'founded', 'discipline', 'notable_yachts', 'status', 'website', 'notes'].
//
// designed_by edges are created ONLY on a confident match: the Notable
// Yachts cell (comma-split) is resolved against existing yacht nodes by
// EXACT normalized-name equality — no fuzzy guessing, no new yacht node
// creation (per the ticket).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapDesignerTables, isDesignerTable } from '../src/mappers/designerMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';
import { isCompanyTable } from '../src/mappers/companyMapper.js';

const FIXTURE_DESIGNERS = `
| Designer | Country | City | Founded | Discipline | Notable Yachts | Status | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Bannenberg & Rowell | UK | London | 2003 | exterior design, interior design | Joy, Elandess 2 | active | bannenbergandrowell.com | Direct descendant studio of Jon Bannenberg |
| Winch Design | UK | London (Putney) | 1986 | exterior design, interior design | Al Mirqab, Somnio | active | winchdesign.com | Founded by Andrew Winch |
`;

// Only ONE of the three designer-specific signal columns present
// (discipline) — must NOT be claimed (guard requires >=2).
const FIXTURE_ONE_SIGNAL_ONLY = `
| Designer | Country | City | Discipline |
|----------|---------|------|------------|
| Some Studio | Italy | Milan | interior design |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'designer-mapper-test-')), 'graph.db');
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

describe('isDesignerTable — schema guard', () => {
  it('claims the exact designer-directory header shape (Designer + >=2 of Discipline/Notable Yachts/Status)', () => {
    const [table] = parseTables(FIXTURE_DESIGNERS);
    expect(isDesignerTable(table)).toBe(true);
  });

  it('does NOT claim a designer-named table with only one specific signal column', () => {
    const [table] = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    expect(isDesignerTable(table)).toBe(false);
  });

  it('does NOT collide with the shipyard/company guards (no collision either direction)', () => {
    const [table] = parseTables(FIXTURE_DESIGNERS);
    expect(isShipyardTable(table)).toBe(false);
    expect(isCompanyTable(table)).toBe(false);
  });
});

describe('mapDesignerTables — enriches existing + creates new designer nodes', () => {
  it('enriches an existing (empty-attrs) designer node without renaming it', () => {
    upsertNode(db, { id: 'designer:bannenberg-rowell', type: 'designer', name: 'Bannenberg & Rowell' });

    const tables = parseTables(FIXTURE_DESIGNERS);
    const result = mapDesignerTables(db, tables, 'designer-fixture.md');

    const node = getNode('designer:bannenberg-rowell');
    expect(node.name).toBe('Bannenberg & Rowell');
    expect(node.attrs.country).toBe('UK');
    expect(node.attrs.city).toBe('London');
    expect(node.attrs.founded).toBe('2003');
    expect(node.attrs.discipline).toEqual(['exterior design', 'interior design']);
    expect(node.attrs.notable_yachts).toEqual(['Joy', 'Elandess 2']);
    expect(node.attrs.provenance).toEqual(['designer-fixture.md']);
    expect(result.matched).toBe(1);
  });

  it('creates a new designer node when none exists', () => {
    const tables = parseTables(FIXTURE_DESIGNERS);
    const result = mapDesignerTables(db, tables, 'designer-fixture.md');

    const node = getNode('designer:winch-design');
    expect(node).not.toBeNull();
    expect(node.type).toBe('designer');
    expect(node.name).toBe('Winch Design');
    expect(result.created).toBe(2);
    expect(countByType('designer')).toBe(2);
  });
});

describe('mapDesignerTables — DESIGNED_BY edges (confident-match only)', () => {
  it('creates a designed_by edge when a Notable Yachts entry resolves to an existing yacht by EXACT normalized name', () => {
    upsertNode(db, { id: 'yacht:joy', type: 'yacht', name: 'Joy' });

    const tables = parseTables(FIXTURE_DESIGNERS);
    const result = mapDesignerTables(db, tables, 'designer-fixture.md');

    expect(edgeExists('yacht:joy', 'designed_by', 'designer:bannenberg-rowell')).toBe(true);
    expect(result.designedByEdges).toBeGreaterThanOrEqual(1);
  });

  it('does NOT create a designed_by edge (and does NOT mint a new yacht node) when no yacht node matches', () => {
    upsertNode(db, { id: 'yacht:joy', type: 'yacht', name: 'Joy' });

    const tables = parseTables(FIXTURE_DESIGNERS);
    mapDesignerTables(db, tables, 'designer-fixture.md');

    // "Elandess 2" has no pre-existing yacht node in this test's db.
    expect(getNode('yacht:elandess-2')).toBeNull();
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM edges WHERE rel = 'designed_by' AND dst = 'designer:bannenberg-rowell'").get().count
    ).toBe(1); // only Joy matched, not Elandess 2
  });

  it('supports multiple designed_by edges for the same yacht from different designer rows (Somnio: Winch Design + others)', () => {
    upsertNode(db, { id: 'yacht:somnio', type: 'yacht', name: 'Somnio' });

    const tables = parseTables(FIXTURE_DESIGNERS);
    mapDesignerTables(db, tables, 'designer-fixture.md');

    expect(edgeExists('yacht:somnio', 'designed_by', 'designer:winch-design')).toBe(true);
  });
});

describe('mapDesignerTables — attribute mapping', () => {
  it('splits Discipline and Notable Yachts on commas into arrays and stores status/website/notes as plain strings', () => {
    const tables = parseTables(FIXTURE_DESIGNERS);
    mapDesignerTables(db, tables, 'designer-fixture.md');

    const node = getNode('designer:winch-design');
    expect(node.attrs.discipline).toEqual(['exterior design', 'interior design']);
    expect(node.attrs.notable_yachts).toEqual(['Al Mirqab', 'Somnio']);
    expect(node.attrs.status).toBe('active');
    expect(node.attrs.website).toBe('winchdesign.com');
    expect(node.attrs.notes).toBe('Founded by Andrew Winch');
  });
});

describe('mapDesignerTables — idempotency', () => {
  it('running twice over the same input yields identical node/edge counts (no dupes)', () => {
    upsertNode(db, { id: 'yacht:joy', type: 'yacht', name: 'Joy' });

    const tables = parseTables(FIXTURE_DESIGNERS);
    mapDesignerTables(db, tables, 'designer-fixture.md');
    const firstDesigners = countByType('designer');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapDesignerTables(db, tables, 'designer-fixture.md');
    expect(countByType('designer')).toBe(firstDesigners);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('mapDesignerTables — schema guard on the table pass', () => {
  it('skips a non-designer table and reports it, without minting any designer nodes', () => {
    const tables = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    const result = mapDesignerTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.matched + result.created).toBe(0);
    expect(countByType('designer')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapDesignerTables and isDesignerTable as named exports', async () => {
    const mod = await import('../src/mappers/designerMapper.js');
    expect(typeof mod.mapDesignerTables).toBe('function');
    expect(typeof mod.isDesignerTable).toBe('function');
  });
});
