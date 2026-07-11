// ingest/tests/personEnrichmentMapper.spec.js
//
// TASK-021: person enrichment mapper. Real header shape grounded in
// research/round4/person-enrichment.md (curated into knowledge/95):
//   Person | Nationality | Industry | Role/Title | Status | Ownership
//   Confidence | Notes
// normalizedHeaders: person, nationality, industry, role_title, status,
// ownership_confidence, notes ("Person" is a bare header, not aliased to
// any existing identifier key).
//
// Resolves onto EXISTING person nodes by EXACT name only — never mints a
// new person node (per the ticket). ownership_confidence is stored on the
// person's EXISTING owned_by edge(s) (yacht -> person), not on the person
// node itself — edges support attrs_json for exactly this kind of
// per-relationship metadata.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapPersonEnrichmentTables, isPersonEnrichmentTable } from '../src/mappers/personMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';

const FIXTURE_PERSON_ENRICHMENT = `
| Person | Nationality | Industry | Role/Title | Status | Ownership Confidence | Notes |
|---|---|---|---|---|---|---|
| Bernard Arnault | French | Luxury goods (LVMH) | Chairman/CEO, LVMH | Living | Confirmed | Owns Symphony (101.5m Feadship). |
| Rinat Akhmetov | Ukrainian | Metals/mining/energy (System Capital Management) | Founder/Chairman | Living | Widely reported (not self-confirmed) | Linked to Luminance. |
| Robert Stiller | American | Coffee/retail (Green Mountain Coffee Roasters, founder) | Founder | Living | **Unconfirmed** | No source found tying Stiller to Naia. |
| No Such Person | American | n/a | n/a | Living | Confirmed | Does not exist in the graph. |
`;

// Only ONE of the three person-enrichment-specific signal columns present
// (nationality) — must NOT be claimed (guard requires >=2).
const FIXTURE_ONE_SIGNAL_ONLY = `
| Person | Nationality |
|--------|-------------|
| Some Person | American |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'person-enrichment-test-')), 'graph.db');
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

function getEdgeAttrs(src, rel, dst) {
  const row = db.prepare('SELECT attrs_json FROM edges WHERE src = ? AND rel = ? AND dst = ?').get(src, rel, dst);
  if (!row) return null;
  return row.attrs_json ? JSON.parse(row.attrs_json) : {};
}

describe('isPersonEnrichmentTable — schema guard', () => {
  it('claims the exact person-enrichment header shape (Person + >=2 of Nationality/Industry/Role)', () => {
    const [table] = parseTables(FIXTURE_PERSON_ENRICHMENT);
    expect(isPersonEnrichmentTable(table)).toBe(true);
  });

  it('does NOT claim a person-named table with only one specific signal column', () => {
    const [table] = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    expect(isPersonEnrichmentTable(table)).toBe(false);
  });

  it('does NOT collide with the shipyard guard (no collision either direction)', () => {
    const [table] = parseTables(FIXTURE_PERSON_ENRICHMENT);
    expect(isShipyardTable(table)).toBe(false);
  });
});

describe('mapPersonEnrichmentTables — resolves onto EXISTING person nodes only', () => {
  it('enriches an existing person node by exact name, storing nationality/industry/role/status/provenance', () => {
    upsertNode(db, { id: 'person:bernard-arnault', type: 'person', name: 'Bernard Arnault' });

    const tables = parseTables(FIXTURE_PERSON_ENRICHMENT);
    const result = mapPersonEnrichmentTables(db, tables, 'person-enrichment-fixture.md');

    const node = getNode('person:bernard-arnault');
    expect(node.attrs.nationality).toBe('French');
    expect(node.attrs.industry).toBe('Luxury goods (LVMH)');
    expect(node.attrs.role).toBe('Chairman/CEO, LVMH');
    expect(node.attrs.status).toBe('Living');
    expect(node.attrs.provenance).toEqual(['person-enrichment-fixture.md']);
    expect(result.matched).toBeGreaterThanOrEqual(1);
  });

  it('never mints a new person node — an unresolved row is counted and reported', () => {
    const tables = parseTables(FIXTURE_PERSON_ENRICHMENT);
    const result = mapPersonEnrichmentTables(db, tables, 'person-enrichment-fixture.md');

    expect(getNode('person:no-such-person')).toBeNull();
    expect(result.unresolved).toBeGreaterThanOrEqual(1);
    expect(result.unresolvedNames).toContain('No Such Person');
  });
});

describe('mapPersonEnrichmentTables — ownership_confidence on the owned_by EDGE, not the node', () => {
  it('sets a canonical confidence tier on every existing owned_by edge for that person', () => {
    upsertNode(db, { id: 'person:bernard-arnault', type: 'person', name: 'Bernard Arnault' });
    upsertNode(db, { id: 'yacht:symphony', type: 'yacht', name: 'Symphony' });
    upsertEdge(db, { src: 'yacht:symphony', rel: 'owned_by', dst: 'person:bernard-arnault' });

    const tables = parseTables(FIXTURE_PERSON_ENRICHMENT);
    mapPersonEnrichmentTables(db, tables, 'person-enrichment-fixture.md');

    expect(getEdgeAttrs('yacht:symphony', 'owned_by', 'person:bernard-arnault').ownership_confidence).toBe('confirmed');
    // The confidence tier must NOT leak onto the person node's own attrs.
    expect(getNode('person:bernard-arnault').attrs.ownership_confidence).toBeUndefined();
  });

  it('normalizes "Widely reported (not self-confirmed)" to the canonical "widely reported" tier', () => {
    upsertNode(db, { id: 'person:rinat-akhmetov', type: 'person', name: 'Rinat Akhmetov' });
    upsertNode(db, { id: 'yacht:luminance', type: 'yacht', name: 'Luminance' });
    upsertEdge(db, { src: 'yacht:luminance', rel: 'owned_by', dst: 'person:rinat-akhmetov' });

    const tables = parseTables(FIXTURE_PERSON_ENRICHMENT);
    mapPersonEnrichmentTables(db, tables, 'person-enrichment-fixture.md');

    expect(getEdgeAttrs('yacht:luminance', 'owned_by', 'person:rinat-akhmetov').ownership_confidence).toBe('widely reported');
  });

  it('normalizes "**Unconfirmed**" to the canonical "unconfirmed" tier', () => {
    upsertNode(db, { id: 'person:robert-stiller', type: 'person', name: 'Robert Stiller' });
    upsertNode(db, { id: 'yacht:naia', type: 'yacht', name: 'Naia' });
    upsertEdge(db, { src: 'yacht:naia', rel: 'owned_by', dst: 'person:robert-stiller' });

    const tables = parseTables(FIXTURE_PERSON_ENRICHMENT);
    mapPersonEnrichmentTables(db, tables, 'person-enrichment-fixture.md');

    expect(getEdgeAttrs('yacht:naia', 'owned_by', 'person:robert-stiller').ownership_confidence).toBe('unconfirmed');
  });
});

describe('mapPersonEnrichmentTables — idempotency', () => {
  it('running twice over the same input yields identical attrs (no dupes)', () => {
    upsertNode(db, { id: 'person:bernard-arnault', type: 'person', name: 'Bernard Arnault' });
    const tables = parseTables(FIXTURE_PERSON_ENRICHMENT);
    mapPersonEnrichmentTables(db, tables, 'person-enrichment-fixture.md');
    const first = getNode('person:bernard-arnault').attrs;

    mapPersonEnrichmentTables(db, tables, 'person-enrichment-fixture.md');
    const second = getNode('person:bernard-arnault').attrs;
    expect(second).toEqual(first);
  });
});

describe('mapPersonEnrichmentTables — schema guard on the table pass', () => {
  it('skips a non-person-enrichment table and reports it, without touching any person node', () => {
    const tables = parseTables(FIXTURE_ONE_SIGNAL_ONLY);
    const result = mapPersonEnrichmentTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.matched).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapPersonEnrichmentTables and isPersonEnrichmentTable as named exports', async () => {
    const mod = await import('../src/mappers/personMapper.js');
    expect(typeof mod.mapPersonEnrichmentTables).toBe('function');
    expect(typeof mod.isPersonEnrichmentTable).toBe('function');
  });
});
