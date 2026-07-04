// ingest/tests/summaryReport.spec.js
//
// TASK-006: the ingestion-summary.md report writer. Mirrors
// skippedProseReport.spec.js's tmp-dir-overridable-path convention, using
// a small synthetic db seeded directly via upsertNode/upsertEdge (no need
// to run the full pipeline here — that's covered by
// realCorpusExport.spec.js).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { writeIngestionSummary } from '../src/reporters/summaryReport.js';

let tmpDir;
let tmpDbPath;
let tmpReportPath;
let db;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-report-test-'));
  tmpDbPath = path.join(tmpDir, 'graph.db');
  tmpReportPath = path.join(tmpDir, 'nested', 'ingestion-summary.md');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedGraph() {
  upsertNode(db, { id: 'yacht:koru', type: 'yacht', name: 'Koru', attrs: { provenance: ['75.md', '78.md'] } });
  upsertNode(db, { id: 'yacht:barbara', type: 'yacht', name: 'Barbara', attrs: { provenance: ['77.md'] } });
  upsertNode(db, { id: 'builder:oceanco', type: 'builder', name: 'Oceanco', attrs: { provenance: ['75.md'] } });
  upsertNode(db, { id: 'builder:feadship', type: 'builder', name: 'Feadship' });
  upsertNode(db, { id: 'region:netherlands', type: 'region', name: 'Netherlands' });

  upsertEdge(db, { src: 'yacht:koru', rel: 'built_by', dst: 'builder:oceanco' });
  upsertEdge(db, { src: 'yacht:barbara', rel: 'built_by', dst: 'builder:oceanco' });
  upsertEdge(db, { src: 'builder:oceanco', rel: 'based_in', dst: 'region:netherlands' });
  upsertEdge(db, { src: 'builder:feadship', rel: 'based_in', dst: 'region:netherlands' });
}

describe('writeIngestionSummary', () => {
  it('writes counts by node type, edge type, top builders, top regions, files ingested/skipped, and dedup stats', () => {
    seedGraph();

    const outPath = writeIngestionSummary(
      {
        db,
        filesProcessed: ['75.md', '77.md', '78.md'],
        filesSkipped: ['01_skip.md'],
        offSchemaTables: 3,
        skippedProse: 2,
      },
      tmpReportPath
    );

    expect(outPath).toBe(tmpReportPath);
    const content = fs.readFileSync(tmpReportPath, 'utf8');

    // Node/edge counts by type.
    expect(content).toContain('- Nodes: 5');
    expect(content).toContain('- Edges: 4');
    expect(content).toContain('| yacht | 2 |');
    expect(content).toContain('| builder | 2 |');
    expect(content).toContain('| region | 1 |');
    expect(content).toContain('| built_by | 2 |');
    expect(content).toContain('| based_in | 2 |');

    // Top builders by yacht count: Oceanco has 2 built_by edges pointing
    // at it, Feadship has none.
    expect(content).toContain('| Oceanco | 2 |');
    expect(content).not.toMatch(/\| Feadship \| \d+ \|/);

    // Top regions by connected entities: Netherlands has 2 based_in edges.
    expect(content).toContain('| Netherlands | 2 |');

    // Files ingested vs skipped.
    expect(content).toContain('75.md');
    expect(content).toContain('01_skip.md');
    expect(content).toContain('- Files ingested: 3');
    expect(content).toContain('- Files skipped: 1');
    expect(content).toContain('- Off-schema tables skipped: 3');
    expect(content).toContain('- Skipped prose sheets: 2');

    // Dedup/provenance: koru and barbara each have provenance, but only
    // koru has 2+ entries.
    expect(content).toContain('Nodes with 2+ provenance source files: 1');
    expect(content).toContain('| yacht | 1 |');
  });

  it('creates the parent directory and still writes a valid report on an empty database', () => {
    const outPath = writeIngestionSummary(
      { db, filesProcessed: [], filesSkipped: [], offSchemaTables: 0, skippedProse: 0 },
      tmpReportPath
    );

    expect(fs.existsSync(outPath)).toBe(true);
    const content = fs.readFileSync(outPath, 'utf8');
    expect(content).toContain('- Nodes: 0');
    expect(content).toContain('- Edges: 0');
    expect(content).toContain('_(no built_by edges)_');
    expect(content).toContain('_(no region edges)_');
    expect(content).toContain('Nodes with 2+ provenance source files: 0');
    expect(content).toContain('_(none)_');
  });
});
