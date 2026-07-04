// ingest/src/mappers/clubMapper.js
//
// TASK-004: maps parsed yacht-club tables into YachtClub nodes (id
// 'club:<slug(name)>') + LOCATED_IN edges to a canonical Region node (see
// regions.js). Two real header shapes are grounded in the corpus:
//   - file 40 (Japan): Region | Club Name | Location | Founding Year |
//     Website | Key Facilities/Activities
//     -> normalizedHeaders: region, club_name, region_2, founding_year,
//        website, key_facilities_activities (tableParser's ALIAS_MAP
//        aliases BOTH "Region" and "Location" to the same canonical
//        "region" key, so the second column becomes "region_2" — see
//        clubMapper.spec.js for the worked example).
//   - file 33 (Russia): Name | Location | Founding Year |
//     Details/Facilities/History
//     -> normalizedHeaders: name, region, founding_year,
//        details_facilities_history ("Name" is already a canonical yacht
//        alias in tableParser, so it's reused here as-is).
//
// File 33's real table also contains section-header rows folded into the
// SAME pipe table (e.g. "| **Moscow Area (Moskovskaya Oblast and
// Reservoirs)** |", a ragged one-cell row with no separator/repeat header
// of its own) — every other column is blank on those rows, so they're
// filtered out by requiring at least one non-name field to be present
// (see hasAnySignal below), rather than becoming spurious "club" nodes.
//
// REVIEW FIX (HIGH 1): a table shaped like "name + region/founded/website"
// is NOT presumed to be club data any more — that guard alone let two real
// corpus shapes corrupt the graph:
//   - file 40's *separate* port/marina docking-facilities table (Region |
//     Name | Type | Location | Key Facilities/Capacities) has the exact
//     same column shape as the real clubs table above (minus
//     founding_year/website) and its "Type" column literally reads
//     "Port"/"Marina"/"Sea Station"/"Fisherina" — e.g. Muroran Port (a
//     bulk cargo port) was becoming a YachtClub node.
//   - file 34's "Best Yacht Clubs in Turkey" sheet (Name | Type |
//     Location/Region | Website | Description | Facilities |
//     History/Notes) deliberately mixes real yacht clubs ("Yacht Club")
//     with marinas ("Marina with Club Facilities") in one table, by the
//     corpus author's own framing ("I've prioritized entities explicitly
//     named as 'yacht clubs' but included top marinas ... for
//     completeness").
// Fix: when a table has a Type column, classify PER ROW instead of
// trusting the table shape — "club"-typed rows become club nodes here;
// "marina"-typed rows are delegated to marinaMapper's mapMarinaRows() (so
// e.g. "Otaru Port Marina" correctly becomes a Marina node, not a club);
// any other type ("Port", "Sea Station", "Fisherina", "Wet Slips",
// "Ramps", ...) is skipped entirely — a deliberate, documented choice
// (these are general port/dock infrastructure, not yacht clubs or
// yacht-scale marinas, and guessing which bucket they belong in risks
// exactly the corruption this fix addresses; reviewer-approved trade-off).
// For tables with NO Type column and no explicit "Club Name" header, a
// new majority-of-rows-say-"club" heuristic guards against a generic
// name+location+website directory being presumed club data (e.g. file
// 26's Miami docking table, where only 3 of 9 rows are actual "... Yacht
// Club" entries) — such tables are now skipped outright rather than
// guessed at.

import { upsertNode, upsertEdge } from '../db.js';
import {
  isEmptyValue,
  slug,
  normalizeName,
  appendProvenance,
  mergeFirstNonEmptyWins,
  parseHistoricalYear,
  pickFirstPresent,
  isPlausibleEntityName,
} from './normalize.js';
import { upsertRegion } from './regions.js';
import { mapMarinaRows } from './marinaMapper.js';

const NAME_KEYS = ['name', 'club_name'];
const REGION_KEYS = ['region', 'region_2'];
const CITY_KEYS = ['region_2', 'region'];
const FOUNDED_KEYS = ['founded', 'founding_year'];
const WEBSITE_KEYS = ['website'];
const FACILITIES_KEYS = ['key_facilities_activities', 'details_facilities_history', 'facilities'];
const TYPE_KEY = 'type';

// A club table must have a name column plus at least one of these to be
// trusted as club data (mirrors yachtMapper's REQUIRED_ANY_OF guard).
const REQUIRED_ANY_OF = [...REGION_KEYS, ...FOUNDED_KEYS, ...WEBSITE_KEYS];

const MERGE_FIELDS = ['founded', 'website', 'address', 'city', 'facilities'];

// At least half of a table's non-empty name values must contain the word
// "club" for a table with no Type column and no explicit "Club Name"
// header to be presumed club data (see HIGH 1 fix note above).
const MAJORITY_THRESHOLD = 0.5;
const CLUB_WORD_RE = /\bclub\b/i;

function majorityRowsSayClub(table) {
  const nameKey = ['name', 'club_name'].find((key) => table.normalizedHeaders.includes(key));
  if (!nameKey) return false;

  const values = table.rows.map((row) => row[nameKey]).filter((value) => !isEmptyValue(value));
  if (values.length === 0) return false;

  const clubCount = values.filter((value) => CLUB_WORD_RE.test(String(value))).length;
  return clubCount / values.length >= MAJORITY_THRESHOLD;
}

function isClubTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!NAME_KEYS.some((key) => present.has(key))) return false;
  if (!REQUIRED_ANY_OF.some((key) => present.has(key))) return false;

  // Strong, explicit club signal: accept outright.
  if (present.has('club_name')) return true;
  // A Type column means rows are individually classified below — accept
  // the table and let classifyRowType() sort club vs marina vs other.
  if (present.has(TYPE_KEY)) return true;
  // Otherwise (generic "name + region/founded/website" shape): require a
  // majority of row names to actually say "club".
  return majorityRowsSayClub(table);
}

// Classifies a single row's Type-column value (only called when the table
// HAS a Type column — see isClubTable/mapClubTables). "marina" is checked
// before "club" because real fixture values like "Marina with Club
// Facilities" (file 34) contain both words but are marinas, not clubs.
function classifyRowType(typeRaw) {
  if (isEmptyValue(typeRaw)) return 'other';
  const t = String(typeRaw).toLowerCase();
  if (/\bmarina\b/.test(t)) return 'marina';
  if (/\bclub\b/.test(t)) return 'club';
  return 'other';
}

// A row is real club data only if it has a name AND at least one other
// field populated — filters out ragged section-header rows folded into
// the same table (see file 33 fixture note above) without a dedicated
// "is this a section header" heuristic.
function hasAnySignal(row) {
  return (
    !isEmptyValue(pickFirstPresent(row, REGION_KEYS)) ||
    !isEmptyValue(pickFirstPresent(row, FOUNDED_KEYS)) ||
    !isEmptyValue(pickFirstPresent(row, WEBSITE_KEYS)) ||
    !isEmptyValue(pickFirstPresent(row, FACILITIES_KEYS))
  );
}

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function upsertClubRow(db, row, sourceFile) {
  const nameRaw = pickFirstPresent(row, NAME_KEYS);
  // Review fix (MEDIUM 2, generalized): rejects corpus truncation-
  // placeholder rows and other implausible names (see marinaMapper.js).
  if (isEmptyValue(nameRaw) || !hasAnySignal(row) || !isPlausibleEntityName(nameRaw)) {
    return { created: false };
  }

  const clubId = `club:${slug(normalizeName(nameRaw))}`;
  const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(clubId);
  const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
  const existingName = existingRow ? existingRow.name : null;

  const incoming = {
    founded: parseHistoricalYear(pickFirstPresent(row, FOUNDED_KEYS)),
    website: pickFirstPresent(row, WEBSITE_KEYS) ?? null,
    address: null,
    city: pickFirstPresent(row, CITY_KEYS) ?? null,
    facilities: pickFirstPresent(row, FACILITIES_KEYS) ?? null,
  };

  const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
  merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

  const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
  upsertNode(db, { id: clubId, type: 'club', name: finalName, attrs: merged });

  let edgesTouched = 0;
  let regionTouched = false;
  const regionRaw = pickFirstPresent(row, REGION_KEYS);
  if (!isEmptyValue(regionRaw)) {
    const regionId = upsertRegion(db, regionRaw);
    if (regionId) {
      upsertEdge(db, { src: clubId, rel: 'located_in', dst: regionId });
      regionTouched = true;
      edgesTouched += 1;
    }
  }

  return { created: true, regionTouched, edgesTouched };
}

/**
 * Maps every club-shaped table found in `tables` into YachtClub nodes +
 * LOCATED_IN edges to a canonical Region node in `db`, tagging every node
 * with `sourceFile` as provenance. Tables that don't look like club data
 * are skipped and reported in `skippedTables`. When a table has a Type
 * column, rows are classified individually (see classifyRowType): "club"
 * rows become club nodes, "marina" rows are delegated to marinaMapper's
 * mapMarinaRows() (counted in the returned `marinas` field), and any
 * other type is skipped entirely (see HIGH 1 fix note above).
 *
 * Returns { clubs, regions, marinas, edges, skippedTables }.
 */
export function mapClubTables(db, tables, sourceFile) {
  const skippedTables = [];
  let clubs = 0;
  let regions = 0;
  let marinas = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isClubTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    const hasTypeColumn = table.normalizedHeaders.includes(TYPE_KEY);
    const marinaRows = [];

    for (const row of table.rows) {
      if (hasTypeColumn) {
        const rowType = classifyRowType(row[TYPE_KEY]);
        if (rowType === 'marina') {
          marinaRows.push(row);
          continue;
        }
        if (rowType === 'other') {
          continue;
        }
        // rowType === 'club' falls through to normal club processing.
      }

      const result = upsertClubRow(db, row, sourceFile);
      if (result.created) {
        clubs += 1;
        if (result.regionTouched) regions += 1;
        edges += result.edgesTouched;
      }
    }

    if (marinaRows.length > 0) {
      const marinaResult = mapMarinaRows(db, marinaRows, sourceFile);
      marinas += marinaResult.marinas;
      edges += marinaResult.edges;
    }
  });

  return { clubs, regions, marinas, edges, skippedTables };
}

export { isClubTable };
