// ingest/src/ingest.js
//
// Ingestion pipeline entry point: scans the /knowledge markdown corpus (in
// sorted filename order — required because yachtMapper's id assignment is
// ingestion-order-dependent, see yachtMapper.js), parses each file's pipe
// tables, and routes every table to exactly one entity mapper by schema
// guard, in precedence order: yacht > club > marina > company > engine >
// shipyard > engine-manufacturer > engine-model > part > size-class. A
// table that matches none of the ten schemas is skipped and counted
// (diagnostic only — never silently dropped from the log).
//
// TASK-016 adds shipyardMapper LAST in precedence (a highly specific guard
// per its own module header — see shipyardMapper.js for the full
// collision analysis against the other five guards) and, separately, the
// `npm run score` completeness reporter (src/reporters/completenessScore.js,
// not part of the ingest run itself).
//
// TASK-017 adds four more highly specific guards, all placed after
// shipyard in precedence (see ingest/tests/guardCollisions.spec.js for the
// full 10x10 collision matrix proving none of the ten guards ever claim
// another's shape):
//   - engineManufacturer (engineMapper.js's second guard): a global engine-
//     brand directory (knowledge/89), upserting into the SAME 'engine' node
//     type as the existing Tier/Manufacturer table, plus OWNED_BY edges to
//     a resolved/created parent-company node.
//   - engineModel (engineModelMapper.js, new 'engine_model' node type):
//     Mercury's model/series history (knowledge/88), with a MADE_BY edge to
//     the resolved/created engine brand node.
//   - part (partMapper.js, new 'part' node type): boat/yacht parts anatomy
//     glossary (knowledge/90).
//   - sizeClass (sizeClassMapper.js, new 'size_class' node type): the
//     yacht/superyacht/megayacht/gigayacht classification table
//     (knowledge/90), attrs stored verbatim (no numeric parsing — see that
//     mapper's own module header for why).
// linkEngineOemSupplies() is a small retrofit hook (same pattern as
// linkYachtRegions() below) run once after all files are processed, adding
// a hand-grounded handful of OEM_SUPPLIES edges between engine brands.
//
// TASK-004 also adds two small "retrofit hooks" that read already-mapped
// data without touching yachtMapper.js's internals (per the ticket: "do
// not rewrite yachtMapper's internals"):
//   - linkYachtRegions(): resolves every yacht's free-text `location` attr
//     (already collected by yachtMapper) through the shared regions.js
//     registry and adds a LOCATED_IN edge to the canonical Region node.
//   - linkYachtAttributions(): a narrow, well-grounded hook for the one
//     real corpus table (file 10, Feadship 2025 fleet) that pairs a yacht
//     name with a "Designers (Ext/Int)" column — tableParser's ALIAS_MAP
//     only aliases "Yacht Name"/"Name"/"Vessel" to the canonical "name"
//     key, not the bare "Yacht" header that table uses, so yachtMapper's
//     own schema guard never sees it as yacht data. This hook recognizes
//     'yacht' as a second identifier column, best-effort-creates the yacht
//     node if missing, and adds DESIGNED_BY edges to Designer nodes split
//     out of the Ext/Int cell.
//
// TASK-005 (Wave B) adds a second, independent pass per file: after the
// table-routing pass above claims every pipe table, proseParser.js scans
// the SAME file's non-table lines for prose "data sheets" (labeled-bullet
// clusters or heading+paragraph narratives — see proseParser.js's module
// header) and proseMapper.js maps them into the same Marina/YachtClub/
// Person nodes, deduping against Wave-A via identical id conventions.
// Sheets that don't confidently classify are written to
// reports/skipped-prose.md rather than dropped or guessed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openDb, initSchema, resolveDbPath, upsertNode, upsertEdge } from './db.js';
import { parseTables } from './parsers/tableParser.js';
import { detectProseSheets } from './parsers/proseParser.js';
import { mapYachtTables } from './mappers/yachtMapper.js';
import { mapClubTables, isClubTable } from './mappers/clubMapper.js';
import { mapMarinaTables, isMarinaTable } from './mappers/marinaMapper.js';
import { mapCompanyTables, isCompanyTable } from './mappers/companyMapper.js';
import {
  mapEngineTables,
  isEngineTable,
  mapEngineManufacturerTables,
  isEngineManufacturerTable,
  linkEngineOemSupplies,
} from './mappers/engineMapper.js';
import { mapShipyardTables, isShipyardTable } from './mappers/shipyardMapper.js';
import { mapEngineModelTables, isEngineModelTable } from './mappers/engineModelMapper.js';
import { mapPartTables, isPartTable } from './mappers/partMapper.js';
import { mapSizeClassTables, isSizeClassTable } from './mappers/sizeClassMapper.js';
import { mapProseSheets } from './mappers/proseMapper.js';
import { upsertRegion } from './mappers/regions.js';
import { isEmptyValue, slug, normalizeName, pickFirstPresent } from './mappers/normalize.js';
import { writeSkippedProseReport } from './reports/skippedProseReport.js';
import { exportGraph, resolveGraphJsonPath } from './exporters/graphExporter.js';
import { writeIngestionSummary } from './reporters/summaryReport.js';

// Per-file bias for proseMapper.js's classifySheet() tie-breaker (used
// ONLY when a sheet has fields but no unambiguous keyword/field signal —
// see proseMapper.js's module header). Set for the corpus files this
// ticket specifically targets; every other file still gets the prose pass
// with no hint (classification then relies purely on content signals).
const PROSE_TYPE_HINTS = {
  '16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md': 'marina',
  '17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md': 'marina',
  '55_Pacific_Coast_Marinas_and_Boatyards_Guide.md': 'marina',
  '67_First_Yacht_Club_in_Florida_History_and_Impact.md': 'club',
  '69_Sarasota_Yacht_Club_History_Amenities_Events.md': 'club',
  '15_Billionaire_Superyacht_Owners_and_Dataset.md': 'person',
  '74_Seized_Yachts_of_Russian_Oligarchs.md': 'person',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default corpus directory: <repo>/knowledge. Overridable via the
// KNOWLEDGE_DIR env var so tests can point at a small synthetic corpus
// instead of scanning the full real one on every run.
const DEFAULT_KNOWLEDGE_DIR = path.resolve(__dirname, '..', '..', 'knowledge');

export function resolveKnowledgeDir() {
  return process.env.KNOWLEDGE_DIR ? path.resolve(process.env.KNOWLEDGE_DIR) : DEFAULT_KNOWLEDGE_DIR;
}

// Files that are skipped entirely: the routing/schema guards below would
// mostly no-op on these anyway (they contain no club/marina/company/
// engine/yacht-shaped tables), but skipping them outright keeps the
// skipped-tables diagnostic meaningful (it counts off-schema tables within
// *processed* files, not noise from files we already know are unrelated).
export const SKIP_FILES = new Set([
  // Meta files about DataYacht itself (hosting costs, registration,
  // query-access limits, the "Bloomberg Terminal" pitch) — not yacht/
  // club/marina/broker/engine entity data.
  '06_Yacht_Data_Puzzle_Compartmentalization.md',
  '12_Hosting_Costs_for_Yacht_Database_Website.md',
  '14_DataYacht_Query_Access_and_Subcategories_Limit.md',
  '18_DataYacht_as_Bloomberg_Terminal_for_Yachts.md',
  '31_Datayacht_AI_Frameworks_for_Yacht_Business.md',
  '47_Datayacht_Registration_Date_1998.md',
  '48_Datayacht_Registration_Status_and_Context.md',
  '50_Yacht_and_Boat_Website_Comparison.md',
  // Historical / unrelated maritime topics (shipwrecks, powerboat racing,
  // outboard-motor history, rum-running, submarines) — no yacht/club/
  // marina/broker/engine entities to extract.
  '01_Florida_Shipwrecks_Treasure_Fleet_GPS_Directory.md',
  '02_Florida_Treasure_Divers_Gold_Pioneer_History.md',
  '03_Offshore_Powerboat_Racing_Origins_and_History.md',
  '04_Johnson_and_Evinrude_Motor_History.md',
  '59_U_505_Only_German_U_boat_in_USA.md',
  '68_1920s_Rum_Running_Boats_and_Operations.md',
  '81_Rum_Row_Prohibition_Offshore_Liquor_Trade.md',
  '82_Remote_Control_Subs_Used_by_Drug_Smugglers.md',
]);

// Duplicates yachtMapper's own (private, unexported) isYachtTable check so
// the routing pass can decide precedence *before* calling any mapper.
// Keep in sync with yachtMapper.js's REQUIRED_ANY_OF if that ever changes.
const YACHT_REQUIRED_ANY_OF = ['builder', 'loa', 'year'];
function isYachtTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!present.has('name')) return false;
  return YACHT_REQUIRED_ANY_OF.some((key) => present.has(key));
}

/**
 * Partitions `tables` into per-mapper buckets by schema guard, in
 * precedence order (yacht > club > marina > company > engine > shipyard >
 * engineManufacturer > engineModel > part > sizeClass). A table matching
 * none of the ten is counted in `skipped` (diagnostic only).
 */
function routeTables(tables) {
  const buckets = {
    yacht: [],
    club: [],
    marina: [],
    company: [],
    engine: [],
    shipyard: [],
    engineManufacturer: [],
    engineModel: [],
    part: [],
    sizeClass: [],
  };
  let skipped = 0;

  for (const table of tables) {
    if (isYachtTable(table)) buckets.yacht.push(table);
    else if (isClubTable(table)) buckets.club.push(table);
    else if (isMarinaTable(table)) buckets.marina.push(table);
    else if (isCompanyTable(table)) buckets.company.push(table);
    else if (isEngineTable(table)) buckets.engine.push(table);
    else if (isShipyardTable(table)) buckets.shipyard.push(table);
    else if (isEngineManufacturerTable(table)) buckets.engineManufacturer.push(table);
    else if (isEngineModelTable(table)) buckets.engineModel.push(table);
    else if (isPartTable(table)) buckets.part.push(table);
    else if (isSizeClassTable(table)) buckets.sizeClass.push(table);
    else skipped += 1;
  }

  return { buckets, skipped };
}

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function nodeExists(db, id) {
  return !!db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
}

/**
 * Retrofit hook (see module header): resolves every existing yacht node's
 * free-text `attrs.location` (already collected by yachtMapper from the
 * corpus's Region/Location/Country column) through the shared regions.js
 * registry and adds a LOCATED_IN edge to the canonical Region node. Reads
 * yachtMapper's output; never modifies yachtMapper.js itself. Runs once
 * over all yacht nodes (idempotent — upsertEdge no-ops on repeat inserts),
 * so it doesn't need per-file bookkeeping of which yachts were just
 * touched.
 */
function linkYachtRegions(db) {
  const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht'").all();
  let edges = 0;

  for (const row of rows) {
    const attrs = parseAttrsJson(row.attrs_json);
    if (isEmptyValue(attrs.location)) continue;

    const regionId = upsertRegion(db, attrs.location);
    if (!regionId) continue;

    upsertEdge(db, { src: row.id, rel: 'located_in', dst: regionId });
    edges += 1;
  }

  return { edges };
}

const ATTRIBUTION_NAME_KEYS = ['name', 'yacht'];
const ATTRIBUTION_DESIGNER_KEYS = ['designer', 'designers_ext_int'];
// Free-text propulsion column that sometimes names a known engine maker
// (e.g. file 10's Feadship "Breakthrough" row: "Hydrogen fuel cells +
// methanol backup + HVO MTU hybrid" attests MTU as its engine maker).
const ATTRIBUTION_ENGINE_TEXT_KEYS = ['propulsion_innovations', 'propulsion', 'engine', 'engine_manufacturer'];

function isAttributionTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!ATTRIBUTION_NAME_KEYS.some((key) => present.has(key))) return false;
  return ATTRIBUTION_DESIGNER_KEYS.some((key) => present.has(key));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Strips markdown bold and a trailing parenthetical project/hull code
// (e.g. "**Breakthrough** (Project 821)" -> "Breakthrough") so the
// computed yacht id matches the one yachtMapper would assign from a
// cleaner mention of the same yacht elsewhere in the corpus.
function cleanAttributionName(raw) {
  return String(raw ?? '')
    .replace(/\*\*/g, '')
    .replace(/\([^)]*\)\s*$/, '')
    .trim();
}

/**
 * Retrofit hook (see module header): a narrow, well-grounded pass over
 * tables that pair a yacht identifier with a designer column but weren't
 * recognized by yachtMapper's own schema guard (e.g. file 10's bare
 * "Yacht" header, which tableParser's ALIAS_MAP doesn't alias to "name").
 * Best-effort creates the yacht node if it doesn't already exist, adds
 * DESIGNED_BY edges to Designer nodes (splitting a combined "Ext/Int" cell
 * into up to two designers), and — when the same row has a free-text
 * propulsion column that names an EngineMaker already known to the graph
 * (from engineMapper's earlier-processed files; corpus files are scanned
 * in sorted order, so file 07's engine tables are ingested before file
 * 10's) — adds a POWERED_BY edge to that engine.
 */
function linkYachtAttributions(db, tables, sourceFile) {
  let designers = 0;
  let poweredBy = 0;
  let edges = 0;

  const knownEngines = db.prepare("SELECT id, name FROM nodes WHERE type = 'engine'").all();

  for (const table of tables) {
    if (!isAttributionTable(table)) continue;

    for (const row of table.rows) {
      const rawName = pickFirstPresent(row, ATTRIBUTION_NAME_KEYS);
      if (rawName === undefined) continue;
      const cleanedName = cleanAttributionName(rawName);
      if (isEmptyValue(cleanedName)) continue;

      const yachtId = `yacht:${slug(normalizeName(cleanedName))}`;
      if (!nodeExists(db, yachtId)) {
        upsertNode(db, { id: yachtId, type: 'yacht', name: cleanedName, attrs: { provenance: [sourceFile] } });
      }

      const designerRaw = pickFirstPresent(row, ATTRIBUTION_DESIGNER_KEYS);
      if (!isEmptyValue(designerRaw)) {
        const designerNames = String(designerRaw)
          .split('/')
          .map((s) => s.trim())
          .filter((s) => !isEmptyValue(s));

        for (const designerName of designerNames) {
          const designerId = `designer:${slug(normalizeName(designerName))}`;
          upsertNode(db, { id: designerId, type: 'designer', name: designerName });
          upsertEdge(db, { src: yachtId, rel: 'designed_by', dst: designerId });
          designers += 1;
          edges += 1;
        }
      }

      const propulsionRaw = pickFirstPresent(row, ATTRIBUTION_ENGINE_TEXT_KEYS);
      if (!isEmptyValue(propulsionRaw)) {
        for (const engine of knownEngines) {
          const mentionRe = new RegExp(`\\b${escapeRegExp(engine.name)}\\b`, 'i');
          if (mentionRe.test(propulsionRaw)) {
            upsertEdge(db, { src: yachtId, rel: 'powered_by', dst: engine.id });
            poweredBy += 1;
            edges += 1;
          }
        }
      }
    }
  }

  return { designers, poweredBy, edges };
}

function listCorpusFiles(knowledgeDir) {
  if (!fs.existsSync(knowledgeDir)) return [];
  return fs
    .readdirSync(knowledgeDir)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort(); // stable order: yachtMapper's id assignment is order-dependent.
}

export function runIngest() {
  const dbPath = resolveDbPath();
  const knowledgeDir = resolveKnowledgeDir();
  const db = openDb(dbPath);

  try {
    initSchema(db);

    const files = listCorpusFiles(knowledgeDir);
    const totals = {
      filesProcessed: 0,
      filesSkipped: 0,
      skippedTables: 0,
      yachts: 0,
      builders: 0,
      persons: 0,
      clubs: 0,
      marinas: 0,
      companies: 0,
      engines: 0,
      shipyards: 0,
      engineModels: 0,
      parts: 0,
      sizeClasses: 0,
      designers: 0,
      poweredBy: 0,
      edges: 0,
      skippedProseSheets: 0,
    };
    const skippedProseEntries = [];
    // TASK-006: filename bookkeeping for the ingestion-summary report's
    // "files ingested vs skipped" lists. Purely additive (does not affect
    // any existing counter/behavior above).
    const filesProcessedList = [];
    const filesSkippedList = [];

    for (const fileName of files) {
      if (SKIP_FILES.has(fileName)) {
        totals.filesSkipped += 1;
        filesSkippedList.push(fileName);
        continue;
      }

      const filePath = path.join(knowledgeDir, fileName);
      const fileText = fs.readFileSync(filePath, 'utf8');
      const tables = parseTables(fileText);
      const { buckets, skipped } = routeTables(tables);
      totals.skippedTables += skipped;

      const yachtResult = mapYachtTables(db, buckets.yacht, fileName);
      totals.yachts += yachtResult.yachts;
      totals.builders += yachtResult.builders;
      totals.persons += yachtResult.persons;
      totals.edges += yachtResult.edges;

      const clubResult = mapClubTables(db, buckets.club, fileName);
      totals.clubs += clubResult.clubs;
      // Type-column routing (HIGH 1 fix): a club-shaped table can contain
      // marina-typed rows (e.g. file 34's "Marina with Club Facilities"),
      // which mapClubTables delegates to marinaMapper's mapMarinaRows()
      // internally — counted here under marinas, not clubs.
      totals.marinas += clubResult.marinas;
      totals.edges += clubResult.edges;

      const marinaResult = mapMarinaTables(db, buckets.marina, fileName);
      totals.marinas += marinaResult.marinas;
      totals.edges += marinaResult.edges;

      const companyResult = mapCompanyTables(db, buckets.company, fileName);
      totals.companies += companyResult.companies;
      totals.edges += companyResult.edges;

      const engineResult = mapEngineTables(db, buckets.engine, fileName);
      totals.engines += engineResult.engines;

      const shipyardResult = mapShipyardTables(db, buckets.shipyard, fileName);
      totals.shipyards += shipyardResult.shipyards;
      totals.edges += shipyardResult.edges;

      // TASK-017: engineManufacturer upserts into the SAME 'engine' node
      // type as `engineResult` above (see engineMapper.js's module header),
      // so its node count is folded into totals.engines, not a separate
      // counter.
      const engineManufacturerResult = mapEngineManufacturerTables(db, buckets.engineManufacturer, fileName);
      totals.engines += engineManufacturerResult.engines;
      totals.edges += engineManufacturerResult.edges;

      const engineModelResult = mapEngineModelTables(db, buckets.engineModel, fileName);
      totals.engineModels += engineModelResult.models;
      totals.edges += engineModelResult.edges;

      const partResult = mapPartTables(db, buckets.part, fileName);
      totals.parts += partResult.parts;

      const sizeClassResult = mapSizeClassTables(db, buckets.sizeClass, fileName);
      totals.sizeClasses += sizeClassResult.classes;

      // Independent side-pass: does not consume from `buckets` / does not
      // affect `skipped` accounting (see module header).
      const attributionResult = linkYachtAttributions(db, tables, fileName);
      totals.designers += attributionResult.designers;
      totals.poweredBy += attributionResult.poweredBy;
      totals.edges += attributionResult.edges;

      // TASK-005 (Wave B): second pass over the SAME file's non-table
      // prose. Independent of the table-routing pass above — proseParser
      // masks out table lines itself, so nothing here is double-extracted.
      const proseSheets = detectProseSheets(fileText);
      const proseResult = mapProseSheets(db, proseSheets, fileName, PROSE_TYPE_HINTS[fileName]);
      totals.marinas += proseResult.marinas;
      totals.clubs += proseResult.clubs;
      totals.persons += proseResult.persons;
      totals.edges += proseResult.edges;
      totals.skippedProseSheets += proseResult.skipped.length;
      skippedProseEntries.push(...proseResult.skipped);

      totals.filesProcessed += 1;
      filesProcessedList.push(fileName);
    }

    const regionResult = linkYachtRegions(db);
    totals.edges += regionResult.edges;

    // TASK-017 retrofit hook (same pattern as linkYachtRegions above): runs
    // once, after every file's engine brand nodes (from either table
    // shape) have been created, so both ends of each documented OEM pair
    // are guaranteed to exist already.
    const oemSuppliesResult = linkEngineOemSupplies(db);
    totals.edges += oemSuppliesResult.edges;

    const skippedProseReportPath = writeSkippedProseReport(skippedProseEntries);

    const nodeCountsByType = db
      .prepare('SELECT type, COUNT(*) AS count FROM nodes GROUP BY type ORDER BY type')
      .all();
    const edgeCountsByRel = db
      .prepare('SELECT rel, COUNT(*) AS count FROM edges GROUP BY rel ORDER BY rel')
      .all();
    const totalNodes = db.prepare('SELECT COUNT(*) AS count FROM nodes').get().count;
    const totalEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    console.log(`[ingest] database: ${dbPath}`);
    console.log(`[ingest] knowledge dir: ${knowledgeDir}`);
    console.log(`[ingest] files processed: ${totals.filesProcessed}, skipped: ${totals.filesSkipped}`);
    console.log(`[ingest] off-schema tables skipped: ${totals.skippedTables}`);
    console.log(`[ingest] skipped prose sheets: ${totals.skippedProseSheets} (see ${skippedProseReportPath})`);
    console.log(`[ingest] nodes: ${totalNodes}`);
    if (nodeCountsByType.length > 0) {
      for (const { type, count } of nodeCountsByType) {
        console.log(`[ingest]   - ${type}: ${count}`);
      }
    }
    console.log(`[ingest] edges: ${totalEdges}`);
    if (edgeCountsByRel.length > 0) {
      for (const { rel, count } of edgeCountsByRel) {
        console.log(`[ingest]   - ${rel}: ${count}`);
      }
    }
    // TASK-006: final export step — writes graph.json (or, past the size
    // threshold, a sharded manifest — see graphExporter.js) plus the
    // human-readable ingestion-summary.md report. Both are pure read-outs
    // of the database populated above; they never mutate it.
    const graphJsonPath = resolveGraphJsonPath();
    const exportResult = exportGraph(db, graphJsonPath);
    const summaryReportPath = writeIngestionSummary(
      {
        db,
        filesProcessed: filesProcessedList,
        filesSkipped: filesSkippedList,
        offSchemaTables: totals.skippedTables,
        skippedProse: totals.skippedProseSheets,
      }
    );

    console.log(
      `[ingest] export: ${exportResult.outPath} (${exportResult.format}, ${exportResult.bytes} bytes) — nodes: ${exportResult.nodeCount}, edges: ${exportResult.edgeCount}`
    );
    console.log(`[ingest] summary report: ${summaryReportPath}`);
    console.log('[ingest] done.');

    return { dbPath, totalNodes, totalEdges, totals, skippedProseReportPath, exportResult, summaryReportPath };
  } finally {
    db.close();
  }
}

// Only auto-run when executed directly (node src/ingest.js), not when
// imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIngest();
}
