// ingest/src/reporters/freshnessGuard.js
//
// TASK-025 (Round 7) hardening: extends the committed-artifact freshness
// guard (realCorpusExport.spec.js's "committed artifact freshness" describe
// block, added for TASK-024's review HIGH) beyond node attrs to also
// deep-compare EDGES between a clean-slate ingest and the committed
// ingest/data/graph.json — a stale `ownership_confidence` on an `owned_by`
// edge, or a stale `classified_as` edge left over from a since-corrected
// LOA, previously sailed through undetected.
//
// Pulled out into this small, pure, directly-testable module so
// freshnessGuard.spec.js can exercise every divergence case with small
// synthetic graphs (fast, deterministic) rather than only ever being
// provable via a slow full real-corpus run.

/**
 * Edges are keyed by their own uniqueness constraint (src, rel, dst) — see
 * db.js's `UNIQUE (src, rel, dst)` — so two edges with the same key are, by
 * construction, "the same edge" whose attrs may differ, never two distinct
 * edges.
 */
function edgeKey(edge) {
  return `${edge.src}|${edge.rel}|${edge.dst}`;
}

/**
 * True when `a` and `b` should be treated as equal edge/node attrs — a
 * null/undefined attrs object is treated as equal to an empty object `{}`
 * (both mean "no attrs"), avoiding a false-positive divergence report for
 * an edge stored with `attrs: null` vs one stored with `attrs: {}` (both
 * legitimate representations of "no extra data" across this codebase's own
 * upsertEdge/exporter conventions).
 */
function attrsEqual(a, b) {
  const normalize = (v) => (v === null || v === undefined ? {} : v);
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/**
 * Deep-compares two exported graphs ({ nodes, edges }, the same shape as
 * graph.json) — `fresh` (a clean-slate ingest's export) against `committed`
 * (whatever is currently checked in). Pure function; no file I/O.
 *
 * Returns:
 *   { onlyInFreshNodes, onlyInCommittedNodes, divergentNodeIds,
 *     onlyInFreshEdges, onlyInCommittedEdges, divergentEdgeKeys, isClean }
 * — every array holds ids/keys (node ids for nodes, "src|rel|dst" for
 * edges), sorted for deterministic, readable test failure output.
 * `isClean` is true iff all six arrays are empty.
 */
export function compareGraphs(fresh, committed) {
  const freshNodes = fresh?.nodes || [];
  const committedNodes = committed?.nodes || [];
  const freshEdges = fresh?.edges || [];
  const committedEdges = committed?.edges || [];

  const freshNodesById = new Map(freshNodes.map((n) => [n.id, n]));
  const committedNodesById = new Map(committedNodes.map((n) => [n.id, n]));

  const onlyInFreshNodes = [...freshNodesById.keys()].filter((id) => !committedNodesById.has(id)).sort();
  const onlyInCommittedNodes = [...committedNodesById.keys()].filter((id) => !freshNodesById.has(id)).sort();

  const divergentNodeIds = [];
  for (const [id, committedNode] of committedNodesById) {
    const freshNode = freshNodesById.get(id);
    if (!freshNode) continue;
    // TASK-026 (Round 8) residual (6): previously only `attrs` was
    // compared — a stale committed `name` or `type` (e.g. left over from a
    // graphCleanup retype whose logic later changed, or a hand-edit that
    // slipped past review) sailed through undetected.
    const attrsSame = attrsEqual(freshNode.attrs, committedNode.attrs);
    const nameSame = freshNode.name === committedNode.name;
    const typeSame = freshNode.type === committedNode.type;
    if (!attrsSame || !nameSame || !typeSame) divergentNodeIds.push(id);
  }
  divergentNodeIds.sort();

  const freshEdgesByKey = new Map(freshEdges.map((e) => [edgeKey(e), e]));
  const committedEdgesByKey = new Map(committedEdges.map((e) => [edgeKey(e), e]));

  const onlyInFreshEdges = [...freshEdgesByKey.keys()].filter((key) => !committedEdgesByKey.has(key)).sort();
  const onlyInCommittedEdges = [...committedEdgesByKey.keys()].filter((key) => !freshEdgesByKey.has(key)).sort();

  const divergentEdgeKeys = [];
  for (const [key, committedEdge] of committedEdgesByKey) {
    const freshEdge = freshEdgesByKey.get(key);
    if (!freshEdge) continue;
    if (!attrsEqual(freshEdge.attrs, committedEdge.attrs)) divergentEdgeKeys.push(key);
  }
  divergentEdgeKeys.sort();

  const isClean =
    onlyInFreshNodes.length === 0 &&
    onlyInCommittedNodes.length === 0 &&
    divergentNodeIds.length === 0 &&
    onlyInFreshEdges.length === 0 &&
    onlyInCommittedEdges.length === 0 &&
    divergentEdgeKeys.length === 0;

  return {
    onlyInFreshNodes,
    onlyInCommittedNodes,
    divergentNodeIds,
    onlyInFreshEdges,
    onlyInCommittedEdges,
    divergentEdgeKeys,
    isClean,
  };
}
