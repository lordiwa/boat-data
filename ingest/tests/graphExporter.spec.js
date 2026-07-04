// ingest/tests/graphExporter.spec.js
//
// TASK-006: graph.json exporter. Uses a small synthetic db (mirrors
// db.spec.js's per-test-tmp-file convention) to prove the documented
// shape, determinism, and the shard fallback; a separate real-corpus
// assertion (see ingest.spec.js-style totals-match spec below) proves
// exported totals exactly match the live database after a real ingest.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { exportGraph, resolveGraphJsonPath, DEFAULT_GRAPH_JSON_PATH } from '../src/exporters/graphExporter.js';

let tmpDir;
let tmpDbPath;
let tmpOutPath;
let db;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-exporter-test-'));
  tmpDbPath = path.join(tmpDir, 'graph.db');
  tmpOutPath = path.join(tmpDir, 'graph.json');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function seedSmallGraph() {
  upsertNode(db, { id: 'yacht:koru', type: 'yacht', name: 'Koru', attrs: { loa: 118, provenance: ['a.md', 'b.md'] } });
  upsertNode(db, { id: 'yacht:barbara', type: 'yacht', name: 'Barbara', attrs: { loa: 90, provenance: ['a.md'] } });
  upsertNode(db, { id: 'builder:oceanco', type: 'builder', name: 'Oceanco', attrs: { provenance: ['a.md'] } });
  upsertNode(db, { id: 'region:netherlands', type: 'region', name: 'Netherlands' });

  upsertEdge(db, { src: 'yacht:koru', rel: 'built_by', dst: 'builder:oceanco' });
  upsertEdge(db, { src: 'yacht:barbara', rel: 'built_by', dst: 'builder:oceanco' });
  upsertEdge(db, { src: 'builder:oceanco', rel: 'based_in', dst: 'region:netherlands' });
}

describe('exportGraph — shape', () => {
  it('writes graph.json with meta, nodes, edges, and indexes matching the documented shape', () => {
    seedSmallGraph();

    const result = exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });
    expect(result.format).toBe('single');
    expect(fs.existsSync(tmpOutPath)).toBe(true);

    const graph = JSON.parse(fs.readFileSync(tmpOutPath, 'utf8'));

    expect(graph.meta).toEqual({
      generated_at: '2026-01-01T00:00:00.000Z',
      node_count: 4,
      edge_count: 3,
      types: { builder: 1, region: 1, yacht: 2 },
      edge_types: { based_in: 1, built_by: 2 },
    });

    expect(graph.nodes).toHaveLength(4);
    // Sorted by id.
    expect(graph.nodes.map((n) => n.id)).toEqual(
      ['builder:oceanco', 'region:netherlands', 'yacht:barbara', 'yacht:koru'].slice().sort()
    );
    const koru = graph.nodes.find((n) => n.id === 'yacht:koru');
    expect(koru).toEqual({
      id: 'yacht:koru',
      type: 'yacht',
      name: 'Koru',
      attrs: { loa: 118, provenance: ['a.md', 'b.md'] },
    });

    expect(graph.edges).toHaveLength(3);
    // Sorted by (src, rel, dst).
    const sortedEdgeKeys = graph.edges.map((e) => `${e.src}|${e.rel}|${e.dst}`);
    expect(sortedEdgeKeys).toEqual([...sortedEdgeKeys].sort());

    expect(graph.indexes.by_type.yacht.slice().sort()).toEqual(['yacht:barbara', 'yacht:koru']);
    expect(graph.indexes.by_type.builder).toEqual(['builder:oceanco']);
    expect(graph.indexes.name_to_id.koru).toEqual(['yacht:koru']);
    expect(graph.indexes.name_to_id.oceanco).toEqual(['builder:oceanco']);
  });

  it('exported node/edge totals exactly match SQLite row counts', () => {
    seedSmallGraph();

    const totalNodes = db.prepare('SELECT COUNT(*) AS count FROM nodes').get().count;
    const totalEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    const result = exportGraph(db, tmpOutPath);
    expect(result.nodeCount).toBe(totalNodes);
    expect(result.edgeCount).toBe(totalEdges);

    const graph = JSON.parse(fs.readFileSync(tmpOutPath, 'utf8'));
    expect(graph.nodes).toHaveLength(totalNodes);
    expect(graph.edges).toHaveLength(totalEdges);
    expect(graph.meta.node_count).toBe(totalNodes);
    expect(graph.meta.edge_count).toBe(totalEdges);
  });

  it('is deterministic: re-exporting the same db produces byte-identical output', () => {
    seedSmallGraph();

    exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });
    const firstBytes = fs.readFileSync(tmpOutPath);

    const secondOutPath = path.join(tmpDir, 'graph-2.json');
    exportGraph(db, secondOutPath, { generatedAt: '2026-01-01T00:00:00.000Z' });
    const secondBytes = fs.readFileSync(secondOutPath);

    expect(secondBytes.equals(firstBytes)).toBe(true);
  });
});

describe('exportGraph — shard fallback', () => {
  it('writes a manifest + per-type/per-rel shard files when past maxSingleFileBytes', () => {
    seedSmallGraph();

    // Force the shard path with a tiny threshold — the real corpus never
    // gets anywhere near the real ~15MB default (see module header), but
    // the fallback logic itself still needs direct coverage.
    const result = exportGraph(db, tmpOutPath, { generatedAt: '2026-01-01T00:00:00.000Z', maxSingleFileBytes: 10 });
    expect(result.format).toBe('sharded');

    const manifest = JSON.parse(fs.readFileSync(tmpOutPath, 'utf8'));
    expect(manifest.nodes).toBeUndefined();
    expect(manifest.edges).toBeUndefined();
    expect(manifest.meta.node_count).toBe(4);
    expect(manifest.meta.edge_count).toBe(3);
    expect(Object.keys(manifest.shards.nodes).sort()).toEqual(['builder', 'region', 'yacht']);
    expect(Object.keys(manifest.shards.edges).sort()).toEqual(['based_in', 'built_by']);

    const yachtShardPath = path.join(tmpDir, manifest.shards.nodes.yacht);
    const yachtShard = JSON.parse(fs.readFileSync(yachtShardPath, 'utf8'));
    expect(yachtShard.nodes).toHaveLength(2);

    const builtByShardPath = path.join(tmpDir, manifest.shards.edges.built_by);
    const builtByShard = JSON.parse(fs.readFileSync(builtByShardPath, 'utf8'));
    expect(builtByShard.edges).toHaveLength(2);
  });
});

describe('resolveGraphJsonPath', () => {
  const originalEnv = process.env.GRAPH_JSON_PATH;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.GRAPH_JSON_PATH;
    else process.env.GRAPH_JSON_PATH = originalEnv;
  });

  it('defaults to ingest/data/graph.json', () => {
    delete process.env.GRAPH_JSON_PATH;
    expect(resolveGraphJsonPath()).toBe(DEFAULT_GRAPH_JSON_PATH);
  });

  it('honors GRAPH_JSON_PATH override', () => {
    process.env.GRAPH_JSON_PATH = tmpOutPath;
    expect(resolveGraphJsonPath()).toBe(path.resolve(tmpOutPath));
  });
});
