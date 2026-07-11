// ingest/src/mappers/yachtSpecMapper.js
//
// TASK-020: maps parsed yacht-spec-completion tables (curated from
// research/round3/yacht-specs.md into knowledge/93) onto EXISTING 'yacht'
// nodes, by exact-then-normalized name. Real header shape:
//   Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max
//   Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes
//
// "Yacht" is a BARE header — tableParser's ALIAS_MAP only aliases "Yacht
// Name"/"Name"/"Vessel" to the canonical "name" key, not bare "Yacht" — so
// this guard deliberately treats 'yacht' as its own identifier column,
// distinct from every other mapper's 'name'/'builder'/'designer'/'marina'
// identifier (see ingest/tests/guardCollisions.spec.js's matrix).
//
// UNLIKE every enrichment mapper before it (which mints a new node when no
// match is found — builderEnrichmentMapper.js mints ~2, designerMapper.js
// mints ~50), this mapper NEVER creates a yacht node. A row that doesn't
// resolve onto an existing yacht node is counted as `unresolved` and its
// name reported in `unresolvedNames`, never minted — per the ticket
// ("Unresolved rows -> counted + reported, not created").
//
// RESOLUTION: exact case-insensitive name match first; when 2+ yacht nodes
// share that exact name (a known graph hazard — the corpus mints a
// `-<builder-slug>` suffixed id when yachtMapper.js sees a same-named,
// definitely-different yacht, see that module's own header), disambiguate
// by the row's own LOA column against each candidate's existing loa.meters
// (closest wins), falling back to the lexicographically-smallest id when
// LOA can't disambiguate (neither side has a comparable value, or they
// tie) — deterministic, so a re-ingest never picks a different candidate.
// knowledge/93's own Curation notes document every row that needed the
// Yacht cell curated to resolve unambiguously (the 7 renames, in
// particular) plus every row left ambiguous/unresolved on purpose.
//
// CONFLICTING SOURCE VALUES: per the ticket, uses the yacht mapper's own
// attrs.conflicts convention (see yachtMapper.js's mergeAttrs) rather than
// silently picking a value — both for a field that already carries a
// DIFFERENT value from yachtMapper's own corpus ingestion (e.g. `beam`,
// which yachtMapper already populates), and for the two cells research
// itself flagged as source-conflicted (Al Lusail's beam, Yersin's flag),
// curated in knowledge/93 into an explicit, parseable
// "<primary> [conflict: <alt1>, <alt2>]" marker (see splitConflictMarker).
//
// NUMERIC PARSING DISCIPLINE (full, per the ticket): strips thousands-
// separator commas and a leading "~" approx marker BEFORE matching (same
// HIGH-severity lesson as shipyardMapper.js's tonnage fix), and rejects a
// digit run immediately adjacent to a letter on either side (same fix as
// engineModelMapper.js's power_hp "V8" bug — NUMBER_RE below is identical).
// Range-sanity locks (beam [3,35], draft [1,12], gt [50,25000], max_speed
// [5,80], range_nm [500,20000]) are enforced as a real-corpus TEST
// (realCorpusExport.spec.js), not a parse-time rejection — a value outside
// range is still stored (so a genuine data error surfaces immediately in
// that test) rather than silently dropped.

import { upsertNode } from '../db.js';
import {
  isEmptyValue,
  normalizeName,
  appendProvenance,
  pickFirstPresent,
  isPlausibleEntityName,
  parseLength,
  lengthsMatch,
} from './normalize.js';

const NAME_KEYS = ['yacht'];
const LOA_KEYS = ['loa']; // used ONLY for disambiguation among same-named nodes — never stored by this mapper.
const BEAM_KEYS = ['beam_m'];
const DRAFT_KEYS = ['draft_m'];
const GT_KEYS = ['gt'];
const MAX_SPEED_KEYS = ['max_speed_kn'];
const RANGE_KEYS = ['range_nm'];
const FLAG_KEYS = ['flag'];
const CLASS_SOCIETY_KEYS = ['class_society'];
const IMO_KEYS = ['imo'];
const NOTES_KEYS = ['notes'];

// A table must have the yacht identifier column PLUS at least 2 of these
// yacht-spec-specific signals to be trusted as this shape (same "highly
// specific" 2-of-N pattern as every enrichment guard this project uses).
const SPECIFIC_SIGNAL_KEYS = [...BEAM_KEYS, ...DRAFT_KEYS, ...GT_KEYS];
const MIN_SPECIFIC_SIGNALS = 2;

function isYachtSpecTable(table) {
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

// Same lookbehind/lookahead letter-adjacency guard as engineModelMapper.js's
// power_hp fix (HIGH regression precedent: "various V8 racing engines"
// matched the bare "8" out of "V8").
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

// "<primary> [conflict: <alt1>, <alt2>]" -> { primary: '<primary>', conflicts: ['<alt1>', '<alt2>'] }.
// Curated marker format (see module header) for the handful of cells
// research itself flagged as genuinely disputed between two sources.
const CONFLICT_MARKER_RE = /^(.*?)\s*\[conflict:\s*(.+?)\]\s*$/i;

function splitConflictMarker(raw) {
  if (isEmptyValue(raw)) return { primary: raw, conflicts: [] };
  const s = String(raw).trim();
  const m = s.match(CONFLICT_MARKER_RE);
  if (!m) return { primary: s, conflicts: [] };
  const conflicts = m[2]
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return { primary: m[1].trim(), conflicts };
}

// Small, hand-grounded set of confirmed renames (research/round3/
// yacht-specs.md's "Renames found" section) — keyed by the CURRENT name's
// normalized form, mirroring engineMapper.js's OEM_SUPPLIES_PAIRS/
// graphCleanup.js's QUALITY_FLAGS convention (a tiny data-driven map with
// provenance comments, not prose-parsed from Notes). "Kaos" and "Whisper"
// are only reachable here after knowledge/93's Yacht-cell curation (see
// that file's own Curation notes) resolves their rows onto the CURRENT
// name; "Jubilee"/"Lana"/"CC-Summer"/"Kismet (95.2m)"'s own OLD-name nodes
// are separately merged away by graphCleanup.js's YACHT_MERGE_MAP.
const FORMER_NAMES_MAP = {
  'a+': ['Topaz'],
  kaos: ['Jubilee', 'Secret III'],
  mar: ['Lana'],
  madsummer: ['CC-Summer'],
  zeus: ['Eco'],
  multiverse: ['Ulysses'],
  whisper: ['Kismet'],
};

/**
 * Resolves a Yacht cell to an existing yacht node id: exact case-
 * insensitive name match; when 2+ nodes share that name, disambiguates by
 * the row's own LOA against each candidate's stored loa.meters (closest
 * wins; ties and "neither side comparable" fall back to the
 * lexicographically-smallest id, deterministic across re-ingests). Returns
 * null when no yacht node has this name at all (never mints one — see
 * module header).
 */
function resolveYachtId(db, nameRaw, loaRaw) {
  const trimmed = String(nameRaw).trim();
  const candidates = db
    .prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht' AND LOWER(name) = LOWER(?)")
    .all(trimmed);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;

  const withLoa = candidates.map((c) => {
    const attrs = parseAttrsJson(c.attrs_json);
    const loaMeters = attrs.loa && typeof attrs.loa.meters === 'number' ? attrs.loa.meters : null;
    return { id: c.id, loaMeters };
  });

  const rowLoa = parseLength(loaRaw);
  if (rowLoa !== null) {
    const comparable = withLoa.filter((c) => typeof c.loaMeters === 'number');
    if (comparable.length > 0) {
      comparable.sort((a, b) => {
        const diff = Math.abs(a.loaMeters - rowLoa) - Math.abs(b.loaMeters - rowLoa);
        return diff !== 0 ? diff : a.id < b.id ? -1 : 1;
      });
      return comparable[0].id;
    }
  }

  return withLoa.map((c) => c.id).sort()[0];
}

// Generic "first non-empty wins, a later differing value goes to
// attrs.conflicts rather than being dropped" merge for one field — mirrors
// yachtMapper.js's own mergeAttrs()/fieldsEqual() convention exactly (see
// this module's own header), applied here to the 8 new spec fields (plus
// `beam`, which yachtMapper.js may already have populated from the
// original corpus).
function mergeFieldWithConflict(existingAttrs, field, incomingValue, isEqualFn, rawOfFn) {
  const oldVal = existingAttrs[field] ?? null;
  if (oldVal === null || oldVal === undefined) return { value: incomingValue, conflict: null };
  if (incomingValue === null || incomingValue === undefined) return { value: oldVal, conflict: null };
  if (isEqualFn(oldVal, incomingValue)) return { value: oldVal, conflict: null };
  return { value: oldVal, conflict: rawOfFn(incomingValue) };
}

function lengthFieldsEqual(a, b) {
  if (typeof a.meters === 'number' && typeof b.meters === 'number') return lengthsMatch(a.meters, b.meters);
  return a.raw === b.raw;
}

function lengthRawOf(value) {
  return value && typeof value === 'object' && 'raw' in value ? value.raw : String(value);
}

function scalarFieldsEqual(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function scalarRawOf(value) {
  return String(value);
}

/**
 * Maps every yacht-spec-shaped table found in `tables` onto EXISTING yacht
 * nodes in `db` (never minting one), recording new spec attrs (beam,
 * draft, gt, max_speed, range_nm, flag, class_society, imo,
 * former_names), with source-conflicting values recorded in
 * attrs.conflicts rather than silently overwritten. Tables that don't look
 * like this shape are skipped and reported in `skippedTables`.
 *
 * Returns { matched, unresolved, unresolvedNames, skippedTables }.
 */
export function mapYachtSpecTables(db, tables, sourceFile) {
  const skippedTables = [];
  let matched = 0;
  let unresolved = 0;
  const unresolvedNames = [];

  tables.forEach((table, index) => {
    if (!isYachtSpecTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    for (const row of table.rows) {
      const nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (isEmptyValue(nameRaw) || !isPlausibleEntityName(nameRaw)) continue;

      const yachtId = resolveYachtId(db, nameRaw, pickFirstPresent(row, LOA_KEYS));
      if (!yachtId) {
        unresolved += 1;
        unresolvedNames.push(String(nameRaw).trim());
        continue;
      }

      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(yachtId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const merged = { ...existingAttrs };
      const conflicts = { ...(existingAttrs.conflicts || {}) };

      const addConflict = (field, altRaw) => {
        if (!altRaw) return;
        const existingList = conflicts[field] || [];
        conflicts[field] = existingList.includes(altRaw) ? existingList : [...existingList, altRaw];
      };

      // beam / draft: length-shaped ({ meters, raw }), curated-conflict-aware.
      const beamCell = splitConflictMarker(pickFirstPresent(row, BEAM_KEYS));
      const incomingBeam = buildLengthAttr(beamCell.primary);
      if (incomingBeam) {
        const { value, conflict } = mergeFieldWithConflict(existingAttrs, 'beam', incomingBeam, lengthFieldsEqual, lengthRawOf);
        merged.beam = value;
        if (conflict) addConflict('beam', conflict);
      }
      for (const alt of beamCell.conflicts) addConflict('beam', alt);

      const draftCell = splitConflictMarker(pickFirstPresent(row, DRAFT_KEYS));
      const incomingDraft = buildLengthAttr(draftCell.primary);
      if (incomingDraft) {
        const { value, conflict } = mergeFieldWithConflict(existingAttrs, 'draft', incomingDraft, lengthFieldsEqual, lengthRawOf);
        merged.draft = value;
        if (conflict) addConflict('draft', conflict);
      }
      for (const alt of draftCell.conflicts) addConflict('draft', alt);

      // gt / max_speed / range_nm: plain numbers.
      const gtValue = parseNumeric(pickFirstPresent(row, GT_KEYS));
      if (gtValue !== null) {
        const { value, conflict } = mergeFieldWithConflict(existingAttrs, 'gt', gtValue, (a, b) => a === b, scalarRawOf);
        merged.gt = value;
        if (conflict) addConflict('gt', conflict);
      }

      const maxSpeedValue = parseNumeric(pickFirstPresent(row, MAX_SPEED_KEYS));
      if (maxSpeedValue !== null) {
        const { value, conflict } = mergeFieldWithConflict(existingAttrs, 'max_speed', maxSpeedValue, (a, b) => a === b, scalarRawOf);
        merged.max_speed = value;
        if (conflict) addConflict('max_speed', conflict);
      }

      const rangeValue = parseNumeric(pickFirstPresent(row, RANGE_KEYS));
      if (rangeValue !== null) {
        const { value, conflict } = mergeFieldWithConflict(existingAttrs, 'range_nm', rangeValue, (a, b) => a === b, scalarRawOf);
        merged.range_nm = value;
        if (conflict) addConflict('range_nm', conflict);
      }

      // flag / class_society: plain strings, curated-conflict-aware for flag.
      const flagCell = splitConflictMarker(pickFirstPresent(row, FLAG_KEYS));
      if (!isEmptyValue(flagCell.primary)) {
        const incomingFlag = String(flagCell.primary).trim();
        const { value, conflict } = mergeFieldWithConflict(existingAttrs, 'flag', incomingFlag, scalarFieldsEqual, scalarRawOf);
        merged.flag = value;
        if (conflict) addConflict('flag', conflict);
      }
      for (const alt of flagCell.conflicts) addConflict('flag', alt);

      const classSocietyRaw = pickFirstPresent(row, CLASS_SOCIETY_KEYS);
      if (!isEmptyValue(classSocietyRaw)) {
        const { value, conflict } = mergeFieldWithConflict(
          existingAttrs,
          'class_society',
          String(classSocietyRaw).trim(),
          scalarFieldsEqual,
          scalarRawOf
        );
        merged.class_society = value;
        if (conflict) addConflict('class_society', conflict);
      }

      // imo: plain string (per the ticket), not a parsed number.
      const imoRaw = pickFirstPresent(row, IMO_KEYS);
      if (!isEmptyValue(imoRaw)) {
        const { value, conflict } = mergeFieldWithConflict(existingAttrs, 'imo', String(imoRaw).trim(), scalarFieldsEqual, scalarRawOf);
        merged.imo = value;
        if (conflict) addConflict('imo', conflict);
      }

      if (Object.keys(conflicts).length > 0) merged.conflicts = conflicts;

      // former_names: small hand-grounded map, keyed by the (curated) Yacht
      // cell's normalized current name — see FORMER_NAMES_MAP above.
      const formerNames = FORMER_NAMES_MAP[normalizeName(nameRaw)];
      if (formerNames && !merged.former_names) merged.former_names = formerNames;

      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = existingRow ? existingRow.name : String(nameRaw).trim();
      upsertNode(db, { id: yachtId, type: 'yacht', name: finalName, attrs: merged });
      matched += 1;
    }
  });

  return { matched, unresolved, unresolvedNames, skippedTables };
}

export { isYachtSpecTable };
