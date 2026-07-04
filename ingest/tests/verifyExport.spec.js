// ingest/tests/verifyExport.spec.js
//
// TASK-006: proves graph.json is independently loadable and traversable
// (loadGraph + traverse) without touching SQLite/better-sqlite3 at all —
// this file imports ONLY verifyExport.js, never db.js. Covers both export
// shapes graphExporter.js can produce (single-file and sharded).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { exportGraph } from '../src/exporters/graphExporter.js';
import { loadGraph, traverse, getNode, findIdsByName, printThreeHopSample } from '../src/exporters/verifyExport.js';

let tmpDir;
let tmpDbPath;
let tmpOutPath;
let db;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-export-test-'));
  tmpDbPath = path.join(tmpDir, 'graph.db');
  tmpOutPath = path.join(tmpDir, 'graph.json');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedGraph() {
  upsertNode(db, { id: 'yacht:koru', type: 'yacht', name: 'Koru' });
  upsertNode(db, { id: 'yacht:barbara', type: 'yacht', name: 'Barbara' });
  upsertNode(db, { id: 'builder:oceanco', type: 'builder', name: 'Oceanco' });
  upsertNode(db, { id: 'region:netherlands', type: 'region', name: 'Netherlands' });

  upsertEdge(db, { src: 'yacht:koru', rel: 'built_by', dst: 'builder:oceanco' });
  upsertEdge(db, { src: 'yacht:barbara', rel: 'built_by', dst: 'builder:oceanco' });
  upsertEdge(db, { src: 'builder:oceanco', rel: 'based_in', dst: 'region:netherlands' });
}

describe('loadGraph + traverse — single-file export', () => {
  it('traverses Yacht -[built_by]-> Builder -[based_in]-> Region end-to-end', () => {
    seedGraph();
    exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });

    const graph = loadGraph(tmpOutPath);

    const builderIds = traverse(graph, 'yacht:koru', 'built_by', 'out');
    expect(builderIds).toEqual(['builder:oceanco']);

    const regionIds = traverse(graph, builderIds[0], 'based_in', 'out');
    expect(regionIds).toEqual(['region:netherlands']);

    expect(getNode(graph, 'region:netherlands').name).toBe('Netherlands');
  });

  it('traverses the reverse direction: Builder <-[built_by]- Yachts', () => {
    seedGraph();
    exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });

    const graph = loadGraph(tmpOutPath);
    const yachtIds = traverse(graph, 'builder:oceanco', 'built_by', 'in').sort();

    expect(yachtIds).toEqual(['yacht:barbara', 'yacht:koru']);
  });

  it('returns [] for a start id / rel with no matching edges, never throws', () => {
    seedGraph();
    exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });

    const graph = loadGraph(tmpOutPath);
    expect(traverse(graph, 'yacht:koru', 'owned_by', 'out')).toEqual([]);
    expect(traverse(graph, 'nonexistent:id', 'built_by', 'out')).toEqual([]);
  });

  it('findIdsByName resolves a node id via the exported name_to_id index', () => {
    seedGraph();
    exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });

    const graph = loadGraph(tmpOutPath);
    expect(findIdsByName(graph, 'Koru')).toEqual(['yacht:koru']);
    expect(findIdsByName(graph, 'koru')).toEqual(['yacht:koru']);
    expect(findIdsByName(graph, 'nobody')).toEqual([]);
  });

  it('printThreeHopSample logs a Yacht->Builder->sibling-Yachts sample', () => {
    seedGraph();
    exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });

    const graph = loadGraph(tmpOutPath);
    const lines = [];
    printThreeHopSample(graph, { seedName: 'koru', log: (line) => lines.push(line) });

    expect(lines[0]).toContain('Koru');
    expect(lines[0]).toContain('Oceanco');
    expect(lines[1]).toContain('builder:oceanco');
    expect(lines[1]).toMatch(/Barbara/);
    expect(lines[1]).toMatch(/Koru/);
  });
});

describe('loadGraph — sharded export', () => {
  it('loads and traverses a sharded manifest identically to a single-file export', () => {
    seedGraph();
    exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z', maxSingleFileBytes: 10 });

    const graph = loadGraph(tmpOutPath);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(3);

    const builderIds = traverse(graph, 'yacht:koru', 'built_by', 'out');
    expect(builderIds).toEqual(['builder:oceanco']);

    const yachtIds = traverse(graph, 'builder:oceanco', 'built_by', 'in').sort();
    expect(yachtIds).toEqual(['yacht:barbara', 'yacht:koru']);
  });
});
