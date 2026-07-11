// ingest/src/mappers/builderEnrichmentMapper.js
//
// TASK-019: maps parsed builder-enrichment directory tables (curated from
// research/round2/builder-enrichment.md into knowledge/91) onto EXISTING
// 'builder' nodes in the graph, by exact-then-normalized name. Real header
// shape:
//   Builder | Country | City | Founded | Specialty | Status | Parent
//   Company | Website | Notes
//
// HEADER-ALIASING NOTE (same as shipyardMapper.js): "Builder" is ALREADY
// aliased to the canonical "builder" key, and "Country" is ALREADY aliased
// to "region" (tableParser.js's ALIAS_MAP). No new alias was needed.
//
// UNLIKE every other TASK-004/016/017 entity mapper (which always mints a
// node if none exists), this mapper's whole point is enrichment of the
// pre-existing 186 builder nodes created by yachtMapper.js from the yacht
// corpus's own Builder column — the ticket explicitly expects ~0 new
// builder nodes. Resolution order per row:
//   1. EXACT match on the existing node's `name` field (case-sensitive is
//      too strict for real-world drift, so this compares case-insensitively
//      — see resolveBuilderId below).
//   2. normalized-slug-id match (builder:<slug(normalizeName(name))>).
//   3. only if neither matches: mint a new builder node at that computed id.
// Two research-doc Builder cells (Corsair Marine, Crescent Custom Yachts)
// deliberately fall through to (3) rather than being curated onto a
// same-first-word-but-different-suffix existing node ("Corsair Yachts",
// "Crescent Yachts") whose real-world identity with the research row could
// not be confirmed — see knowledge/91's own Curation notes for the full
// reconciliation of all 21 originally-unmatched research rows.
//
// GUARD-COLLISION CHECK (see ingest/tests/guardCollisions.spec.js's 12x12
// matrix): a table with this exact shape has 'builder' + 'region' present
// (same identifier pair as shipyardMapper's guard) but the highly specific
// 2-of-3 signal set below (specialty/status/parent_company) never overlaps
// with shipyard's own signal set (facility_type/dry_docks/lift_type/
// dock_dimensions) or any other guard's identifier requirement, so no
// collision either direction.
//
// Parent Company -> OWNED_BY edge resolution reuses ALL the discipline
// built in TASK-017's engineMapper.js resolveParentCompanyId (checked
// builder-then-company, prose/ownership-change rejection, self-reference
// skip, dedupe onto an existing node rather than minting a near-duplicate)
// — duplicated locally per this codebase's small-mapper-local-helper
// convention (see engineMapper.js's own module header for why).

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
import { upsertRegion } from './regions.js';

const NAME_KEYS = ['builder'];
const COUNTRY_KEYS = ['region'];
const CITY_KEYS = ['city'];
const FOUNDED_KEYS = ['founded'];
const SPECIALTY_KEYS = ['specialty'];
const STATUS_KEYS = ['status'];
const PARENT_COMPANY_KEYS = ['parent_company'];
const WEBSITE_KEYS = ['website'];
const NOTES_KEYS = ['notes'];

// A table must have the builder identifier column PLUS at least 2 of these
// builder-enrichment-specific signals to be trusted as this shape (same
// "highly specific" 2-of-N pattern as shipyardMapper.js/engineMapper.js's
// manufacturer-directory guard). None of these three columns exist
// together on any other mapper's guard.
const SPECIFIC_SIGNAL_KEYS = [...SPECIALTY_KEYS, ...STATUS_KEYS, ...PARENT_COMPANY_KEYS];
const MIN_SPECIFIC_SIGNALS = 2;

const MERGE_FIELDS = ['country', 'city', 'founded', 'specialty', 'status', 'website', 'notes'];

function isBuilderEnrichmentTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!NAME_KEYS.some((key) => present.has(key))) return false;

  const signalCount = SPECIFIC_SIGNAL_KEYS.reduce((count, key) => count + (present.has(key) ? 1 : 0), 0);
  return signalCount >= MIN_SPECIFIC_SIGNALS;
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

// "custom steel/aluminium megayachts, naval vessels" -> ['custom
// steel/aluminium megayachts', 'naval vessels']. Same shape as
// shipyardMapper.js's/engineMapper.js's own splitCommaList.
function splitCommaList(raw) {
  if (isEmptyValue(raw)) return null;
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !isEmptyValue(s));
  return parts.length > 0 ? parts : null;
}

function stripEmptyAttrs(attrs, fields) {
  for (const field of fields) {
    if (attrs[field] === null || attrs[field] === undefined) delete attrs[field];
  }
}

/**
 * Resolves a Builder cell to an existing builder node id: EXACT name match
 * first (case-insensitive — real-world corpora sometimes differ only by
 * case, e.g. an all-caps node from an earlier ingestion pass), then a
 * normalized-slug-id match, and only failing both does the caller mint a
 * new node at the computed id. Returns { id, isNew }.
 */
function resolveBuilderId(db, nameRaw) {
  const trimmed = String(nameRaw).trim();

  const exact = db
    .prepare("SELECT id FROM nodes WHERE type = 'builder' AND LOWER(name) = LOWER(?)")
    .get(trimmed);
  if (exact) return { id: exact.id, isNew: false };

  const candidateId = `builder:${slug(normalizeName(trimmed))}`;
  if (nodeExists(db, candidateId)) return { id: candidateId, isNew: false };

  return { id: candidateId, isNew: true };
}

// Same defensive guard as engineMapper.js's isPlausibleParentName /
// shipyardMapper.js's isPlausibleOperatorName: a Parent Company cell that
// narrates an ownership CHANGE in prose, rather than naming the current
// parent, must not mint a junk node.
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
 * normalized name — checks builder first, then company, mirroring
 * shipyardMapper.js's resolveOperatorId and engineMapper.js's
 * resolveParentCompanyId), minting a minimal Company node (kind: "builder
 * parent company") if neither exists. Returns null when the cell is empty/
 * implausible, or when it normalizes to the same name as the builder
 * itself (a builder is not its own parent).
 */
function resolveParentCompanyId(db, parentRaw, builderNameRaw, sourceFile) {
  if (isEmptyValue(parentRaw) || !isPlausibleParentName(parentRaw)) return null;
  if (normalizeName(parentRaw) === normalizeName(builderNameRaw)) return null;

  const slugged = slug(normalizeName(parentRaw));
  const builderId = `builder:${slugged}`;
  if (nodeExists(db, builderId)) return builderId;

  const companyId = `company:${slugged}`;
  const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(companyId);
  const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};

  const merged = { ...existingAttrs, kind: existingAttrs.kind ?? 'builder parent company' };
  merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

  const finalName = existingRow ? existingRow.name : String(parentRaw).trim();
  upsertNode(db, { id: companyId, type: 'company', name: finalName, attrs: merged });

  return companyId;
}

/**
 * Maps every builder-enrichment-shaped table found in `tables` onto
 * existing (or, rarely, newly minted) Builder nodes in `db`, plus LOCATED_IN
 * edges (to a Region resolved from City/Country) and OWNED_BY edges (to a
 * resolved/created parent-company node). Tables that don't look like this
 * shape are skipped and reported in `skippedTables`.
 *
 * Returns { matched, created, owners, edges, skippedTables }.
 */
export function mapBuilderEnrichmentTables(db, tables, sourceFile) {
  const skippedTables = [];
  let matched = 0;
  let created = 0;
  let owners = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isBuilderEnrichmentTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const { id: builderId, isNew } = resolveBuilderId(db, nameRaw);
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(builderId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const incoming = {
        country: pickFirstPresent(row, COUNTRY_KEYS) ?? null,
        city: pickFirstPresent(row, CITY_KEYS) ?? null,
        founded: pickFirstPresent(row, FOUNDED_KEYS) ?? null,
        specialty: splitCommaList(pickFirstPresent(row, SPECIALTY_KEYS)),
        status: pickFirstPresent(row, STATUS_KEYS) ?? null,
        website: pickFirstPresent(row, WEBSITE_KEYS) ?? null,
        notes: pickFirstPresent(row, NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);
      stripEmptyAttrs(merged, MERGE_FIELDS);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: builderId, type: 'builder', name: finalName, attrs: merged });
      if (isNew) created += 1;
      else matched += 1;

      const locationRaw = pickFirstPresent(row, CITY_KEYS) ?? pickFirstPresent(row, COUNTRY_KEYS);
      if (!isEmptyValue(locationRaw)) {
        const regionId = upsertRegion(db, locationRaw);
        if (regionId) {
          upsertEdge(db, { src: builderId, rel: 'located_in', dst: regionId });
          edges += 1;
        }
      }

      const parentRaw = pickFirstPresent(row, PARENT_COMPANY_KEYS);
      const parentId = resolveParentCompanyId(db, parentRaw, nameRaw, sourceFile);
      if (parentId) {
        upsertEdge(db, { src: builderId, rel: 'owned_by', dst: parentId });
        owners += 1;
        edges += 1;
      }
    }
  });

  return { matched, created, owners, edges, skippedTables };
}

export { isBuilderEnrichmentTable };
