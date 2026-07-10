// ingest/src/mappers/shipyardMapper.js
//
// TASK-016: maps parsed shipyard/dry-dock directory tables into Shipyard
// nodes (id 'shipyard:<slug(name)>') + LOCATED_IN edges to a canonical
// Region node (see regions.js) + OPERATED_BY edges to a Builder or Company
// node. Grounded in the ticket's exact header spec, now populated by five
// real corpus docs (knowledge/83-87, curated from research/round1's global
// shipyard/dry-dock research lanes in TASK-016 Phase 2):
//   Shipyard | Country | City | Operator | Facility Type | Dry Docks |
//   Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type | Services |
//   Founded | Website | Notes
//
// HEADER-ALIASING NOTE (verified against tableParser.js's ALIAS_MAP before
// writing this guard — see shipyardMapper.spec.js's module header for the
// full worked example): "Shipyard" is ALREADY aliased to the canonical
// "builder" key (used elsewhere for a yacht's builder column: the alias
// group is builder: ['Builder', 'Shipyard', 'Yard']), and "Country" is
// ALREADY aliased to the canonical "region" key (region: ['Region',
// 'Location', 'Country']). Re-aliasing either to a new "shipyard"/"country"
// key would change what EVERY existing yacht/marina/club/company table
// using those exact headers resolves to — forbidden by this ticket's
// ingestion-order-dependent-id invariant. So this mapper deliberately
// reads the 'builder' key as the shipyard's own name and the 'region' key
// as its country text; no new tableParser alias was needed.
//
// GUARD-COLLISION CHECK (see shipyardMapper.spec.js): a table with this
// exact shape has 'builder' + 'region' present but NO 'name'/'club_name'/
// 'facility'/'facility_name'/'yard_name'/'marina_name'/'company_name'/
// 'platform'/'manufacturer' key, so yachtMapper/clubMapper/marinaMapper/
// engineMapper's own name-column guards all fail on it before ever
// reaching their own REQUIRED_ANY_OF checks. companyMapper's guard DOES
// fall back to a bare 'website' column as an identifier, but its
// SECONDARY_ANY_OF list (address/contact/description/locations/
// key_features) is absent from this shape, so it correctly declines too.
// The shipyard guard below is nonetheless placed LAST in ingest.js's
// routing precedence (after yacht/club/marina/company/engine), per the
// ticket, as a defense-in-depth measure against any future corpus header
// drift.

import { upsertNode, upsertEdge } from '../db.js';
import {
  isEmptyValue,
  slug,
  normalizeName,
  appendProvenance,
  mergeFirstNonEmptyWins,
  parseIntSafe,
  pickFirstPresent,
  isPlausibleEntityName,
} from './normalize.js';
import { upsertRegion } from './regions.js';

// 'builder': the "Shipyard" header aliases here (see module header) — this
// is the facility's OWN name, not a yacht's builder reference.
const NAME_KEYS = ['builder'];
// 'region': the "Country" header aliases here (see module header).
const COUNTRY_KEYS = ['region'];
const CITY_KEYS = ['city'];
const OPERATOR_KEYS = ['operator'];
const FACILITY_TYPE_KEYS = ['facility_type'];
const DRY_DOCKS_KEYS = ['dry_docks'];
const MAX_LOA_KEYS = ['max_loa_m'];
const MAX_TONNAGE_KEYS = ['max_tonnage_t'];
const DOCK_DIMENSIONS_KEYS = ['dock_dimensions'];
const LIFT_TYPE_KEYS = ['lift_type'];
const SERVICES_KEYS = ['services'];
const FOUNDED_KEYS = ['founded'];
const WEBSITE_KEYS = ['website'];
const NOTES_KEYS = ['notes'];

// A table must have the shipyard name column PLUS at least 2 of these
// facility-specific signals to be trusted as shipyard data (per the
// ticket: "Make the shipyard guard highly specific"). None of these
// columns exist on any yacht/club/marina/company/engine table in the real
// corpus, so this combination cannot collide with an existing guard.
const SPECIFIC_SIGNAL_KEYS = [...FACILITY_TYPE_KEYS, ...DRY_DOCKS_KEYS, ...LIFT_TYPE_KEYS, ...DOCK_DIMENSIONS_KEYS];
const MIN_SPECIFIC_SIGNALS = 2;

const MERGE_FIELDS = [
  'country',
  'city',
  'facility_type',
  'dry_docks',
  'max_loa',
  'max_tonnage',
  'dock_dimensions',
  'lift_type',
  'services',
  'founded',
  'website',
  'notes',
];

function isShipyardTable(table) {
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

const NUMBER_RE = /(\d+(?:\.\d+)?)/;

// "160m", "160", "160 m", "400,000", "93,500" -> 160 / 400000 / 93500. Strips
// thousands-separator commas BEFORE matching (review fix, HIGH: without this,
// "400,000".match(NUMBER_RE) matches just "400", silently truncating every
// comma-formatted tonnage cell in the corpus — e.g. Fincantieri Palermo's
// 400,000t read back as 400t, Skaramangas's 500,000t as 500t, Hanwha Ocean's
// 1,000,000t as 1t). normalize.js's own parseLength/parseMoney already strip
// commas first for the same reason; mirrored here rather than importing
// those (they parse different cell shapes — this needs a plain float, not a
// meters/money object).
function parseNumeric(raw) {
  if (isEmptyValue(raw)) return null;
  const cleaned = String(raw).replace(/,/g, '');
  const m = cleaned.match(NUMBER_RE);
  return m ? parseFloat(m[1]) : null;
}

// "New build, Refit, Sea trials" -> ['New build', 'Refit', 'Sea trials'].
// Returns null (not []) for empty input, consistent with every other
// omitted-when-empty attr below.
function splitCommaList(raw) {
  if (isEmptyValue(raw)) return null;
  const parts = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => !isEmptyValue(s));
  return parts.length > 0 ? parts : null;
}

// Per the ticket ("Empty cells -> attr omitted"): deletes any MERGE_FIELDS
// key whose value is null/undefined from `attrs` in place, so an empty
// cell never persists as a bogus `null` (or placeholder-text) attribute on
// the node — it's simply absent, exactly as if the column didn't exist for
// that row.
function stripEmptyAttrs(attrs, fields) {
  for (const field of fields) {
    if (attrs[field] === null || attrs[field] === undefined) delete attrs[field];
  }
}

// Review fix (MEDIUM 1): an Operator cell is sometimes researcher prose
// narrating an ownership CHANGE rather than naming the current operator
// (real fixtures: "Formerly Lürssen/NVL; sold to Rheinmetall in 2025" and
// "Sold by The Italian Sea Group to Next Yacht Group in 2024") — matching
// isPlausibleEntityName alone (normalize.js) doesn't reject these (they're
// short, no sentence-ending "[.!?] " run), so they minted junk company
// nodes (e.g. "company:formerly-lurssen-nvl-sold-to-rheinmetall-in-2025").
// A real operator name doesn't open with a history-narrating verb or
// contain a semicolon (a strong signal of multi-clause "X; now Y" prose) —
// reject rather than mint a node from it. The curation-side fix (rewriting
// those two Operator cells to the actual current operator, with the
// ownership history moved to Notes) is the primary fix; this is defense in
// depth for any future corpus row shaped the same way.
const PROSE_OPERATOR_RE = /^(formerly|sold|ceased)\b/i;

function isPlausibleOperatorName(raw) {
  if (!isPlausibleEntityName(raw)) return false;
  const s = String(raw).trim();
  if (PROSE_OPERATOR_RE.test(s)) return false;
  if (s.includes(';')) return false;
  return true;
}

/**
 * Resolves an Operator cell to an existing Builder or Company node id by
 * normalized name (same id convention as yachtMapper's builder ids and
 * companyMapper's company ids: `<type>:<slug(normalizeName(name))>`).
 * Checks builder first (a shipyard's operator is very often the same
 * entity as a yacht builder already in the graph, e.g. Feadship operating
 * its own Aalsmeer yard), then an existing company. If neither exists,
 * mints a minimal Company node (kind: 'shipyard operator') so the
 * OPERATED_BY edge always resolves to a real node rather than dangling.
 * Returns the resolved/created node id, or null if the Operator cell is
 * empty/implausible (see isPlausibleOperatorName).
 */
function resolveOperatorId(db, operatorRaw, sourceFile) {
  if (isEmptyValue(operatorRaw) || !isPlausibleOperatorName(operatorRaw)) return null;

  const slugged = slug(normalizeName(operatorRaw));
  const builderId = `builder:${slugged}`;
  if (nodeExists(db, builderId)) return builderId;

  const companyId = `company:${slugged}`;
  const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(companyId);
  const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};

  const merged = { ...existingAttrs, kind: existingAttrs.kind ?? 'shipyard operator' };
  merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

  const finalName = existingRow ? existingRow.name : String(operatorRaw).trim();
  upsertNode(db, { id: companyId, type: 'company', name: finalName, attrs: merged });

  return companyId;
}

/**
 * Maps every shipyard-shaped table found in `tables` into Shipyard nodes +
 * LOCATED_IN edges (to a canonical Region node, resolved from City,
 * falling back to Country when City is empty) + OPERATED_BY edges (to a
 * Builder/Company node, see resolveOperatorId) in `db`, tagging every node
 * with `sourceFile` as provenance. Tables that don't look like shipyard
 * data are skipped and reported in `skippedTables`.
 *
 * Returns { shipyards, regions, operators, edges, skippedTables }.
 */
export function mapShipyardTables(db, tables, sourceFile) {
  const skippedTables = [];
  let shipyards = 0;
  let regions = 0;
  let operators = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isShipyardTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const shipyardId = `shipyard:${slug(normalizeName(nameRaw))}`;
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(shipyardId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const incoming = {
        country: pickFirstPresent(row, COUNTRY_KEYS) ?? null,
        city: pickFirstPresent(row, CITY_KEYS) ?? null,
        facility_type: pickFirstPresent(row, FACILITY_TYPE_KEYS) ?? null,
        dry_docks: parseIntSafe(pickFirstPresent(row, DRY_DOCKS_KEYS)),
        max_loa: parseNumeric(pickFirstPresent(row, MAX_LOA_KEYS)),
        max_tonnage: parseNumeric(pickFirstPresent(row, MAX_TONNAGE_KEYS)),
        dock_dimensions: pickFirstPresent(row, DOCK_DIMENSIONS_KEYS) ?? null,
        lift_type: splitCommaList(pickFirstPresent(row, LIFT_TYPE_KEYS)),
        services: splitCommaList(pickFirstPresent(row, SERVICES_KEYS)),
        founded: pickFirstPresent(row, FOUNDED_KEYS) ?? null,
        website: pickFirstPresent(row, WEBSITE_KEYS) ?? null,
        notes: pickFirstPresent(row, NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);
      stripEmptyAttrs(merged, MERGE_FIELDS);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: shipyardId, type: 'shipyard', name: finalName, attrs: merged });
      shipyards += 1;

      const locationRaw = pickFirstPresent(row, CITY_KEYS) ?? pickFirstPresent(row, COUNTRY_KEYS);
      if (!isEmptyValue(locationRaw)) {
        const regionId = upsertRegion(db, locationRaw);
        if (regionId) {
          upsertEdge(db, { src: shipyardId, rel: 'located_in', dst: regionId });
          regions += 1;
          edges += 1;
        }
      }

      const operatorRaw = pickFirstPresent(row, OPERATOR_KEYS);
      const operatorId = resolveOperatorId(db, operatorRaw, sourceFile);
      if (operatorId) {
        upsertEdge(db, { src: shipyardId, rel: 'operated_by', dst: operatorId });
        operators += 1;
        edges += 1;
      }
    }
  });

  return { shipyards, regions, operators, edges, skippedTables };
}

export { isShipyardTable };
