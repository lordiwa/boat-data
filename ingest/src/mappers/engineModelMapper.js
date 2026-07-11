// ingest/src/mappers/engineModelMapper.js
//
// TASK-017: maps parsed engine model/series tables into `engine_model`
// nodes (id 'engine_model:<slug(name)>') + MADE_BY edges to the engine
// BRAND node (see engineMapper.js), resolved by normalized brand name and
// created if missing. Real header shape, curated into knowledge/88 from
// research/round1/mercury-offshore-history.md's "Engine models" table:
//   Model/Series | Brand | Years | Type | Power (hp) | Segment | Notes
//
// DEDUP NOTE (see knowledge/88's Curation notes for the full row-by-row
// rationale): the research doc's Brand cells originally read things like
// "Mercury" (bare) or "Mercury (ex-Thor)" — curated to "Mercury Marine" so
// they resolve to the SAME engine node the existing file-07 tier table and
// knowledge/89's manufacturer directory both target, rather than minting a
// second "Mercury" node. Genuinely distinct sub-brands (Mercury Racing,
// MerCruiser, Mercury Zeus, Mercury Avator, Mariner) keep their own clean
// brand names and get their own engine nodes via the "create if missing"
// rule below — this mapper does not force those into the main brand node.

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

const NAME_KEYS = ['model_series'];
const BRAND_KEYS = ['brand'];
const YEARS_KEYS = ['years'];
const TYPE_KEYS = ['type'];
const POWER_HP_KEYS = ['power_hp'];
const SEGMENT_KEYS = ['segment'];
const NOTES_KEYS = ['notes'];

// A table must have both the model identifier AND the brand column, plus
// at least one of years/type, to be trusted as this shape (mirrors
// shipyardMapper.js's "highly specific" 2-signal pattern). 'model_series'
// is not used by any other mapper's guard — verified in
// ingest/tests/guardCollisions.spec.js.
function isEngineModelTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!NAME_KEYS.some((key) => present.has(key))) return false;
  if (!BRAND_KEYS.some((key) => present.has(key))) return false;
  return YEARS_KEYS.some((key) => present.has(key)) || TYPE_KEYS.some((key) => present.has(key));
}

const MERGE_FIELDS = ['brand', 'years', 'type', 'power_hp', 'segment', 'notes'];

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

// Both regexes below require the matched number NOT be directly adjacent
// (immediately before or after, no space needed) to a letter — review fix
// (HIGH): without this, a prose-only cell like "drive only (paired to
// various V8 racing engines)" matched the bare "8" out of "V8" and shipped
// power_hp=8 for a drive that has no rated hp of its own (same failure
// mode as the shipyard Norfolk Naval Shipyard tonnage=8 bug: a digit
// embedded in a word, not a real standalone figure). A genuine number in
// these cells is always its own token (e.g. "1,650 (race fuel)", "20-40",
// "3.5 hp equiv."), never glued to a letter, so this is a safe, narrow
// rejection rule rather than a false-negative risk for real values.
const NUMBER_RE = /(?<![a-zA-Z])(\d+(?:\.\d+)?)(?![a-zA-Z])/;
// Matches a number immediately followed by "hp" ANYWHERE in the cell, e.g.
// the "~3.5 hp equiv." parenthetical on an electric-outboard row.
const HP_IN_TEXT_RE = /(?<![a-zA-Z])(\d+(?:\.\d+)?)\s*hp\b/i;

// "600" -> 600. Strips thousands-separator commas before matching (see
// shipyardMapper.js's parseNumeric — same HIGH-severity lesson: without
// this, "1,650" would silently truncate to 1).
//
// "1,650 (race fuel) / 1,350 (pump fuel)" -> 1650, NOT 1350: this is a
// deliberate decision to take the FIRST-listed figure in a multi-value
// cell, which happens to be the higher/race-fuel rating for these
// dual-calibration entries. The SAME "first-listed" rule applied to a
// low-to-high RANGE cell like "20-40" instead yields the MINIMUM of the
// range (20) — there is no special-casing for which shape a cell is; both
// are simply "the first number found," documented here so a future reader
// doesn't mistake this for always picking the maximum.
//
// "750 W (~3.5 hp equiv.)" -> 3.5, NOT 750: electric-outboard rows quote
// power in WATTS with a separate "X hp equiv." parenthetical — naively
// taking the leading number would store 750 as if it were 750 hp (a
// ~200x-too-high value for what's actually a ~3.5 hp-equivalent motor).
// When the cell contains an explicit "<number> hp" mention anywhere, that
// number wins over any leading non-hp figure (Watts, kW, etc).
function parsePowerHp(raw) {
  if (isEmptyValue(raw)) return null;
  const cleaned = String(raw).replace(/,/g, '');

  const hpMatch = cleaned.match(HP_IN_TEXT_RE);
  if (hpMatch) return parseFloat(hpMatch[1]);

  const m = cleaned.match(NUMBER_RE);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Resolves a Brand cell to an existing 'engine' node id by normalized name,
 * creating a minimal one (name only, no attrs) if it doesn't exist yet —
 * per the ticket: "resolve by normalized name, create brand if missing".
 * Returns null when the cell is empty/implausible.
 */
function resolveBrandId(db, brandRaw, sourceFile) {
  if (isEmptyValue(brandRaw) || !isPlausibleEntityName(brandRaw)) return null;

  const engineId = `engine:${slug(normalizeName(brandRaw))}`;
  if (!nodeExists(db, engineId)) {
    upsertNode(db, { id: engineId, type: 'engine', name: String(brandRaw).trim(), attrs: { provenance: [sourceFile] } });
  }
  return engineId;
}

/**
 * Maps every engine-model-shaped table found in `tables` into engine_model
 * nodes + MADE_BY edges to a resolved/created engine brand node in `db`,
 * tagging every node with `sourceFile` as provenance. Tables that don't
 * look like this shape are skipped and reported in `skippedTables`.
 *
 * Returns { models, edges, skippedTables }.
 */
export function mapEngineModelTables(db, tables, sourceFile) {
  const skippedTables = [];
  let models = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isEngineModelTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const modelId = `engine_model:${slug(normalizeName(nameRaw))}`;
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(modelId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const brandRaw = pickFirstPresent(row, BRAND_KEYS);

      const incoming = {
        brand: brandRaw ?? null,
        years: pickFirstPresent(row, YEARS_KEYS) ?? null,
        type: pickFirstPresent(row, TYPE_KEYS) ?? null,
        power_hp: parsePowerHp(pickFirstPresent(row, POWER_HP_KEYS)),
        segment: pickFirstPresent(row, SEGMENT_KEYS) ?? null,
        notes: pickFirstPresent(row, NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: modelId, type: 'engine_model', name: finalName, attrs: merged });
      models += 1;

      const brandId = resolveBrandId(db, brandRaw, sourceFile);
      if (brandId) {
        upsertEdge(db, { src: modelId, rel: 'made_by', dst: brandId });
        edges += 1;
      }
    }
  });

  return { models, edges, skippedTables };
}

export { isEngineModelTable };
