// ingest/src/mappers/designerMapper.js
//
// TASK-019: maps parsed designer-directory tables (curated from
// research/round2/designer-directory.md into knowledge/92) into 'designer'
// nodes. Real header shape:
//   Designer | Country | City | Founded | Discipline | Notable Yachts |
//   Status | Website | Notes
//
// HEADER-ALIASING NOTE: "Designer" is ALREADY aliased to the canonical
// 'designer' key (tableParser.js's ALIAS_MAP: designer: ['Designer']),
// used elsewhere by ingest.js's linkYachtAttributions() as a VALUE column
// (ATTRIBUTION_DESIGNER_KEYS), not an identifier — that hook requires
// 'name'/'yacht' as its own identifier, so there's no collision between
// this guard (which requires 'designer' as the row IDENTIFIER) and that
// unrelated retrofit pass. "Country" aliases to 'region'.
//
// Enriches the 10 pre-existing (empty-attrs) designer nodes from the
// original corpus (created by linkYachtAttributions from file 10's
// Designers Ext/Int column — their names are preserved VERBATIM in the
// research doc so this mapper resolves onto them by exact name) and
// creates ~50 new ones. Attrs: country, city, founded, discipline (array),
// notable_yachts (array), status, website, provenance.
//
// DESIGNED_BY edges: per the ticket, "no fuzzy guessing" — each Notable
// Yachts entry is resolved against EXISTING yacht nodes by EXACT
// normalized-name equality only (slug(normalizeName(cell)) ===
// slug(normalizeName(existing yacht name)), i.e. same id convention). No
// new yacht node is ever minted from this column, and a non-matching
// entry is silently skipped (not an error — the research doc itself notes
// several Notable Yachts entries won't have a corresponding yacht node in
// this graph). A single yacht legitimately accumulates multiple
// designed_by edges across different designer rows (exterior/interior/
// naval-architecture credits on the same hull — see the research doc's own
// Coverage notes on Vava II/Aquijo/Black Pearl).
//
// GUARD-COLLISION CHECK (see ingest/tests/guardCollisions.spec.js's 12x12
// matrix): requires 'designer' identifier PLUS >=2 of
// discipline/notable_yachts/status — none of these three columns exist
// together on any other mapper's guard, and no other guard uses 'designer'
// as its own identifier column.

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

const NAME_KEYS = ['designer'];
const COUNTRY_KEYS = ['region'];
const CITY_KEYS = ['city'];
const FOUNDED_KEYS = ['founded'];
const DISCIPLINE_KEYS = ['discipline'];
const NOTABLE_YACHTS_KEYS = ['notable_yachts'];
const STATUS_KEYS = ['status'];
const WEBSITE_KEYS = ['website'];
const NOTES_KEYS = ['notes'];

const SPECIFIC_SIGNAL_KEYS = [...DISCIPLINE_KEYS, ...NOTABLE_YACHTS_KEYS, ...STATUS_KEYS];
const MIN_SPECIFIC_SIGNALS = 2;

const MERGE_FIELDS = ['country', 'city', 'founded', 'discipline', 'notable_yachts', 'status', 'website', 'notes'];

function isDesignerTable(table) {
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
 * Resolves a Designer cell to an existing designer node id: EXACT name
 * match (case-insensitive) first, then a normalized-slug-id match, and
 * only failing both does the caller mint a new node at the computed id.
 * Returns { id, isNew }. Same two-tier resolution as
 * builderEnrichmentMapper.js's resolveBuilderId.
 */
function resolveDesignerId(db, nameRaw) {
  const trimmed = String(nameRaw).trim();

  const exact = db
    .prepare("SELECT id FROM nodes WHERE type = 'designer' AND LOWER(name) = LOWER(?)")
    .get(trimmed);
  if (exact) return { id: exact.id, isNew: false };

  const candidateId = `designer:${slug(normalizeName(trimmed))}`;
  if (nodeExists(db, candidateId)) return { id: candidateId, isNew: false };

  return { id: candidateId, isNew: true };
}

/**
 * Resolves each entry of a comma-split Notable Yachts cell against existing
 * yacht nodes by EXACT normalized-name equality (same id convention as
 * every yacht node: yacht:<slug(normalizeName(name))>). Never mints a new
 * yacht node; a non-matching entry is silently skipped. Returns the list of
 * matched yacht ids (0..n).
 */
function resolveNotableYachtIds(db, notableYachtsList) {
  if (!notableYachtsList) return [];
  const ids = [];
  for (const entry of notableYachtsList) {
    const candidateId = `yacht:${slug(normalizeName(entry))}`;
    if (nodeExists(db, candidateId)) ids.push(candidateId);
  }
  return ids;
}

/**
 * Maps every designer-directory-shaped table found in `tables` into
 * 'designer' nodes (enriching the graph's pre-existing empty-attrs designer
 * nodes by exact name, minting new ones for the rest) plus DESIGNED_BY
 * edges to any Notable Yachts entry that resolves to an existing yacht node
 * by exact normalized name. Tables that don't look like this shape are
 * skipped and reported in `skippedTables`.
 *
 * Returns { matched, created, designedByEdges, skippedTables }.
 */
export function mapDesignerTables(db, tables, sourceFile) {
  const skippedTables = [];
  let matched = 0;
  let created = 0;
  let designedByEdges = 0;

  tables.forEach((table, index) => {
    if (!isDesignerTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const { id: designerId, isNew } = resolveDesignerId(db, nameRaw);
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(designerId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const notableYachts = splitCommaList(pickFirstPresent(row, NOTABLE_YACHTS_KEYS));

      const incoming = {
        country: pickFirstPresent(row, COUNTRY_KEYS) ?? null,
        city: pickFirstPresent(row, CITY_KEYS) ?? null,
        founded: pickFirstPresent(row, FOUNDED_KEYS) ?? null,
        discipline: splitCommaList(pickFirstPresent(row, DISCIPLINE_KEYS)),
        notable_yachts: notableYachts,
        status: pickFirstPresent(row, STATUS_KEYS) ?? null,
        website: pickFirstPresent(row, WEBSITE_KEYS) ?? null,
        notes: pickFirstPresent(row, NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);
      stripEmptyAttrs(merged, MERGE_FIELDS);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: designerId, type: 'designer', name: finalName, attrs: merged });
      if (isNew) created += 1;
      else matched += 1;

      const yachtIds = resolveNotableYachtIds(db, notableYachts);
      for (const yachtId of yachtIds) {
        upsertEdge(db, { src: yachtId, rel: 'designed_by', dst: designerId });
        designedByEdges += 1;
      }
    }
  });

  return { matched, created, designedByEdges, skippedTables };
}

export { isDesignerTable };
