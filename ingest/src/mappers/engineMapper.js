// ingest/src/mappers/engineMapper.js
//
// TASK-004: maps parsed engine-manufacturer tier tables into EngineMaker
// nodes (id 'engine:<slug(manufacturer)>'). Real header shape grounded in
// the corpus (file 07, repeated for main/mid-range/entry propulsion tiers
// and again for center-console outboards):
//   Tier | Manufacturer | Parent/Brand | Strengths & Reputation | Best For
//   | Power Range | Notes
//   (a later variant swaps the last column for "Market Position / Notes")
//   -> normalizedHeaders: tier, manufacturer, parent_brand,
//      strengths_reputation, best_for, power_range, notes (or
//      market_position_notes).
//
// No DESIGNED_BY/POWERED_BY edges are created here — none of these tables
// mention a yacht name (they're manufacturer-tier comparisons, not
// per-vessel propulsion records), so there's nothing to attest a link to.
// See ingest.js's linkYachtAttributions() for the (separate, best-effort)
// yacht<->designer/engine attribution hook grounded in the one corpus
// table that *does* pair a yacht name with such a column (file 10's
// "Designers (Ext/Int)" column).
//
// TASK-017 adds a SECOND, independent table shape (knowledge/89, curated
// from research/round1/engine-manufacturers.md's "Manufacturers"
// directory): Brand | Parent Company | Country | Founded | Engine Types |
// Power Range | Notable Models | Segment | Status | Website | Notes. This
// identifies engine BRANDS by a 'brand' column (not 'manufacturer' — the
// two guards below are mutually exclusive and collision-checked against
// every other mapper's guard, see engineMapper.spec.js's guard tests and
// ingest/tests/guardCollisions.spec.js), and upserts into the SAME 'engine'
// node type/id scheme as the table above, so e.g. "MTU" merges into the one
// engine:mtu node whichever table mentions it first. "Country" aliases to
// the canonical 'region' key (tableParser.js's ALIAS_MAP: region:
// ['Region', 'Location', 'Country'] — same collision already documented in
// shipyardMapper.js), so this mapper reads country from row.region.
//
// mapEngineManufacturerTables also creates OWNED_BY edges (brand -> parent
// company, when Parent Company differs from Brand) and, via the separate
// linkEngineOemSupplies() hook (called once from ingest.js after all files
// are processed, mirroring linkYachtRegions()'s pattern), a small, hand-
// grounded set of OEM_SUPPLIES edges for relationships explicitly stated in
// a Notes cell of the Manufacturers table (not parsed from free "History
// highlights" prose — see linkEngineOemSupplies's own comment for the
// grounding of each pair).

import { upsertNode, upsertEdge } from '../db.js';
import {
  isEmptyValue,
  slug,
  normalizeName,
  appendProvenance,
  mergeFirstNonEmptyWins,
  pickFirstPresent,
  isPlausibleEntityName,
} from './normalize.js';

const NAME_KEYS = ['manufacturer'];
const TIER_KEYS = ['tier'];
const PARENT_BRAND_KEYS = ['parent_brand'];
const POWER_RANGE_KEYS = ['power_range'];
const NOTES_KEYS = ['notes', 'market_position_notes'];

// An engine table must have a manufacturer column plus at least one of
// these to be trusted as engine-maker data.
const REQUIRED_ANY_OF = [...TIER_KEYS, ...PARENT_BRAND_KEYS, ...POWER_RANGE_KEYS];

const MERGE_FIELDS = ['tier', 'parent_brand', 'power_range', 'notes'];

function isEngineTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!NAME_KEYS.some((key) => present.has(key))) return false;
  return REQUIRED_ANY_OF.some((key) => present.has(key));
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
 * Maps every engine-maker-shaped table found in `tables` into EngineMaker
 * nodes in `db`, tagging every node with `sourceFile` as provenance.
 * Tables that don't look like engine-maker data are skipped and reported
 * in `skippedTables`.
 *
 * Returns { engines, skippedTables }.
 */
export function mapEngineTables(db, tables, sourceFile) {
  const skippedTables = [];
  let engines = 0;

  tables.forEach((table, index) => {
    if (!isEngineTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw)) continue;

      const engineId = `engine:${slug(normalizeName(nameRaw))}`;
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(engineId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const incoming = {
        tier: pickFirstPresent(row, TIER_KEYS) ?? null,
        parent_brand: pickFirstPresent(row, PARENT_BRAND_KEYS) ?? null,
        power_range: pickFirstPresent(row, POWER_RANGE_KEYS) ?? null,
        notes: pickFirstPresent(row, NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: engineId, type: 'engine', name: finalName, attrs: merged });
      engines += 1;
    }
  });

  return { engines, skippedTables };
}

// --- TASK-017: Manufacturers directory table (knowledge/89) -------------

const MFG_NAME_KEYS = ['brand'];
const MFG_COUNTRY_KEYS = ['region']; // "Country" aliases to 'region' — see module header.
const PARENT_COMPANY_KEYS = ['parent_company'];
const FOUNDED_KEYS = ['founded'];
const ENGINE_TYPES_KEYS = ['engine_types'];
const NOTABLE_MODELS_KEYS = ['notable_models'];
const SEGMENT_KEYS = ['segment'];
const STATUS_KEYS = ['status'];
const WEBSITE_KEYS = ['website'];
const MFG_NOTES_KEYS = ['notes'];

// A table must have the brand identifier column PLUS at least 2 of these
// manufacturer-directory-specific signals to be trusted as this shape (same
// "highly specific" 2-of-N pattern as shipyardMapper.js's guard). None of
// these columns exist on any other mapper's guard — verified in
// engineMapper.spec.js and ingest/tests/guardCollisions.spec.js.
const MFG_SPECIFIC_SIGNAL_KEYS = [...ENGINE_TYPES_KEYS, ...NOTABLE_MODELS_KEYS, ...SEGMENT_KEYS, ...STATUS_KEYS];
const MFG_MIN_SPECIFIC_SIGNALS = 2;

// Superset of both table shapes' fields, so re-ingesting either table after
// the other only ADDS fields (first-non-empty-wins) rather than clobbering
// what the other shape already populated.
const MFG_MERGE_FIELDS = [
  ...MERGE_FIELDS,
  'country',
  'founded',
  'engine_types',
  'notable_models',
  'segment',
  'status',
  'website',
];

export function isEngineManufacturerTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!MFG_NAME_KEYS.some((key) => present.has(key))) return false;

  const signalCount = MFG_SPECIFIC_SIGNAL_KEYS.reduce((count, key) => count + (present.has(key) ? 1 : 0), 0);
  return signalCount >= MFG_MIN_SPECIFIC_SIGNALS;
}

// "New build, Refit" -> ['New build', 'Refit']. Shared shape with
// shipyardMapper.js's splitCommaList (duplicated locally, per this
// codebase's convention of small mapper-local pure helpers rather than a
// shared utils import — see e.g. companyMapper.js's own isEmptyOrNA).
function splitCommaList(raw) {
  if (isEmptyValue(raw)) return null;
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !isEmptyValue(s));
  return parts.length > 0 ? parts : null;
}

// Review-learned defensively (see shipyardMapper.js's isPlausibleOperatorName,
// added after a real review finding): a Parent Company cell that narrates an
// ownership CHANGE in prose, rather than naming the current parent, must not
// mint a junk company node. Same rule: reject a leading "Formerly"/"Sold"/
// "Ceased", or an embedded semicolon.
const PROSE_PARENT_RE = /^(formerly|sold|ceased)\b/i;

function isPlausibleParentName(raw) {
  if (!isPlausibleEntityName(raw)) return false;
  const s = String(raw).trim();
  if (PROSE_PARENT_RE.test(s)) return false;
  if (s.includes(';')) return false;
  return true;
}

/**
 * Resolves a Parent Company cell to an existing Builder/Company node id (by
 * normalized name, same id convention as shipyardMapper.js's
 * resolveOperatorId), minting a minimal Company node if none exists.
 * Returns null when the cell is empty/implausible, OR when it normalizes to
 * the same name as the brand itself (nothing to link — a brand is not its
 * own parent).
 */
function resolveParentCompanyId(db, parentRaw, brandRaw, sourceFile) {
  if (isEmptyValue(parentRaw) || !isPlausibleParentName(parentRaw)) return null;
  if (normalizeName(parentRaw) === normalizeName(brandRaw)) return null;

  const slugged = slug(normalizeName(parentRaw));
  const builderId = `builder:${slugged}`;
  if (nodeExists(db, builderId)) return builderId;

  const companyId = `company:${slugged}`;
  const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(companyId);
  const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};

  const merged = { ...existingAttrs, kind: existingAttrs.kind ?? 'engine parent company' };
  merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

  const finalName = existingRow ? existingRow.name : String(parentRaw).trim();
  upsertNode(db, { id: companyId, type: 'company', name: finalName, attrs: merged });

  return companyId;
}

/**
 * Maps every Manufacturers-directory-shaped table found in `tables` into
 * 'engine' nodes (same id scheme as mapEngineTables — merges into the same
 * node when a brand recurs across both table shapes) plus OWNED_BY edges to
 * a resolved/created parent-company node. Tables that don't look like this
 * shape are skipped and reported in `skippedTables`.
 *
 * Returns { engines, owners, edges, skippedTables }.
 */
export function mapEngineManufacturerTables(db, tables, sourceFile) {
  const skippedTables = [];
  let engines = 0;
  let owners = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isEngineManufacturerTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const brandRaw = pickFirstPresent(row, MFG_NAME_KEYS);
      if (isEmptyValue(brandRaw) || !isPlausibleEntityName(brandRaw)) continue;

      const engineId = `engine:${slug(normalizeName(brandRaw))}`;
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(engineId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const incoming = {
        country: pickFirstPresent(row, MFG_COUNTRY_KEYS) ?? null,
        founded: pickFirstPresent(row, FOUNDED_KEYS) ?? null,
        engine_types: splitCommaList(pickFirstPresent(row, ENGINE_TYPES_KEYS)),
        power_range: pickFirstPresent(row, POWER_RANGE_KEYS) ?? null,
        notable_models: splitCommaList(pickFirstPresent(row, NOTABLE_MODELS_KEYS)),
        segment: pickFirstPresent(row, SEGMENT_KEYS) ?? null,
        status: pickFirstPresent(row, STATUS_KEYS) ?? null,
        website: pickFirstPresent(row, WEBSITE_KEYS) ?? null,
        notes: pickFirstPresent(row, MFG_NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MFG_MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = !isEmptyValue(existingName) ? existingName : String(brandRaw).trim();
      upsertNode(db, { id: engineId, type: 'engine', name: finalName, attrs: merged });
      engines += 1;

      const parentRaw = pickFirstPresent(row, PARENT_COMPANY_KEYS);
      const parentId = resolveParentCompanyId(db, parentRaw, brandRaw, sourceFile);
      if (parentId) {
        upsertEdge(db, { src: engineId, rel: 'owned_by', dst: parentId });
        owners += 1;
        edges += 1;
      }
    }
  });

  return { engines, owners, edges, skippedTables };
}

// --- TASK-017: OEM_SUPPLIES edges (hand-grounded, not prose-parsed) ------
//
// Each pair below is grounded in a STRUCTURED cell (a Notes cell in the
// Manufacturers directory table, knowledge/89) rather than parsed from the
// doc's free "History highlights" prose bullets — see knowledge/89's own
// Curation notes for the exact quoted source cell for each pair. Both
// engine ids must already exist in the graph for an edge to be created
// (missing brands are skipped, not created here — this hook only links
// pre-existing brand nodes).
const OEM_SUPPLIES_PAIRS = [
  // Tohatsu's own Notes cell: "Builds all Mercury/Mariner 4–30 hp
  // four-strokes (M-series) under the 1988 Tohatsu Marine Corp JV ...
  // also supplied Nissan Marine (rebadge) and small Evinrude-branded units
  // 2011+".
  { supplier: 'Tohatsu', recipient: 'Mercury Marine' },
  { supplier: 'Tohatsu', recipient: 'Nissan Marine' },
  { supplier: 'Tohatsu', recipient: 'Evinrude' },
  // John Deere's own Notes cell (knowledge/89: sold under the "John Deere
  // Marine" brand): "some smaller John Deere diesels are Yanmar- or
  // FPT-sourced".
  { supplier: 'Yanmar', recipient: 'John Deere' },
  { supplier: 'FPT Industrial', recipient: 'John Deere' },
];

/**
 * Retrofit hook (mirrors ingest.js's linkYachtRegions pattern): links a
 * small, hand-grounded set of documented OEM relationships between engine
 * brands already in the graph (see OEM_SUPPLIES_PAIRS above). Call once,
 * after all corpus files are processed, so brand nodes from either engine
 * table shape (and from either the file-07 tier table or knowledge/89's
 * directory) have all been created first. Idempotent (upsertEdge no-ops on
 * repeat inserts).
 *
 * Returns { edges }.
 */
export function linkEngineOemSupplies(db) {
  let edges = 0;

  for (const { supplier, recipient } of OEM_SUPPLIES_PAIRS) {
    const supplierId = `engine:${slug(normalizeName(supplier))}`;
    const recipientId = `engine:${slug(normalizeName(recipient))}`;
    if (!nodeExists(db, supplierId) || !nodeExists(db, recipientId)) continue;

    upsertEdge(db, { src: supplierId, rel: 'oem_supplies', dst: recipientId });
    edges += 1;
  }

  return { edges };
}

export { isEngineTable };
