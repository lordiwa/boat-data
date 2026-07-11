// ingest/src/mappers/personMapper.js
//
// TASK-021: maps parsed person-enrichment tables (curated from
// research/round4/person-enrichment.md into knowledge/95) onto EXISTING
// 'person' nodes, by EXACT name only. Real header shape:
//   Person | Nationality | Industry | Role/Title | Status | Ownership
//   Confidence | Notes
//
// "Person" is a bare header — not aliased to any other mapper's identifier
// — so this guard's identifier ('person') is distinct from every other
// mapper's own ('builder', 'designer', 'marina', 'yacht', ...).
//
// Like yachtSpecMapper.js and marinaMapper.js's design conventions before
// it, this mapper NEVER mints a new person node — a row whose Person cell
// doesn't exact-match an existing node is counted `unresolved` and its
// name reported, never created.
//
// OWNERSHIP CONFIDENCE placement (per the ticket): the tier (confirmed /
// widely reported / rumored / unconfirmed / disputed / contradicted) is
// stored on the person's EXISTING owned_by EDGE(S) (yacht -> person), not
// as a person-node attr — edges already support attrs_json for exactly
// this per-relationship metadata (see db.js's upsertEdge). A person with
// multiple owned_by edges (e.g. someone linked to two yachts) gets the
// SAME row-level confidence tier applied to every one of their existing
// edges; per-yacht confidence nuance (e.g. "Confirmed (Nord not seized) /
// Confirmed (Lady M seized)") stays in the person node's own `notes` attr
// verbatim rather than being split apart, since this table is one row per
// PERSON, not one row per (person, yacht) pair.

import { upsertNode, upsertEdge } from '../db.js';
import { isEmptyValue, appendProvenance, pickFirstPresent, isPlausibleEntityName } from './normalize.js';

const NAME_KEYS = ['person'];
const NATIONALITY_KEYS = ['nationality'];
const INDUSTRY_KEYS = ['industry'];
const ROLE_KEYS = ['role_title'];
const STATUS_KEYS = ['status'];
const OWNERSHIP_CONFIDENCE_KEYS = ['ownership_confidence'];
const NOTES_KEYS = ['notes'];

// A table must have the person identifier column PLUS at least 2 of these
// person-enrichment-specific signals to be trusted as this shape (same
// "highly specific" 2-of-N pattern as every other enrichment guard).
const SPECIFIC_SIGNAL_KEYS = [...NATIONALITY_KEYS, ...INDUSTRY_KEYS, ...ROLE_KEYS];
const MIN_SPECIFIC_SIGNALS = 2;

function isPersonEnrichmentTable(table) {
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

// Placeholder-ish cell text this research pass uses for non-individual
// rows ("— not an individual —", "— duplicate node —", etc) — not one of
// normalize.js's own isEmptyValue() patterns (those are plain "no data"
// markers, not this doc's specific dash-wrapped commentary shape), so a
// small local addition, mirroring companyMapper.js's own isEmptyOrNA
// convention of a mapper-local emptiness check rather than editing the
// shared helper.
const DASH_COMMENTARY_RE = /^—.*—$/;

function isUsableCellValue(raw) {
  if (isEmptyValue(raw)) return false;
  return !DASH_COMMENTARY_RE.test(String(raw).trim());
}

// Normalizes the free-text Ownership Confidence cell into one of a small
// set of canonical tiers, matched case-insensitively against the whole
// cell (order matters: "unconfirmed"/"widely reported" must be checked
// BEFORE a bare "confirmed" substring match, since "unconfirmed" itself
// contains "confirmed"). Returns null for "N/A"/empty cells (no ownership
// claim at all to attach a tier to).
const CONFIDENCE_TIERS = [
  ['unconfirmed', 'unconfirmed'],
  ['contradicted', 'contradicted'],
  ['disputed', 'disputed'],
  ['rumored', 'rumored'],
  ['widely reported', 'widely reported'],
  ['confirmed', 'confirmed'],
];

function canonicalConfidenceTier(raw) {
  if (isEmptyValue(raw)) return null;
  const s = String(raw).toLowerCase();
  for (const [needle, tier] of CONFIDENCE_TIERS) {
    if (s.includes(needle)) return tier;
  }
  return null;
}

/**
 * Maps every person-enrichment-shaped table found in `tables` onto
 * EXISTING person nodes in `db` (never minting one), recording
 * nationality/industry/role/status/provenance on the node and a
 * canonical ownership_confidence tier on every one of that person's
 * existing owned_by edges. Tables that don't look like this shape are
 * skipped and reported in `skippedTables`.
 *
 * Returns { matched, unresolved, unresolvedNames, edgesTagged, skippedTables }.
 */
export function mapPersonEnrichmentTables(db, tables, sourceFile) {
  const skippedTables = [];
  let matched = 0;
  let unresolved = 0;
  let edgesTagged = 0;
  const unresolvedNames = [];

  tables.forEach((table, index) => {
    if (!isPersonEnrichmentTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const trimmed = String(nameRaw).trim();
      const existingRow = db.prepare("SELECT id, name, attrs_json FROM nodes WHERE type = 'person' AND name = ?").get(trimmed);
      if (!existingRow) {
        unresolved += 1;
        unresolvedNames.push(trimmed);
        continue;
      }

      const personId = existingRow.id;
      const existingAttrs = parseAttrsJson(existingRow.attrs_json);
      const merged = { ...existingAttrs };

      const nationalityRaw = pickFirstPresent(row, NATIONALITY_KEYS);
      if (isUsableCellValue(nationalityRaw)) merged.nationality = merged.nationality ?? String(nationalityRaw).trim();

      const industryRaw = pickFirstPresent(row, INDUSTRY_KEYS);
      if (isUsableCellValue(industryRaw)) merged.industry = merged.industry ?? String(industryRaw).trim();

      const roleRaw = pickFirstPresent(row, ROLE_KEYS);
      if (isUsableCellValue(roleRaw)) merged.role = merged.role ?? String(roleRaw).trim();

      const statusRaw = pickFirstPresent(row, STATUS_KEYS);
      if (isUsableCellValue(statusRaw)) merged.status = merged.status ?? String(statusRaw).trim();

      const notesRaw = pickFirstPresent(row, NOTES_KEYS);
      if (isUsableCellValue(notesRaw)) merged.notes = merged.notes ?? String(notesRaw).trim();

      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      upsertNode(db, { id: personId, type: 'person', name: existingRow.name, attrs: merged });
      matched += 1;

      const confidenceTier = canonicalConfidenceTier(pickFirstPresent(row, OWNERSHIP_CONFIDENCE_KEYS));
      if (confidenceTier) {
        const ownedByEdges = db.prepare("SELECT src FROM edges WHERE dst = ? AND rel = 'owned_by'").all(personId);
        for (const { src: yachtId } of ownedByEdges) {
          upsertEdge(db, { src: yachtId, rel: 'owned_by', dst: personId, attrs: { ownership_confidence: confidenceTier } });
          edgesTagged += 1;
        }
      }
    }
  });

  return { matched, unresolved, unresolvedNames, edgesTagged, skippedTables };
}

export { isPersonEnrichmentTable };
