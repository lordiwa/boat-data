// ingest/src/mappers/regions.js
//
// TASK-004: shared canonical Region registry used by every mapper (club,
// marina, company, and — via a light retrofit hook in ingest.js — yacht)
// so the same real-world place recurring under different spellings across
// the corpus (e.g. "USA" / "United States" / "U.S." / "US", or "Monaco" /
// "Port Hercules (Monaco)") collapses onto one Region node rather than one
// per spelling. Unknown regions are never dropped: they become their own
// canonical node keyed by a slug of the raw text.
//
// Design: REGION_ALIAS_GROUPS is a plain, data-driven array (deliberately
// NOT hardcoded into the resolver logic) so new aliases can be added
// without touching resolveRegion()/upsertRegion() themselves. Each raw
// alias is looked up via aliasKey() — normalizeName() (diacritic/case
// folding) plus stripping all remaining punctuation — so "Côte d'Azur",
// "Cote d'Azur", and "COTE D AZUR" all resolve to the same lookup key
// regardless of apostrophe/accent spelling drift.

import { upsertNode, upsertEdge } from '../db.js';
import { normalizeName, isEmptyValue, slug } from './normalize.js';

export const REGION_ALIAS_GROUPS = [
  {
    slug: 'french-riviera',
    name: 'French Riviera',
    aliases: ['French Riviera', "Côte d'Azur", "Cote d'Azur", 'Cote dAzur', "Côte d’Azur"],
  },
  {
    slug: 'united-states',
    name: 'United States',
    aliases: ['USA', 'United States', 'U.S.', 'US', 'U.S.A.', 'United States of America'],
  },
  {
    slug: 'monaco',
    name: 'Monaco',
    // TASK-022: 'Monaco (La Condamine)' is the marina/harbour ward (Port
    // Hercule sits in La Condamine) — a tiny city-state has no useful
    // internal-ward granularity for this graph, same reasoning as the
    // pre-existing Port Hercules alias.
    aliases: ['Monaco', 'Port Hercules (Monaco)', 'Port Hercules', 'Monte Carlo', 'Monaco (La Condamine)'],
  },

  // --- TASK-022: Tier 1 city/qualifier alias hardening --------------------
  // Every group below collapses a "City, <broader qualifier>" (or "City
  // (<supplementary note>)") corpus spelling onto a single canonical "City"
  // node. Each pair was confirmed, by inspecting the pre-fix real-corpus
  // graph's actual located_in/based_in edges, to name the SAME real place
  // with no plausible alternate referent (e.g. both the bare "Coomera" and
  // "Coomera, QLD" nodes pointed at the identical "Gold Coast City Marina &
  // Shipyard"). This is deliberately a PERMANENT alias (not a one-time
  // graphCleanup-style merge): adding it here means a fresh ingest never
  // mints the duplicate node in the first place.
  //
  // Genuinely ambiguous same-spelled cities (Portland OR/ME, Newport RI/OR,
  // Henderson WA/NV, Toledo OH/OR, Jamestown RI/PA, Scarborough ON/QLD,
  // Vancouver BC/WA, Belfast UK/ME, Richmond CA/BC, Tuzla Turkey/Bosnia) are
  // deliberately NOT added here even where the CURRENT corpus happens to be
  // unambiguous — baking a bare "Portland"/"Henderson"/"Tuzla" alias into
  // this permanent table would silently swallow a future, genuinely
  // different same-named place. Those get a one-time, corpus-scoped merge
  // in regionCanonicalization.js instead (see that module's own header).
  { slug: 'alameda', name: 'Alameda', aliases: ['Alameda', 'Alameda, CA'] },
  {
    slug: 'ameglia-la-spezia',
    name: 'Ameglia (La Spezia)',
    aliases: ['Ameglia (La Spezia)', 'Ameglia (La Spezia), plus Viareggio/Massa plants'],
  },
  { slug: 'barcelona', name: 'Barcelona', aliases: ['Barcelona', 'Barcelona, Catalonia'] },
  { slug: 'bremerton', name: 'Bremerton', aliases: ['Bremerton', 'Bremerton, WA'] },
  {
    slug: 'calvia-mallorca',
    name: 'Calvià, Mallorca',
    aliases: [
      'Calvià, Mallorca',
      'Calvia, Mallorca',
      'Calvià, Mallorca, Balearic Islands',
      'Calvia, Mallorca, Balearic Islands',
    ],
  },
  { slug: 'coomera', name: 'Coomera', aliases: ['Coomera', 'Coomera, QLD'] },
  { slug: 'cyca', name: 'CYCA', aliases: ['CYCA', 'CYCA, NSW'] },
  { slug: 'dania-beach', name: 'Dania Beach', aliases: ['Dania Beach', 'Dania Beach, FL'] },
  { slug: 'dianshan-lake', name: 'Dianshan Lake', aliases: ['Dianshan Lake', 'Dianshan Lake, Qingpu'] },
  // NOTE: deliberately excludes the "(Dania/New River), FL" and
  // ", FL / Saugatuck, MI" compound variants — both combine multiple
  // distinct places (never guessed onto plain Fort Lauderdale).
  { slug: 'fort-lauderdale', name: 'Fort Lauderdale', aliases: ['Fort Lauderdale', 'Fort Lauderdale, FL'] },
  { slug: 'freeport', name: 'Freeport', aliases: ['Freeport', 'Freeport, Grand Bahama Island'] },
  { slug: 'fremantle', name: 'Fremantle', aliases: ['Fremantle', 'Fremantle, WA'] },
  { slug: 'gold-coast', name: 'Gold Coast', aliases: ['Gold Coast', 'Gold Coast, QLD'] },
  {
    slug: 'houghton-mi',
    name: 'Houghton, MI',
    aliases: ['Houghton, MI', 'Houghton, MI (Keweenaw Peninsula)'],
  },
  { slug: 'kaohsiung', name: 'Kaohsiung', aliases: ['Kaohsiung', 'Kaohsiung (+ USA facilities)'] },
  {
    slug: 'la-seyne-sur-mer',
    name: 'La Seyne-sur-Mer',
    aliases: ['La Seyne-sur-Mer', 'La Seyne-sur-Mer (Toulon)'],
  },
  { slug: 'marbella', name: 'Marbella', aliases: ['Marbella', 'Marbella, Costa del Sol'] },
  { slug: 'marina-del-rey', name: 'Marina del Rey', aliases: ['Marina del Rey', 'Marina del Rey, CA'] },
  { slug: 'miami', name: 'Miami', aliases: ['Miami', 'Miami, FL'] },
  {
    slug: 'miami-river',
    name: 'Miami River',
    aliases: ['Miami River', 'Miami River, ~2.6 miles upriver'],
  },
  { slug: 'naples', name: 'Naples', aliases: ['Naples', 'Naples (HQ)'] },
  { slug: 'north-vancouver', name: 'North Vancouver', aliases: ['North Vancouver', 'North Vancouver, BC'] },
  { slug: 'poole', name: 'Poole', aliases: ['Poole', 'Poole, Dorset'] },
  { slug: 'port-angeles', name: 'Port Angeles', aliases: ['Port Angeles', 'Port Angeles, WA'] },
  { slug: 'port-vila', name: 'Port Vila', aliases: ['Port Vila', 'Port Vila, Efate'] },
  { slug: 'san-diego', name: 'San Diego', aliases: ['San Diego', 'San Diego, CA'] },
  { slug: 'seattle', name: 'Seattle', aliases: ['Seattle', 'Seattle, WA'] },
  { slug: 'sydney', name: 'Sydney', aliases: ['Sydney', 'Sydney, NSW'] },
  { slug: 'tauranga', name: 'Tauranga', aliases: ['Tauranga', 'Tauranga, Bay of Plenty'] },
  { slug: 'vuda-point', name: 'Vuda Point', aliases: ['Vuda Point', 'Vuda Point, Lautoka'] },
  { slug: 'west-palm-beach', name: 'West Palm Beach', aliases: ['West Palm Beach', 'West Palm Beach, FL'] },
  { slug: 'west-vancouver', name: 'West Vancouver', aliases: ['West Vancouver', 'West Vancouver, BC'] },
  { slug: 'whangarei', name: 'Whangarei', aliases: ['Whangarei', 'Whangarei, Northland'] },
  // "Newport, RI" and "Newport, Rhode Island" both explicitly name the same
  // US state in full or abbreviated form — zero ambiguity regardless of
  // corpus (unlike bare "Newport", which this corpus's OWN Pacific-coast
  // marinas file also uses for Newport, OR — deliberately left unaliased).
  { slug: 'newport-ri', name: 'Newport, RI', aliases: ['Newport, RI', 'Newport, Rhode Island'] },
];

// Florida cities that recur across the marina/club/company corpus files:
// they stay distinct city-level Region nodes (never merged into one
// "Florida" blob — a marina in Miami is a different place than one in Fort
// Lauderdale), but each gets a PART_OF edge to region:florida so queries
// can roll up "all Florida" without losing the city. Data-driven for the
// same reason as REGION_ALIAS_GROUPS: easy to extend as new cities show up.
export const FLORIDA_CITIES = [
  'Miami',
  'Fort Lauderdale',
  'Palm Beach',
  'West Palm Beach',
  'Palm Beach Gardens',
  'Riviera Beach',
  'Stuart',
  'Dania Beach',
  'Jacksonville',
  'St. Augustine',
  'Tampa',
  'Sarasota',
  'Fort Pierce',
  'Fort Myers',
  'Panama City',
  'Pensacola',
  'Naples',
  'Boca Raton',
  'Key West',
  'Sebastian',
  'Titusville',
  'Port Orange',
  'Tarpon Springs',
  'Merritt Island',
  'St. Petersburg',
  'Palmetto',
  'Crystal River',
  'Indiantown',
];

const FLORIDA_REGION_SLUG = 'florida';
const FLORIDA_REGION_NAME = 'Florida';

/**
 * Normalizes a raw alias string into a lookup key: diacritic/case folded
 * (via normalizeName) with all remaining punctuation stripped, so
 * "Côte d'Azur" / "Cote d'Azur" / "COTE D'AZUR" all collide on one key
 * regardless of accent or apostrophe-style drift.
 */
function aliasKey(str) {
  return normalizeName(str)
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Review fix (MEDIUM 3): corpus "region"-ish cells are sometimes not a
// place at all — "(Various)" (file 21-style hedges) or "Unknown (likely
// Moscow/St. Petersburg)" (real fixture: file 33). isEmptyValue()
// (normalize.js) only catches the bare, EXACT string "unknown" — not this
// "Unknown (...)" prefix shape — so this is a regions.js-local addition
// rather than a change to that shared, already-tested helper.
const PLACEHOLDER_REGION_RE = /^\(?various\)?$|^unknown\b/i;

function isPlaceholderRegionText(raw) {
  return PLACEHOLDER_REGION_RE.test(String(raw).trim());
}

// Review fix (MEDIUM 3): a leading postcode glued onto a city name (real
// fixture: file 56's address field yields "29001 Málaga" once naively
// comma-split) — strip it so the city resolves cleanly instead of minting
// a junk "29001 málaga" region distinct from the real "málaga" one.
const LEADING_POSTCODE_RE = /^\d{4,6}\s+(.+)$/;

function stripLeadingPostcode(raw) {
  const s = String(raw).trim();
  const m = s.match(LEADING_POSTCODE_RE);
  return m ? m[1].trim() : s;
}

// Review fix (MEDIUM 3): a full street address (real fixture:
// "1001 S Federal Hwy, Delray Beach, FL 33483") is not a single "region" —
// naively slugging the whole string, or guessing which comma-segment is
// "the city", produces junk nodes. When a string still looks like a full
// street address after stripLeadingPostcode() (has a house number AND a
// street-suffix token), resolveRegion() below returns null (skip region
// creation) rather than guess — wrong/junk regions are worse than none.
// Allows 0-4 words between the house number and the street-suffix word
// (lazy, so it stops at the first suffix it finds) so this catches BOTH
// American-style "1001 S Federal Hwy" (suffix comes after the street
// name) AND European-style "9 Ave President Kennedy" (suffix comes
// immediately after the number, before the street name).
const STREET_ADDRESS_RE =
  /\b\d+\s+(?:\S+\s+){0,4}?(st|ave|blvd|dr|rd|hwy|way|ln|ct|pl|street|avenue|boulevard|drive|road|highway|lane|court|place)\b/i;

function looksLikeStreetAddress(raw) {
  return STREET_ADDRESS_RE.test(String(raw));
}

function buildAliasLookup() {
  const map = new Map();
  for (const group of REGION_ALIAS_GROUPS) {
    for (const alias of group.aliases) {
      map.set(aliasKey(alias), group);
    }
  }
  return map;
}

const ALIAS_LOOKUP = buildAliasLookup();
const FLORIDA_CITY_KEYS = new Set(FLORIDA_CITIES.map(aliasKey));

/**
 * Resolves a raw region/location string (as found in a corpus table cell)
 * to its canonical { id, name, slug }. Known aliases collapse onto the
 * shared canonical node (e.g. "U.S." -> region:united-states); anything
 * else becomes its own canonical node keyed by slug(raw) — unknown regions
 * are never dropped. Returns null for empty/unknown cells (isEmptyValue).
 */
export function resolveRegion(raw) {
  if (isEmptyValue(raw)) return null;
  if (isPlaceholderRegionText(raw)) return null;

  const trimmed = String(raw).trim();
  // Check street-address-ness BEFORE stripping a leading postcode: a full
  // address's HOUSE NUMBER (e.g. "1001" in "1001 S Federal Hwy, ...") must
  // not be mistaken for, and stripped as, a postcode — that would delete
  // the very digit that makes this detectable as an address, leaving only
  // the trailing ZIP with nothing after it to match against.
  if (looksLikeStreetAddress(trimmed)) return null;

  const cleaned = stripLeadingPostcode(trimmed);
  if (looksLikeStreetAddress(cleaned)) return null; // safety net post-strip

  const group = ALIAS_LOOKUP.get(aliasKey(cleaned));
  if (group) return { id: `region:${group.slug}`, name: group.name, slug: group.slug };

  const s = slug(cleaned);
  return { id: `region:${s}`, name: cleaned, slug: s };
}

/**
 * True if `raw` (post alias-resolution slug or raw text) names one of the
 * known Florida cities in FLORIDA_CITIES.
 */
export function isFloridaCity(raw) {
  if (isEmptyValue(raw)) return false;
  return FLORIDA_CITY_KEYS.has(aliasKey(String(raw).trim()));
}

/**
 * Resolves `raw` to its canonical Region node, upserts that node into
 * `db`, and — when `raw` names a known Florida city — also upserts a
 * region:florida node plus a PART_OF edge from the city to it. Returns the
 * canonical region id (e.g. 'region:united-states'), or null if `raw` was
 * empty/unknown. This is the single entry point every TASK-004 mapper
 * (and the ingest.js yacht-region retrofit hook) should call rather than
 * building region ids by hand, so canonicalization stays centralized.
 */
export function upsertRegion(db, raw) {
  const resolved = resolveRegion(raw);
  if (!resolved) return null;

  upsertNode(db, { id: resolved.id, type: 'region', name: resolved.name });

  if (isFloridaCity(resolved.name) && resolved.slug !== FLORIDA_REGION_SLUG) {
    const floridaId = `region:${FLORIDA_REGION_SLUG}`;
    upsertNode(db, { id: floridaId, type: 'region', name: FLORIDA_REGION_NAME });
    upsertEdge(db, { src: resolved.id, rel: 'part_of', dst: floridaId });
  }

  return resolved.id;
}
