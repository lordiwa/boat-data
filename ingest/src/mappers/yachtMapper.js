// ingest/src/mappers/yachtMapper.js
//
// TASK-003: maps parsed yacht tables (see src/parsers/tableParser.js) into
// Yacht/Builder/Person graph nodes + BUILT_BY/OWNED_BY edges, with entity
// resolution that collapses the same real-world yacht recurring across
// many /knowledge corpus files under slightly different spellings/values
// (e.g. Eclipse, Koru, Dilbar, Azzam each show up in 5+ files).
//
// Resolution key: normalized(name) + normalized(builder) + LOA-bucket
// (±1m tolerance). See resolveYacht()/classifyCandidate() below for the
// exact precedence rules, including the documented fallbacks:
//   - if builder or LOA is missing on one side, match on name + whichever
//     of the two is present and comparable on both sides.
//   - if neither builder nor LOA is comparable between two same-named
//     records (a "name-only" row, or a name shared with 2+ existing
//     candidates none of which is a definite match), attach
//     DETERMINISTICALLY rather than minting a new node: prefer a
//     candidate whose provenance already contains the current
//     sourceFile (so re-ingesting the same file is a pure no-op merge),
//     else the lexicographically-smallest candidate id. The ambiguity is
//     recorded in attrs._resolution.ambiguous_name_only rather than
//     silently guessed away. This keeps re-runs idempotent: an earlier
//     version merged into a NEW node every time a name-only row was
//     ambiguous, so a single ambiguous row caused unbounded node growth
//     on every re-ingest (see regression test "ambiguous name-only
//     resolution stays idempotent").
// A same name + definitively different builder/LOA is treated as a
// different yacht (e.g. two different boats named "Serenity").
//
// Merge semantics: for each attribute, the first non-empty value wins;
// a later, differing non-empty value is preserved in attrs.conflicts
// rather than silently dropped. provenance accumulates every source file
// the yacht was seen in.

import { upsertNode, upsertEdge } from '../db.js';
import {
  normalizeName,
  isEmptyValue,
  slug,
  parseLength,
  lengthsMatch,
  parseMoney,
  parseIntSafe,
  parseYear,
} from './normalize.js';

// A yacht table must have a "name" column plus at least one of these to be
// trusted as yacht data (guards against corpus files that lie about their
// own contents, e.g. a salary table appearing in a yacht-scrape file).
const REQUIRED_ANY_OF = ['builder', 'loa', 'year'];

// Header slugs (produced by tableParser's normalizeHeader) that aren't in
// its canonical alias map but recur in the corpus for "estimated value",
// "key features", "owner", and combined "guests/crew" columns. e.g. file
// 13's real header is "Owner (Verified)" -> slugs to "owner_verified", not
// the canonical "owner" alias; file 42's "Guests/Crew" -> "guests_crew"
// holds a combined "12/46" cell rather than separate guests/crew columns.
const VALUE_KEYS = ['value', 'estimated_value', 'est_value'];
const FEATURES_KEYS = ['features', 'key_features'];
const OWNER_KEYS = ['owner', 'owner_verified'];
const GUESTS_CREW_KEYS = ['guests_crew'];

/**
 * Maps every yacht-shaped table found in `tables` into Yacht/Builder/
 * Person nodes + BUILT_BY/OWNED_BY edges in `db`, tagging every node with
 * `sourceFile` as provenance. Tables that don't look like yacht data
 * (missing "name", or missing all of builder/loa/year) are skipped and
 * reported in `skippedTables` rather than guessed at.
 *
 * Returns { yachts, builders, persons, edges, skippedTables }: counts of
 * rows processed into each node type / edge, plus the list of skipped
 * tables (by index + raw headers, for diagnostics).
 */
export function mapYachtTables(db, tables, sourceFile) {
  const skippedTables = [];
  let yachts = 0;
  let builders = 0;
  let persons = 0;
  let edges = 0;

  let candidates = loadYachtCandidates(db);

  tables.forEach((table, index) => {
    if (!isYachtTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      if (isEmptyValue(row.name)) continue; // no name -> nothing to resolve

      const result = processRow(db, row, sourceFile, candidates);
      candidates = result.candidates;
      yachts += 1;
      if (result.builderTouched) builders += 1;
      if (result.personTouched) persons += 1;
      edges += result.edgesTouched;
    }
  });

  return { yachts, builders, persons, edges, skippedTables };
}

function isYachtTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!present.has('name')) return false;
  return REQUIRED_ANY_OF.some((key) => present.has(key));
}

function loadYachtCandidates(db) {
  const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht'").all();
  return rows.map((row) => {
    const attrs = parseAttrsJson(row.attrs_json);
    const resolution = attrs._resolution || {};
    return {
      id: row.id,
      nameNorm: resolution.nameNorm ?? '',
      builderId: resolution.builderId ?? null,
      loaMeters:
        attrs.loa && typeof attrs.loa.meters === 'number' ? attrs.loa.meters : null,
      // TASK-023 item 0 fix: graphCleanup.js's YACHT_QUALITY_CORRECTIONS
      // (e.g. EIV, MYSTERE) rewrites a node's loa.meters to the researched
      // correct value but the /knowledge corpus's raw row is never
      // rewritten — a re-ingest sees the same historical (pre-correction)
      // raw LOA every time. loaAliasMeters carries that historical value
      // forward so classifyCandidate() below can recognize it as the SAME
      // yacht rather than a definite LOA mismatch (see this node's own
      // attrs.loa_aliases, set by applyYachtQualityCorrections).
      loaAliasMeters: Array.isArray(attrs.loa_aliases) ? attrs.loa_aliases : [],
      provenance: attrs.provenance || [],
    };
  });
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

/**
 * Classifies whether `existing` and `candidate` (both { nameNorm,
 * builderId, loaMeters }, same nameNorm guaranteed by caller) represent
 * the same yacht:
 *   'MATCH'   — at least one of builder/LOA is comparable (present on
 *               both sides) and none of the comparable fields disagree.
 *   'MISMATCH'— a comparable field (builder or LOA) disagrees: this is
 *               definitely a different yacht despite the shared name.
 *   'UNKNOWN' — neither builder nor LOA is comparable between the two
 *               (at least one is missing on one side for both fields):
 *               not enough evidence either way.
 *
 * TASK-023 item 0 fix: an LOA disagreement is NOT a mismatch when the
 * candidate's raw LOA matches one of `existing.loaAliasMeters` — the
 * historical (pre-quality-correction) LOA value graphCleanup.js's
 * YACHT_QUALITY_CORRECTIONS preserves precisely so a re-ingest of the same,
 * still-uncorrected /knowledge row keeps resolving onto the corrected node
 * instead of being classified as a different yacht and minting a
 * disambiguated "-2" sibling (yacht:eiv-2, yacht:mystere-2 were the two
 * real-corpus repeat offenders before this fix).
 */
function classifyCandidate(existing, candidate) {
  const builderComparable = Boolean(existing.builderId) && Boolean(candidate.builderId);
  const loaComparable =
    typeof existing.loaMeters === 'number' && typeof candidate.loaMeters === 'number';

  if (builderComparable && existing.builderId !== candidate.builderId) return 'MISMATCH';

  if (loaComparable) {
    const matchesCurrentLoa = lengthsMatch(existing.loaMeters, candidate.loaMeters);
    const matchesLoaAlias = (existing.loaAliasMeters || []).some((aliasMeters) =>
      lengthsMatch(aliasMeters, candidate.loaMeters)
    );
    if (!matchesCurrentLoa && !matchesLoaAlias) return 'MISMATCH';
  }

  if (builderComparable || loaComparable) return 'MATCH';
  return 'UNKNOWN';
}

/**
 * Finds the existing candidate (if any) that `candidate` should be merged
 * into, applying the resolution/fallback rules documented at the top of
 * this file. Returns null when a brand-new yacht node should be created,
 * otherwise { candidate: <matched candidate>, ambiguous: boolean,
 * ambiguousWith: string[] | undefined } — `ambiguous: true` means the
 * merge target was chosen deterministically among 2+ same-name
 * candidates with no comparable evidence either way (not a confirmed
 * match), which the caller records in attrs._resolution so it's visible,
 * not silently guessed.
 */
function resolveYacht(candidates, candidate, sourceFile) {
  const sameName = candidates.filter((c) => c.nameNorm === candidate.nameNorm);
  if (sameName.length === 0) return null;

  const classified = sameName.map((c) => ({ c, cls: classifyCandidate(c, candidate) }));

  // A single same-name candidate: merge into it unless it's a definite
  // mismatch (comparable field disagreement -> genuinely a different
  // yacht despite the shared name).
  if (sameName.length === 1) {
    return classified[0].cls === 'MISMATCH' ? null : { candidate: classified[0].c, ambiguous: false };
  }

  const definiteMatch = classified.find((x) => x.cls === 'MATCH');
  if (definiteMatch) return { candidate: definiteMatch.c, ambiguous: false };

  // 2+ same-name candidates, none a definite match. If every one of them
  // is a definite MISMATCH, this is genuinely a new, different yacht —
  // create a new node (bounded: distinct real yachts, not an
  // unresolvable ambiguity).
  const unknowns = classified.filter((x) => x.cls === 'UNKNOWN').map((x) => x.c);
  if (unknowns.length === 0) return null;

  // Ambiguous: no comparable evidence distinguishes these candidates.
  // Minting a new node here would grow unboundedly on every re-run (the
  // same ambiguity recurs each time). Resolve deterministically instead:
  //   1. Prefer a candidate this exact sourceFile has already
  //      contributed to (a re-ingest of the same file becomes a no-op
  //      merge into whichever candidate it originally picked).
  //   2. Otherwise, the lexicographically-smallest candidate id (stable
  //      across runs regardless of provenance/insertion order).
  const sorted = [...unknowns].sort((a, b) => {
    const aSeen = (a.provenance || []).includes(sourceFile) ? 0 : 1;
    const bSeen = (b.provenance || []).includes(sourceFile) ? 0 : 1;
    if (aSeen !== bSeen) return aSeen - bSeen;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return {
    candidate: sorted[0],
    ambiguous: true,
    ambiguousWith: unknowns.map((c) => c.id).sort(),
  };
}

function generateYachtId(db, name, builderRaw) {
  const base = `yacht:${slug(normalizeName(name))}`;
  if (!nodeExists(db, base)) return base;

  const builderSlug = !isEmptyValue(builderRaw) ? slug(normalizeName(builderRaw)) : null;
  if (builderSlug) {
    const withBuilder = `${base}-${builderSlug}`;
    if (!nodeExists(db, withBuilder)) return withBuilder;
  }

  let n = 2;
  let candidateId = `${base}-${n}`;
  while (nodeExists(db, candidateId)) {
    n += 1;
    candidateId = `${base}-${n}`;
  }
  return candidateId;
}

function pickFirstPresent(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && !isEmptyValue(row[key])) return row[key];
  }
  return undefined;
}

function buildLengthAttr(raw) {
  if (isEmptyValue(raw)) return null;
  return { meters: parseLength(raw), raw: String(raw).trim() };
}

function buildYearAttr(raw) {
  if (isEmptyValue(raw)) return null;
  return { value: parseYear(raw), raw: String(raw).trim() };
}

// Splits a combined "Guests/Crew" cell (e.g. "12/46", "12/NA") into its
// two halves and parses each independently. Either half may itself be
// empty/unknown ("12/NA" -> crew: null).
function parseGuestsCrew(raw) {
  if (isEmptyValue(raw)) return { guests: null, crew: null };
  const [guestsPart, crewPart] = String(raw).split('/');
  return {
    guests: guestsPart !== undefined ? parseIntSafe(guestsPart) : null,
    crew: crewPart !== undefined ? parseIntSafe(crewPart) : null,
  };
}

function buildRowFields(row) {
  let guests = isEmptyValue(row.guests) ? null : parseIntSafe(row.guests);
  let crew = isEmptyValue(row.crew) ? null : parseIntSafe(row.crew);

  if (guests === null || crew === null) {
    const combinedRaw = pickFirstPresent(row, GUESTS_CREW_KEYS);
    if (combinedRaw !== undefined) {
      const parsed = parseGuestsCrew(combinedRaw);
      if (guests === null) guests = parsed.guests;
      if (crew === null) crew = parsed.crew;
    }
  }

  return {
    loa: buildLengthAttr(row.loa),
    beam: buildLengthAttr(row.beam),
    year: buildYearAttr(row.year),
    value: parseMoney(pickFirstPresent(row, VALUE_KEYS)),
    weekly_rate: parseMoney(row.weekly_rate),
    guests,
    cabins: isEmptyValue(row.cabins) ? null : parseIntSafe(row.cabins),
    crew,
    features: pickFirstPresent(row, FEATURES_KEYS) ?? null,
    location: isEmptyValue(row.region) ? null : String(row.region).trim(),
  };
}

const MERGEABLE_FIELDS = [
  'loa',
  'beam',
  'year',
  'value',
  'weekly_rate',
  'guests',
  'cabins',
  'crew',
  'features',
  'location',
];

function fieldsEqual(fieldName, a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;

  switch (fieldName) {
    case 'loa':
    case 'beam':
      if (typeof a.meters === 'number' && typeof b.meters === 'number') {
        return lengthsMatch(a.meters, b.meters);
      }
      return a.raw === b.raw;
    case 'year':
      if (typeof a.value === 'number' && typeof b.value === 'number') return a.value === b.value;
      return a.raw === b.raw;
    case 'value':
    case 'weekly_rate':
      if (typeof a.amount === 'number' && typeof b.amount === 'number') {
        return a.amount === b.amount && a.currency === b.currency;
      }
      return a.raw === b.raw;
    case 'guests':
    case 'cabins':
    case 'crew':
      return a === b;
    case 'features':
    case 'location':
      return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
    default:
      return a === b;
  }
}

function rawOf(fieldName, value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && 'raw' in value) return value.raw;
  return value;
}

/**
 * Merges `incoming` field values onto `existingAttrs` (the yacht node's
 * previously stored attrs, or {} for a brand-new node): first non-empty
 * value wins per field; a later differing non-empty value is appended to
 * attrs.conflicts[field] instead of being dropped. provenance accumulates
 * every distinct source file.
 */
function mergeAttrs(existingAttrs, incomingFields, sourceFile, resolution) {
  const merged = { ...existingAttrs };
  const conflicts = { ...(existingAttrs.conflicts || {}) };

  for (const field of MERGEABLE_FIELDS) {
    const oldVal = existingAttrs[field] ?? null;
    const newVal = incomingFields[field] ?? null;

    if (oldVal === null) {
      merged[field] = newVal;
    } else if (newVal === null) {
      merged[field] = oldVal;
    } else if (fieldsEqual(field, oldVal, newVal)) {
      merged[field] = oldVal;
    } else {
      merged[field] = oldVal;
      conflicts[field] = [...(conflicts[field] || []), rawOf(field, newVal)];
    }
  }

  if (Object.keys(conflicts).length > 0) merged.conflicts = conflicts;

  const provenance = existingAttrs.provenance || [];
  merged.provenance = provenance.includes(sourceFile) ? provenance : [...provenance, sourceFile];

  merged._resolution = resolution;

  return merged;
}

function processRow(db, row, sourceFile, candidates) {
  const nameNorm = normalizeName(row.name);
  const builderRaw = row.builder;
  const builderId = !isEmptyValue(builderRaw) ? `builder:${slug(normalizeName(builderRaw))}` : null;
  const loaMeters = parseLength(row.loa);

  const rowCandidate = { nameNorm, builderId, loaMeters };
  const resolved = resolveYacht(candidates, rowCandidate, sourceFile);

  let yachtId;
  let existingAttrs = {};
  let existingName = null;
  if (resolved) {
    yachtId = resolved.candidate.id;
    const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(yachtId);
    existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
    existingName = existingRow ? existingRow.name : null;
  } else {
    yachtId = generateYachtId(db, row.name, builderRaw);
  }

  const resolution = {
    nameNorm,
    builderId: builderId || existingAttrs?._resolution?.builderId || null,
    ...(resolved && resolved.ambiguous
      ? { ambiguous_name_only: true, candidates: resolved.ambiguousWith }
      : {}),
  };

  const incomingFields = buildRowFields(row);
  const mergedAttrs = mergeAttrs(existingAttrs, incomingFields, sourceFile, resolution);

  const finalName = !isEmptyValue(existingName) ? existingName : String(row.name).trim();

  upsertNode(db, { id: yachtId, type: 'yacht', name: finalName, attrs: mergedAttrs });

  const updatedCandidate = {
    id: yachtId,
    nameNorm,
    builderId: resolution.builderId,
    loaMeters:
      mergedAttrs.loa && typeof mergedAttrs.loa.meters === 'number' ? mergedAttrs.loa.meters : null,
    provenance: mergedAttrs.provenance || [],
  };
  const nextCandidates = candidates.filter((c) => c.id !== yachtId).concat(updatedCandidate);

  let edgesTouched = 0;
  let builderTouched = false;
  let personTouched = false;

  if (builderId) {
    upsertNode(db, { id: builderId, type: 'builder', name: String(builderRaw).trim() });
    upsertEdge(db, { src: yachtId, rel: 'built_by', dst: builderId });
    builderTouched = true;
    edgesTouched += 1;
  }

  const ownerRaw = pickFirstPresent(row, OWNER_KEYS);
  if (!isEmptyValue(ownerRaw)) {
    const personId = `person:${slug(normalizeName(ownerRaw))}`;
    upsertNode(db, { id: personId, type: 'person', name: String(ownerRaw).trim() });
    upsertEdge(db, { src: yachtId, rel: 'owned_by', dst: personId });
    personTouched = true;
    edgesTouched += 1;
  }

  return { candidates: nextCandidates, builderTouched, personTouched, edgesTouched };
}
