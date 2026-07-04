// ingest/src/parsers/proseParser.js
//
// TASK-005: deterministic, regex/labeled-block extractor for semi-
// structured prose "data sheets" in the /knowledge corpus — files that
// describe a marina, yacht club, or yacht owner in FREE TEXT (headings +
// paragraphs, or headings + bulleted "Label: value" lines) rather than a
// markdown pipe table (tableParser.js's domain). No DB access here — pure
// functions only, mirroring tableParser.js's own "parse first, map later"
// split. No LLM: every extraction below is a fixed regex/heuristic grounded
// in real corpus excerpts (see proseParser.spec.js).
//
// Two real corpus shapes are grounded here:
//   - "labeled-bullet" sheets (files 17, 74, 15): a heading — a numbered
//     bold list item ("1. **Amadea** (Suleiman Kerimov)", file 74), a
//     "GROK YACHT TERMINAL — NAME (LOCATION) ... DEEP DIVE" boilerplate
//     bold line (file 16/17), or a bold-only bulleted name ("* **Bradford
//     Marine — Fort Lauderdale**", file 16) — followed by consecutive
//     "- **Label**: value" / "* Label: value" lines.
//   - "heading + narrative paragraph" sheets (files 67, 69): a markdown
//     heading naming the entity (optionally with a trailing "(City, ST)"
//     parenthetical) followed by ordinary prose that mentions the founding
//     year / address inline ("founded in 1946", "Located at 4307 Snead
//     Island Road, Palmetto, ...") rather than as separate labeled lines.
//
// detectProseSheets() walks the document once, recording every heading
// that plausibly names a single real-world entity (see the heading
// matchers below), computes that heading's "section" (its own text span,
// bounded by the next heading of equal-or-shallower precedence), and
// returns one sheet per such heading:
//   { heading, locationHint, fields, startLine }
// `fields` is populated first from any recognized labeled-field lines in
// the section, then (for any FIELD_PATTERNS field still missing) topped up
// from PROSE_PATTERNS regex matches against the section's full text.
// Sections with zero recognized fields are still returned (never silently
// dropped) — proseMapper.js decides whether an empty-fields sheet is worth
// reporting as "unparseable" in the skipped-prose report.
//
// Table lines are excluded up front (maskTableLines) using a small,
// self-contained reimplementation of tableParser.js's pipe-table line
// detection (header + separator + rows) — duplicated rather than imported
// so this module stays independent of tableParser.js's internals (per the
// ticket: tableParser.js must not be modified), and so a table already
// claimed by the table-routing pass is never double-extracted as prose.

// ---------------------------------------------------------------------------
// FIELD_PATTERNS: extensible label-alias -> canonical field map. Add new
// aliases here as new corpus label spellings are found; nothing else in
// this module needs to change.
// ---------------------------------------------------------------------------
export const FIELD_PATTERNS = {
  address: ['address'],
  phone: ['phone', 'contact', 'tel', 'telephone', 'contact number'],
  email: ['email'],
  website: ['website', 'official', 'official site', 'site'],
  founded: ['founded', 'established', 'organized', 'chartered', 'incorporated', 'est', 'est.'],
  travelift_tonnage: ['travelift', 'lift', 'lifts', 'boat hoist', 'travelift / boat hoist'],
  // NOTE: a bare 'capacity' alias was tried here and removed — real fixture
  // (file 11, a general yacht-model guide): a "Capacity: 8-14 guests" bullet
  // under an unrelated yacht-model heading ("Prestige M7 (Power Catamaran,
  // ...)") was misread as marina haul-out capacity, which alone was enough
  // to misclassify that heading as a marina (see proseMapper.js's
  // classifySheet: a marina FIELD signal bypasses the heading-keyword
  // check entirely). Only compound phrases that are unambiguously about
  // haul-out capacity are kept.
  max_loa: ['max loa', 'max length', 'haul-out capacity', 'haulout capacity'],
  berths: ['slips', 'berths', 'marina slips', 'slips/dockage'],
  net_worth: ['net worth', 'estimated net worth'],
  owner: ['owner'],
  yacht_name: ['yacht'],
  builder: ['builder'],
  notes: ['details', 'status', 'notoriety'],
};

function normalizeLabel(str) {
  return String(str ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIAS_TO_FIELD = (() => {
  const map = new Map();
  for (const [field, aliases] of Object.entries(FIELD_PATTERNS)) {
    for (const alias of aliases) {
      map.set(normalizeLabel(alias), field);
    }
  }
  return map;
})();

function canonicalizeField(labelRaw) {
  return ALIAS_TO_FIELD.get(normalizeLabel(labelRaw)) ?? null;
}

// ---------------------------------------------------------------------------
// PROSE_PATTERNS: fallback regexes applied to a whole section's free-text
// body (not individual labeled lines) when a field wasn't found via a
// labeled line. Grounded in real fixtures (file 67 club paragraphs, file 74
// owner narratives).
// ---------------------------------------------------------------------------
const FOUNDED_PROSE_RE = /\b(?:founded|established|organized|chartered|incorporated)\b[^.\n\d]{0,25}?(\d{4})/i;
// Matches "Located at 4307 Snead Island Road, Palmetto, the Bradenton..."
// and "located at 1100 John Ringling Blvd, Sarasota, FL 34236, is a..." —
// captures everything between "at <digit...>" and the next ", is"/", the"/
// ", which" (the sentence continuation), which is where the real corpus
// prose reliably breaks from "address" into "description".
const ADDRESS_PROSE_RE = /\bat\s+(\d+[^.\n]+?),\s*(?:is\b|the\b|which\b)/i;
const NET_WORTH_PROSE_RE = /\bnet worth\b[^$\d]{0,12}\$?\s?([\d.,]+\s?(?:billion|million|thousand|b|m|k)\b)/i;

const PROSE_PATTERNS = {
  founded: FOUNDED_PROSE_RE,
  address: ADDRESS_PROSE_RE,
  net_worth: NET_WORTH_PROSE_RE,
};

// ---------------------------------------------------------------------------
// Table-line masking (self-contained; see module header for why this is
// not imported from tableParser.js).
// ---------------------------------------------------------------------------
const SEPARATOR_CELL_RE = /^:?-+:?$/;

function splitRowLocal(line) {
  let s = line.replace(/\r$/, '').trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((cell) => cell.trim());
}

function isSeparatorRowLocal(line) {
  if (typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (trimmed === '' || !trimmed.includes('-')) return false;
  const cells = splitRowLocal(trimmed);
  return cells.length > 0 && cells.every((cell) => SEPARATOR_CELL_RE.test(cell.trim()));
}

function isTableRowLineLocal(line) {
  return typeof line === 'string' && line.trim() !== '' && line.includes('|');
}

/**
 * Returns a Set of 0-based line indices that belong to a markdown pipe
 * table (header + separator + data rows), so the prose pass can skip them.
 */
export function maskTableLines(lines) {
  const masked = new Set();
  let i = 0;
  while (i < lines.length) {
    if (isTableRowLineLocal(lines[i]) && isSeparatorRowLocal(lines[i + 1])) {
      masked.add(i);
      masked.add(i + 1);
      let j = i + 2;
      while (j < lines.length && isTableRowLineLocal(lines[j])) {
        masked.add(j);
        j++;
      }
      i = j;
    } else {
      i++;
    }
  }
  return masked;
}

// ---------------------------------------------------------------------------
// Labeled field-line matching.
// ---------------------------------------------------------------------------

// "- **Label**: value" / "* **Label** — value" (bold label, bulleted).
const FIELD_LINE_BOLD_BULLET_RE = /^[-*]\s*\*\*([^*]{1,60}?)\*\*\s*[:—-]\s*(.+)$/;
// "**Label**: value" (bold label, no bullet).
const FIELD_LINE_BOLD_PLAIN_RE = /^\*\*([^*]{1,60}?)\*\*\s*[:—-]\s*(.+)$/;
// "* Label: value" (plain label, bulleted) — restricted to KNOWN aliases
// only (see canonicalizeField below) since, without a bold marker, a plain
// "Word: rest of sentence" line is much more likely to be a false positive
// elsewhere in the corpus.
const FIELD_LINE_PLAIN_BULLET_RE = /^[-*]\s+([A-Za-z][A-Za-z /]{1,30}):\s+(.+)$/;

/**
 * Matches a single (already table-line-filtered) line against the three
 * labeled-field line shapes above. Returns { label, canonical, value } or
 * null. `canonical` is null when the label text doesn't map to a known
 * FIELD_PATTERNS alias (still returned so callers can tell "this looked
 * like a label line" from "no label line at all", though only `canonical`
 * matches are stored into a sheet's `fields`).
 */
export function matchFieldLine(line) {
  if (typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (trimmed === '') return null;

  let m = trimmed.match(FIELD_LINE_BOLD_BULLET_RE);
  if (m) return { label: m[1].trim(), canonical: canonicalizeField(m[1]), value: m[2].trim() };

  m = trimmed.match(FIELD_LINE_BOLD_PLAIN_RE);
  if (m) return { label: m[1].trim(), canonical: canonicalizeField(m[1]), value: m[2].trim() };

  m = trimmed.match(FIELD_LINE_PLAIN_BULLET_RE);
  if (m) {
    const canonical = canonicalizeField(m[1]);
    if (canonical) return { label: m[1].trim(), canonical, value: m[2].trim() };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Heading detection.
// ---------------------------------------------------------------------------

const ENTITY_HINT_RE = /\b(yacht club|sailing club|marina|boatyard|shipyard|haul-?out|travelift|dry ?dock)\b/i;

// Recurring generic sub-section vocabulary seen in the real "GROK YACHT
// TERMINAL ... DEEP DIVE" style deep-dives (files 16/17) and club review
// sections (file 67) — a heading (bold OR markdown — see matchBoldHeading
// AND matchMarkdownHeading, both consult this) matching one of these is a
// SUB-heading describing an ASPECT of whatever entity's section is already
// open, not a new entity itself, so it must NOT be treated as a heading:
// it's fully transparent (matchers return null for it), which both (a)
// stops it from minting its own bogus node, and (b) — just as important —
// stops it from PREMATURELY CLOSING the enclosing entity's section, so its
// own labeled fields keep flowing to the real, enclosing entity instead of
// being misattributed to (or lost with) the generic subheading (real
// regression found in the full-corpus review: "### Key Differentiating
// Equipment & Haul-Out Capabilities" was stealing a real 50-ton travelift
// field from its parent marina).
// NOTE: `\w*` suffixes matter here, not just cosmetics — `\b` (the group's
// trailing boundary) only matches at a transition between a \w and a \W
// char. A bare "facilit" or "haul-out capab" entry (no trailing `\w*`)
// NEVER actually matches inside "Facilities"/"Capabilities" (real corpus
// spelling — "facilit"+"ies" and "capab"+"ilities" are both \w-to-\w
// transitions, i.e. NOT a boundary), so those two entries were silent
// dead code until this fix (found via the full-corpus regression review:
// "### Dockage & Facilities" was still slipping through as its own bogus
// marina despite looking like it should have matched "facilit").
const GENERIC_BOLD_HEADING_RE =
  /\b(histor\w*|legacy|facilit\w*|haul-out capab\w*|dockage\s*(?:&|and)?\s*(?:marina)?\s*integration|marina\s*(?:&|and)\s*dockage|services overview|contact & booking|unique selling|sites .*scraped|key operational|notes from scrape|comparison notes|sources scraped|double-check\w*|key verified|ecuador angle|why it ranks|business fit|why these three|bottom line|breakdown of each|total haul-out|key differentiating|word count|world war|interwar|\bperiod\b|\bera\b|pre-histor\w*|data scrape)\b/i;

// A handful of common nouns recur as BARE section headings across the
// corpus ("### Marina", "### The Marina", "**Rates (Current from Site —
// Verify Direct)**") that name a generic ASPECT of whatever entity is
// already open, not a distinct entity of their own — GENERIC_BOLD_HEADING_RE
// above is a substring blocklist and doesn't cover these single common
// words (adding them there as bare words would be too broad; e.g. "marina"
// bare is fine as a SUBSTRING of a real name like "Bradford Marine", but
// not as the WHOLE name). Checked as an EXACT (trimmed, case-folded) match
// against the extracted name only, after any parenthetical/dash split.
const GENERIC_BARE_NAME_SET = new Set([
  'marina',
  'the marina',
  'shipyard',
  'the shipyard',
  'boatyard',
  'the boatyard',
  'dockage',
  'rates',
  'services',
  'contact',
  'overview',
  'docking',
  'amenities',
]);

function isGenericBareName(name) {
  return GENERIC_BARE_NAME_SET.has(String(name ?? '').trim().toLowerCase());
}

const NUMBERED_PREFIX_RE = /^\d+\.\s*/;
const TRAILING_PAREN_RE = /^(.*?)\s*\(([^)]+)\)\s*$/;
// Only the em-dash/en-dash, WITH surrounding whitespace, counts as a
// name/location separator — a plain hyphen commonly appears inside a
// compound word with no surrounding space (e.g. "Merrill-Stevens",
// "Haul-Out"), so including bare "-" here would mis-split those.
const DASH_SPLIT_RE = /^(.+?)\s+[—–]\s+(.+)$/;

function splitNameAndLocation(text) {
  const paren = text.match(TRAILING_PAREN_RE);
  if (paren) return { name: paren[1].trim(), locationHint: paren[2].trim() };
  const dashed = text.match(DASH_SPLIT_RE);
  if (dashed) return { name: dashed[1].trim(), locationHint: dashed[2].trim() };
  return { name: text.trim(), locationHint: null };
}

// A bare year or year-range parenthetical (e.g. "(1907–1926)", real
// fixture: file 69's "### Historical Context and Founding (1907–1926)")
// is NOT location evidence — without this guard, such a heading would
// wrongly qualify as its own "entity" via the locationHint-presence check
// below, minting a bogus club/marina named "Historical Context and
// Founding". Real place parentheticals ("Palmetto, FL", "Fort Lauderdale")
// never look like this.
// Trailing "s" handles decade notation ("1910s", "1900s") — real fixture:
// file 16's "### Founding & Early Jacksonville Era (1885–1910s)".
const YEAR_ONLY_RE = /^\d{4}s?\s*[–—-]?\s*\d{0,4}s?$/;

// The corpus's recurring "GROK YACHT TERMINAL" report-boilerplate
// vocabulary (real fixtures: "(Top Verified + Scraped)", "(REDO +
// DOUBLE-CHECKED — LIVE MARCH 2026)", "(Copy-Paste Ready)") describes the
// REPORT, not a place — without this, headings like "### KEY CAPE COD
// HAUL-OUT FACILITIES (Top Verified + Scraped)" wrongly qualify as a
// single entity via this parenthetical alone.
const NON_LOCATION_WORDS_RE =
  /\b(top|full|key|verified|scraped|redo|confirmed|double-checked|comprehensive|detailed|analysis|report|focus|scrape|deep dive|checked|updated|revised|copy-paste|ready|live|structured|extracted)\b/i;

// A street-suffix word immediately followed by a comma (real fixtures,
// file 55's AU/NZ marina directory: "Marina Drive, Ascot", "Petra Street,
// East Fremantle", "The Esplanade, Esperance") means the text up to that
// comma is a street address, NOT a suburb/region by itself — even without
// a house number, which is why regions.js's own STREET_ADDRESS_RE (it
// requires a leading house number) doesn't catch it. Unlike the leading-
// digit case below (a full numbered address, rejected outright), a bare
// street name still carries a real, extractable suburb after the last
// comma — see resolveLocationHint, which extracts it rather than
// discarding the whole hint.
const STREET_SUFFIX_BEFORE_COMMA_RE =
  /\b(?:Street|St|Road|Rd|Drive|Dr|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Way|Esplanade|Parade|Terrace|Crescent|Quay|Wharf)\b\s*,/i;
// A "suburb" that's just the bare suffix word itself (e.g. a malformed
// "Marina Drive, Rd" entry) isn't a real place either.
const BARE_STREET_SUFFIX_RE =
  /^(?:Street|St|Road|Rd|Drive|Dr|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Way|Esplanade|Parade|Terrace|Crescent|Quay|Wharf)$/i;

/**
 * Resolves a raw locationHint into a string usable as region input, or
 * null when nothing usable can be extracted. Rejects bare years/decade-
 * ranges and report-boilerplate vocabulary outright (see YEAR_ONLY_RE /
 * NON_LOCATION_WORDS_RE), and a leading-digit full street address (e.g.
 * "578 Royal Esplanade, Manly" — regions.js's own guard already handles
 * numbered addresses it recognizes the suffix word for, but not every
 * real-world suffix, so this is a narrower belt-and-suspenders net).
 * A NUMBER-LESS street address ("Marina Drive, Ascot") is not itself
 * rejected outright: the suburb after the LAST comma is extracted and
 * returned instead, unless that suburb is empty or ALSO street-shaped (a
 * multi-segment address with no real suburb at the end), in which case
 * the whole hint is rejected rather than guessed at.
 */
export function resolveLocationHint(locationHint) {
  if (!locationHint) return null;
  const trimmed = locationHint.trim();
  if (YEAR_ONLY_RE.test(trimmed)) return null;
  if (NON_LOCATION_WORDS_RE.test(trimmed)) return null;
  if (/^\d/.test(trimmed)) return null;

  if (STREET_SUFFIX_BEFORE_COMMA_RE.test(trimmed)) {
    const segments = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    const suburb = segments[segments.length - 1];
    if (!suburb || STREET_SUFFIX_BEFORE_COMMA_RE.test(suburb) || BARE_STREET_SUFFIX_RE.test(suburb) || /^\d/.test(suburb)) return null;
    return suburb;
  }

  return trimmed;
}

export function isRealLocationHint(locationHint) {
  return resolveLocationHint(locationHint) !== null;
}

// A real entity name is short and not sentence-shaped (mirrors normalize.js
// isPlausibleEntityName's spirit; duplicated here as a tiny local check
// rather than importing from mappers/normalize.js to keep this a pure,
// mapper-independent parser — see mappers/proseMapper.js for the shared
// isPlausibleEntityName pass applied again before any node is created).
function looksLikePlausibleName(name) {
  const s = String(name ?? '').trim();
  if (s.length === 0 || s.length > 80) return false;
  if (/[.!?]\s/.test(s)) return false;
  // A trailing '?' (real fixture: file 65's own H3 "### Is There a
  // California or West Coast Yacht Club Association?") is a QUESTION, not
  // a proper name.
  if (s.endsWith('?')) return false;
  // A slash (real fixtures: "GROK YACHT TERMINAL — CAPE COD
  // (MASSACHUSETTS) SHIPYARDS / BOATYARDS / HAUL-OUT DEEP DIVE" — a
  // regional multi-yard roundup, not one yard; "Massachusetts Haul-Out
  // Marina/Shipyard" — a category label, not a name) reads as a list of
  // alternatives, not a single entity's name. No real corpus entity name
  // in this ticket's target files uses a literal slash.
  if (s.includes('/')) return false;
  return true;
}

// A markdown heading whose name matches ENTITY_HINT_RE keyword-alone (no
// real location parenthetical) is only trusted as a single entity when it
// doesn't ALSO read like a collection/summary title (real fixture: file
// 16's "### Top / Notable Boatyards & Haul-Out Spots" — a section
// introducing a LIST of yards, not one yard itself; "Spots" gives it away).
// Keyword-alone qualification is needed for genuine single-topic files
// (file 69's H1 "Sarasota Yacht Club: History, Amenities, Events" has no
// parenthetical at all), so this only narrows that specific path — a
// heading with a real place parenthetical always still qualifies.
const COLLECTION_HEADING_RE =
  /\b(spots|options|list|directory|overview|guide|compilation|summary|roundup|breakdown|leaders|players|movers|shakers|rankings?|total|facilities|specifications|capacity|docking|amenities)\b/i;

function titleCaseIfAllCaps(name) {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/(^|[\s/(-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

// Matches "**GROK YACHT TERMINAL — <TITLE>**" boilerplate headings (files
// 16/17). Only accepted as a single-entity heading when <TITLE> ends with a
// "DEEP DIVE" suffix (real per-entity deep-dive convention) AND has a
// trailing "(Location)" parenthetical — multi-entity topic roundups in the
// same files use "... FULL DATA SCRAPE" wording instead (no "DEEP DIVE"),
// so they're correctly rejected here rather than mis-parsed as one entity.
const GROK_PREFIX_RE = /^GROK YACHT TERMINAL\s*[—-]\s*(.+)$/i;
const DEEP_DIVE_SUFFIX_RE = /\s*(?:HAUL-OUT POINTS\s+)?(?:FULL\s+)?DEEP DIVE\s*$/i;

function matchGrokBoilerplateHeading(boldText) {
  const prefixMatch = boldText.match(GROK_PREFIX_RE);
  if (!prefixMatch) return null;

  const rest = prefixMatch[1];
  if (!DEEP_DIVE_SUFFIX_RE.test(rest)) return null; // topic roundup, not one entity
  const withoutSuffix = rest.replace(DEEP_DIVE_SUFFIX_RE, '').trim();

  const { name, locationHint } = splitNameAndLocation(withoutSuffix);
  if (!looksLikePlausibleName(name)) return null;

  return {
    name: titleCaseIfAllCaps(name),
    locationHint: locationHint ? titleCaseIfAllCaps(locationHint) : locationHint,
    level: 3,
    isEntity: true,
  };
}

/**
 * Matches a bare bold-only line ("**Text**", nothing else). Returns a
 * heading record only when the text is entity-shaped (contains a marina/
 * club keyword, or splits into name+location via parens/dash) and isn't
 * one of the known generic sub-section headings. Generic/unrecognized bold
 * lines return null (transparent: neither a new entity nor a section
 * boundary — see module header).
 */
function matchBoldHeading(line) {
  const m = line.match(/^\*\*([^*]+)\*\*\s*$/);
  if (!m) return null;
  const boldText = m[1].trim();

  const grok = matchGrokBoilerplateHeading(boldText);
  if (grok) return grok;

  if (GENERIC_BOLD_HEADING_RE.test(boldText)) return null;

  const { name, locationHint } = splitNameAndLocation(boldText);
  if (!looksLikePlausibleName(name)) return null;
  // A second check AFTER splitting off the parenthetical/dash: the whole-
  // boldText check above catches phrases like "...Key Differentiating..."
  // but not a bare generic noun paired with an unrelated parenthetical
  // (real fixture: "**Rates (Current from Site — Verify Direct)**" — the
  // whole text doesn't match GENERIC_BOLD_HEADING_RE, but the extracted
  // name "Rates" is exactly the kind of bare aspect-noun GENERIC_BARE_NAME_SET
  // exists for).
  if (GENERIC_BOLD_HEADING_RE.test(name) || isGenericBareName(name)) return null;
  // Unlike markdown headings (which may qualify on keyword alone — see
  // matchMarkdownHeading, needed for file 69's keyword-only H1), a bare
  // bold-only line requires an actual location split: this whole file's
  // subject is haul-out yards, so nearly every generic subheading
  // ("Key Differentiating Equipment & Haul-Out Capabilities", "Facilities
  // & Haul-Out Capabilities") ALSO contains an ENTITY_HINT_RE keyword —
  // keyword-alone would wrongly promote them all to entity headings.
  if (!isRealLocationHint(locationHint)) return null;

  return { name, locationHint, level: 3, isEntity: true };
}

// "1. **Amadea** (Suleiman Kerimov)" / "12. **Safe Harbor ...** (Fort
// Lauderdale)" — numbered list item whose entire content is a bolded name
// optionally followed by a bare (non-bold) parenthetical.
const NUMBERED_BOLD_HEADING_RE = /^\d+\.\s*\*\*([^*]+)\*\*\s*(?:\(([^)]+)\))?\s*$/;

function matchNumberedBoldHeading(line) {
  const m = line.match(NUMBERED_BOLD_HEADING_RE);
  if (!m) return null;
  const name = m[1].trim();
  const locationHint = m[2] ? m[2].trim() : null;
  if (!looksLikePlausibleName(name)) return null;
  if (GENERIC_BOLD_HEADING_RE.test(name) || isGenericBareName(name)) return null;
  // Requires the parenthetical (real fixtures always have one: file 74's
  // "1. **Amadea** (Suleiman Kerimov)", file 16/17's "12. **Safe Harbor
  // Lauderdale Marine Center** (Fort Lauderdale)") — without this, a
  // numbered sub-item describing one PIECE OF EQUIPMENT rather than a
  // whole entity (real fixture: file 16's "1. **70-ton Travelift**" /
  // "2. **150-ton Travelift**" breakdown of Bradford Marine's own lifts)
  // would wrongly become its own marina.
  if (!isRealLocationHint(locationHint)) return null;
  return { name, locationHint, level: 3, isEntity: true };
}

// "* **Bradford Marine — Fort Lauderdale**" — bulleted, entire content
// bold, name/location split via em-dash INSIDE the bold span.
const BULLET_BOLD_ONLY_RE = /^[-*]\s+\*\*([^*]+)\*\*\s*$/;

function matchBulletBoldHeading(line) {
  const m = line.match(BULLET_BOLD_ONLY_RE);
  if (!m) return null;
  const { name, locationHint } = splitNameAndLocation(m[1].trim());
  if (!looksLikePlausibleName(name)) return null;
  if (GENERIC_BOLD_HEADING_RE.test(name) || isGenericBareName(name)) return null;
  if (!isRealLocationHint(locationHint)) return null;
  return { name, locationHint, level: 3, isEntity: true };
}

// "* Jeff Bezos — Koru" (file 15) — a plain (non-bold) bulleted "Name —
// Name2" line with nothing else on it. Riskier than the bold-marked
// variants (no bold marker to lean on), so gated tightly: both segments
// must start with a capital letter and be short, and — critically — this
// heading is only kept as a real entity heading when its own section goes
// on to contain at least one recognized labeled field (checked by the
// caller in detectProseSheets, since that requires scanning forward) —
// otherwise a coincidental "Capitalized Word — Capitalized Word" prose
// fragment elsewhere in the corpus could wrongly open an empty section.
const PLAIN_BULLET_DASH_HEADING_RE = /^[-*]\s+([A-Z][\w.']*(?:\s[A-Z][\w.']*){0,3})\s+[—–]\s+([A-Z][\w.']*(?:\s[A-Z][\w.']*){0,3})\s*$/;

function matchPlainBulletDashHeading(line) {
  const m = line.match(PLAIN_BULLET_DASH_HEADING_RE);
  if (!m) return null;
  const name = m[1].trim();
  const locationHint = m[2].trim();
  if (!looksLikePlausibleName(name)) return null;
  return { name, locationHint, level: 3, isEntity: true, requiresFieldConfirmation: true };
}

const CONVERSATION_MARKER_RE = /^(user|grok)\s*$/i;

/**
 * Matches a markdown heading line ("#".."######"). Always returns a
 * record (even non-entity ones, e.g. "## User"/"## Grok" or "### Location
 * and Facilities") because markdown headings reliably mark real document
 * structure and must terminate an open entity section regardless of
 * whether they themselves name an entity (see buildSections below).
 */
function matchMarkdownHeading(line) {
  const m = line.match(/^(#{1,6})\s+(.+)$/);
  if (!m) return null;
  const level = m[1].length;
  let text = m[2].replace(/\*\*/g, '').trim();

  if (CONVERSATION_MARKER_RE.test(text)) return { name: null, locationHint: null, level, isEntity: false };

  text = text.replace(NUMBERED_PREFIX_RE, '');
  // "Sarasota Yacht Club: History, Amenities, Events" -> name candidate is
  // the part before the first colon (a real corpus title-suffix pattern);
  // headings with no colon use the full cleaned text.
  const colonIdx = text.indexOf(':');
  const nameCandidate = colonIdx > 0 ? text.slice(0, colonIdx).trim() : text;

  let { name, locationHint } = splitNameAndLocation(nameCandidate);
  // Strip a trailing corpus title-suffix (real fixture: file 24's "###
  // Puerto de Mogán Marina Key Data (2026)" — the marina's actual name is
  // "Puerto de Mogán Marina"; "Key Data" is just this section's own
  // labeling convention, same idea as the GROK-boilerplate "DEEP DIVE"
  // suffix stripped above for bold headings — applied AFTER the
  // parenthetical is split off, since the suffix sits before it).
  name = name.replace(/\s+(?:Key Data|Full Data|Data Sheet|Quick Facts|Fact Sheet)\s*$/i, '').trim();
  if (!looksLikePlausibleName(name)) return { name: null, locationHint: null, level, isEntity: false };

  // A generic ASPECT subheading (real fixtures: "### Marina", "### Rates",
  // "### Dockage & Facilities", "### Key Differentiating Equipment &
  // Haul-Out Capabilities", "### NEW JERSEY HAUL-OUT FULL DATA SCRAPE")
  // is fully TRANSPARENT — unlike the true structural/topic boundaries
  // below (still recorded as a non-entity heading so they correctly
  // terminate an open section, e.g. "## User"/"## Grok" or "### Notes for
  // Your Custom Yacht Business"), this returns null: it neither mints its
  // own bogus node NOR closes the enclosing entity's section, so its own
  // labeled fields keep flowing to the real, nearest-preceding entity
  // heading instead of being misattributed or lost (see GENERIC_BOLD_HEADING_RE's
  // doc comment for the real 50-ton-travelift regression this fixes).
  if (GENERIC_BOLD_HEADING_RE.test(name) || isGenericBareName(name)) return null;

  const keywordQualifies = ENTITY_HINT_RE.test(name) && !COLLECTION_HEADING_RE.test(name);
  const isEntity = keywordQualifies || isRealLocationHint(locationHint);
  return isEntity ? { name, locationHint, level, isEntity: true } : { name: null, locationHint: null, level, isEntity: false };
}

// A bold name (with an em/en-dash-separated location INSIDE the bold span)
// as the very first words of a paragraph, with MORE text following on the
// same line — real fixture: file 16's "## Grok\n\n**Bradford Marine — Fort
// Lauderdale** stands out as one of the premier full-service yacht repair
// ...". matchBoldHeading requires the ENTIRE line to be bold (nothing
// else), so it doesn't recognize this far more common "opening sentence"
// shape, which is how files 16/17's turn-based Q&A structure actually
// names the entity each Grok reply is about — without recognizing it, that
// entity's own subsection bullets (e.g. "- **Travelift**: 50-ton
// capacity...") have no open section to attach to, and (before the
// generic-subheading fix above) were wrongly captured by a bogus
// "Key Differentiating Equipment & Haul-Out Capabilities" node instead.
// Deliberately gated to fire ONLY as the first non-blank line after a
// "## Grok" turn marker (see detectProseSheets' forward scan) — anywhere
// else in the corpus, a line starting with bold emphasis is far more
// likely to be ordinary mid-paragraph emphasis than an entity name, so
// this stays a narrow, contextual exception rather than a general rule.
const GROK_OPENING_BOLD_RE = /^\*\*([^*]+?)\*\*\s+\S/;

function matchGrokOpeningBoldHeading(line) {
  const m = line.match(GROK_OPENING_BOLD_RE);
  if (!m) return null;
  const boldText = m[1].trim();
  if (GENERIC_BOLD_HEADING_RE.test(boldText)) return null;

  const { name, locationHint } = splitNameAndLocation(boldText);
  if (!looksLikePlausibleName(name)) return null;
  if (GENERIC_BOLD_HEADING_RE.test(name) || isGenericBareName(name)) return null;
  if (!isRealLocationHint(locationHint)) return null;

  return { name, locationHint, level: 3, isEntity: true };
}

/**
 * Matches a heading-candidate line against every recognized shape, in
 * priority order. Returns null for an ordinary prose line. `context` (only
 * used by the Grok-opening-bold matcher above) tells whether this line is
 * the first non-blank line after a "## Grok" turn marker.
 */
function matchHeadingLine(line, context) {
  return (
    matchMarkdownHeading(line) ??
    matchBoldHeading(line) ??
    matchNumberedBoldHeading(line) ??
    matchBulletBoldHeading(line) ??
    matchPlainBulletDashHeading(line) ??
    (context && context.afterGrokTurn ? matchGrokOpeningBoldHeading(line) : null)
  );
}

// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------

/**
 * Scans `text` (a whole markdown file's contents) for prose data-sheets:
 * a heading naming a single real-world entity (marina/club/person), plus
 * the fields recognized within that heading's section (see module header).
 * Returns an array of { heading, locationHint, fields, startLine }.
 * Never touches the DB; never throws on malformed input.
 */
export function detectProseSheets(text) {
  const lines = String(text ?? '').split(/\r\n|\r|\n/);
  const tableLines = maskTableLines(lines);

  // Single forward pass: record every heading line (markdown headings
  // always; bold/numbered/bullet headings only when entity-qualifying —
  // see module header for why that asymmetry is intentional). `afterGrok`
  // tracks whether the current line is the first non-blank line following
  // a "## Grok" turn marker (blank lines in between don't reset it) — see
  // matchGrokOpeningBoldHeading for why that narrow context matters.
  const headings = [];
  let afterGrok = false;
  for (let i = 0; i < lines.length; i++) {
    if (tableLines.has(i)) continue;
    const line = lines[i];
    const match = matchHeadingLine(line, { afterGrokTurn: afterGrok });
    if (match) headings.push({ lineIndex: i, ...match });

    const trimmed = line.trim();
    if (trimmed !== '') afterGrok = /^##\s+Grok\s*$/i.test(trimmed);
  }

  // The file's H1 (level 1) title is only trusted as an entity heading of
  // its own when it's the ONLY entity heading found anywhere in the file
  // (real fixture: file 69, a single-topic "Sarasota Yacht Club: History,
  // Amenities, Events" file with no other entity-shaped heading — the H1
  // is the sole source of the club's name, and its section correctly
  // spans the whole document). When the document contains other, more
  // specific entity headings (real fixture: file 67's H1 "First Yacht
  // Club in Florida: History and Impact" — a *description*, not a club's
  // real name — followed by a dozen real "## <Club> (<City>, FL)"
  // headings), the H1 is demoted: keeping it as its own entity would mint
  // a bogus club/marina from the file's title and let its section run to
  // EOF (nothing at level <= 1 would ever close it), vacuuming up
  // unrelated content along the way.
  const entityHeadingCount = headings.filter((h) => h.isEntity).length;
  if (entityHeadingCount > 1) {
    const h1Index = headings.findIndex((h) => h.level === 1 && h.isEntity);
    if (h1Index !== -1) headings[h1Index].isEntity = false;
  }

  const sheets = [];
  for (let k = 0; k < headings.length; k++) {
    const h = headings[k];
    if (!h.isEntity) continue;

    let sectionEnd = lines.length;
    for (let j = k + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        sectionEnd = headings[j].lineIndex;
        break;
      }
    }

    const fields = {};
    const sectionTextLines = [];
    for (let i = h.lineIndex + 1; i < sectionEnd; i++) {
      if (tableLines.has(i)) continue;
      const line = lines[i];
      sectionTextLines.push(line);

      const fieldMatch = matchFieldLine(line);
      if (fieldMatch && fieldMatch.canonical && fields[fieldMatch.canonical] === undefined) {
        fields[fieldMatch.canonical] = fieldMatch.value;
      }
    }

    const sectionText = sectionTextLines.join('\n');
    for (const [field, regex] of Object.entries(PROSE_PATTERNS)) {
      if (fields[field] !== undefined) continue;
      const m = sectionText.match(regex);
      if (m) fields[field] = m[1].trim();
    }

    // A plain-bullet "Name — Name2" heading (file 15 style) is only kept
    // when its section actually yielded a recognized field — otherwise a
    // coincidental "Capitalized Word — Capitalized Word" prose fragment
    // elsewhere in the corpus would open a spurious, empty sheet (see
    // matchPlainBulletDashHeading).
    if (h.requiresFieldConfirmation && Object.keys(fields).length === 0) continue;

    sheets.push({
      heading: h.name,
      locationHint: h.locationHint,
      fields,
      startLine: h.lineIndex + 1, // 1-based, for diagnostics
    });
  }

  sheets.push(...scanDirectoryListEntries(lines, tableLines));

  return sheets;
}

// ---------------------------------------------------------------------------
// Directory-list scan: a THIRD real corpus shape (file 55, Pacific Coast
// Marinas and Boatyards Guide) that doesn't fit "heading + fields" at all —
// a flat bulleted list of "Name - City" (or "**Name** - City (extra info)")
// entries, one per marina/boatyard, with no per-entry heading whatsoever.
// The only structure available is the enclosing "### Marinas" / "###
// Boatyards" section title — which is exactly why this scan is gated so
// tightly to just those two exact section titles rather than running
// generally (a bare "- Name - Place" line is far too weak a signal on its
// own anywhere else in the ~90-file corpus).
// ---------------------------------------------------------------------------

const DIRECTORY_SECTION_RE = /^marinas$|^boatyards$/i;
// "- **Bay of Islands Marina** - Opua, Northland" (bold) or
// "- A-Dock Floating House Docks - Sausalito" (plain) — name, then a
// single " - " separator, then the rest of the line (city/region, plus an
// optional trailing "(services; capacity: ...)" parenthetical).
const DIRECTORY_ENTRY_RE = /^[-*]\s+\*{0,2}([^*\n]+?)\*{0,2}\s+-\s+(.+)$/;
const DIRECTORY_CAPACITY_LOA_RE = /(\d+(?:\.\d+)?)\s*m\s*length/i;
const DIRECTORY_CAPACITY_TONNAGE_RE = /([\d,]+)\s*tonnage/i;

/**
 * Scans `lines` for the file-55-style flat marina/boatyard directory shape
 * (see block comment above). Returns sheets shaped like detectProseSheets'
 * regular output, plus a `sectionHint: 'marina'` marker proseMapper.js's
 * classifySheet treats as authoritative (stronger than the per-file
 * typeHint: it comes from this specific list's own "### Marinas"/"###
 * Boatyards" section title, not a file-wide guess) — this is what lets a
 * plain "Name - City" entry with no fields at all still become a real
 * marina node rather than being skipped for lack of a keyword/field signal.
 */
function scanDirectoryListEntries(lines, tableLines) {
  const sheets = [];
  let inSection = false;

  for (let i = 0; i < lines.length; i++) {
    if (tableLines.has(i)) continue;
    const line = lines[i];

    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      inSection = DIRECTORY_SECTION_RE.test(headingMatch[1].replace(/\*\*/g, '').trim());
      continue;
    }
    if (!inSection) continue;

    const entryMatch = line.match(DIRECTORY_ENTRY_RE);
    if (!entryMatch) continue;

    const name = entryMatch[1].trim();
    if (!looksLikePlausibleName(name)) continue;

    let rest = entryMatch[2].trim();
    const fields = {};
    // The prefix before '(' uses `*` (0+), not `+` (1+): a real fixture
    // (file 55's "- Avi Avi Marina Boatyard - (1000-ton slipway)") has a
    // `rest` that is ENTIRELY parenthetical with nothing before it — `+`
    // requires at least one non-'(' char there and so never matches,
    // leaving `rest` as the literal "(1000-ton slipway)" (parens and all),
    // which then became a bogus "region:1000-ton-slipway" node. With `*`,
    // an empty prefix is fine and `rest` correctly becomes null (no
    // location at all) while `extra` still captures the capacity info.
    const parenMatch = rest.match(/^([^(]*?)\s*\(([^)]+)\)\s*$/);
    if (parenMatch) {
      rest = parenMatch[1].trim();
      const extra = parenMatch[2];
      const loaMatch = extra.match(DIRECTORY_CAPACITY_LOA_RE);
      if (loaMatch) fields.max_loa = `${loaMatch[1]}m`;
      const tonnageMatch = extra.match(DIRECTORY_CAPACITY_TONNAGE_RE);
      if (tonnageMatch) fields.travelift_tonnage = `${tonnageMatch[1]} tonnage`;
      fields.notes = extra.trim();
    }

    sheets.push({ heading: name, locationHint: rest || null, fields, startLine: i + 1, sectionHint: 'marina' });
  }

  return sheets;
}
