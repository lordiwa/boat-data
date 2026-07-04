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

import { upsertNode } from '../db.js';
import {
  isEmptyValue,
  slug,
  normalizeName,
  appendProvenance,
  mergeFirstNonEmptyWins,
  pickFirstPresent,
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

export { isEngineTable };
