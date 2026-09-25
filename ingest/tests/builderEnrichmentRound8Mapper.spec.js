// ingest/tests/builderEnrichmentRound8Mapper.spec.js
//
// TASK-026 (Round 8): maps knowledge/99_Global_Builder_Enrichment_Round8.md's
// table onto EXISTING 'builder' nodes ONLY — never mints. Real header shape:
//   Builder | Country | Founded | Website | Specialty | Notes
// "Builder" aliases to 'builder', "Country" aliases to 'region'
// (tableParser.js's ALIAS_MAP — same as builderEnrichmentMapper.js's Round-2
// table); Founded/Website/Specialty/Notes are unaliased, so
// normalizedHeaders is ['builder', 'region', 'founded', 'website',
// 'specialty', 'notes'].

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import {
  mapBuilderEnrichmentRound8Tables,
  isBuilderEnrichmentRound8Table,
} from '../src/mappers/builderEnrichmentRound8Mapper.js';
import { isBuilderEnrichmentTable } from '../src/mappers/builderEnrichmentMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';
import { isDesignerTable } from '../src/mappers/designerMapper.js';
import { isClubEnrichmentTable } from '../src/mappers/clubMapper.js';

const FIXTURE_ROUND8 = `
| Builder | Country | Founded | Website | Specialty | Notes |
|---|---|---|---|---|---|
| Absolute | Italy | 2002 | absoluteyachts.com | flybridge/coupé/navetta motor yachts; composite construction | Founded by Sergio Maggi & Marcello Bè in Podenzano (Piacenza). |
| Cassens-Werft | Germany | 1875 |  | general/commercial shipbuilding | [conflict: 1875 traditional founding per de.wikipedia.org vs 2004 "inception date" per Wikidata company record — likely a later corporate re-registration]. Emden. Defunct. |
| Alloy Yachts | | | alloyyachts.com | | New Zealand builder, ceased operations c.2013-2016; live status not independently confirmed |
`;

// The Round-2 shape (Builder/Country/City/Founded/Specialty/Status/Parent
// Company/Website/Notes) also carries founded+website+specialty — must NOT
// be claimed by the Round-8 guard (Round 2's own guard claims it first in
// ingest.js's precedence order; this fixture proves the two guards don't
// double-claim the same real table).
const FIXTURE_ROUND2_SHAPE = `
| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Lurssen | Germany | Bremen-Vegesack | 1875 | custom steel/aluminium megayachts | active | family-owned | lurssen.com | 51 yachts in graph |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'builder-enrichment-round8-test-')), 'graph.db');
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

describe('isBuilderEnrichmentRound8Table — schema guard', () => {
  it('claims the exact Round-8 header shape (Builder + Founded + Website + Specialty, no City/Status/Parent Company)', () => {
    const [table] = parseTables(FIXTURE_ROUND8);
    expect(isBuilderEnrichmentRound8Table(table)).toBe(true);
  });

  it('does NOT claim the Round-2 builder-enrichment shape (that guard claims it first)', () => {
    const [table] = parseTables(FIXTURE_ROUND2_SHAPE);
    expect(isBuilderEnrichmentRound8Table(table)).toBe(false);
    expect(isBuilderEnrichmentTable(table)).toBe(true); // sanity: Round 2's own guard still claims its shape.
  });

  it('does not collide with shipyard/designer/clubEnrichment guards in either direction', () => {
    const [round8Table] = parseTables(FIXTURE_ROUND8);
    expect(isShipyardTable(round8Table)).toBe(false);
    expect(isDesignerTable(round8Table)).toBe(false);
    expect(isClubEnrichmentTable(round8Table)).toBe(false);
  });
});

describe('mapBuilderEnrichmentRound8Tables — NEVER mints', () => {
  it('does not create any builder node for a row with no existing match', () => {
    const tables = parseTables(FIXTURE_ROUND8);
    const result = mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    expect(countByType('builder')).toBe(0);
    expect(result.unresolved).toBe(3);
    expect(result.matched).toBe(0);
  });

  it('resolves onto an existing builder node by EXACT name (case-insensitive) and matches, never mints', () => {
    upsertNode(db, { id: 'builder:absolute', type: 'builder', name: 'Absolute' });

    const tables = parseTables(FIXTURE_ROUND8);
    const result = mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    expect(countByType('builder')).toBe(1);
    expect(result.matched).toBe(1);
    const node = getNode('builder:absolute');
    expect(node.attrs.country).toBe('Italy');
    expect(node.attrs.founded).toBe(2002);
    expect(node.attrs.website).toBe('absoluteyachts.com');
    expect(node.attrs.specialty).toEqual(['flybridge/coupé/navetta motor yachts', 'composite construction']);
    expect(node.attrs.provenance).toEqual(['99_Global_Builder_Enrichment_Round8.md']);
  });

  it('resolves onto an existing builder node by NORMALIZED-slug-id match when the exact name differs by case/diacritics', () => {
    upsertNode(db, { id: 'builder:cassens-werft', type: 'builder', name: 'CASSENS-WERFT' });

    const tables = parseTables(FIXTURE_ROUND8);
    mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    const node = getNode('builder:cassens-werft');
    expect(node.name).toBe('CASSENS-WERFT'); // pre-existing name preserved, not overwritten.
    expect(node.attrs.founded).toBe(1875);
  });
});

describe('mapBuilderEnrichmentRound8Tables — placeholder exclusion (AC2: attrs.placeholder === true, NOT a name regex)', () => {
  it('skips a node flagged attrs.placeholder === true even though its NAME does not match any known placeholder pattern', () => {
    // "Absolute" does not match any custom/various/mixed/motorsailer name
    // pattern — this proves the exclusion keys on the attrs flag, not a
    // name regex (a name-regex implementation would wrongly enrich this
    // node, since nothing about "Absolute" looks like a placeholder name).
    upsertNode(db, {
      id: 'builder:absolute',
      type: 'builder',
      name: 'Absolute',
      attrs: { placeholder: true },
    });

    const tables = parseTables(FIXTURE_ROUND8);
    const result = mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    const node = getNode('builder:absolute');
    expect(node.attrs.country).toBeUndefined();
    expect(node.attrs.founded).toBeUndefined();
    expect(result.placeholderSkipped).toBe(1);
    expect(result.matched).toBe(0);
  });

  it('the 5 known placeholder builders (custom/various/custom-rebuild/mixed/motorsailer) are all skipped when flagged', () => {
    const ids = ['builder:custom', 'builder:various', 'builder:custom-rebuild', 'builder:mixed', 'builder:motorsailer'];
    for (const id of ids) {
      upsertNode(db, { id, type: 'builder', name: id.split(':')[1], attrs: { placeholder: true } });
    }

    const tables = parseTables(`
| Builder | Country | Founded | Website | Specialty | Notes |
|---|---|---|---|---|---|
| Custom | France | 1990 | custom.example.com | fabricated | should never be enriched |
| Various | France | 1990 | various.example.com | fabricated | should never be enriched |
| Custom-Rebuild | France | 1990 | custom-rebuild.example.com | fabricated | should never be enriched |
| Mixed | France | 1990 | mixed.example.com | fabricated | should never be enriched |
| Motorsailer | France | 1990 | motorsailer.example.com | fabricated | should never be enriched |
`);
    const result = mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    for (const id of ids) {
      expect(getNode(id).attrs.country).toBeUndefined();
    }
    expect(result.placeholderSkipped).toBe(5);
  });
});

describe('mapBuilderEnrichmentRound8Tables — [conflict: ...] marker routing (curation rule 4)', () => {
  it('routes the [conflict: ...] marker text into attrs.conflicts.founded rather than silently overwriting', () => {
    upsertNode(db, { id: 'builder:cassens-werft', type: 'builder', name: 'Cassens-Werft' });

    const tables = parseTables(FIXTURE_ROUND8);
    mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    const node = getNode('builder:cassens-werft');
    expect(node.attrs.founded).toBe(1875);
    const conflicts = node.attrs.conflicts && node.attrs.conflicts.founded;
    expect(Array.isArray(conflicts)).toBe(true);
    expect(conflicts.join(' ')).toMatch(/2004/);
    expect(conflicts.join(' ')).toMatch(/inception date/);
    // the marker itself is stripped out of the stored value, not duplicated verbatim as-is
    expect(conflicts.some((c) => c.startsWith('[conflict:'))).toBe(false);
  });

  it('preserves the full Notes cell (including non-conflict [note:]/[SUSPECTED DUPLICATE] markers) verbatim in attrs.notes', () => {
    upsertNode(db, { id: 'builder:alloy-yachts', type: 'builder', name: 'Alloy Yachts' });

    const tables = parseTables(FIXTURE_ROUND8);
    mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    const node = getNode('builder:alloy-yachts');
    expect(node.attrs.notes).toMatch(/ceased operations c\.2013-2016/);
  });
});

describe('mapBuilderEnrichmentRound8Tables — never overwrites an existing non-empty attr', () => {
  it('leaves an already-populated field untouched (first-non-empty-wins)', () => {
    upsertNode(db, {
      id: 'builder:absolute',
      type: 'builder',
      name: 'Absolute',
      attrs: { country: 'Somewhere Else' },
    });

    const tables = parseTables(FIXTURE_ROUND8);
    mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');

    expect(getNode('builder:absolute').attrs.country).toBe('Somewhere Else');
  });
});

describe('mapBuilderEnrichmentRound8Tables — idempotency', () => {
  it('running twice over the same input yields identical node counts and attrs (no dupes, no drift)', () => {
    upsertNode(db, { id: 'builder:absolute', type: 'builder', name: 'Absolute' });
    const tables = parseTables(FIXTURE_ROUND8);

    mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');
    const first = JSON.stringify(getNode('builder:absolute'));

    mapBuilderEnrichmentRound8Tables(db, tables, '99_Global_Builder_Enrichment_Round8.md');
    const second = JSON.stringify(getNode('builder:absolute'));

    expect(second).toBe(first);
    expect(countByType('builder')).toBe(1);
  });
});

describe('mapBuilderEnrichmentRound8Tables — schema guard on the table pass', () => {
  it('skips a non-Round-8-shaped table and reports it, without touching any builder node', () => {
    const tables = parseTables(`
| Builder | Country | City | Specialty |
|---------|---------|------|-----------|
| Some Yard | Italy | Genoa | custom motoryachts |
`);
    const result = mapBuilderEnrichmentRound8Tables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.matched).toBe(0);
    expect(countByType('builder')).toBe(0);
  });
});

describe('module importability', () => {
  it('exposes mapBuilderEnrichmentRound8Tables and isBuilderEnrichmentRound8Table as named exports', async () => {
    const mod = await import('../src/mappers/builderEnrichmentRound8Mapper.js');
    expect(typeof mod.mapBuilderEnrichmentRound8Tables).toBe('function');
    expect(typeof mod.isBuilderEnrichmentRound8Table).toBe('function');
  });
});
