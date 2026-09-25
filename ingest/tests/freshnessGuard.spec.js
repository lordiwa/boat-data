// ingest/tests/freshnessGuard.spec.js
//
// TASK-025 (Round 7) AC7 (hardening, item 1): the committed-artifact
// freshness guard (realCorpusExport.spec.js's "committed artifact
// freshness" describe block, added for TASK-024's review HIGH) only
// deep-compares each node's `attrs` between a clean-slate ingest and the
// committed ingest/data/graph.json — it never looks at EDGE attrs (e.g. a
// stale `ownership_confidence` on an `owned_by` edge, or a stale
// `classified_as` edge left over from a since-corrected LOA, would sail
// through undetected). This ticket extends the guard to also deep-compare
// edges (keyed by src/rel/dst, since that triple is the graph's own
// uniqueness constraint — see db.js's `UNIQUE (src, rel, dst)`).
//
// The comparison logic is pulled out into a new, directly-testable pure
// module (`../src/reporters/freshnessGuard.js`, exporting `compareGraphs`)
// so this file can exercise every divergence case with small synthetic
// graphs (fast, deterministic) rather than only ever being provable via a
// slow full real-corpus run. This module does not exist yet — every test
// below fails at import time until TASK-025's IMPL phase adds it.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareGraphs } from '../src/reporters/freshnessGuard.js';

function graph(nodes, edges) {
  return { nodes, edges };
}

describe('compareGraphs — pure synthetic comparisons', () => {
  it('reports no divergence at all for two byte-identical graphs', () => {
    const g = graph(
      [{ id: 'yacht:a', type: 'yacht', name: 'A', attrs: { loa: { meters: 10 } } }],
      [{ src: 'yacht:a', rel: 'built_by', dst: 'builder:b', attrs: {} }]
    );

    const result = compareGraphs(g, JSON.parse(JSON.stringify(g)));

    expect(result.onlyInFreshNodes).toEqual([]);
    expect(result.onlyInCommittedNodes).toEqual([]);
    expect(result.divergentNodeIds).toEqual([]);
    expect(result.onlyInFreshEdges).toEqual([]);
    expect(result.onlyInCommittedEdges).toEqual([]);
    expect(result.divergentEdgeKeys).toEqual([]);
    expect(result.isClean).toBe(true);
  });

  it('flags a node whose attrs differ between fresh and committed', () => {
    const fresh = graph([{ id: 'yacht:a', type: 'yacht', name: 'A', attrs: { loa: { meters: 10 } } }], []);
    const committed = graph([{ id: 'yacht:a', type: 'yacht', name: 'A', attrs: { loa: { meters: 99 } } }], []);

    const result = compareGraphs(fresh, committed);

    expect(result.divergentNodeIds).toEqual(['yacht:a']);
    expect(result.isClean).toBe(false);
  });

  it('flags an edge that carries different attrs between fresh and committed (same src/rel/dst)', () => {
    const fresh = graph(
      [],
      [{ src: 'yacht:a', rel: 'owned_by', dst: 'person:p', attrs: { ownership_confidence: 'confirmed' } }]
    );
    const committed = graph(
      [],
      [{ src: 'yacht:a', rel: 'owned_by', dst: 'person:p', attrs: { ownership_confidence: 'rumored' } }]
    );

    const result = compareGraphs(fresh, committed);

    expect(result.divergentEdgeKeys).toEqual(['yacht:a|owned_by|person:p']);
    expect(result.onlyInFreshEdges).toEqual([]);
    expect(result.onlyInCommittedEdges).toEqual([]);
    expect(result.isClean).toBe(false);
  });

  it('flags an edge present in only one side (a stale committed edge / a missing fresh edge)', () => {
    const fresh = graph([], [{ src: 'yacht:a', rel: 'classified_as', dst: 'size_class:superyacht', attrs: {} }]);
    const committed = graph([], [{ src: 'yacht:a', rel: 'classified_as', dst: 'size_class:megayacht', attrs: {} }]);

    const result = compareGraphs(fresh, committed);

    // Different dst -> different (src, rel, dst) keys entirely, so this is
    // an "only in fresh" + "only in committed" pair, not a divergent-attrs
    // case on a shared key.
    expect(result.onlyInFreshEdges).toEqual(['yacht:a|classified_as|size_class:superyacht']);
    expect(result.onlyInCommittedEdges).toEqual(['yacht:a|classified_as|size_class:megayacht']);
    expect(result.divergentEdgeKeys).toEqual([]);
    expect(result.isClean).toBe(false);
  });

  it('treats a null/undefined edge attrs as equal to an empty-object edge attrs (no false positive)', () => {
    const fresh = graph([], [{ src: 'yacht:a', rel: 'built_by', dst: 'builder:b', attrs: null }]);
    const committed = graph([], [{ src: 'yacht:a', rel: 'built_by', dst: 'builder:b', attrs: {} }]);

    const result = compareGraphs(fresh, committed);

    expect(result.divergentEdgeKeys).toEqual([]);
    expect(result.isClean).toBe(true);
  });

  // TASK-026 (Round 8) residual (6): the guard previously only compared each
  // node's `attrs` — a stale committed `name` or `type` (e.g. left over from
  // a graphCleanup retype that a later code change altered, or a hand-edit
  // slipping past review) sailed through undetected.
  it('flags a node whose NAME differs between fresh and committed, even when attrs are identical', () => {
    const fresh = graph([{ id: 'builder:a', type: 'builder', name: 'A', attrs: {} }], []);
    const committed = graph([{ id: 'builder:a', type: 'builder', name: 'A (stale name)', attrs: {} }], []);

    const result = compareGraphs(fresh, committed);

    expect(result.divergentNodeIds).toEqual(['builder:a']);
    expect(result.isClean).toBe(false);
  });

  it('flags a node whose TYPE differs between fresh and committed, even when attrs are identical', () => {
    const fresh = graph([{ id: 'x:a', type: 'company', name: 'A', attrs: {} }], []);
    const committed = graph([{ id: 'x:a', type: 'builder', name: 'A', attrs: {} }], []);

    const result = compareGraphs(fresh, committed);

    expect(result.divergentNodeIds).toEqual(['x:a']);
    expect(result.isClean).toBe(false);
  });
});

// --- Real-corpus integration: extends TASK-024's node-only freshness guard
// to also cover every edge in the actual committed ingest/data/graph.json.
// Same pattern as realCorpusExport.spec.js's own "committed artifact
// freshness" describe block (a clean-slate tmp-dir ingest, compared against
// the real committed path read directly off disk, never through
// GRAPH_JSON_PATH) — kept in this file (not that one) since it exercises
// the NEW compareGraphs() module this ticket adds, rather than the
// existing inline node-only comparison.
let tmpDir;
let tmpDbPath;
let tmpGraphJsonPath;
let originalGraphDbPath;
let originalGraphJsonPath;

describe('real corpus — committed artifact freshness now also covers EDGE attrs (TASK-025 hardening)', () => {
  const committedGraphJsonPath = path.resolve(fileURLToPath(import.meta.url), '..', '..', 'data', 'graph.json');

  it('the committed ingest/data/graph.json has zero node OR edge divergence from a clean-slate ingest', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'freshness-guard-edges-test-'));
    tmpDbPath = path.join(tmpDir, 'graph.db');
    tmpGraphJsonPath = path.join(tmpDir, 'graph.json');
    originalGraphDbPath = process.env.GRAPH_DB_PATH;
    originalGraphJsonPath = process.env.GRAPH_JSON_PATH;
    process.env.GRAPH_DB_PATH = tmpDbPath;
    process.env.GRAPH_JSON_PATH = tmpGraphJsonPath;

    try {
      const { runIngest } = await import('../src/ingest.js');
      runIngest();

      const fresh = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));
      expect(fs.existsSync(committedGraphJsonPath)).toBe(true);
      const committed = JSON.parse(fs.readFileSync(committedGraphJsonPath, 'utf8'));

      const result = compareGraphs(fresh, committed);

      expect(result.onlyInCommittedNodes, JSON.stringify(result.onlyInCommittedNodes)).toEqual([]);
      expect(result.onlyInFreshNodes, JSON.stringify(result.onlyInFreshNodes)).toEqual([]);
      expect(result.divergentNodeIds, JSON.stringify(result.divergentNodeIds)).toEqual([]);
      expect(result.onlyInCommittedEdges, JSON.stringify(result.onlyInCommittedEdges.slice(0, 20))).toEqual([]);
      expect(result.onlyInFreshEdges, JSON.stringify(result.onlyInFreshEdges.slice(0, 20))).toEqual([]);
      expect(result.divergentEdgeKeys, JSON.stringify(result.divergentEdgeKeys.slice(0, 20))).toEqual([]);
    } finally {
      if (originalGraphDbPath === undefined) delete process.env.GRAPH_DB_PATH;
      else process.env.GRAPH_DB_PATH = originalGraphDbPath;
      if (originalGraphJsonPath === undefined) delete process.env.GRAPH_JSON_PATH;
      else process.env.GRAPH_JSON_PATH = originalGraphJsonPath;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 30000);
});
