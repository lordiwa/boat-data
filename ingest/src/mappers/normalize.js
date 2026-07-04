// ingest/src/mappers/normalize.js
//
// Shared normalization helpers for the entity-resolution mappers (yacht,
// and later builder/person mappers in TASK-004+). Pure functions only —
// no DB access here.
//
// These exist because the /knowledge corpus repeats the same real-world
// entities (yachts, builders, owners) across many files with slightly
// different spelling, diacritics, punctuation, and units. A mapper needs
// a single, deterministic notion of "same name" / "same length" to dedupe
// them into one graph node instead of five.

/**
 * Strips diacritics/accents from a string (e.g. "Lürssen" -> "Lurssen").
 * Uses Unicode NFD decomposition + combining-mark removal, which is
 * locale-independent and covers the accented Latin letters seen in the
 * corpus (ü, é, etc).
 */
export function stripDiacritics(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Matches a leading "M/Y ", "MY ", "S/Y ", "SY " vessel-type prefix
// (case-insensitive), optionally followed by a period, before the actual
// name. e.g. "M/Y Eclipse" / "MY Eclipse" / "S/Y Koru" -> "Eclipse" / "Koru".
const VESSEL_PREFIX_RE = /^(m\/y|my|s\/y|sy)\.?\s+/i;

/**
 * Normalizes a name (yacht, builder, or person) for entity-resolution
 * comparison: strips diacritics, lowercases, strips a leading M/Y or S/Y
 * vessel-type prefix, and collapses/trims whitespace.
 */
export function normalizeName(str) {
  if (str === null || str === undefined) return '';
  let s = stripDiacritics(String(str)).toLowerCase().trim();
  s = s.replace(VESSEL_PREFIX_RE, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Values that mean "no data" throughout the corpus. Matched case-
// insensitively against the fully-trimmed cell text; "not specified" is
// matched as a prefix since the corpus qualifies it further (e.g. "Not
// specified (high-end)").
const EMPTY_EXACT_RE = /^(n\/a|na|unknown|none|none mentioned|none publicly known|—|-|n\/a\.?)$/;

/**
 * True if a raw table-cell value represents "no data" (empty string,
 * 'N/A', 'Unknown', 'None', '—', 'Not specified...', etc). Used to guard
 * edge creation (never link to a "Builder: Unknown" node) and to decide
 * which side wins during attribute merging.
 */
export function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  const s = String(value).trim().toLowerCase();
  if (s === '') return true;
  if (EMPTY_EXACT_RE.test(s)) return true;
  if (s.startsWith('not specified')) return true;
  return false;
}

/**
 * Turns a (possibly diacritic/punctuation-laden) name into a URL/id-safe
 * slug: strip diacritics, lowercase, collapse any run of non-alphanumeric
 * characters into a single '-', trim leading/trailing '-'.
 */
export function slug(str) {
  const s = stripDiacritics(String(str ?? ''))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'x';
}

const FEET_TO_METERS = 0.3048;

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Parses a length/LOA/beam cell into a number of meters, handling the
 * formats seen across the corpus:
 *   '88m', '88 m'                    -> 88
 *   '162 m (533 ft)'                 -> 162 (meters value preferred)
 *   '289ft (88m)'                    -> 88 (meters-in-parens preferred)
 *   '88/279' (m/ft pair, no units)   -> 88 (first number = meters)
 *   '390 ft' / '289ft' (feet only)   -> converted to meters
 *   '180'                           -> 180 (bare number assumed meters)
 * Returns null for empty/unparseable input (e.g. 'N/A', 'Unknown', a
 * '110-112m' range with no anchor number immediately after a unit).
 */
export function parseLength(raw) {
  if (isEmptyValue(raw)) return null;
  let s = String(raw).trim().replace(/,/g, '').replace(/~/g, '');

  // Meters value inside parens takes precedence, e.g. "289ft (88m)".
  let m = s.match(/\(\s*(\d+(?:\.\d+)?)\s*m\b/i);
  if (m) return parseFloat(m[1]);

  // Leading number directly followed by 'm', e.g. "162 m (533 ft)", "88m".
  m = s.match(/^(\d+(?:\.\d+)?)\s*m\b/i);
  if (m) return parseFloat(m[1]);

  // Bare "meters/feet" pair with no units, e.g. "88/279", "118.8/390".
  m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);

  // Feet only, e.g. "390 ft", "289ft".
  m = s.match(/(\d+(?:\.\d+)?)\s*ft\b/i);
  if (m) return round2(parseFloat(m[1]) * FEET_TO_METERS);

  // Bare number, assumed already in meters.
  m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]);

  return null;
}

/**
 * True if two LOA/beam measurements (in meters) are "the same" within the
 * corpus's typical cross-file rounding drift (~1m tolerance, e.g. 162m vs
 * 162.5m reported for the same yacht in different files).
 */
export function lengthsMatch(a, b, tolerance = 1) {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return Math.abs(a - b) <= tolerance;
}

// Currency symbol/word -> ISO code.
const CURRENCY_MARKERS = [
  [/€/, 'EUR'],
  [/\beur\b/i, 'EUR'],
  [/£/, 'GBP'],
  [/\bgbp\b/i, 'GBP'],
  [/\$/, 'USD'],
  [/\busd\b/i, 'USD'],
];

const MULTIPLIERS = [
  [/\bbillion\b/i, 1e9],
  [/\bmillion\b/i, 1e6],
  [/\bthousand\b/i, 1e3],
];

// Digit-adjacent letter suffix (no space required, e.g. "$100M", "€25k",
// "$1.2B") -> multiplier. Each matched number carries its OWN multiplier,
// which matters for ranges like "€25k-€45k" where a whole-string word
// multiplier would be wrong (only one side would ever carry the word).
// The trailing \b requires the letter not be immediately followed by
// another word character, so it never matches inside a real word like
// "million" (the 'm' there is followed by 'i', not a boundary).
const SUFFIX_TOKEN_RE = /(\d+(?:\.\d+)?)\s?([mkb])\b/gi;
const SUFFIX_MULTIPLIER = { m: 1e6, k: 1e3, b: 1e9 };

/**
 * Parses a money cell (weekly rate, estimated value, etc) into
 * { amount, currency, raw }. Handles thousands separators, '+' suffixes,
 * million/billion/thousand words, digit-adjacent M/k/B suffixes (e.g.
 * "$100M", "€25k", "$1.2B" — each number in a range carries its own
 * suffix, e.g. "€25k-€45k"), and simple "X-Y million"/"Xk-Yk" ranges
 * (averaged). Returns null for empty/unknown cells (e.g. 'Not specified',
 * 'N/A') — the field is simply absent rather than a zero-value guess.
 * `raw` is always the original (trimmed) string, since the numeric parse
 * can be lossy (ranges, parenthetical notes like "(sale)").
 */
export function parseMoney(raw) {
  if (isEmptyValue(raw)) return null;
  const original = String(raw).trim();
  let s = original.replace(/,/g, '');

  let currency = null;
  for (const [re, code] of CURRENCY_MARKERS) {
    if (re.test(s)) {
      currency = code;
      break;
    }
  }

  // Digit-adjacent letter suffixes take precedence: each matched number
  // supplies its own multiplier, so "€25k-€45k" averages 25,000/45,000
  // rather than treating the whole string as a single unit.
  const suffixMatches = [...s.matchAll(SUFFIX_TOKEN_RE)];
  if (suffixMatches.length > 0) {
    const amounts = suffixMatches.map(
      (m) => parseFloat(m[1]) * SUFFIX_MULTIPLIER[m[2].toLowerCase()]
    );
    const amount = amounts.length >= 2 ? (amounts[0] + amounts[1]) / 2 : amounts[0];
    return { amount, currency, raw: original };
  }

  let multiplier = 1;
  for (const [re, factor] of MULTIPLIERS) {
    if (re.test(s)) {
      multiplier = factor;
      break;
    }
  }

  const numberMatches = [...s.matchAll(/\d+(?:\.\d+)?/g)].map((m) => parseFloat(m[0]));
  if (numberMatches.length === 0) {
    return { amount: null, currency, raw: original };
  }

  let amount;
  if (numberMatches.length >= 2) {
    // Treat as a range (e.g. "$50-80 million") and average the bounds.
    amount = (numberMatches[0] + numberMatches[1]) / 2;
  } else {
    amount = numberMatches[0];
  }
  amount = amount * multiplier;

  return { amount, currency, raw: original };
}

/**
 * Parses an integer-ish cell (guests, cabins, crew) into a plain number,
 * taking the leading integer run. Returns null for empty/unknown cells.
 */
export function parseIntSafe(raw) {
  if (isEmptyValue(raw)) return null;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

// Matches a 4-digit year (1900-2099) anywhere in the string, e.g. picks
// "2005" out of "2005/2024" (delivery/refit combined column) or "2014"
// out of "2014 (refit)".
const YEAR_RE = /\b(19|20)\d{2}\b/;

/**
 * Parses a year cell into a 4-digit integer, taking the first plausible
 * year found (handles combined "delivery/refit" columns like
 * "2005/2024" by taking the first). Returns null for empty/unknown cells.
 */
export function parseYear(raw) {
  if (isEmptyValue(raw)) return null;
  const m = String(raw).match(YEAR_RE);
  return m ? parseInt(m[0], 10) : null;
}

// TASK-004: broader year range than YEAR_RE (1900-2099) — clubs/marinas in
// the corpus have real founding dates well before 1900 (Neva Yacht Club
// 1718, Imperial St Petersburg YC 1846, Moscow Imperial River Yacht-Club
// 1867, the Venetian Arsenal ~1104). parseYear() above is deliberately left
// untouched (yacht build/delivery years are always modern) — this is a new,
// additive helper for "founded" style fields on clubs/marinas/companies.
const HISTORICAL_YEAR_RE = /\b(1[0-9]{3}|20\d{2})\b/;

/**
 * Like parseYear(), but accepts any 4-digit year from 1000-2099 (not just
 * 1900-2099), for "founded"/"established" fields on clubs, marinas, and
 * companies where genuinely old founding dates appear in the corpus.
 * Returns { value, raw } or null for empty/unknown cells.
 */
export function parseHistoricalYear(raw) {
  if (isEmptyValue(raw)) return null;
  const m = String(raw).match(HISTORICAL_YEAR_RE);
  return m ? { value: parseInt(m[0], 10), raw: String(raw).trim() } : null;
}

// TASK-004 review fix (MEDIUM 2, generalized): the corpus sometimes uses a
// table row as a truncation placeholder instead of a real entity (real
// fixture: file 35's marina table has rows literally reading "... (5+
// more like Sivota, Paxos Gaios, Kyparissia)"), or abuses an identifier
// column for a full prose sentence (real fixture: file 21's "No
// significant non-.com charters found ..."). A real entity name is short
// and doesn't read like a sentence or a "more like X, Y" summary — reject
// rather than mint a node from it. Shared by club/marina/company mappers.
const MAX_PLAUSIBLE_NAME_LENGTH = 80;
const SENTENCE_PUNCTUATION_RE = /[.!?]\s/;
const TRUNCATION_PLACEHOLDER_RE = /^\.\.\./;

export function isPlausibleEntityName(name) {
  const s = String(name ?? '').trim();
  if (s.length === 0 || s.length > MAX_PLAUSIBLE_NAME_LENGTH) return false;
  if (SENTENCE_PUNCTUATION_RE.test(s)) return false;
  if (TRUNCATION_PLACEHOLDER_RE.test(s)) return false;
  return true;
}

/**
 * Returns the first value in `row` (a parsed table row, keyed by
 * tableParser's normalizedHeaders) among `keys` that is present and not
 * "empty" per isEmptyValue(), or undefined if none qualify. Shared by the
 * TASK-004 mappers (club/marina/company/engine) to fall back across the
 * corpus's several real-world header spellings for the same concept (e.g.
 * a club's name column is "Name" in one file, "Club Name" in another).
 */
export function pickFirstPresent(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && !isEmptyValue(row[key])) return row[key];
  }
  return undefined;
}

/**
 * Appends `sourceFile` to `provenance` (an existing provenance array, or
 * undefined/null for a brand-new node) unless it's already present.
 * Shared by the TASK-004 mappers (club/marina/company/engine) so every
 * entity node accumulates the same "which files mention this" trail the
 * yacht mapper already keeps, without each mapper re-implementing the
 * dedupe-on-append logic.
 */
export function appendProvenance(provenance, sourceFile) {
  const existing = provenance || [];
  return existing.includes(sourceFile) ? existing : [...existing, sourceFile];
}

/**
 * Merges `incoming` field values onto `existingAttrs` for the simpler
 * TASK-004 entity mappers (club/marina/company/engine): first non-empty
 * value per field wins, a later differing value is simply ignored (no
 * conflicts-tracking — unlike yachtMapper's mergeAttrs, these entities
 * don't need per-field conflict provenance for this ticket's scope).
 * `fieldNames` lists which keys in `incoming` participate in the merge.
 */
export function mergeFirstNonEmptyWins(existingAttrs, incoming, fieldNames) {
  const merged = { ...existingAttrs };
  for (const field of fieldNames) {
    const oldVal = existingAttrs[field] ?? null;
    const newVal = incoming[field] ?? null;
    merged[field] = oldVal === null || oldVal === undefined ? newVal : oldVal;
  }
  return merged;
}
