// ingest/src/mappers/partMapper.js
//
// TASK-017: maps parsed boat/yacht parts-anatomy tables into `part` nodes
// (id 'part:<slug(name)>'). Real header shape, curated into knowledge/90
// from research/round1/parts-and-classes.md's "Parts" table:
//   Part | Category | Location | Description | Applies To
//
// HEADER-ALIASING NOTE (same pattern as shipyardMapper.js's Country/City
// collision): "Location" is ALREADY aliased to the canonical 'region' key
// in tableParser.js's ALIAS_MAP (region: ['Region', 'Location', 'Country']
// — used elsewhere for a free-text location cell on yacht/marina/club
// tables). This mapper deliberately reads the 'region' key as the part's
// on-vessel location text (NOT a geographic region — no LOCATED_IN edge is
// created here, since a part's "location" is "forward-most point of the
// hull," not a place on Earth). No new tableParser alias was needed.
//
// No edges are created by this mapper (parts are reference/glossary data,
// not linked to specific yacht instances in this round).

import { upsertNode } from '../db.js';
import { isEmptyValue, slug, normalizeName, appendProvenance, mergeFirstNonEmptyWins, pickFirstPresent, isPlausibleEntityName } from './normalize.js';

const NAME_KEYS = ['part'];
const CATEGORY_KEYS = ['category'];
// 'region': the "Location" header aliases here (see module header).
const LOCATION_KEYS = ['region'];
const DESCRIPTION_KEYS = ['description'];
const APPLIES_TO_KEYS = ['applies_to'];

// A table must have the part name column PLUS at least 2 of these
// part-specific signals to be trusted as this shape (mirrors
// shipyardMapper.js's "highly specific" 2-of-N pattern). None of these
// columns exist on any other mapper's guard — verified in
// ingest/tests/guardCollisions.spec.js.
const SPECIFIC_SIGNAL_KEYS = [...CATEGORY_KEYS, ...APPLIES_TO_KEYS];
const MIN_SPECIFIC_SIGNALS = 2;

const MERGE_FIELDS = ['category', 'location', 'description', 'applies_to'];

function isPartTable(table) {
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

// "powerboat, sailing yacht" -> ['powerboat', 'sailing yacht']; "all" ->
// ['all']. Returns null (not []) for empty input.
function splitCommaList(raw) {
  if (isEmptyValue(raw)) return null;
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !isEmptyValue(s));
  return parts.length > 0 ? parts : null;
}

/**
 * Maps every parts-anatomy-shaped table found in `tables` into `part` nodes
 * in `db`, tagging every node with `sourceFile` as provenance. Tables that
 * don't look like this shape are skipped and reported in `skippedTables`.
 *
 * Returns { parts, skippedTables }.
 */
export function mapPartTables(db, tables, sourceFile) {
  const skippedTables = [];
  let parts = 0;

  tables.forEach((table, index) => {
    if (!isPartTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const partId = `part:${slug(normalizeName(nameRaw))}`;
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(partId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const incoming = {
        category: pickFirstPresent(row, CATEGORY_KEYS) ?? null,
        location: pickFirstPresent(row, LOCATION_KEYS) ?? null,
        description: pickFirstPresent(row, DESCRIPTION_KEYS) ?? null,
        applies_to: splitCommaList(pickFirstPresent(row, APPLIES_TO_KEYS)),
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: partId, type: 'part', name: finalName, attrs: merged });
      parts += 1;
    }
  });

  return { parts, skippedTables };
}

export { isPartTable };
