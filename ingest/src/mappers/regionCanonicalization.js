// ingest/src/mappers/regionCanonicalization.js
//
// TASK-022: region canonicalization Tier 2 — the retrofit hook (same
// "run once, after every file's nodes exist, called from ingest.js" pattern
// as graphCleanup.js's applyGraphCleanup()) that handles the one-time,
// corpus-scoped judgment calls regions.js's PERMANENT REGION_ALIAS_GROUPS
// hardening (see that module's Tier 1 section) deliberately does NOT:
//
//   1. REGION_MERGE_MAP: same-spelled cities that are genuinely ambiguous
//      in the real world (Portland OR/ME, Henderson WA/NV, Tuzla Turkey/
//      Bosnia) but, per THIS corpus's own located_in/based_in edges,
//      unambiguously name only one of the two — safe to merge the existing
//      nodes once, but NOT safe to bake into a permanent alias (a future
//      round's genuinely different Portland/Henderson/Tuzla data would be
//      silently swallowed). Also covers prose-artifact nodes whose
//      unambiguous primary place already has an existing canonical node
//      (e.g. "New River; includes integrated Roscioli Yachting Center" ->
//      the pre-existing "New River" node).
//   2. REGION_RENAME_MAP: prose-name artifacts with NO pre-existing
//      canonical target — the clean name is extracted and a fresh node is
//      minted (e.g. "Palm Beach; often grouped with Fort Lauderdale due to
//      proximity and shared ecosystem" -> a clean "Palm Beach" node).
//   3. REGION_ARTIFACT_FLAGS: prose-name artifacts that are genuinely
//      ambiguous (describe more than one real place, e.g. a company's
//      relocation history across three different cities) — quarantined
//      with attrs.artifact = true rather than guessed onto any one of them.
//   4. A generic ";"-in-name safety net: any region node whose name still
//      contains ';' after the three passes above (including one a future
//      corpus round mints that nobody has hand-curated yet) is flagged
//      artifact:true too, so the "no un-quarantined ';' name" invariant
//      holds even for cases this file's authors never anticipated.
//
// Same discipline as graphCleanup.js: data-driven maps/lists, one
// rationale comment per entry, idempotent, no lost/orphaned edges.

import { upsertNode, upsertEdge } from '../db.js';
import { isFloridaCity } from './regions.js';

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

function getFullNode(db, id) {
  return db.prepare('SELECT id, type, name, attrs_json FROM nodes WHERE id = ?').get(id);
}

const FLORIDA_ID = 'region:florida';
const FLORIDA_NAME = 'Florida';

/**
 * Mirrors regions.js's upsertRegion() Florida roll-up for a region node
 * that was just created/renamed by this module (rather than resolved fresh
 * through resolveRegion/upsertRegion) — e.g. a prose artifact renamed to a
 * clean "Panama City"/"Palm Beach" never goes through upsertRegion() itself,
 * so it would otherwise miss the PART_OF edge every other Florida-city
 * region gets.
 */
function ensureFloridaPartOf(db, id, name) {
  if (id === FLORIDA_ID) return;
  if (!isFloridaCity(name)) return;
  upsertNode(db, { id: FLORIDA_ID, type: 'region', name: FLORIDA_NAME });
  upsertEdge(db, { src: id, rel: 'part_of', dst: FLORIDA_ID });
}

/**
 * Re-points every edge referencing `fromId` (as src OR dst) onto `toId`,
 * merges attrs (toId's own values win on conflict; regions carry no attrs
 * today, but this stays generically correct if a future round adds any),
 * then deletes `fromId`. Same mechanics as graphCleanup.js's mergeNode() —
 * duplicated locally rather than imported, matching this codebase's
 * existing convention of small per-module helper duplication (see
 * ingest.js's own nodeExists/parseAttrsJson, also duplicated from
 * graphCleanup.js).
 */
function mergeRegionNode(db, fromId, toId) {
  if (fromId === toId) return false;
  if (!nodeExists(db, fromId)) return false;
  if (!nodeExists(db, toId)) return false;

  const srcEdges = db.prepare('SELECT rel, dst, attrs_json FROM edges WHERE src = ?').all(fromId);
  for (const e of srcEdges) {
    upsertEdge(db, { src: toId, rel: e.rel, dst: e.dst, attrs: e.attrs_json ? JSON.parse(e.attrs_json) : null });
  }
  db.prepare('DELETE FROM edges WHERE src = ?').run(fromId);

  const dstEdges = db.prepare('SELECT src, rel, attrs_json FROM edges WHERE dst = ?').all(fromId);
  for (const e of dstEdges) {
    upsertEdge(db, { src: e.src, rel: e.rel, dst: toId, attrs: e.attrs_json ? JSON.parse(e.attrs_json) : null });
  }
  db.prepare('DELETE FROM edges WHERE dst = ?').run(fromId);

  const fromRow = getFullNode(db, fromId);
  const toRow = getFullNode(db, toId);
  const fromAttrs = parseAttrsJson(fromRow.attrs_json);
  const toAttrs = parseAttrsJson(toRow.attrs_json);
  const mergedAttrs = { ...toAttrs };
  for (const key of Object.keys(fromAttrs)) {
    if (mergedAttrs[key] === null || mergedAttrs[key] === undefined) mergedAttrs[key] = fromAttrs[key];
  }

  upsertNode(db, { id: toId, type: toRow.type, name: toRow.name, attrs: mergedAttrs });
  db.prepare('DELETE FROM nodes WHERE id = ?').run(fromId);

  ensureFloridaPartOf(db, toId, toRow.name);
  return true;
}

// --- 1. Tier 2 one-time merges -------------------------------------------
export const REGION_MERGE_MAP = [
  {
    from: 'region:portland',
    to: 'region:portland-or',
    notes:
      '"Portland" is a genuinely ambiguous US city name (Oregon vs Maine, among others) — NOT safe as a permanent ' +
      'regions.js alias. But every edge on both the bare "Portland" and "Portland, OR" nodes in this corpus traces ' +
      'to Oregon (file 55\'s Pacific Coast Marinas guide + file 85\'s Vigor Portland/Swan Island shipyard) — a ' +
      'one-time, corpus-confirmed merge onto the disambiguated name.',
  },
  {
    from: 'region:henderson',
    to: 'region:henderson-wa',
    notes:
      '"Henderson" collides with the much more prominent Henderson, NV — not safe as a permanent alias. Every edge ' +
      'on the bare "Henderson" node (BAE Systems Australia, Echo Yachts, Henderson Boat Lifters, all from file 55) ' +
      'is the same Henderson, WA marine-industrial precinct near Fremantle/Perth as the disambiguated node\'s own ' +
      'edges (SilverYachts Henderson, Echo Yachts Henderson, Austal Ships) — corpus-confirmed, one-time merge.',
  },
  {
    from: 'region:henderson-perth',
    to: 'region:henderson-wa',
    notes: 'Same Henderson, WA precinct — Austal (file 55) is the same real Henderson, WA facility as Austal Ships (file 91).',
  },
  {
    from: 'region:tuzla',
    to: 'region:tuzla-istanbul',
    notes:
      '"Tuzla" is also a real (inland, non-nautical) city in Bosnia — not safe as a permanent alias. Every edge on ' +
      'the bare "Tuzla" node (Sedef Shipyard, Besiktas Shipyard, both Turkey) is the same Tuzla shipyard district ' +
      'of Istanbul as the disambiguated node\'s edges (TK Tuzla Shipyard, KRM Yacht Refit, Bilgin Yachts, Dunya ' +
      'Yachts, all Turkey) — corpus-confirmed, one-time merge.',
  },
  {
    from: 'region:new-river-includes-integrated-roscioli-yachting-center',
    to: 'region:new-river',
    notes:
      'Prose-name artifact ("New River; includes integrated Roscioli Yachting Center") whose unambiguous primary ' +
      'place (New River, Fort Lauderdale) already has its own canonical node.',
  },
  {
    from: 'region:nassau-new-providence-area-emerging',
    to: 'region:nassau-new-providence',
    notes:
      'Prose-name artifact ("Nassau / New Providence area; emerging") whose unambiguous primary place already has ' +
      'its own canonical "Nassau, New Providence" node — "emerging" is a market descriptor, not a different place.',
  },
  {
    from: 'region:sanya-hainan-also-shenzhen-ties',
    to: 'region:sanya-hainan',
    notes:
      'Prose-name artifact ("Sanya, Hainan; also Shenzhen ties") — the primary, unambiguous location (stated ' +
      'first) already has its own canonical node; "also Shenzhen ties" is supplementary, not a second location ' +
      'for THIS entity.',
  },
  {
    from: 'region:shanghai-bund-branches-in-ningbo-ninghai-bay',
    to: 'region:shanghai',
    notes:
      'Prose-name artifact ("Shanghai/Bund; branches in Ningbo, Ninghai Bay") — the primary location (Shanghai\'s ' +
      'Bund district) already has its own canonical "Shanghai" node; the branch-city mentions describe OTHER ' +
      'facilities, not this one.',
  },
];

// --- 2. Prose artifacts renamed to a clean, unambiguous name -------------
// No pre-existing canonical node to merge onto — mint a clean one instead.
export const REGION_RENAME_MAP = [
  {
    from: 'region:palm-beach-often-grouped-with-fort-lauderdale-due-to-proximity-and-shared-ecosystem',
    toId: 'region:palm-beach',
    toName: 'Palm Beach',
    notes:
      'Prose-name artifact ("Palm Beach; often grouped with Fort Lauderdale due to proximity and shared ' +
      'ecosystem") — the real place named is unambiguously Palm Beach, FL (a distinct town from West Palm Beach, ' +
      'so this is a RENAME, not a merge into the West Palm Beach canonical node — never guessed as the same place ' +
      'as an adjacent-but-different town).',
  },
  {
    from: 'region:panama-city-operated-by-j-a-jones-construction-co',
    toId: 'region:panama-city',
    toName: 'Panama City',
    notes:
      'Prose-name artifact ("Panama City, operated by J.A. Jones Construction Co.") — the operator clause is not ' +
      'part of the place name; the real, unambiguous place is Panama City, FL (already in FLORIDA_CITIES).',
  },
];

// --- 3. Genuinely ambiguous prose artifacts — quarantined, never guessed -
export const REGION_ARTIFACT_FLAGS = [
  {
    id: 'region:originally-sturgeon-bay-wi-closed-2015-2017-hq-now-monaco-yard-in-netherlands',
    reason:
      'Describes a company\'s relocation history across THREE different real places over time (Sturgeon Bay, WI ' +
      '-> HQ in Monaco -> yard in Netherlands) — no single "current" location can be picked without guessing.',
  },
  {
    id: 'region:vancouver-wa-relocated-to-tellico-lake-tn',
    reason:
      'Describes a relocation between two different real places (Vancouver, WA -> Tellico Lake, TN) — kept ' +
      'distinct from the plain "region:vancouver-wa" node rather than guessed onto either the old or new site.',
  },
];

function applyMergeMap(db) {
  for (const { from, to } of REGION_MERGE_MAP) {
    mergeRegionNode(db, from, to);
  }
}

function applyRenameMap(db) {
  for (const { from, toId, toName } of REGION_RENAME_MAP) {
    if (!nodeExists(db, from)) continue;
    if (!nodeExists(db, toId)) {
      upsertNode(db, { id: toId, type: 'region', name: toName });
    }
    mergeRegionNode(db, from, toId);
  }
}

function flagArtifact(db, id, reason) {
  if (!nodeExists(db, id)) return;
  const row = getFullNode(db, id);
  const attrs = parseAttrsJson(row.attrs_json);
  if (attrs.artifact === true) return; // already flagged, idempotent no-op
  attrs.artifact = true;
  attrs.artifact_reason = reason;
  upsertNode(db, { id, type: row.type, name: row.name, attrs });
}

function applyArtifactFlags(db) {
  for (const { id, reason } of REGION_ARTIFACT_FLAGS) {
    flagArtifact(db, id, reason);
  }
}

// Generic hardening safety net (see module header, item 4): after the
// hand-curated passes above run, any REMAINING region node whose name still
// contains ';' gets quarantined too, even if this file's authors never
// hand-curated it — this is what keeps the "no un-quarantined ';' name"
// invariant true for a future corpus round's new prose artifacts, not just
// today's six known ones.
function applyGenericSemicolonSafetyNet(db) {
  const rows = db.prepare("SELECT id, name, attrs_json FROM nodes WHERE type = 'region'").all();
  for (const row of rows) {
    if (!row.name || !row.name.includes(';')) continue;
    const attrs = parseAttrsJson(row.attrs_json);
    if (attrs.artifact === true) continue;
    flagArtifact(db, row.id, 'Region name contains ";" — auto-quarantined by the generic hardening safety net.');
  }
}

/**
 * Runs the full Tier 2 region canonicalization pass (see module header):
 * one-time judgment merges, prose-artifact renames, artifact quarantine
 * flags, and the generic ";"-in-name safety net. Idempotent — safe to call
 * after every ingest run, same as graphCleanup.js's applyGraphCleanup().
 */
export function applyRegionCanonicalization(db) {
  applyMergeMap(db);
  applyRenameMap(db);
  applyArtifactFlags(db);
  applyGenericSemicolonSafetyNet(db);
}
