// ingest/src/mappers/builderEnrichmentRound8Mapper.js
//
// TASK-026 (Round 8): maps knowledge/99_Global_Builder_Enrichment_Round8.md's
// builder-enrichment table onto EXISTING 'builder' nodes ONLY — never mints
// (unlike builderEnrichmentMapper.js's Round-2 predecessor, which mints a
// couple of new nodes on an unmatched row). knowledge/99's own header note
// says every row "was mechanically verified against ingest/data/graph.json
// before curation: all join keys match a real builder node's name AND id
// verbatim" — an unresolved row here is a curation-process regression to
// count, not a legitimate new builder to create.
//
// TABLE SHAPE: | Builder | Country | Founded | Website | Specialty | Notes |
// "Builder" aliases to 'builder' (tableParser's ALIAS_MAP — same identifier
// key shipyardMapper.js/builderEnrichmentMapper.js also read from) and
// "Country" aliases to 'region' (same as builderEnrichmentMapper.js).
// Founded/Website/Specialty/Notes are NOT aliased, so normalizedHeaders is
// ['builder', 'region', 'founded', 'website', 'specialty', 'notes'] — a
// narrower 6-column shape than Round 2's 9-column table (which also carries
// City/Status/Parent Company). The guard below requires 'founded' AND
// 'website' AND 'specialty' ALL present (Round 2's own guard only requires
// 2-of-3 of a DIFFERENT signal set: specialty/status/parent_company) AND
// requires 'status'/'parent_company'/'city' ALL absent, so a real Round-2-
// shaped table (which also has founded+website+specialty) is never claimed
// here — ingest.js's routeTables keeps Round 2's own guard earlier in
// precedence, so it claims that shape first (see
// ingest/tests/guardCollisions.spec.js's matrix, extended by this ticket).
//
// RESOLUTION: the same two-tier "exact case-insensitive name match, else
// normalized-slug-id match" as builderEnrichmentMapper.js's own
// resolveBuilderId — reused (not re-invented) per this round's own
// instruction to follow the established resolution pattern, minus the
// "mint if neither matches" third tier this round explicitly forbids.
//
// PLACEHOLDER EXCLUSION (AC2): keyed on the EXISTING node's
// attrs.placeholder === true, NOT a name pattern — checked after
// resolution, before any write, so it stays correct even if a future round
// adds a 6th placeholder node graphCleanup.js flags with a name that
// doesn't match "custom/various/mixed/motorsailer" (see
// ingest/tests/builderEnrichmentRound8Mapper.spec.js's dedicated proof: a
// node named "Absolute" but flagged attrs.placeholder === true is still
// skipped).
//
// CONFLICT MARKERS (knowledge/99 curation rule 4): the Notes column embeds
// a `[conflict: ...]` bracketed marker inline (e.g. Cassens-Werft's
// "[conflict: 1875 traditional founding ... vs 2004 'inception date' ...]")
// — a different shape from yachtSpecMapper.js's own per-field trailing
// "<primary> [conflict: <alt>]" suffix convention. Every real occurrence in
// this round's curated data is about the same field, `founded`
// (Cassens-Werft, Mondomarine, Neel, Oceanfast), so the extracted text is
// routed to attrs.conflicts.founded (an array, the same shape every other
// mapper's attrs.conflicts[field] already uses). The full Notes cell
// (marker included) is ALSO kept verbatim in attrs.notes — duplicate-pair /
// misattribution-risk markers ("[note: ...]", "[SUSPECTED DUPLICATE ...]")
// are informational only (curation rule 6: never merge here) and are not
// separately structured beyond being preserved in that verbatim text.
//
// FOUNDED: parsed via normalize.js's parseFoundedYear (bare 4-digit year,
// range-locked, rejects comma/letter-adjacency artifacts and "c."/range-
// marker estimates) — see that function's own header for the full
// recurring-bug citation.

import { upsertNode } from '../db.js';
import { isEmptyValue, slug, normalizeName, appendProvenance, pickFirstPresent, parseFoundedYear } from './normalize.js';

const NAME_KEYS = ['builder'];
const COUNTRY_KEYS = ['region'];
const FOUNDED_KEYS = ['founded'];
const WEBSITE_KEYS = ['website'];
const SPECIALTY_KEYS = ['specialty'];
const NOTES_KEYS = ['notes'];

// Round 8's shape is a strict subset+complement of Round 2's own builder-
// enrichment table (see module header): all three REQUIRED_PRESENT columns
// AND none of MUST_BE_ABSENT, so the two guards never both claim the same
// real-corpus table.
const REQUIRED_PRESENT = [...FOUNDED_KEYS, ...WEBSITE_KEYS, ...SPECIALTY_KEYS];
const MUST_BE_ABSENT = ['status', 'parent_company', 'city'];

function isBuilderEnrichmentRound8Table(table) {
  const present = new Set(table.normalizedHeaders);
  if (!NAME_KEYS.some((key) => present.has(key))) return false;
  if (!REQUIRED_PRESENT.every((key) => present.has(key))) return false;
  if (MUST_BE_ABSENT.some((key) => present.has(key))) return false;
  return true;
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

// Same two-tier resolution as builderEnrichmentMapper.js's resolveBuilderId,
// minus the "mint if neither matches" third tier this round forbids.
// Returns the existing node's id, or null.
function resolveExistingBuilderId(db, nameRaw) {
  const trimmed = String(nameRaw).trim();

  const exact = db
    .prepare("SELECT id FROM nodes WHERE type = 'builder' AND LOWER(name) = LOWER(?)")
    .get(trimmed);
  if (exact) return exact.id;

  const candidateId = `builder:${slug(normalizeName(trimmed))}`;
  if (nodeExists(db, candidateId)) return candidateId;

  return null;
}

function isPlaceholderNode(attrs) {
  return Boolean(attrs && attrs.placeholder === true);
}

// "flybridge/coupé/navetta motor yachts; composite construction" ->
// ['flybridge/coupé/navetta motor yachts', 'composite construction'].
// knowledge/99's Specialty cells favor ';' over Round 2's ',' as the
// clause separator (its clauses often already contain an internal '/'
// construction-material list) — splits on EITHER, so a cell using either
// convention still tokenizes into the same array-of-strings shape every
// other builder node's attrs.specialty already carries (see
// builderEnrichmentMapper.js's own splitCommaList).
function splitSpecialty(raw) {
  if (isEmptyValue(raw)) return null;
  const parts = String(raw)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => !isEmptyValue(s));
  return parts.length > 0 ? parts : null;
}

// knowledge/99's Notes column embeds a `[conflict: ...]` bracketed marker
// (see module header) — global match extracts every occurrence's inner
// text (never more than one per row in this round's real data, but a
// future round with two wouldn't silently lose the second).
const CONFLICT_MARKER_RE = /\[conflict:\s*([^\]]+)\]/gi;

function extractConflictMarkers(notesRaw) {
  if (isEmptyValue(notesRaw)) return [];
  const s = String(notesRaw);
  const found = [];
  for (const m of s.matchAll(CONFLICT_MARKER_RE)) {
    found.push(m[1].trim());
  }
  return found;
}

/**
 * Maps every Round-8-shaped builder-enrichment table found in `tables` onto
 * EXISTING builder nodes in `db` — NEVER mints, NEVER touches a
 * placeholder-flagged node (attrs.placeholder === true), NEVER overwrites
 * an already-populated field (first-non-empty-wins, same discipline as
 * every other enrichment mapper in this codebase). Tables that don't look
 * like this exact shape are skipped and reported in `skippedTables`.
 *
 * Returns { matched, unresolved, placeholderSkipped, skippedTables }.
 */
export function mapBuilderEnrichmentRound8Tables(db, tables, sourceFile) {
  const skippedTables = [];
  let matched = 0;
  let unresolved = 0;
  let placeholderSkipped = 0;

  tables.forEach((table, index) => {
    if (!isBuilderEnrichmentRound8Table(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      // Deliberately does NOT gate on normalize.js's shared
      // isPlausibleEntityName() (unlike every minting mapper) — that
      // heuristic exists to stop a "sentence-shaped" identifier cell from
      // minting a junk node, but this mapper NEVER mints, and every real
      // name here must ALREADY match an existing builder node exactly (see
      // resolveExistingBuilderId below) before anything is written. Applying
      // it anyway produced a real false positive: "Scheepswerf Gebr. van der
      // Werf" trips isPlausibleEntityName's mid-string ". " sentence-
      // punctuation check (the "Gebr." abbreviation), silently dropping an
      // otherwise perfectly resolvable, curated row.
      if (isEmptyValue(nameRaw)) continue;

      const builderId = resolveExistingBuilderId(db, nameRaw);
      if (!builderId) {
        unresolved += 1;
        continue;
      }

      const existingRow = db.prepare('SELECT name, type, attrs_json FROM nodes WHERE id = ?').get(builderId);
      const existingAttrs = parseAttrsJson(existingRow.attrs_json);

      if (isPlaceholderNode(existingAttrs)) {
        placeholderSkipped += 1;
        continue;
      }

      const merged = { ...existingAttrs };
      const conflicts = { ...(existingAttrs.conflicts || {}) };

      const countryRaw = pickFirstPresent(row, COUNTRY_KEYS);
      if (!isEmptyValue(countryRaw) && isEmptyValue(existingAttrs.country)) {
        merged.country = String(countryRaw).trim();
      }

      const websiteRaw = pickFirstPresent(row, WEBSITE_KEYS);
      if (!isEmptyValue(websiteRaw) && isEmptyValue(existingAttrs.website)) {
        merged.website = String(websiteRaw).trim();
      }

      if (isEmptyValue(existingAttrs.specialty)) {
        const specialty = splitSpecialty(pickFirstPresent(row, SPECIALTY_KEYS));
        if (specialty) merged.specialty = specialty;
      }

      if (isEmptyValue(existingAttrs.founded)) {
        const foundedYear = parseFoundedYear(pickFirstPresent(row, FOUNDED_KEYS));
        if (foundedYear !== null) merged.founded = foundedYear;
      }

      const notesRaw = pickFirstPresent(row, NOTES_KEYS);
      if (!isEmptyValue(notesRaw) && isEmptyValue(existingAttrs.notes)) {
        merged.notes = String(notesRaw).trim();
      }

      for (const conflictText of extractConflictMarkers(notesRaw)) {
        const existingList = conflicts.founded || [];
        conflicts.founded = existingList.includes(conflictText) ? existingList : [...existingList, conflictText];
      }
      if (Object.keys(conflicts).length > 0) merged.conflicts = conflicts;

      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      upsertNode(db, { id: builderId, type: existingRow.type, name: existingRow.name, attrs: merged });
      matched += 1;
    }
  });

  return { matched, unresolved, placeholderSkipped, skippedTables };
}

export { isBuilderEnrichmentRound8Table };
