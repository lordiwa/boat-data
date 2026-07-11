// ingest/tests/realCorpusExport.spec.js
//
// TASK-006: the one real-corpus regression lock the ticket calls for
// ("a real-corpus assertion on totals-match") — runs the full pipeline
// against the actual /knowledge corpus (not a synthetic fixture) and
// proves the graph.json export's node/edge totals exactly match the live
// SQLite row counts, with zero loss. Everything else in this ticket's
// test coverage uses small synthetic corpora/dbs for speed (see
// graphExporter.spec.js / summaryReport.spec.js); this file is the
// deliberate exception, and is why it's the slowest spec in the suite
// (a handful of seconds to scan all ~80 real corpus files).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

let tmpDir;
let tmpDbPath;
let tmpGraphJsonPath;
let tmpSummaryReportPath;
let tmpSkippedProseReportPath;
let originalGraphDbPath;
let originalGraphJsonPath;
let originalSummaryReportPath;
let originalSkippedProseReportPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'real-corpus-export-test-'));
  tmpDbPath = path.join(tmpDir, 'graph.db');
  tmpGraphJsonPath = path.join(tmpDir, 'graph.json');
  tmpSummaryReportPath = path.join(tmpDir, 'ingestion-summary.md');
  tmpSkippedProseReportPath = path.join(tmpDir, 'skipped-prose.md');

  originalGraphDbPath = process.env.GRAPH_DB_PATH;
  originalGraphJsonPath = process.env.GRAPH_JSON_PATH;
  originalSummaryReportPath = process.env.INGESTION_SUMMARY_REPORT_PATH;
  originalSkippedProseReportPath = process.env.SKIPPED_PROSE_REPORT_PATH;

  process.env.GRAPH_DB_PATH = tmpDbPath;
  process.env.GRAPH_JSON_PATH = tmpGraphJsonPath;
  process.env.INGESTION_SUMMARY_REPORT_PATH = tmpSummaryReportPath;
  process.env.SKIPPED_PROSE_REPORT_PATH = tmpSkippedProseReportPath;
  // Deliberately do NOT set KNOWLEDGE_DIR: this test wants the real
  // /knowledge corpus (resolveKnowledgeDir()'s default), not a fixture.
});

afterEach(() => {
  if (originalGraphDbPath === undefined) delete process.env.GRAPH_DB_PATH;
  else process.env.GRAPH_DB_PATH = originalGraphDbPath;
  if (originalGraphJsonPath === undefined) delete process.env.GRAPH_JSON_PATH;
  else process.env.GRAPH_JSON_PATH = originalGraphJsonPath;
  if (originalSummaryReportPath === undefined) delete process.env.INGESTION_SUMMARY_REPORT_PATH;
  else process.env.INGESTION_SUMMARY_REPORT_PATH = originalSummaryReportPath;
  if (originalSkippedProseReportPath === undefined) delete process.env.SKIPPED_PROSE_REPORT_PATH;
  else process.env.SKIPPED_PROSE_REPORT_PATH = originalSkippedProseReportPath;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('real corpus — export totals match SQLite exactly', () => {
  it('graph.json node/edge counts equal the live database row counts after a full real ingest', async () => {
    const { runIngest } = await import('../src/ingest.js');

    const result = runIngest();

    // Sanity: this really did scan the full real corpus, not an empty/tiny
    // fixture (matches the ticket's documented real-corpus ballpark).
    expect(result.totalNodes).toBeGreaterThan(3000);
    expect(result.totalEdges).toBeGreaterThan(1500);

    const db = new Database(tmpDbPath, { readonly: true });
    const sqliteNodeCount = db.prepare('SELECT COUNT(*) AS count FROM nodes').get().count;
    const sqliteEdgeCount = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;
    db.close();

    expect(fs.existsSync(tmpGraphJsonPath)).toBe(true);
    const graph = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));

    expect(graph.nodes.length).toBe(sqliteNodeCount);
    expect(graph.edges.length).toBe(sqliteEdgeCount);
    expect(graph.meta.node_count).toBe(sqliteNodeCount);
    expect(graph.meta.edge_count).toBe(sqliteEdgeCount);
    expect(result.exportResult.nodeCount).toBe(sqliteNodeCount);
    expect(result.exportResult.edgeCount).toBe(sqliteEdgeCount);

    // Sum of per-type / per-rel breakdowns must also account for every
    // node/edge (no silent loss in the grouping either).
    const typeSum = Object.values(graph.meta.types).reduce((a, b) => a + b, 0);
    const relSum = Object.values(graph.meta.edge_types).reduce((a, b) => a + b, 0);
    expect(typeSum).toBe(sqliteNodeCount);
    expect(relSum).toBe(sqliteEdgeCount);

    expect(fs.existsSync(tmpSummaryReportPath)).toBe(true);
    const summary = fs.readFileSync(tmpSummaryReportPath, 'utf8');
    expect(summary).toContain(`Nodes: ${sqliteNodeCount}`);
    expect(summary).toContain(`Edges: ${sqliteEdgeCount}`);
  }, 30000);
});

// Review fix (MEDIUM 3): yachtMapper's id assignment is ingestion-order-
// dependent (see ingest.js's module header) — the corpus is scanned in
// sorted filename order, so a future data-enrichment round that adds new
// numbered files should sort AFTER the existing corpus and never shift an
// existing yacht's id. This lock pins the current real-corpus per-type
// counts (as of TASK-017's engine/parts/size-class enrichment) and a small
// sample of well-known yacht ids, so a future round that silently disturbs
// ingestion order (e.g. a new file inserted with a lower sort-order number,
// or a rename that changes a yacht's normalized name) fails loudly here
// instead of quietly reshuffling ids downstream.
describe('real corpus — baseline lock (per-type counts + pinned yacht ids)', () => {
  it('matches the pinned per-type node counts (TASK-017 engine/parts/size-class baseline)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    // `result.totals.<type>` is a running tally of ROWS PROCESSED (it
    // increments on every mention across files, including re-merges of an
    // already-known entity), not the final distinct-node count — the
    // graph.json export's meta.types is the one true per-type node count
    // (see graphExporter.js's buildMeta), so the baseline lock reads from
    // there instead.
    const graph = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));

    expect(graph.meta.types.yacht).toBe(605);
    expect(graph.meta.types.builder).toBe(186);
    expect(graph.meta.types.club).toBe(368);
    expect(graph.meta.types.marina).toBe(893);
    expect(graph.meta.types.person).toBe(110);
    expect(graph.meta.types.designer).toBe(10);
    expect(graph.meta.types.shipyard).toBe(236);
    // TASK-017: engine grew from 16 (file-07 tier table only) to 59 after
    // knowledge/89's manufacturer directory merged into/created brand
    // nodes; engine_model/part/size_class are brand-new types this round.
    expect(graph.meta.types.engine).toBe(59);
    expect(graph.meta.types.engine_model).toBe(37);
    expect(graph.meta.types.part).toBe(111);
    expect(graph.meta.types.size_class).toBe(4);
  }, 30000);

  it('resolves a pinned sample of well-known yacht ids unchanged', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const pinnedIds = ['yacht:azzam', 'yacht:eclipse', 'yacht:dilbar', 'yacht:big-data', 'yacht:breakthrough'];
    for (const id of pinnedIds) {
      const row = db.prepare('SELECT id, type FROM nodes WHERE id = ?').get(id);
      expect(row, `expected pinned yacht id ${id} to still exist`).toBeTruthy();
      expect(row.type).toBe('yacht');
    }
    db.close();
  }, 30000);
});

// Review fix (TASK-016 review carry-forward): a cheap sanity range on every
// numeric attr the shipyard/engine/engine-model mappers parse, so a future
// curation mistake (a prose cell like "Nimitz-class capable (Dry Dock 8)"
// silently parsing to tonnage=8, or a stray comma truncating "400,000" to
// 400) fails a real-corpus test immediately instead of shipping a
// nonsensical value. Bounds are deliberately generous (real-world dry docks
// span a few hundred tons to ~1M+ tons; yachts/shipyards span a few metres
// to Newport-News-scale ~700m graving docks; engine outputs span a few
// horsepower to multi-thousand-hp racing/ship engines) — this is a "does
// this look like the right unit/order-of-magnitude" check, not a precise
// business-rule validation.
describe('real corpus — numeric attr range-sanity locks', () => {
  it('every shipyard max_tonnage/max_loa falls within a plausible real-world range', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'shipyard'").all();
    db.close();

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (attrs.max_tonnage !== undefined && attrs.max_tonnage !== null) {
        expect(attrs.max_tonnage, `${row.id} max_tonnage=${attrs.max_tonnage}`).toBeGreaterThanOrEqual(100);
        expect(attrs.max_tonnage, `${row.id} max_tonnage=${attrs.max_tonnage}`).toBeLessThanOrEqual(1_500_000);
      }
      if (attrs.max_loa !== undefined && attrs.max_loa !== null) {
        expect(attrs.max_loa, `${row.id} max_loa=${attrs.max_loa}`).toBeGreaterThanOrEqual(10);
        expect(attrs.max_loa, `${row.id} max_loa=${attrs.max_loa}`).toBeLessThanOrEqual(700);
      }
    }
  }, 30000);

  it('every engine_model power_hp falls within a plausible real-world range (TASK-017)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'engine_model'").all();
    db.close();

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (attrs.power_hp !== undefined && attrs.power_hp !== null) {
        expect(attrs.power_hp, `${row.id} power_hp=${attrs.power_hp}`).toBeGreaterThanOrEqual(1);
        expect(attrs.power_hp, `${row.id} power_hp=${attrs.power_hp}`).toBeLessThanOrEqual(10_000);
      }
    }
  }, 30000);
});
