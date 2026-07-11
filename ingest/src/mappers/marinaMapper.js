// ingest/src/mappers/marinaMapper.js
//
// TASK-004: maps parsed haul-out marina/shipyard tables into Marina nodes
// (id 'marina:<slug(name)>') + LOCATED_IN edges to a canonical Region node
// (see regions.js). Real header shapes grounded in the corpus:
//   - file 16 (USA Superyacht Haul-Out Yards), repeated per-state tables:
//     Facility | Location | Lift Capacity | Max LOA/Beam | Marina
//     Integration | Key Services | SSG Listed?
//     -> normalizedHeaders: facility, region, lift_capacity, max_loa_beam,
//        marina_integration, key_services, ssg_listed ("Location" is
//        aliased to the canonical "region" key by tableParser).
//     A header variant later in the same file swaps the last two columns
//     for "Notes / History Tie | Biggest?" — the schema guard below
//     accepts either shape via an ANY-OF check, not an exact header match.
//   - file 17 (Oldest Real-Deal Yacht Haul-Out Marinas), the Venice
//     "Google Sheet style" tables:
//     Yard Name | Type | Location (Venice) | Haul-Out / Capacity |
//     Services | Contact / Notes | Primary Sources Scraped
//     -> normalizedHeaders: yard_name, type, location_venice,
//        haul_out_capacity, services, contact_notes,
//        primary_sources_scraped ("Location (Venice)" is NOT an exact
//        match for tableParser's "Location" alias — the parenthetical
//        suffix makes it a distinct slug, hence the dedicated
//        `location_venice` key below).
//
// CAN_SERVICE design decision (documented per ticket): rather than a
// separate CAN_SERVICE edge type, a marina's service capability is encoded
// as a NODE ATTR (`max_loa`, shape { meters, raw }, mirroring yachtMapper's
// loa attr) — a marina "can service" any yacht at/under that LOA. This
// keeps the graph schema simpler (one relation, LOCATED_IN, plus a
// queryable capability attribute) instead of introducing a second edge
// relation whose only argument would be the same number already on the
// node.

import { upsertNode, upsertEdge } from '../db.js';
import {
  isEmptyValue,
  slug,
  normalizeName,
  appendProvenance,
  mergeFirstNonEmptyWins,
  parseHistoricalYear,
  parseIntSafe,
  pickFirstPresent,
  isPlausibleEntityName,
} from './normalize.js';
import { upsertRegion, resolveRegion } from './regions.js';

// Review fix (HIGH 2a): 'marina_name' is the real header slug for file 56's
// Spain marina tables ("Marina Name | Location | Max Yacht Length | Total
// Berths | ..."). It was missing here, so marinaMapper's schema guard
// never recognized these tables — they fell through to companyMapper's
// website-fallback instead, minting Company nodes named after raw URLs.
const NAME_KEYS = ['name', 'facility', 'facility_name', 'yard_name', 'marina_name'];
const REGION_KEYS = ['region', 'region_2', 'location_venice'];
const ESTABLISHED_KEYS = ['established', 'founded', 'est_date'];
// 'max_yacht_length' is file 56's real header ("Max Yacht Length": "110m",
// "180m", ...) — a clean single LOA figure, unlike file 16's combined
// "Max LOA/Beam" strings (see buildMaxLoaAttr below).
const MAX_LOA_KEYS = ['max_loa_beam', 'max_loa', 'haul_out_capacity', 'haul_out_equivalent_capacity', 'max_yacht_length'];
const TRAVELIFT_KEYS = ['lift_capacity', 'travelift_tonnage'];
// 'key_facilities_capacities' is file 40's docking-facilities header,
// routed here from clubMapper's per-row Type-column split (see
// clubMapper.js) rather than matched by mapMarinaTables' own table-level
// schema guard.
const NOTES_KEYS = ['contact_notes', 'key_services', 'services', 'marina_integration', 'key_facilities_capacities'];
const BERTHS_SOURCE_KEYS = ['marina_integration', 'key_services', 'services'];
// 'total_berths' (file 56) is a clean direct integer column, preferred
// over the free-text regex extraction from BERTHS_SOURCE_KEYS below.
const BERTHS_DIRECT_KEYS = ['total_berths', 'berths'];

// A marina table must have a name column plus at least one of these to be
// trusted as marina data (mirrors yachtMapper's REQUIRED_ANY_OF guard).
const REQUIRED_ANY_OF = [
  ...ESTABLISHED_KEYS,
  ...MAX_LOA_KEYS,
  ...TRAVELIFT_KEYS,
  ...BERTHS_DIRECT_KEYS,
  'marina_integration',
];

const MERGE_FIELDS = ['established', 'address', 'phone', 'website', 'max_loa', 'travelift_tonnage', 'berths', 'notes'];

function isMarinaTable(table) {
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

// "700T + 200T + 75T", "150 tons", "820 MT" -> { tons: 700, raw }. Takes
// the first (primary/largest-listed) lift's tonnage, best-effort.
function buildTonnageAttr(raw) {
  if (isEmptyValue(raw)) return null;
  return { tons: parseIntSafe(raw), raw: String(raw).trim() };
}

// Review fix (MEDIUM 1): normalize.js's shared parseLength() is a general-
// purpose yacht-LOA parser and, on a combined "LOA / beam" string like
// "300+ ft / 36 ft", its ft-regex requires digits directly adjacent to
// "ft" (mod whitespace) — the "+" after "300" breaks that match, so it
// silently fell through to the *second* figure (36ft, the BEAM) and
// reported it as max_loa. A wrong number is worse than a missing one, so
// this is a dedicated, narrower parser instead of reusing parseLength:
//   - meters: first "<number>m" occurrence (handles file 56's clean
//     "110m", "180m", and "22m (up to 50m in some areas)" -> 22, the
//     *current* capacity, not the future-expansion figure).
//   - feet: first "<number>+? ft" occurrence — the optional "+?" is the
//     fix, so "300+ ft / 36 ft" now matches "300" (the LOA, first-listed),
//     not "36" (the beam, second-listed).
//   - anything else (e.g. "Mid-large yachts", no parseable number): null,
//     with the raw text preserved so it's still visible on the node.
const METERS_RE = /(\d+(?:\.\d+)?)\s*m\b/i;
const FEET_RE = /(\d+(?:\.\d+)?)\+?\s*ft\b/i;
const FEET_TO_METERS = 0.3048;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function parseMaxLoaMeters(raw) {
  const s = String(raw).trim();
  let m = s.match(METERS_RE);
  if (m) return parseFloat(m[1]);
  m = s.match(FEET_RE);
  if (m) return round2(parseFloat(m[1]) * FEET_TO_METERS);
  return null;
}

function buildMaxLoaAttr(raw) {
  if (isEmptyValue(raw)) return null;
  return { meters: parseMaxLoaMeters(raw), raw: String(raw).trim() };
}

const PHONE_RE = /\+?\d[\d\s().-]{5,}\d/;
const BERTHS_RE = /(\d[\d,]*)\s*(?:slips|berths|docks)/i;

function extractPhone(raw) {
  if (isEmptyValue(raw)) return null;
  const m = String(raw).match(PHONE_RE);
  return m ? m[0].trim() : null;
}

// Prefers a clean direct integer column (e.g. file 56's "Total Berths":
// "425", "915") over regex-extracting a berths count from free-form
// prose (file 16's "Marina Integration": "Yes (3,500 ft docks)").
function extractBerths(directRaw, proseRaw) {
  if (!isEmptyValue(directRaw)) return parseIntSafe(directRaw);
  if (isEmptyValue(proseRaw)) return null;
  const m = String(proseRaw).match(BERTHS_RE);
  return m ? parseIntSafe(m[1]) : null;
}

/**
 * Maps an already-validated array of marina-shaped `rows` (parsed table
 * rows, keyed by tableParser's normalizedHeaders) into Marina nodes +
 * LOCATED_IN edges in `db`. Extracted from mapMarinaTables() so
 * clubMapper.js's Type-column row router (HIGH 1 fix: a table can mix
 * yacht-club rows with marina/port rows under one header, e.g. file 40's
 * docking-facilities table or file 34's Turkey "Best Yacht Clubs" sheet)
 * can delegate its marina-typed rows here directly, without re-deriving
 * this module's field-merging logic and without those rows needing to
 * satisfy mapMarinaTables' own table-level schema guard (isMarinaTable) —
 * the Type column itself is already stronger evidence than that guard.
 *
 * Returns { marinas, regions, edges }.
 */
export function mapMarinaRows(db, rows, sourceFile) {
  let marinas = 0;
  let regions = 0;
  let edges = 0;

  for (const row of rows) {
    const nameRaw = pickFirstPresent(row, NAME_KEYS);
    // Review fix (MEDIUM 2, generalized): rejects corpus truncation-
    // placeholder rows (real fixture: file 35's "... (5+ more like Sivota,
    // Paxos Gaios, Kyparissia)") and other implausible names.
    if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

    const marinaId = `marina:${slug(normalizeName(nameRaw))}`;
    const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(marinaId);
    const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
    const existingName = existingRow ? existingRow.name : null;

    const contactNotes = pickFirstPresent(row, ['contact_notes']);
    const berthsDirect = pickFirstPresent(row, BERTHS_DIRECT_KEYS);
    const berthsProse = pickFirstPresent(row, BERTHS_SOURCE_KEYS);

    const incoming = {
      established: parseHistoricalYear(pickFirstPresent(row, ESTABLISHED_KEYS)),
      address: null,
      phone: extractPhone(contactNotes),
      website: null,
      max_loa: buildMaxLoaAttr(pickFirstPresent(row, MAX_LOA_KEYS)),
      travelift_tonnage: buildTonnageAttr(pickFirstPresent(row, TRAVELIFT_KEYS)),
      berths: extractBerths(berthsDirect, berthsProse),
      notes: pickFirstPresent(row, NOTES_KEYS) ?? null,
    };

    const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
    merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

    const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
    upsertNode(db, { id: marinaId, type: 'marina', name: finalName, attrs: merged });
    marinas += 1;

    const regionRaw = pickFirstPresent(row, REGION_KEYS);
    if (!isEmptyValue(regionRaw)) {
      const regionId = upsertRegion(db, regionRaw);
      if (regionId) {
        upsertEdge(db, { src: marinaId, rel: 'located_in', dst: regionId });
        regions += 1;
        edges += 1;
      }
    }
  }

  return { marinas, regions, edges };
}

/**
 * Maps every marina-shaped table found in `tables` into Marina nodes +
 * LOCATED_IN edges to a canonical Region node in `db`, tagging every node
 * with `sourceFile` as provenance. Tables that don't look like marina data
 * are skipped and reported in `skippedTables`.
 *
 * Returns { marinas, regions, edges, skippedTables }.
 */
export function mapMarinaTables(db, tables, sourceFile) {
  const skippedTables = [];
  let marinas = 0;
  let regions = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isMarinaTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    const result = mapMarinaRows(db, table.rows, sourceFile);
    marinas += result.marinas;
    regions += result.regions;
    edges += result.edges;
  });

  return { marinas, regions, edges, skippedTables };
}

export { isMarinaTable };

// --- TASK-020: Famous-marina enrichment table (knowledge/94) -------------
//
// Curated from research/round3/marina-enrichment.md. Real header shape:
//   Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel
//   Dock | Website | Notes
// "Marina" is a BARE header (not aliased to 'name'/'facility'/'marina_name'
// by tableParser's ALIAS_MAP), so this guard's identifier ('marina') is
// deliberately distinct from mapMarinaTables' own NAME_KEYS above — no
// collision either direction (see ingest/tests/guardCollisions.spec.js).
//
// UNLIKE mapMarinaTables/mapMarinaRows above (which always mints a node
// when none exists at the naive slug id), this mapper's resolution is
// COUNTRY-AWARE: a row can share an EXACT name with an existing marina
// node that is a completely different real-world place (the graph's
// "Portofino Hotel & Marina" is in Redondo Beach, California; its
// "Yacht Haven Marina" is a Pacific-Northwest entry — neither is the
// famous Mediterranean/Caribbean facility of the same name this research
// pass covers). resolveMarinaId() below requires the existing candidate's
// located_in region to be compatible with the incoming row's own City/
// Country (via the same regions.js canonicalization every mapper already
// shares) before treating it as a match; an incompatible or absent
// existing candidate falls through to minting a NEW, disambiguated node
// instead of overwriting the wrong one.

const ME_NAME_KEYS = ['marina'];
const ME_COUNTRY_KEYS = ['region']; // "Country" aliases to 'region' — see shipyardMapper.js's identical note.
const ME_CITY_KEYS = ['city'];
const ME_BERTHS_KEYS = ['berths'];
const ME_MAX_LOA_KEYS = ['max_loa_m'];
const ME_MAX_DRAFT_KEYS = ['max_draft_m'];
const ME_FUEL_DOCK_KEYS = ['fuel_dock'];
const ME_WEBSITE_KEYS = ['website'];
const ME_NOTES_KEYS = ['notes'];

// A table must have the marina identifier column PLUS at least 2 of these
// marina-enrichment-specific signals to be trusted as this shape (same
// "highly specific" 2-of-N pattern as every other enrichment guard).
const ME_SPECIFIC_SIGNAL_KEYS = [...ME_BERTHS_KEYS, ...ME_MAX_LOA_KEYS, ...ME_MAX_DRAFT_KEYS];
const ME_MIN_SPECIFIC_SIGNALS = 2;

function isMarinaEnrichmentTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!ME_NAME_KEYS.some((key) => present.has(key))) return false;

  const signalCount = ME_SPECIFIC_SIGNAL_KEYS.reduce((count, key) => count + (present.has(key) ? 1 : 0), 0);
  return signalCount >= ME_MIN_SPECIFIC_SIGNALS;
}

function nodeExists(db, id) {
  return !!db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
}

const NUMBER_RE = /(?<![a-zA-Z])(\d+(?:\.\d+)?)(?![a-zA-Z])/;

function parseNumeric(raw) {
  if (isEmptyValue(raw)) return null;
  const cleaned = String(raw).replace(/,/g, '').replace(/~/g, '');
  const m = cleaned.match(NUMBER_RE);
  return m ? parseFloat(m[1]) : null;
}

function buildLengthAttr(raw) {
  if (isEmptyValue(raw)) return null;
  const value = parseNumeric(raw);
  return value === null ? null : { meters: value, raw: String(raw).trim() };
}

// "Yes" / "Yes (bunker service)" -> true; "—" / "not confirmed" -> null
// (never guessed as false — absence of confirmation isn't confirmation of
// absence, same spirit as every other omitted-when-unknown attr in this
// codebase).
function parseFuelDock(raw) {
  if (isEmptyValue(raw)) return null;
  return /^yes\b/i.test(String(raw).trim()) ? true : null;
}

const ME_MERGE_FIELDS = ['berths', 'max_loa', 'max_draft', 'fuel_dock', 'website', 'notes'];

/**
 * Resolves the existing marina node (if any) whose located_in region is
 * compatible with the incoming row's own City/Country — returns true when
 * there's nothing to disagree with (no located_in edge on the existing
 * node, or no City/Country on the incoming row), so a real match is never
 * rejected for lack of evidence; returns false only on an ACTUAL
 * disagreement (e.g. existing region "Redondo Beach" vs incoming "Italy").
 */
// Generic marina/geographic filler words that recur across totally
// unrelated real places — excluded from the word-overlap check below so
// e.g. two different "Port ..." facilities don't falsely read as the same
// place merely for sharing the word "Port".
const LOCATION_STOPWORDS = new Set(['marina', 'port', 'yacht', 'club', 'harbor', 'harbour', 'bay', 'the', 'and']);

// Existing marina nodes' located_in region NAME is sometimes a fuller/
// messier real-world string than the simple City cell this research pass
// provides (e.g. "Barcelona, Catalonia" vs "Barcelona"; or, worst case,
// a genuinely garbled pre-existing region name like "Palm Beach; often
// grouped with Fort Lauderdale due to proximity and shared ecosystem" vs
// "West Palm Beach, FL") — a strict canonical-region-id equality check
// would reject all of these as "incompatible" even though they plainly
// describe the SAME place. Word-overlap (>=1 shared, non-stopword,
// >=4-letter token) is robust to this granularity mismatch while still
// correctly rejecting two places with NO shared vocabulary at all
// (Portofino vs Redondo Beach; Charlotte Amalie vs Wilmington).
function significantWords(text) {
  return normalizeName(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !LOCATION_STOPWORDS.has(w));
}

function locationCompatible(db, existingNodeId, cityRaw, countryRaw) {
  const edge = db.prepare("SELECT dst FROM edges WHERE src = ? AND rel = 'located_in'").get(existingNodeId);
  if (!edge) return true;

  const locationRaw = !isEmptyValue(cityRaw) ? cityRaw : countryRaw;
  if (isEmptyValue(locationRaw)) return true;

  const resolved = resolveRegion(locationRaw);
  if (resolved && resolved.id === edge.dst) return true;

  const regionNode = db.prepare('SELECT name FROM nodes WHERE id = ?').get(edge.dst);
  if (!regionNode) return true;

  const incomingWords = significantWords(locationRaw);
  const existingWords = new Set(significantWords(regionNode.name));
  return incomingWords.some((w) => existingWords.has(w));
}

/**
 * Resolves a Marina cell to an existing node id (exact name AND
 * location-compatible), or a fresh id to mint at (disambiguated with a
 * city/country suffix when the naive slug id is already occupied by an
 * incompatible node). Returns { id, isNew }.
 */
function resolveMarinaId(db, nameRaw, cityRaw, countryRaw) {
  const trimmed = String(nameRaw).trim();
  const candidates = db.prepare("SELECT id FROM nodes WHERE type = 'marina' AND LOWER(name) = LOWER(?)").all(trimmed);

  for (const { id } of candidates) {
    if (locationCompatible(db, id, cityRaw, countryRaw)) return { id, isNew: false };
  }

  const baseId = `marina:${slug(normalizeName(trimmed))}`;
  if (!nodeExists(db, baseId)) return { id: baseId, isNew: true };

  const suffix = slug(normalizeName(cityRaw || countryRaw || 'unknown'));
  return { id: `${baseId}-${suffix}`, isNew: true };
}

/**
 * Maps every marina-enrichment-shaped table found in `tables` into Marina
 * nodes (enriching a location-compatible existing node, or minting a new
 * one — see resolveMarinaId) plus LOCATED_IN edges. Tables that don't look
 * like this shape are skipped and reported in `skippedTables`.
 *
 * Returns { matched, created, edges, skippedTables }.
 */
export function mapMarinaEnrichmentTables(db, tables, sourceFile) {
  const skippedTables = [];
  let matched = 0;
  let created = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isMarinaEnrichmentTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, ME_NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const cityRaw = pickFirstPresent(row, ME_CITY_KEYS);
      const countryRaw = pickFirstPresent(row, ME_COUNTRY_KEYS);

      const { id: marinaId, isNew } = resolveMarinaId(db, nameRaw, cityRaw, countryRaw);
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(marinaId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const incoming = {
        berths: parseIntSafe(pickFirstPresent(row, ME_BERTHS_KEYS)),
        max_loa: buildLengthAttr(pickFirstPresent(row, ME_MAX_LOA_KEYS)),
        max_draft: buildLengthAttr(pickFirstPresent(row, ME_MAX_DRAFT_KEYS)),
        fuel_dock: parseFuelDock(pickFirstPresent(row, ME_FUEL_DOCK_KEYS)),
        website: pickFirstPresent(row, ME_WEBSITE_KEYS) ?? null,
        notes: pickFirstPresent(row, ME_NOTES_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, ME_MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = !isEmptyValue(existingName) ? existingName : String(nameRaw).trim();
      upsertNode(db, { id: marinaId, type: 'marina', name: finalName, attrs: merged });
      if (isNew) created += 1;
      else matched += 1;

      const locationRaw = !isEmptyValue(cityRaw) ? cityRaw : countryRaw;
      if (!isEmptyValue(locationRaw)) {
        const regionId = upsertRegion(db, locationRaw);
        if (regionId) {
          upsertEdge(db, { src: marinaId, rel: 'located_in', dst: regionId });
          edges += 1;
        }
      }
    }
  });

  return { matched, created, edges, skippedTables };
}

export { isMarinaEnrichmentTable };
