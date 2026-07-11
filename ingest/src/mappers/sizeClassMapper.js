// ingest/src/mappers/sizeClassMapper.js
//
// TASK-017: maps the yacht/superyacht/megayacht/gigayacht classification
// table into `size_class` nodes (id 'size_class:<slug(name)>'). Real header
// shape, curated into knowledge/90 from research/round1/parts-and-classes.md's
// "Size classes" table:
//   Class | Length Threshold | GT Range | Typical Crew | Definition Used By
//   | Example Vessels | Notes
//
// RECORDED PROJECT DECISION: there is no single official legal definition
// for "superyacht"/"megayacht"/"gigayacht" — they are industry/marketing
// labels with genuinely competing conventions (e.g. the megayacht/
// superyacht boundary is cited as both 60m and 80m by different brokers).
// This mapper NEVER parses those cells down to one authoritative number —
// every attr is stored verbatim, so the competing definitions stay visible
// on the node exactly as researched, rather than the mapper silently
// picking one broker's number as "the" threshold. The separate "Regulatory
// thresholds" table (24m load line, 500 GT, 3,000 GT — the only genuinely
// regulatory, non-competing figures) is deliberately left unclaimed as doc
// prose this round (no clean 1:1 row-to-size_class mapping exists for it).

import { upsertNode } from '../db.js';
import { isEmptyValue, slug, normalizeName, appendProvenance, mergeFirstNonEmptyWins, pickFirstPresent, isPlausibleEntityName } from './normalize.js';

const NAME_KEYS = ['class'];
const LENGTH_THRESHOLD_KEYS = ['length_threshold'];
const GT_RANGE_KEYS = ['gt_range'];
const TYPICAL_CREW_KEYS = ['typical_crew'];
const DEFINITION_USED_BY_KEYS = ['definition_used_by'];
const EXAMPLE_VESSELS_KEYS = ['example_vessels'];
const NOTES_KEYS = ['notes'];

// A table must have the class identifier column PLUS length_threshold AND
// gt_range to be trusted as this shape — a 3-key combo unique to this
// table; 'class' is not used by any other mapper's guard (verified in
// ingest/tests/guardCollisions.spec.js), and this specific combination
// deliberately excludes the "Regulatory thresholds" table (which has no
// 'class'/'length_threshold'/'gt_range' columns at all).
function isSizeClassTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!NAME_KEYS.some((key) => present.has(key))) return false;
  return LENGTH_THRESHOLD_KEYS.some((key) => present.has(key)) && GT_RANGE_KEYS.some((key) => present.has(key));
}

const MERGE_FIELDS = ['length_threshold', 'gt_range', 'typical_crew', 'definition_used_by', 'example_vessels', 'notes'];

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * Maps every size-classification-shaped table found in `tables` into
 * `size_class` nodes in `db`, tagging every node with `sourceFile` as
 * provenance. Every attr is stored verbatim (see module header) — no
 * numeric parsing of length/GT thresholds. Tables that don't look like
 * this shape are skipped and reported in `skippedTables`.
 *
 * Returns { classes, skippedTables }.
 */
export function mapSizeClassTables(db, tables, sourceFile) {
  const skippedTables = [];
  let classes = 0;

  tables.forEach((table, index) => {
    if (!isSizeClassTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const classId = `size_class:${slug(normalizeName(nameRaw))}`;
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(classId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const incoming = {
        length_threshold: pickFirstPresent(row, LENGTH_THRESHOLD_KEYS) ?? null,
        gt_range: pickFirstPresent(row, GT_RANGE_KEYS) ?? null,
        typical_crew: pickFirstPresent(row, TYPICAL_CREW_KEYS) ?? null,
        definition_used_by: pickFirstPresent(row, DEFINITION_USED_BY_KEYS) ?? null,
        example_vessels: pickFirstPresent(row, EXAMPLE_VESSELS_KEYS) ?? null,
        notes: pickFirstPresent(row, NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: classId, type: 'size_class', name: finalName, attrs: merged });
      classes += 1;
    }
  });

  return { classes, skippedTables };
}

export { isSizeClassTable };
