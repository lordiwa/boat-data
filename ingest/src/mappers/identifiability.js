// ingest/src/mappers/identifiability.js
//
// TASK-024 (Rule B — supersedes TASK-023 item 4's Rule A/v1): yacht
// identifiability classification — a programmatic (NOT hand-curated)
// retrofit hook, same "run once, after every file's nodes/edges exist,
// called from ingest.js" pattern as graphCleanup.js's applyGraphCleanup() /
// regionCanonicalization.js's applyRegionCanonicalization(). Tags every
// yacht node with `attrs.identifiability: 'identifiable' | 'fragment'`,
// RE-DERIVED FROM SCRATCH on every ingest run (never a stored judgment call
// that could drift from the graph's actual state — there is no
// hand-curated map here, unlike YACHT_MERGE_MAP/YACHT_QUALITY_CORRECTIONS).
//
// RULE B (per the TASK-024 ticket, replacing v1's "any ONE signal is
// enough" rule, which the TASK-023 review found too generous): a yacht is
// IDENTIFIABLE only when it carries AT LEAST TWO of the following four
// independent signals:
//   1. year         — `attrs.year` present (a build/delivery year known).
//   2. built_by     — a MEANINGFUL `built_by` edge: excludes edges to
//                      `builder:various`/`builder:custom` explicitly, and
//                      to any builder node graphCleanup.js's
//                      SUSPECT_NODE_ACTIONS 'flag' action has stamped
//                      `attrs.placeholder = true` on (mixed, custom-rebuild,
//                      motorsailer, ...) — a generic catch-all shipyard
//                      tag is not real identity evidence.
//   3. spec attr    — any of gt/beam/draft/max_speed/range_nm/flag/imo
//                      present (yachtSpecMapper.js's 7 non-length-schema-
//                      overlapping spec fields... beam/draft ARE
//                      length-shaped {meters,raw} objects, still counted).
//   4. research     — "covered by a research pass": attrs.provenance
//                      contains 93_Yacht_Spec_Completion.md or
//                      97_Yacht_Spec_Completion_Round6.md, OR
//                      attrs.data_quality is set, OR attrs.former_names is
//                      non-empty (same three sub-conditions as v1's single
//                      research-coverage signal).
//
// NEGATIVE EVIDENCE (new in Rule B): research/round5's four band files each
// document, in their own "Coverage notes" (or in-body "Skipped..." /
// "Flagged as conflicts" sections), specific yacht NAMES they explicitly
// could NOT confidently resolve to one real vessel — either because the
// name is a generic, multiply-reused charter-listing fragment with no
// distinguishing detail, or because a same-named real vessel exists
// publicly but its documented specs contradict this graph node's own
// LOA/builder (a probable data/parsing error or an unconfirmed private
// build). NEGATIVE_EVIDENCE_TABLE below is that skip-list, carried into
// code as an explicit table (one row per name, each citing the exact
// source file + section it came from — see the citation strings). A
// skip-listed name can still be IDENTIFIABLE, but only if it ALSO carries
// a spec attr or research-pass coverage (signals 3/4 above) — i.e. having
// merely a year + a non-excluded builder edge (signals 1+2) is NOT enough
// for a name research has flagged as an unconfirmed/ambiguous match. This
// is what correctly demotes cases like "AQA" and "The Jackson" (both carry
// a year AND a real-looking builder edge from the primary corpus scrape,
// which would clear Rule B's base >=2 threshold on signals 1+2 alone) back
// to fragment: round5 research specifically found NO public vessel matching
// this graph node's exact name+builder+size combination, so the "identity"
// itself is unconfirmed, not merely under-specified.
//
// Flags only; NEVER deletes a node.
//
// completenessScore.js's dual-scoring (item 4's other half, unchanged by
// this ticket) reads this same attrs.identifiability to compute the
// identifiable-only yacht score.

import { upsertNode } from '../db.js';
import { normalizeName } from './normalize.js';

// The two yacht-spec-completion research docs whose provenance alone
// counts as "covered by a research pass" — see this module's own rule
// above. Kept as a small, explicit list (not a generic "any provenance
// counts" rule) because EVERY yacht node already carries at least one
// provenance entry from whichever raw corpus file first mentioned it
// (yachtMapper.js stamps that on every row) — provenance alone is not a
// meaningful "was this yacht specifically researched" signal; only these
// two dedicated enrichment docs are.
const RESEARCH_COVERAGE_PROVENANCE = new Set([
  '93_Yacht_Spec_Completion.md',
  '97_Yacht_Spec_Completion_Round6.md',
]);

// yachtSpecMapper.js's own spec-attr fields (per the ticket): gt, beam,
// draft, max_speed, range_nm, flag, imo. beam/draft are length-shaped
// ({ meters, raw }) objects; the rest are scalars (number or string).
const SPEC_ATTR_KEYS = ['gt', 'beam', 'draft', 'max_speed', 'range_nm', 'flag', 'imo'];

// Explicitly excluded regardless of whether graphCleanup.js has (yet, or
// ever will) stamp attrs.placeholder on them — the ticket names these two
// ids by hand, so a synthetic/unit-test graph that mints one directly
// (without running graphCleanup.js's SUSPECT_NODE_ACTIONS first) still
// gets the exclusion.
const EXPLICIT_PLACEHOLDER_BUILDER_IDS = new Set(['builder:various', 'builder:custom']);

// --- Negative-evidence skip list (research/round5 Coverage notes) --------
// Each group cites the exact source file + section the names came from.
// Matched against the yacht node's own `name`, normalized (case/diacritic/
// whitespace-insensitive) — see normalizeName() in normalize.js. A name
// appearing here is NOT itself a judgment that "this yacht is a fragment"
// (many popular charter names are reused across several genuinely
// different real hulls, some of which DO carry a spec attr or research
// provenance and clear the bar normally) — it only tightens the bar for
// whichever specific graph node(s) share that exact name AND have neither
// a spec attr nor research-pass coverage of their own (see hasSpecOrResearch
// below).
function withSource(names, source) {
  return names.map((name) => ({ name, source }));
}

export const NEGATIVE_EVIDENCE_TABLE = [
  ...withSource(
    [
      '4Life', 'A4A', 'Alaskan Story', 'Arsana', 'Atalante', 'BABAC', 'Bear Paw', 'Bellini', 'Benik',
      'Best of Me', 'Big Data', 'Blackwood', 'Centurion', 'Champagne & Caviar', 'Charade', 'Crazy Love',
      'Dauntless', 'Discovery', 'Fleur', 'Glacier Bear', 'Golden Eagle', 'Grey Wolf II', 'Greyb', 'Haze 2',
      'Heavenly', 'Kayana', "L'Octant", 'Laila', 'Largo', 'Life Time', 'Liquidity', 'Luciano', 'Martita',
      'Meme', 'Miredo', 'Mirka', 'Mr. K', 'Oceana', 'Voyager', 'Wallygator', 'wallywhy200',
    ],
    'research/round5/yacht-specs-under35m.md — Coverage notes: "Skipped generic sub-35m entries"'
  ),
  ...withSource(
    [
      'Ad Astra', 'Alta', 'Antheya III', 'Aqualibra', 'Arsana', 'Arya', 'Aurum Sky', 'Away', 'Babbo',
      'Charade', 'Desamis B', 'El Rey', 'Element', 'Emocean', 'Fat Bob', 'Fleur', 'Fortitude', 'FX',
      'Ghost II', 'Gioia', 'Grand Illusion', 'Grey', 'Haze II', 'Impulsive', 'Infinity Pacific', 'Kai',
      'Kathleen Anne', 'Kayana', 'Kijo', 'Koju', 'La Blanca', 'Lady Azul', 'Largo', 'Last Call',
      'Le Verseau', 'Life Time', 'Liquidity', 'Liv Love', 'Lucien', 'Mar Allure', 'Maverick',
      'Maximus III', 'Mirage IV', 'Moka', 'Morning Star', 'No.9', 'Octopussy', 'Oracle', 'Ourway',
      'Pura Vida', 'Reverie', 'S7', 'Safari Quest', 'Samsara Samudra', 'Serengeti', 'Silentworld',
      'Silver Dream', 'Stellamar', 'Summertime II', 'Sweet Escape', 'Takara One', "That's Amore",
      'The Beast', 'Thumper', 'Vauban', 'White Star', 'Yamakay', 'Brooklyn',
    ],
    'research/round5/yacht-specs-35-45m.md — "Skipped — generic charter-listing name, insufficient data to disambiguate" table'
  ),
  ...withSource(
    ['Angel', 'Firebird', 'Sea Eagle', 'Stavros'],
    'research/round5/yacht-specs-45-55m.md — Coverage notes: "Skipped — insufficient confidence to disambiguate"'
  ),
  ...withSource(
    ['AQA', 'Grace', 'Panam', 'Starburst IV', 'Night Fury II', 'Little Perle'],
    'research/round5/yacht-specs-45-55m.md — Coverage notes: "Flagged as conflicts"'
  ),
  ...withSource(
    ['The Jackson'],
    'research/round5/yacht-specs-35-45m.md — Researched table: "Conflict, not resolved" (The Jackson row)'
  ),
  ...withSource(
    ['Barbara Anne', 'Burrasca', 'Marguerite', 'Hampshire II', 'Katina', 'Lady Beth'],
    'research/round5/yacht-specs-55-70m.md — Coverage notes: "5 LOA/builder mismatches"'
  ),
  ...withSource(['Purpose'], 'research/round5/yacht-specs-55-70m.md — Coverage notes: "1 not found"'),
  ...withSource(
    ['Genesis', 'Kinda', 'Orion One', 'Party Girl', 'Polarfront', 'Prana', 'Spirit', 'Una Vida'],
    'research/round5/yacht-specs-55-70m.md — Coverage notes: "10 skipped as too generic to disambiguate"'
  ),
];

const NEGATIVE_EVIDENCE_NAMES = new Set(NEGATIVE_EVIDENCE_TABLE.map((entry) => normalizeName(entry.name)));

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function hasYear(attrs) {
  return Boolean(attrs.year);
}

function isPresentValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'object') {
    if ('meters' in value) return typeof value.meters === 'number' && !Number.isNaN(value.meters);
    return true;
  }
  return true;
}

function hasSpecAttr(attrs) {
  return SPEC_ATTR_KEYS.some((key) => isPresentValue(attrs[key]));
}

function isResearchCovered(attrs) {
  const provenance = Array.isArray(attrs.provenance) ? attrs.provenance : [];
  if (provenance.some((file) => RESEARCH_COVERAGE_PROVENANCE.has(file))) return true;
  if (attrs.data_quality) return true;
  if (Array.isArray(attrs.former_names) && attrs.former_names.length > 0) return true;
  return false;
}

function isPlaceholderBuilder(builderId, builderAttrs) {
  if (EXPLICIT_PLACEHOLDER_BUILDER_IDS.has(builderId)) return true;
  return Boolean(builderAttrs && builderAttrs.placeholder === true);
}

/**
 * Loads every yacht id that carries at least one MEANINGFUL built_by edge
 * (excludes builder:various/builder:custom and any placeholder-flagged
 * builder — see module header).
 */
function loadMeaningfulBuiltByYachtIds(db) {
  const builderRows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'builder'").all();
  const builderAttrsById = new Map(builderRows.map((row) => [row.id, parseAttrsJson(row.attrs_json)]));

  const builtByEdges = db.prepare("SELECT src, dst FROM edges WHERE rel = 'built_by'").all();
  const meaningful = new Set();
  for (const { src, dst } of builtByEdges) {
    if (meaningful.has(src)) continue;
    if (!isPlaceholderBuilder(dst, builderAttrsById.get(dst))) meaningful.add(src);
  }
  return meaningful;
}

/**
 * Runs the identifiability classification pass (see module header):
 * tags every yacht node's `attrs.identifiability` as 'identifiable' or
 * 'fragment'. Idempotent AND non-accumulating — every call re-derives the
 * classification from the node's CURRENT attrs/edges from scratch (a
 * fragment that later gains enough signals is correctly reclassified as
 * identifiable on the next call, never stuck with a stale tag).
 *
 * Returns { identifiable, fragment } counts.
 */
export function classifyYachtIdentifiability(db) {
  const rows = db.prepare("SELECT id, type, name, attrs_json FROM nodes WHERE type = 'yacht'").all();
  const meaningfulBuiltByYachtIds = loadMeaningfulBuiltByYachtIds(db);

  let identifiable = 0;
  let fragment = 0;

  for (const row of rows) {
    const attrs = parseAttrsJson(row.attrs_json);

    const signals = [
      hasYear(attrs),
      meaningfulBuiltByYachtIds.has(row.id),
      hasSpecAttr(attrs),
      isResearchCovered(attrs),
    ];
    const signalCount = signals.filter(Boolean).length;
    const baseIdentifiable = signalCount >= 2;

    const hasSpecOrResearch = hasSpecAttr(attrs) || isResearchCovered(attrs);
    const isSkipListed = NEGATIVE_EVIDENCE_NAMES.has(normalizeName(row.name));

    // Negative evidence override: a skip-listed name that clears the base
    // >=2 threshold ONLY via year+builder (never via a spec attr or
    // research-pass coverage of its own) is demoted back to fragment — see
    // module header for why (AQA, The Jackson, ...).
    const isFragment = !baseIdentifiable || (isSkipListed && !hasSpecOrResearch);

    attrs.identifiability = isFragment ? 'fragment' : 'identifiable';
    if (isFragment) fragment += 1;
    else identifiable += 1;

    upsertNode(db, { id: row.id, type: row.type, name: row.name, attrs });
  }

  return { identifiable, fragment };
}
