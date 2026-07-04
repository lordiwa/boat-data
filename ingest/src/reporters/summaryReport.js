// ingest/src/reporters/summaryReport.js
//
// TASK-006: writes reports/ingestion-summary.md — a human-readable
// markdown rollup of a completed ingest run: node/edge counts by type,
// the top builders/regions by connected-entity count, which corpus files
// were ingested vs skipped, dedup/provenance stats, and the skipped-prose
// count. Companion to graphExporter.js's machine-readable graph.json;
// this file is for humans reviewing an ingest run, not for programmatic
// consumption.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default report path lives at ingest/reports/ingestion-summary.md.
// Configurable via INGESTION_SUMMARY_REPORT_PATH, mirroring
// skippedProseReport.js's SKIPPED_PROSE_REPORT_PATH convention.
export const DEFAULT_INGESTION_SUMMARY_REPORT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'reports',
  'ingestion-summary.md'
);

export function resolveIngestionSummaryReportPath() {
  return process.env.INGESTION_SUMMARY_REPORT_PATH
    ? path.resolve(process.env.INGESTION_SUMMARY_REPORT_PATH)
    : DEFAULT_INGESTION_SUMMARY_REPORT_PATH;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function nodeCountsByType(db) {
  return db.prepare('SELECT type, COUNT(*) AS count FROM nodes GROUP BY type ORDER BY type').all();
}

function edgeCountsByRel(db) {
  return db.prepare('SELECT rel, COUNT(*) AS count FROM edges GROUP BY rel ORDER BY rel').all();
}

/** Top `limit` builders by number of yachts pointing at them via built_by. */
function topBuildersByYachtCount(db, limit = 15) {
  return db
    .prepare(
      `
      SELECT b.id AS builder_id, b.name AS builder_name, COUNT(*) AS yacht_count
      FROM edges e
      JOIN nodes b ON b.id = e.dst
      WHERE e.rel = 'built_by'
      GROUP BY e.dst
      ORDER BY yacht_count DESC, builder_name ASC
      LIMIT @limit
    `
    )
    .all({ limit });
}

/**
 * Top `limit` regions by number of edges terminating at them (any rel —
 * located_in, based_in, part_of — so a region's count reflects every kind
 * of entity connected to it, not just one relation type).
 */
function topRegionsByConnectedEntities(db, limit = 15) {
  return db
    .prepare(
      `
      SELECT r.id AS region_id, r.name AS region_name, COUNT(*) AS entity_count
      FROM edges e
      JOIN nodes r ON r.id = e.dst
      WHERE r.type = 'region'
      GROUP BY e.dst
      ORDER BY entity_count DESC, region_name ASC
      LIMIT @limit
    `
    )
    .all({ limit });
}

/**
 * Nodes with 2+ distinct provenance source files (attrs.provenance, an
 * array every mapper appends to — see normalize.js's appendProvenance and
 * yachtMapper.js's own provenance handling), broken down by type. A node
 * with 2+ provenance entries is one the pipeline successfully deduped
 * across multiple corpus files rather than minting once per mention.
 */
function multiProvenanceStats(db) {
  const rows = db.prepare('SELECT type, attrs_json FROM nodes').all();
  const byType = {};
  let total = 0;

  for (const row of rows) {
    const attrs = parseAttrsJson(row.attrs_json);
    const provenance = Array.isArray(attrs.provenance) ? attrs.provenance : [];
    if (provenance.length >= 2) {
      byType[row.type] = (byType[row.type] || 0) + 1;
      total += 1;
    }
  }

  const orderedByType = Object.keys(byType)
    .sort()
    .map((type) => ({ type, count: byType[type] }));

  return { total, byType: orderedByType };
}

function renderCountTable(headers, rows) {
  const lines = [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`];
  for (const row of rows) {
    lines.push(`| ${row.map(escapeCell).join(' | ')} |`);
  }
  return lines.join('\n');
}

function renderFileList(files) {
  if (!files || files.length === 0) return '_(none)_';
  return files
    .slice()
    .sort()
    .map((f) => `- ${f}`)
    .join('\n');
}

/**
 * Writes the ingestion summary markdown report to `outPath` (defaults to
 * resolveIngestionSummaryReportPath()), creating the parent directory if
 * needed. `db` is queried directly for counts/top-N tables so the report
 * always reflects exactly what's in the database at call time.
 *
 * `filesProcessed`/`filesSkipped` are arrays of corpus file names.
 * `offSchemaTables` and `skippedProse` are counts (numbers).
 */
export function writeIngestionSummary(
  { db, filesProcessed = [], filesSkipped = [], offSchemaTables = 0, skippedProse = 0 },
  outPath = resolveIngestionSummaryReportPath()
) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const nodeTypes = nodeCountsByType(db);
  const edgeRels = edgeCountsByRel(db);
  const totalNodes = nodeTypes.reduce((sum, r) => sum + r.count, 0);
  const totalEdges = edgeRels.reduce((sum, r) => sum + r.count, 0);
  const topBuilders = topBuildersByYachtCount(db, 15);
  const topRegions = topRegionsByConnectedEntities(db, 15);
  const provenanceStats = multiProvenanceStats(db);

  const lines = [
    '# Ingestion Summary',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Totals',
    '',
    `- Nodes: ${totalNodes}`,
    `- Edges: ${totalEdges}`,
    `- Files ingested: ${filesProcessed.length}`,
    `- Files skipped: ${filesSkipped.length}`,
    `- Off-schema tables skipped: ${offSchemaTables}`,
    `- Skipped prose sheets: ${skippedProse}`,
    '',
    '## Nodes by type',
    '',
    renderCountTable(
      ['Type', 'Count'],
      nodeTypes.map((r) => [r.type, r.count])
    ),
    '',
    '## Edges by relation',
    '',
    renderCountTable(
      ['Relation', 'Count'],
      edgeRels.map((r) => [r.rel, r.count])
    ),
    '',
    '## Top 15 builders by yacht count',
    '',
    topBuilders.length > 0
      ? renderCountTable(
          ['Builder', 'Yachts'],
          topBuilders.map((r) => [r.builder_name, r.yacht_count])
        )
      : '_(no built_by edges)_',
    '',
    '## Top 15 regions by connected entities',
    '',
    topRegions.length > 0
      ? renderCountTable(
          ['Region', 'Connected entities'],
          topRegions.map((r) => [r.region_name, r.entity_count])
        )
      : '_(no region edges)_',
    '',
    '## Dedup / provenance',
    '',
    `Nodes with 2+ provenance source files: ${provenanceStats.total}`,
    '',
    provenanceStats.byType.length > 0
      ? renderCountTable(
          ['Type', 'Nodes with 2+ provenance files'],
          provenanceStats.byType.map((r) => [r.type, r.count])
        )
      : '_(none)_',
    '',
    '## Files ingested',
    '',
    renderFileList(filesProcessed),
    '',
    '## Files skipped',
    '',
    renderFileList(filesSkipped),
    '',
  ];

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}
