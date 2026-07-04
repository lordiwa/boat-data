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
