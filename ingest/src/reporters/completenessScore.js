// ingest/src/reporters/completenessScore.js
//
// TASK-016: reads the exported graph.json (same path resolution as
// exporters/graphExporter.js) and computes a per-node-type and overall
// "completeness score" — a rough proxy for how much of each entity type's
// useful data is actually populated, so every future data-enrichment round
// (dry docks, new marina/club/company directories, ...) can be measured
// against the project's >=8.5/10 goal instead of eyeballing node counts.
//
// Scoring (per the ticket):
//   per-type score = 0.7 * (avg fraction of required attrs present per
//                           node of that type)
//                  + 0.3 * (fraction of that type's nodes with >=1 edge,
//                           counted whether the node is the edge's src OR
//                           dst — e.g. a region is always the DST of a
//                           located_in/based_in edge, never the src).
//   overall = weighted average of the ten per-type scores, weights below.
// Both are on a 0-10 scale (attr/edge fractions are 0-1 internally,
// *10'd at the very end so intermediate math stays in the same units the
// ticket's 0.7/0.3 split describes).
//
// REQUIRED_ATTRS is deliberately data-driven (an array per type, not
// hardcoded scoring logic) so a future round can extend it without
// touching computeCompleteness() itself. Each entry is one of:
//   - a string: a single required attrs.<key> (non-empty per isPresent).
//   - an array of strings: an OR-group — ANY ONE of these attrs present
//     satisfies the whole entry (e.g. shipyard's dry_docks-OR-lift_type:
//     not every real-world dry dock discloses a docks *count*, but
//     reports its travel-lift capability instead, and either is
//     meaningful signal).
//   - { edge: '<rel>' }: satisfied if the node has >=1 edge with that rel
//     (as src).
//   - { anyOf: [...] }: an OR-group whose members can themselves be
//     strings or { edge } objects (e.g. marina's city-OR-located_in-edge:
//     marinaMapper.js never stores a bare `city` attr on the node — that
//     data only ever surfaces via the LOCATED_IN edge to a Region node —
//     so a plain 'city' string entry would always read as missing).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveGraphJsonPath } from '../exporters/graphExporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default report path: ingest/reports/completeness.json (alongside the
// other reporters' outputs). Overridable via COMPLETENESS_REPORT_PATH,
// mirroring summaryReport.js's INGESTION_SUMMARY_REPORT_PATH convention.
export const DEFAULT_COMPLETENESS_REPORT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'reports',
  'completeness.json'
);

export function resolveCompletenessReportPath() {
  return process.env.COMPLETENESS_REPORT_PATH
    ? path.resolve(process.env.COMPLETENESS_REPORT_PATH)
    : DEFAULT_COMPLETENESS_REPORT_PATH;
}

export const REQUIRED_ATTRS = {
  // TASK-020: extends the original 6-attr yacht schema with
  // yachtSpecMapper.js's 8 new spec fields (beam, draft, gt, max_speed,
  // range_nm, flag, class_society, imo). This makes yacht scoring
  // noticeably STRICTER — only the ~88 researched yachts (of 599) carry
  // any of these — a deliberate, ticket-mandated change; see
  // ingest/reports/completeness.json's own commit message for the
  // before/after numbers under both the old (6-attr) and new (14-attr)
  // yacht schema, so the score's downward jump reads as "yacht is scored
  // more honestly now," not "the graph regressed."
  yacht: [
    'loa',
    'year',
    'guests',
    'cabins',
    'crew',
    'value',
    'beam',
    'draft',
    'gt',
    'max_speed',
    'range_nm',
    'flag',
    'class_society',
    'imo',
  ],
  builder: ['country', 'founded', 'website', 'specialty'],
  shipyard: ['country', 'city', 'facility_type', ['dry_docks', 'lift_type'], ['max_loa', 'max_tonnage'], 'services', 'website'],
  marina: ['berths', 'max_loa', { anyOf: ['city', { edge: 'located_in' }] }, 'website'],
  club: ['city', 'founded', 'website'],
  company: ['kind', 'website', 'notes'],
  // TASK-019: designerMapper.js's real schema (country, discipline,
  // notable_yachts) replaces the old placeholder pair — 'notes' dropped (not
  // every row has one; discipline/notable_yachts are the meaningful signal
  // per the ticket's own acceptance criterion: ">=55 nodes with discipline +
  // notable_yachts attrs").
  designer: ['country', 'discipline', 'notable_yachts'],
  person: ['notes', 'provenance'],
  engine: ['tier', 'parent_brand', 'power_range'],
  // TASK-017: engine_model's own attrs, plus its MADE_BY edge to the brand
  // (an engine_model with no resolved brand is a data gap, same spirit as
  // marina's city-or-located_in-edge item).
  engine_model: ['years', 'type', 'power_hp', 'segment', { edge: 'made_by' }],
  part: ['category', 'location', 'description', 'applies_to'],
  // size_class carries no edges at all this round (see sizeClassMapper.js's
  // module header) — its completeness is purely attr presence.
  size_class: ['length_threshold', 'gt_range', 'typical_crew', 'definition_used_by', 'example_vessels', 'notes'],
  // Region nodes carry no meaningful attrs of their own in this graph —
  // their only signal is how well-connected they are (see module header).
  region: [],
};

// Per the ticket. Sum is 113 (review fix, LOW 1: a prior version of this
// comment miscounted it as 118, and the TASK-016-era comment before that
// miscounted its own 10-type subtotal as 105 when it was actually 100 —
// verify by summing the object below directly rather than trusting this
// comment) — overall divides by the sum of weights actually applied (see
// computeCompleteness), so this need not be a strict 0-100 partition.
export const TYPE_WEIGHTS = {
  yacht: 20,
  shipyard: 15,
  builder: 15,
  marina: 10,
  company: 10,
  region: 10,
  person: 5,
  club: 5,
  designer: 5,
  engine: 5,
  engine_model: 5,
  part: 5,
  size_class: 3,
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  return true; // non-empty object, boolean, etc.
}

function evalDescriptor(descriptor, attrs, hasEdge) {
  if (typeof descriptor === 'string') return isPresent(attrs[descriptor]);
  if (Array.isArray(descriptor)) return descriptor.some((d) => evalDescriptor(d, attrs, hasEdge));
  if (descriptor && typeof descriptor === 'object') {
    if ('edge' in descriptor) return hasEdge(descriptor.edge);
    if ('anyOf' in descriptor) return descriptor.anyOf.some((d) => evalDescriptor(d, attrs, hasEdge));
  }
  return false;
}

/**
 * Computes one type's { count, attrPct, edgePct, score } from already-
 * filtered `typeNodes` plus the whole graph's edges (via the shared
 * `edgesBySrc` / `connectedNodeIds` indexes built once by
 * computeCompleteness, not re-derived per type).
 */
function computeTypeStats(type, typeNodes, edgesBySrc, connectedNodeIds) {
  const count = typeNodes.length;
  const requiredList = REQUIRED_ATTRS[type] || [];

  if (count === 0) {
    return { type, count: 0, attrPct: 0, edgePct: 0, score: 0 };
  }

  let sumFraction = 0;
  let nodesWithEdge = 0;

  for (const node of typeNodes) {
    if (requiredList.length === 0) {
      // "edge-connectivity only" types (see module header): nothing to be
      // missing, so the attr term is a perfect 1 and the whole score rides
      // on the 0.3 edge-fraction term.
      sumFraction += 1;
    } else {
      const attrs = node.attrs || {};
      const hasEdge = (rel) => (edgesBySrc.get(node.id) || EMPTY_SET).has(rel);
      const satisfied = requiredList.filter((descriptor) => evalDescriptor(descriptor, attrs, hasEdge)).length;
      sumFraction += satisfied / requiredList.length;
    }

    if (connectedNodeIds.has(node.id)) nodesWithEdge += 1;
  }

  const attrFraction = sumFraction / count;
  const edgeFraction = nodesWithEdge / count;
  const score = (0.7 * attrFraction + 0.3 * edgeFraction) * 10;

  return {
    type,
    count,
    attrPct: round2(attrFraction * 100),
    edgePct: round2(edgeFraction * 100),
    score: round2(score),
  };
}

const EMPTY_SET = new Set();

/**
 * Pure function: computes per-type and overall completeness stats from an
 * already-parsed graph export ({ nodes, edges }, the same shape as
 * graph.json). No file I/O here — see runCompletenessScore() below for the
 * CLI wrapper that reads graph.json and writes the report.
 *
 * Returns { byType: [...one entry per TYPE_WEIGHTS key, in that order...],
 * overall }.
 */
export function computeCompleteness(graph) {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  const edgesBySrc = new Map();
  const connectedNodeIds = new Set();
  for (const edge of edges) {
    if (!edgesBySrc.has(edge.src)) edgesBySrc.set(edge.src, new Set());
    edgesBySrc.get(edge.src).add(edge.rel);
    connectedNodeIds.add(edge.src);
    connectedNodeIds.add(edge.dst);
  }

  const nodesByType = new Map();
  for (const node of nodes) {
    if (!nodesByType.has(node.type)) nodesByType.set(node.type, []);
    nodesByType.get(node.type).push(node);
  }

  const types = Object.keys(TYPE_WEIGHTS);
  const byType = types.map((type) =>
    computeTypeStats(type, nodesByType.get(type) || [], edgesBySrc, connectedNodeIds)
  );

  let weightedSum = 0;
  let totalWeight = 0;
  for (const entry of byType) {
    const weight = TYPE_WEIGHTS[entry.type] || 0;
    weightedSum += entry.score * weight;
    totalWeight += weight;
  }
  const overall = totalWeight > 0 ? round2(weightedSum / totalWeight) : 0;

  return { byType, overall };
}

function renderTable(byType) {
  const header = ['Type', 'Count', 'Attr %', 'Edge %', 'Score /10'];
  const rows = byType.map((r) => [r.type, String(r.count), `${r.attrPct}%`, `${r.edgePct}%`, r.score.toFixed(2)]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));

  const renderRow = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');

  const lines = [renderRow(header), widths.map((w) => '-'.repeat(w)).join('  ')];
  for (const row of rows) lines.push(renderRow(row));
  return lines.join('\n');
}

/**
 * CLI entry point: reads graph.json (resolveGraphJsonPath, same
 * resolution as the exporter), computes completeness, prints a table plus
 * the overall score, and writes ingest/reports/completeness.json (or
 * COMPLETENESS_REPORT_PATH) with the same data plus a generated_at
 * timestamp. Returns the written report object.
 */
export function runCompletenessScore() {
  const graphJsonPath = resolveGraphJsonPath();
  const raw = fs.readFileSync(graphJsonPath, 'utf8');
  const graph = JSON.parse(raw);

  const { byType, overall } = computeCompleteness(graph);

  console.log(`[score] graph: ${graphJsonPath}`);
  console.log(renderTable(byType));
  console.log(`[score] overall: ${overall.toFixed(2)} / 10`);

  const report = { generated_at: new Date().toISOString(), byType, overall };
  const outPath = resolveCompletenessReportPath();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`[score] report: ${outPath}`);

  return report;
}

// Only auto-run when executed directly (node src/reporters/completenessScore.js),
// not when imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCompletenessScore();
}
