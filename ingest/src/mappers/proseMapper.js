// ingest/src/mappers/proseMapper.js
//
// TASK-005 (Wave B): maps proseParser.js's { heading, locationHint, fields,
// startLine } sheets into the SAME Marina/YachtClub/Person nodes the Wave-A
// mappers (marinaMapper/clubMapper/yachtMapper) create from pipe tables —
// same id conventions (marina:<slug>, club:<slug>, person:<slug>), same
// read-merge-write provenance pattern — so a real-world entity that shows
// up in BOTH a Wave-A table and a Wave-B prose sheet collapses onto one
// node instead of creating a duplicate.
//
// Classification is content-driven first (a heading containing "yacht
// club" is a club; fields.travelift_tonnage/max_loa/berths or a marina/
// boatyard/shipyard keyword means marina; a net_worth field or an
// owner/yacht_name field means a person/ownership statement), with
// `typeHint` (set per-file by ingest.js for the known corpus files this
// ticket targets) used ONLY as a last-resort tie-breaker when the sheet
// has at least one recognized field but no unambiguous keyword/field
// signal — it never overrides a clear signal, and a sheet with zero
// fields is never guessed into existence regardless of hint (see
// classifySheet below). Anything that doesn't confidently classify is
// reported via the `skipped` array rather than dropped or guessed —
// "wrong data is worse than absence" (TASK-004 review quality bar).
//
// Yacht-ownership statements (files 15/74: "Owner: X" / "Yacht: Y" bullet
// clusters, or "1. **Yacht** (Owner)" numbered headings) create an
// OWNED_BY edge from yacht -> person ONLY when the yacht node already
// exists (matched by the same normalizeName-based slug yachtMapper uses
// for its own OWNED_BY edges) — never a new yacht node from prose (per
// the ticket: conservative, no new yacht nodes from prose).

import { upsertNode, upsertEdge } from '../db.js';
import {
  isEmptyValue,
  slug,
  normalizeName,
  appendProvenance,
  mergeFirstNonEmptyWins,
  parseHistoricalYear,
  parseIntSafe,
  parseLength,
  parseMoney,
  isPlausibleEntityName,
} from './normalize.js';
import { upsertRegion } from './regions.js';
import { isRealLocationHint, resolveLocationHint } from '../parsers/proseParser.js';

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

function readNode(db, id) {
  const row = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(id);
  return { name: row ? row.name : null, attrs: row ? parseAttrsJson(row.attrs_json) : {} };
}

// ---------------------------------------------------------------------------
// Value cleanup: strip markdown bold and the descriptive tails the corpus
// commonly appends to a name field (real fixtures: "Jeff Bezos (Amazon
// founder)", "Koru — 127 m sailing superyacht", "Suleiman Kerimov, a
// billionaire sanctioned for ..."). Order matters: strip bold first, then
// cut at the first ", " (comma-clause), then split at an em/en-dash — each
// step only fires if its separator is actually present.
// ---------------------------------------------------------------------------
function cleanExtractedName(raw) {
  let s = String(raw ?? '').replace(/\*\*/g, '').trim();
  // Trailing parenthetical stripped FIRST: a real fixture (file 55) has a
  // name like "Two Harbors (Isthmus Cove, Cherry Cove, etc.)" whose comma
  // sits INSIDE the parens — splitting at the first comma before removing
  // the parens would wrongly truncate to "Two Harbors (Isthmus Cove".
  s = s.replace(/\s*\([^)]*\)\s*$/, '');
  s = s.split(/,\s/)[0];
  s = s.split(/\s[—–]\s/)[0];
  return s.trim();
}

// Strips a trailing ", ST" two-letter US state code so a heading's
// "Palmetto, FL" locationHint resolves to the clean city "Palmetto"
// through regions.js (matching how Wave-A table cells present a bare city
// name, e.g. marinaMapper's REGION_KEYS cells).
const TRAILING_STATE_CODE_RE = /^(.*?),\s*[A-Z]{2}$/;

function stripTrailingStateCode(raw) {
  const s = String(raw ?? '').trim();
  const m = s.match(TRAILING_STATE_CODE_RE);
  return m ? m[1].trim() : s;
}

const PHONE_RE = /\+?\d[\d\s().-]{5,}\d/;

function extractPhone(raw) {
  if (isEmptyValue(raw)) return null;
  const m = String(raw).match(PHONE_RE);
  return m ? m[0].trim() : null;
}

// "**50-ton capacity**", "660-ton Travel Lift" -> { tons: 660, raw }.
const TONS_RE = /(\d[\d,]*)\s*-?\s*tons?\b/i;

function buildTonnageAttr(raw) {
  if (isEmptyValue(raw)) return null;
  const cleaned = String(raw).replace(/\*\*/g, '');
  const m = cleaned.match(TONS_RE);
  return { tons: m ? parseIntSafe(m[1]) : null, raw: String(raw).trim() };
}

// Reuses normalize.js's shared parseLength() (meters/feet-aware) for the
// numeric conversion — its feet/meter regexes are unanchored, so residual
// "**...**" markdown around the value (real fixture: "**300 ft** (multiple
// superyachts...)") doesn't block the match.
function buildMaxLoaAttr(raw) {
  if (isEmptyValue(raw)) return null;
  return { meters: parseLength(raw), raw: String(raw).trim() };
}

function buildFoundedAttr(raw) {
  if (isEmptyValue(raw)) return null;
  return parseHistoricalYear(raw);
}

const BERTHS_COUNT_RE = /(\d[\d,]*)\s*(?:slips|berths|yachts)/i;

function parseBerths(raw) {
  if (isEmptyValue(raw)) return null;
  const cleaned = String(raw).replace(/\*\*/g, '');
  const m = cleaned.match(BERTHS_COUNT_RE);
  return m ? parseIntSafe(m[1]) : null;
}

// ---------------------------------------------------------------------------
// Classification.
// ---------------------------------------------------------------------------

const CLUB_HEADING_RE = /\byacht club\b|\bsailing club\b/i;
const MARINA_HEADING_RE = /\b(marina|boatyard|shipyard|haul-?out|travelift|dry ?dock)\b/i;

/**
 * Classifies a sheet as 'marina' | 'club' | 'person' | 'unknown'.
 * Content signals (heading keyword, or a field that only makes sense for
 * one entity type) always take precedence; `typeHint` only breaks a tie
 * when the sheet has at least one recognized field but no clear signal —
 * it never fires on an empty-fields sheet (nothing to hint at).
 */
export function classifySheet(sheet, typeHint) {
  const heading = String(sheet.heading ?? '');
  const fields = sheet.fields ?? {};
  const hasAnyField = Object.keys(fields).length > 0;

  // CLUB_HEADING_RE is checked BEFORE sectionHint: file 55 lists several
  // real yacht clubs (Perth Flying Squadron, Sandringham, Royal Brighton,
  // ...) under its "### Marinas" section headings, and sectionHint alone
  // used to fire first — minting a SECOND, duplicate marina: node for an
  // entity that already exists (or, from a later file, will exist) as a
  // club: node for the exact same real-world place. An explicit "Yacht
  // Club"/"Sailing Club" in the name is unambiguous and must win over the
  // document-local sectionHint; upsertClubSheet's own read-merge-write
  // then naturally merges into any existing club: node with the same slug.
  if (CLUB_HEADING_RE.test(heading)) return 'club';

  // sectionHint (set by proseParser's scanDirectoryListEntries for file
  // 55's flat "### Marinas"/"### Boatyards" list shape) is a stronger,
  // document-local signal than the file-wide typeHint below: the entry is
  // authoritatively a marina/boatyard because it's listed under that exact
  // section title, even when it has no name keyword or fields at all (most
  // of file 55's directory is a bare "Name - City" with nothing else).
  if (sheet.sectionHint === 'marina') return 'marina';

  const marinaFieldSignal = fields.travelift_tonnage != null || fields.max_loa != null || fields.berths != null;
  if (MARINA_HEADING_RE.test(heading) || marinaFieldSignal) return 'marina';

  const personFieldSignal = fields.net_worth != null || fields.owner != null || fields.yacht_name != null;
  if (personFieldSignal) return 'person';

  // Last-resort tie-breaker: only for marina/club, and only when the
  // heading ALSO carries a real place-shaped locationHint (not a bare year
  // or year-range — see isRealLocationHint). Without that extra guard, any
  // unrelated subheading that happens to yield a single stray field (e.g.
  // file 16's own embedded club-history narrative, "### Founding & Early
  // Jacksonville Era (1885–1910s)", which a "founded"-prose match turns
  // into a one-field sheet) would get rubber-stamped into a bogus marina
  // just because the file's typeHint is 'marina' — a real regression
  // observed against the full corpus during this ticket's verification.
  // 'person' sheets are never hinted this way: resolveOwnershipNames()
  // already requires an explicit owner/yacht_name signal (caught above),
  // so a hint alone would mean literally no ownership evidence at all.
  if (hasAnyField && (typeHint === 'marina' || typeHint === 'club') && isRealLocationHint(sheet.locationHint)) {
    return typeHint;
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Per-type upserts (read-merge-write, mirroring marinaMapper.js/
// clubMapper.js's own pattern so a Wave-A node with the same id merges
// cleanly rather than being overwritten).
// ---------------------------------------------------------------------------

const MARINA_MERGE_FIELDS = ['established', 'address', 'phone', 'website', 'max_loa', 'travelift_tonnage', 'berths', 'notes'];
const CLUB_MERGE_FIELDS = ['founded', 'website', 'address', 'city', 'facilities'];

function upsertMarinaSheet(db, sheet, sourceFile) {
  const name = cleanExtractedName(sheet.heading);
  if (!isPlausibleEntityName(name)) return { created: false, reason: 'implausible marina name' };

  const marinaId = `marina:${slug(normalizeName(name))}`;
  const existing = readNode(db, marinaId);

  const incoming = {
    established: buildFoundedAttr(sheet.fields.founded),
    address: !isEmptyValue(sheet.fields.address) ? String(sheet.fields.address).trim() : null,
    phone: extractPhone(sheet.fields.phone),
    website: !isEmptyValue(sheet.fields.website) ? String(sheet.fields.website).trim() : null,
    max_loa: buildMaxLoaAttr(sheet.fields.max_loa),
    travelift_tonnage: buildTonnageAttr(sheet.fields.travelift_tonnage),
    berths: parseBerths(sheet.fields.berths),
    notes: !isEmptyValue(sheet.fields.notes) ? String(sheet.fields.notes).trim() : null,
  };

  const merged = mergeFirstNonEmptyWins(existing.attrs, incoming, MARINA_MERGE_FIELDS);
  merged.provenance = appendProvenance(existing.attrs.provenance, sourceFile);

  const finalName = !isEmptyValue(existing.name) ? existing.name : name;
  upsertNode(db, { id: marinaId, type: 'marina', name: finalName, attrs: merged });

  let edges = 0;
  let regions = 0;
  const regionInput = resolveLocationHint(sheet.locationHint);
  if (regionInput) {
    const regionId = upsertRegion(db, stripTrailingStateCode(regionInput));
    if (regionId) {
      upsertEdge(db, { src: marinaId, rel: 'located_in', dst: regionId });
      edges += 1;
      regions += 1;
    }
  }

  return { created: true, edges, regions };
}

function upsertClubSheet(db, sheet, sourceFile) {
  const name = cleanExtractedName(sheet.heading);
  if (!isPlausibleEntityName(name)) return { created: false, reason: 'implausible club name' };

  const clubId = `club:${slug(normalizeName(name))}`;
  const existing = readNode(db, clubId);

  const incoming = {
    founded: buildFoundedAttr(sheet.fields.founded),
    website: !isEmptyValue(sheet.fields.website) ? String(sheet.fields.website).trim() : null,
    address: !isEmptyValue(sheet.fields.address) ? String(sheet.fields.address).trim() : null,
    city: resolveLocationHint(sheet.locationHint) ?? null,
    facilities: !isEmptyValue(sheet.fields.notes) ? String(sheet.fields.notes).trim() : null,
  };

  const merged = mergeFirstNonEmptyWins(existing.attrs, incoming, CLUB_MERGE_FIELDS);
  merged.provenance = appendProvenance(existing.attrs.provenance, sourceFile);

  const finalName = !isEmptyValue(existing.name) ? existing.name : name;
  upsertNode(db, { id: clubId, type: 'club', name: finalName, attrs: merged });

  let edges = 0;
  let regions = 0;
  const regionInput = resolveLocationHint(sheet.locationHint);
  if (regionInput) {
    const regionId = upsertRegion(db, stripTrailingStateCode(regionInput));
    if (regionId) {
      upsertEdge(db, { src: clubId, rel: 'located_in', dst: regionId });
      edges += 1;
      regions += 1;
    }
  }

  return { created: true, edges, regions };
}

const PERSON_MERGE_FIELDS = ['net_worth', 'notes'];

/**
 * Resolves the (personName, yachtName) pair for a yacht-ownership
 * narrative sheet, per the two real corpus shapes:
 *   - fields.owner present, fields.yacht_name ALSO present (file 15: heading
 *     is "Owner — Yacht", but both are given explicitly as fields) -> use
 *     the fields directly.
 *   - fields.owner present, no fields.yacht_name (file 74's "1. **<Yacht>**
 *     (<Owner>)" sections): the heading itself IS the yacht name.
 *   - no fields.owner but fields.yacht_name present (file 74's "Yachts Not
 *     Seized" section: "## <Owner Name> (<descriptor>)" heading with a
 *     "Yacht: **<Name>**" field): the heading itself IS the person name.
 * Returns { personNameRaw, yachtNameRaw } with either possibly null.
 */
function resolveOwnershipNames(sheet) {
  if (!isEmptyValue(sheet.fields.owner)) {
    const yachtNameRaw = !isEmptyValue(sheet.fields.yacht_name) ? sheet.fields.yacht_name : sheet.heading;
    return { personNameRaw: sheet.fields.owner, yachtNameRaw };
  }
  if (!isEmptyValue(sheet.fields.yacht_name)) {
    return { personNameRaw: sheet.heading, yachtNameRaw: sheet.fields.yacht_name };
  }
  return { personNameRaw: null, yachtNameRaw: null };
}

function upsertPersonSheet(db, sheet, sourceFile) {
  const { personNameRaw, yachtNameRaw } = resolveOwnershipNames(sheet);
  const rawName = !isEmptyValue(personNameRaw) ? personNameRaw : sheet.heading;
  const name = cleanExtractedName(rawName);
  if (!isPlausibleEntityName(name)) return { created: false, reason: 'implausible person name' };

  const personId = `person:${slug(normalizeName(name))}`;
  const existing = readNode(db, personId);

  const incoming = {
    net_worth: !isEmptyValue(sheet.fields.net_worth) ? parseMoney(sheet.fields.net_worth) : null,
    notes: !isEmptyValue(sheet.fields.notes) ? String(sheet.fields.notes).trim() : null,
  };

  const merged = mergeFirstNonEmptyWins(existing.attrs, incoming, PERSON_MERGE_FIELDS);
  merged.provenance = appendProvenance(existing.attrs.provenance, sourceFile);

  const finalName = !isEmptyValue(existing.name) ? existing.name : name;
  upsertNode(db, { id: personId, type: 'person', name: finalName, attrs: merged });

  let edges = 0;
  if (!isEmptyValue(yachtNameRaw)) {
    const yachtName = cleanExtractedName(yachtNameRaw);
    const yachtId = `yacht:${slug(normalizeName(yachtName))}`;
    // Conservative by design (per the ticket): never create a yacht node
    // from prose — only link when the yacht already exists (created by a
    // real Wave-A pipe-table row elsewhere in the corpus).
    if (nodeExists(db, yachtId)) {
      upsertEdge(db, { src: yachtId, rel: 'owned_by', dst: personId });
      edges += 1;
    }
  }

  return { created: true, edges };
}

// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------

/**
 * Maps `sheets` (proseParser.detectProseSheets() output) into Marina/
 * YachtClub/Person nodes + LOCATED_IN/OWNED_BY edges in `db`, tagging every
 * node with `sourceFile` as provenance. `typeHint` ('marina' | 'club' |
 * 'person' | undefined) is a per-file bias set by ingest.js for the known
 * corpus files this ticket targets — see classifySheet for exactly how
 * (and how little) it's used.
 *
 * Returns { marinas, clubs, persons, regions, edges, skipped }, where
 * `skipped` is an array of { sourceFile, startLine, heading, reason } for
 * every sheet that didn't confidently classify or create a node — never
 * silently dropped.
 */
export function mapProseSheets(db, sheets, sourceFile, typeHint) {
  let marinas = 0;
  let clubs = 0;
  let persons = 0;
  let regions = 0;
  let edges = 0;
  const skipped = [];

  for (const sheet of sheets) {
    const hasAnyField = Object.keys(sheet.fields ?? {}).length > 0;

    if (!isPlausibleEntityName(sheet.heading)) {
      skipped.push({ sourceFile, startLine: sheet.startLine, heading: sheet.heading, reason: 'implausible heading name' });
      continue;
    }

    const type = classifySheet(sheet, typeHint);

    if (type === 'unknown') {
      skipped.push({
        sourceFile,
        startLine: sheet.startLine,
        heading: sheet.heading,
        reason: hasAnyField ? 'ambiguous entity type' : 'no recognized fields',
      });
      continue;
    }

    let result;
    if (type === 'marina') result = upsertMarinaSheet(db, sheet, sourceFile);
    else if (type === 'club') result = upsertClubSheet(db, sheet, sourceFile);
    else result = upsertPersonSheet(db, sheet, sourceFile);

    if (!result.created) {
      skipped.push({ sourceFile, startLine: sheet.startLine, heading: sheet.heading, reason: result.reason ?? 'not created' });
      continue;
    }

    if (type === 'marina') marinas += 1;
    else if (type === 'club') clubs += 1;
    else persons += 1;
    edges += result.edges ?? 0;
    regions += result.regions ?? 0;
  }

  return { marinas, clubs, persons, regions, edges, skipped };
}
