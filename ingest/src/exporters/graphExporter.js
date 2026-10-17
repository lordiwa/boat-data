// ingest/src/exporters/graphExporter.js
//
// TASK-006: exports the SQLite nodes+edges graph (see db.js) into a static
// graph.json artifact that downstream clients (a UI, a query script) can
// load without ever touching SQLite/better-sqlite3 directly.
//
// Determinism: nodes are exported sorted by id, edges by (src, rel, dst),
// and every object's keys are written in a fixed order (JSON.stringify
// preserves insertion order for string keys, so we control that order by
// construction rather than relying on V8 property enumeration). The one
// exception is `meta.generated_at`, a wall-clock timestamp — see
// resolveGeneratedAt() below for how callers keep exports byte-identical
// across repeat runs when that matters (e.g. the ticket's idempotency
// check).
//
// Format decision (single file vs shards): the ticket asks us to shard
// graph.json into per-type files + a manifest if the single-file export
// would exceed ~15MB. On the real corpus (~3,3xx nodes / ~1,8xx edges) the
// serialized export is well under 1MB, so the single-file path is what
// actually ships. The shard path below is nonetheless implemented (not
// just documented) and covered by a test that forces it via a tiny
// `maxSingleFileBytes` override, so the fallback is proven to work rather
// than being aspirational dead code.
//
// Shard shape: when sharding, `outPath` still holds the manifest (so a
// client always starts by loading exactly `outPath`) with a `shards` map
// of relative file names instead of inline `nodes`/`edges` arrays. Every
// shard file is written alongside `outPath` (same directory).

import fs from 'node:fs';
import path from 'node:path';
import { FACETS } from '../mappers/facetVocabulary.js';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default graph.json location: ingest/data/graph.json (alongside
// graph.db). Overridable via GRAPH_JSON_PATH, mirroring db.js's
// GRAPH_DB_PATH / resolveDbPath convention, so tests can point at a
// temporary file instead of the real one.
export const DEFAULT_GRAPH_JSON_PATH = path.resolve(__dirname, '..', '..', 'data', 'graph.json');

export function resolveGraphJsonPath() {
  return process.env.GRAPH_JSON_PATH ? path.resolve(process.env.GRAPH_JSON_PATH) : DEFAULT_GRAPH_JSON_PATH;
}

// ~15MB, per the ticket. Overridable per-call (see exportGraph's options)
// so tests can force the shard path deterministically without generating
// a genuinely huge synthetic db.
export const DEFAULT_MAX_SINGLE_FILE_BYTES = 15 * 1024 * 1024;

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Resolves the `meta.generated_at` value for an export: an explicit
 * `generatedAt` option wins, then the GRAPH_EXPORT_GENERATED_AT env var
 * (mirrors db.js's GRAPH_DB_PATH / resolveDbPath convention, and lets the
 * ticket's "run ingest twice, diff the bytes" check hold the timestamp
 * fixed across both runs), else the current wall-clock time.
 */
export function resolveGeneratedAt(generatedAt) {
  if (generatedAt) return generatedAt;
  if (process.env.GRAPH_EXPORT_GENERATED_AT) return process.env.GRAPH_EXPORT_GENERATED_AT;
  return new Date().toISOString();
}

function loadNodes(db) {
  return db.prepare('SELECT id, type, name, attrs_json FROM nodes ORDER BY id ASC').all();
}

function loadEdges(db) {
  return db.prepare('SELECT src, rel, dst, attrs_json FROM edges ORDER BY src ASC, rel ASC, dst ASC').all();
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    counts[row[key]] = (counts[row[key]] || 0) + 1;
  }
  const sortedKeys = Object.keys(counts).sort();
  const ordered = {};
  for (const k of sortedKeys) ordered[k] = counts[k];
  return ordered;
}

function buildNodeRecords(rows) {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    attrs: parseAttrsJson(row.attrs_json),
  }));
}

function buildEdgeRecords(rows) {
  return rows.map((row) => ({
    src: row.src,
    rel: row.rel,
    dst: row.dst,
    attrs: parseAttrsJson(row.attrs_json),
  }));
}

/**
 * Builds the `indexes` block: by_type (type -> sorted array of node ids)
 * and name_to_id (lowercased node name -> sorted array of node ids sharing
 * that name, across all types). Both are built from the already
 * id-sorted `nodeRecords`, and both are emitted with alphabetically
 * sorted keys, so the output is deterministic regardless of any upstream
 * ordering.
 */
function buildIndexes(nodeRecords) {
  const byType = {};
  const nameToId = new Map();

  for (const node of nodeRecords) {
    if (!byType[node.type]) byType[node.type] = [];
    byType[node.type].push(node.id);

    if (node.name) {
      const key = String(node.name).toLowerCase();
      if (!nameToId.has(key)) nameToId.set(key, []);
      nameToId.get(key).push(node.id);
    }
  }

  const orderedByType = {};
  for (const type of Object.keys(byType).sort()) {
    orderedByType[type] = byType[type].slice().sort();
  }

  const orderedNameToId = {};
  for (const name of [...nameToId.keys()].sort()) {
    orderedNameToId[name] = nameToId.get(name).slice().sort();
  }

  return { by_type: orderedByType, name_to_id: orderedNameToId };
}

/**
 * TASK-027: meta.geo — country and subdivision roll-ups for the UI. node_count
 * is the number of NON-region nodes whose attrs.geo points at that country /
 * subdivision. Sorted by node_count desc, then name, so output is deterministic.
 */
function buildGeoMeta(nodeRecords) {
  const byCountry = new Map();
  const bySub = new Map();
  for (const n of nodeRecords) {
    if (n.type === 'region' || !n.attrs.geo) continue;
    const { country_code: cc, subdivision } = n.attrs.geo;
    byCountry.set(cc, (byCountry.get(cc) || 0) + 1);
    if (subdivision) bySub.set(`${cc}|${subdivision}`, (bySub.get(`${cc}|${subdivision}`) || 0) + 1);
  }
  const byCountThenName = (a, b) => b.node_count - a.node_count || a.name.localeCompare(b.name);
  const countries = [];
  const subdivisions = [];
  for (const n of nodeRecords) {
    if (n.type !== 'region') continue;
    if (n.attrs.level === 'country') {
      countries.push({ iso2: n.attrs.iso2, name: n.name, macro_region: n.attrs.macro_region, node_count: byCountry.get(n.attrs.iso2) || 0 });
    } else if (n.attrs.level === 'subdivision') {
      subdivisions.push({ name: n.name, country_code: n.attrs.iso2, node_count: bySub.get(`${n.attrs.iso2}|${n.name}`) || 0 });
    }
  }
  return { countries: countries.sort(byCountThenName), subdivisions: subdivisions.sort(byCountThenName) };
}

/**
 * TASK-029: meta.facets — { <type>: { <facet>: [{ value, count }] } } recounted from the nodes'
 * attrs.facets. A node counts once per value (multi facets list each value once). Sorted by count
 * desc, then value asc (string order), so the output is deterministic; type and facet keys are
 * alphabetical.
 */
function buildFacetsMeta(nodeRecords) {
  const tally = new Map(); // type -> facet -> Map(value -> count)
  for (const n of nodeRecords) {
    const facets = n.attrs.facets;
    // only the 11 faceted types, and only keys/values the closed vocabulary defines
    if (!FACETS[n.type] || !facets || typeof facets !== 'object') continue;
    const byFacet = tally.get(n.type) || new Map();
    tally.set(n.type, byFacet);
    for (const [facet, raw] of Object.entries(facets)) {
      const spec = FACETS[n.type][facet];
      if (!spec) continue;
      for (const value of new Set(Array.isArray(raw) ? raw : [raw])) {
        if (spec.values !== null && !spec.values.includes(value)) continue;
        const counts = byFacet.get(facet) || new Map();
        byFacet.set(facet, counts);
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
  }
  const out = {};
  for (const type of [...tally.keys()].sort()) {
    out[type] = {};
    for (const facet of [...tally.get(type).keys()].sort()) {
      out[type][facet] = [...tally.get(type).get(facet).entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || (String(a.value) < String(b.value) ? -1 : String(a.value) > String(b.value) ? 1 : 0));
    }
  }
  return out;
}

function buildMeta({ generatedAt, nodeRecords, edgeRecords }) {
  return {
    generated_at: generatedAt,
    node_count: nodeRecords.length,
    edge_count: edgeRecords.length,
    types: countBy(nodeRecords, 'type'),
    edge_types: countBy(edgeRecords, 'rel'),
    geo: buildGeoMeta(nodeRecords),
    facets: buildFacetsMeta(nodeRecords),
  };
}

function shardFileName(base, kind, key) {
  // e.g. "graph.json" -> "graph.nodes.yacht.json" / "graph.edges.built_by.json".
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);
  return `${stem}.${kind}.${key}${ext}`;
}

/**
 * Writes the sharded form: `outPath` gets a manifest (meta + indexes +
 * a `shards` map of relative file names, NO inline nodes/edges), and one
 * file per node type / edge rel is written alongside it holding that
 * slice's array under `{ nodes: [...] }` / `{ edges: [...] }`.
 */
function writeSharded({ outPath, meta, indexes, nodeRecords, edgeRecords }) {
  const dir = path.dirname(outPath);
  const base = path.basename(outPath);

  const shardsByType = {};
  for (const type of Object.keys(indexes.by_type)) {
    const fileName = shardFileName(base, 'nodes', type);
    const records = nodeRecords.filter((n) => n.type === type);
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify({ nodes: records }, null, 2), 'utf8');
    shardsByType[type] = fileName;
  }

  const relTypes = [...new Set(edgeRecords.map((e) => e.rel))].sort();
  const shardsByRel = {};
  for (const rel of relTypes) {
    const fileName = shardFileName(base, 'edges', rel);
    const records = edgeRecords.filter((e) => e.rel === rel);
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify({ edges: records }, null, 2), 'utf8');
    shardsByRel[rel] = fileName;
  }

  const manifest = {
    meta,
    indexes,
    shards: { nodes: shardsByType, edges: shardsByRel },
  };
  const json = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(outPath, json, 'utf8');
  return { format: 'sharded', outPath, bytes: Buffer.byteLength(json, 'utf8') };
}

/**
 * Exports the graph in `db` to `outPath` as graph.json (or, past the size
 * threshold, a manifest + shard files alongside it — see module header).
 *
 * Options:
 *   - generatedAt: explicit meta.generated_at value (see resolveGeneratedAt).
 *   - maxSingleFileBytes: single-file size threshold before sharding
 *     (default DEFAULT_MAX_SINGLE_FILE_BYTES, ~15MB).
 *
 * Returns { format: 'single' | 'sharded', outPath, bytes, nodeCount, edgeCount }.
 */
export function exportGraph(db, outPath, options = {}) {
  const { generatedAt, maxSingleFileBytes = DEFAULT_MAX_SINGLE_FILE_BYTES } = options;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const nodeRows = loadNodes(db);
  const edgeRows = loadEdges(db);
  const nodeRecords = buildNodeRecords(nodeRows);
  const edgeRecords = buildEdgeRecords(edgeRows);
  const indexes = buildIndexes(nodeRecords);
  const meta = buildMeta({ generatedAt: resolveGeneratedAt(generatedAt), nodeRecords, edgeRecords });

  const single = { meta, nodes: nodeRecords, edges: edgeRecords, indexes };
  const singleJson = JSON.stringify(single, null, 2);
  const singleBytes = Buffer.byteLength(singleJson, 'utf8');

  if (singleBytes <= maxSingleFileBytes) {
    fs.writeFileSync(outPath, singleJson, 'utf8');
    return { format: 'single', outPath, bytes: singleBytes, nodeCount: nodeRecords.length, edgeCount: edgeRecords.length };
  }

  const result = writeSharded({ outPath, meta, indexes, nodeRecords, edgeRecords });
  return { ...result, nodeCount: nodeRecords.length, edgeCount: edgeRecords.length };
}
