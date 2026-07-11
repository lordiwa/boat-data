// ingest/src/mappers/graphCleanup.js
//
// TASK-019: the graph cleanup retrofit hook — mirrors ingest.js's
// linkYachtRegions()/linkEngineOemSupplies() pattern (called once, from
// ingest.js, AFTER every corpus file's builder/designer/company nodes have
// been created by the table-routing pass, so every merge target below is
// guaranteed to already exist). Every action here is DATA-DRIVEN (a plain
// array/object, not ad-hoc imperative logic) and grounded in
// research/round2/builder-enrichment.md's "Suspect nodes" and "Likely
// duplicate-entity pairs" sections — see the per-entry comments below for
// the exact citation. This file is deliberately the ONLY place any of
// these ~30 node-level decisions are made; nothing here is a hand-edit to
// graph.json (the ticket's explicit requirement).
//
// Three kinds of action:
//   1. BUILDER_MERGE_MAP: "same real company, two graph nodes" pairs.
//      mergeNode() re-points every edge referencing the duplicate (as BOTH
//      src and dst) onto the canonical node, merges attrs (canonical wins
//      on conflict), then deletes the duplicate. No built_by edge is ever
//      lost; no orphan edge (one whose src/dst id no longer exists in
//      nodes) is ever left behind.
//   2. SUSPECT_NODE_ACTIONS: per-node judgment calls for the 13 suspect
//      "not really a builder" nodes research flagged:
//        - retype: the node names a REAL entity of a DIFFERENT type
//          (Y.CO -> company, Hoek Design -> designer). A new node is
//          minted at the correct type's id; the old builder node's edges
//          are DROPPED (not re-pointed) — a management company or design
//          studio is not a valid built_by target, and no grounded actual
//          shipyard could be identified for the affected yachts from this
//          research pass alone.
//        - remove: the "name" is not a real, identifiable company at all
//          (a person, a garbled string, an unconfirmable term, a model
//          name, or a bare town name distinct from a real same-named
//          company). Node + its edges are dropped entirely.
//        - flag: a generic placeholder value (Custom/Various/Mixed/Custom
//          (rebuild)/Motorsailer) that legitimately has no company data to
//          enrich, but whose edge count is high enough (Custom: 70,
//          Various: 38) that DROPPING the edges would silently
//          un-attribute a lot of yachts' builder field — worse than an
//          honestly-flagged placeholder. attrs.placeholder = true is set;
//          the node and all its edges are left otherwise untouched.
//        - mergeInto: a model-line name captured as its own builder node
//          (Arcadia Sherpa, a model line of Arcadia) — folded into the
//          real builder via the same mergeNode() as (1).
//   3. Two special one-off fixes that need a DIFFERENT edge target (not a
//      simple "same entity" merge), plus the coordinator-grounded Weichai
//      company merge.

import { upsertNode, upsertEdge } from '../db.js';

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

/**
 * Unions two provenance arrays (dedupe-preserving order: canonical's
 * entries first, then any new ones from the duplicate) — TASK-019 LOW
 * carry-forward: a whole-key first-non-empty-wins merge (the generic rule
 * every other attr uses) would silently DROP the duplicate's entire
 * provenance trail whenever the canonical already had one of its own.
 */
function unionProvenance(a, b) {
  const listA = Array.isArray(a) ? a : [];
  const listB = Array.isArray(b) ? b : [];
  const merged = [...listA];
  for (const entry of listB) {
    if (!merged.includes(entry)) merged.push(entry);
  }
  return merged;
}

/**
 * Re-points every edge referencing `fromId` (as src OR dst) onto `toId`,
 * merges `fromId`'s attrs onto `toId` (first-non-empty-wins, `toId`'s own
 * values take precedence on conflict, EXCEPT `provenance` which is always
 * UNIONED rather than first-wins — see unionProvenance above), then
 * deletes `fromId`. No-op (returns false) if `fromId` is absent (already
 * merged, or never existed in a smaller/synthetic graph) or `toId` is
 * absent (the canonical target must already exist — this hook runs after
 * all files are processed, so a missing canonical means the corpus
 * doesn't have that node at all, and merging into a non-existent node
 * would just create dangling edges).
 *
 * TASK-019 LOW carry-forward: if the canonical node ends the merge with NO
 * provenance trace at all (neither side ever recorded one — e.g. both
 * nodes were minted directly by a test or a hand-seeded fixture rather
 * than a mapper), it is stamped with `['graph-cleanup-merge']` rather than
 * silently left without any provenance.
 */
function mergeNode(db, fromId, toId) {
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
    if (key === 'provenance') continue; // handled separately below (union, not first-wins)
    if (mergedAttrs[key] === null || mergedAttrs[key] === undefined) mergedAttrs[key] = fromAttrs[key];
  }

  const unionedProvenance = unionProvenance(toAttrs.provenance, fromAttrs.provenance);
  mergedAttrs.provenance = unionedProvenance.length > 0 ? unionedProvenance : ['graph-cleanup-merge'];

  upsertNode(db, { id: toId, type: toRow.type, name: toRow.name, attrs: mergedAttrs });
  db.prepare('DELETE FROM nodes WHERE id = ?').run(fromId);

  return true;
}

/**
 * Deletes `id` and every edge referencing it (as src or dst). Used by both
 * the 'remove' suspect action and the retype action (which drops the OLD
 * node's edges after minting the new-typed node at a different id).
 */
function removeNodeAndEdges(db, id) {
  if (!nodeExists(db, id)) return false;
  db.prepare('DELETE FROM edges WHERE src = ? OR dst = ?').run(id, id);
  db.prepare('DELETE FROM nodes WHERE id = ?').run(id);
  return true;
}

// --- 1. Duplicate builder pairs -----------------------------------------
// "Same real company, two separate graph nodes" — research/round2/
// builder-enrichment.md's "Likely duplicate-entity pairs" list, plus two
// pairs surfaced by its "Suspect nodes" section (the diacritic-slug pairs).
// Canonical side = the FULLER name, per the ticket ("keep the fuller
// name"). Olympic is a three-way merge (both shorter forms fold onto the
// fullest "Olympic Yacht Services").
export const BUILDER_MERGE_MAP = [
  { from: 'builder:crn', to: 'builder:crn-yachts' },
  { from: 'builder:admiral', to: 'builder:admiral-yachts' },
  { from: 'builder:abeking', to: 'builder:abeking-rasmussen' },
  { from: 'builder:trinity', to: 'builder:trinity-yachts' },
  { from: 'builder:isa', to: 'builder:isa-yachts' },
  { from: 'builder:damen', to: 'builder:damen-yachting' },
  { from: 'builder:austal', to: 'builder:austal-ships' },
  { from: 'builder:icon', to: 'builder:icon-yachts' },
  { from: 'builder:bilgin', to: 'builder:bilgin-yachts' },
  { from: 'builder:overmarine', to: 'builder:overmarine-group' },
  { from: 'builder:freire', to: 'builder:freire-shipyard' },
  { from: 'builder:clelands', to: 'builder:clelands-shipbuilding-co' },
  { from: 'builder:dunya', to: 'builder:dunya-yachts' },
  { from: 'builder:grandi-yatcilik', to: 'builder:grandi-yatcilik-mimarlik' },
  { from: 'builder:olympic', to: 'builder:olympic-yacht-services' },
  { from: 'builder:olympic-yacht', to: 'builder:olympic-yacht-services' },
  // id-slugification lost the diacritic ("đ"/"ø"); same historical entity
  // as the plain-ASCII node under a differently-spelled/formal name.
  { from: 'builder:brodogra-evna-industrija-split', to: 'builder:brodosplit' },
  { from: 'builder:helsing-r', to: 'builder:helsingor-vaerft' },
];

// --- 2. Suspect nodes ----------------------------------------------------
export const SUSPECT_NODE_ACTIONS = [
  {
    id: 'builder:y-co',
    action: 'retype',
    newId: 'company:y-co',
    newType: 'company',
    extraAttrs: { kind: 'brokerage/management' },
    notes:
      'Reclassified from a mistyped "builder" node (TASK-019 cleanup): Y.CO is a yacht management, brokerage & ' +
      'charter company, not a shipyard. Its built_by edges were dropped rather than re-pointed — no grounded ' +
      'actual shipyard could be identified for the affected yachts from research/round2/builder-enrichment.md.',
  },
  {
    id: 'builder:hoek-design',
    action: 'retype',
    newId: 'designer:hoek-design',
    newType: 'designer',
    extraAttrs: { discipline: ['naval architecture'] },
    notes:
      'Reclassified from a mistyped "builder" node (TASK-019 cleanup): Hoek Design is a naval architecture / ' +
      'design studio, not a shipbuilder. Its built_by edge was dropped rather than re-pointed to a real builder ' +
      '(e.g. Royal Huisman, Vitters) — no per-yacht research to confirm which specific yard was correct.',
  },
  {
    id: 'builder:philip-zepter',
    action: 'remove',
    notes: "A person's name (likely a yacht owner), not a shipyard — probable owner/builder field confusion.",
  },
  {
    id: 'builder:sportiva-55',
    action: 'remove',
    notes: 'Reads like a yacht/model name, not a shipyard name; no grounded real builder to re-point to.',
  },
  {
    id: 'builder:cies-oassive',
    action: 'remove',
    notes: 'Garbled/unparseable string, likely an OCR or scraping fragment from the source corpus.',
  },
  {
    id: 'builder:kolotura',
    action: 'remove',
    notes: 'Could not be confirmed as a real shipyard; left unconfirmed rather than guessed, per research.',
  },
  {
    id: 'builder:viareggio',
    action: 'remove',
    notes:
      'Bare "Viareggio" likely names the Italian shipbuilding town itself, not a company — distinct from the ' +
      'real company "Viareggio SuperYachts", which is enriched and kept as its own node.',
  },
  {
    id: 'builder:bali-catamarans',
    action: 'remove',
    notes:
      '"BALI" is a model line of Catana Group, not an independent shipyard. No "Catana" node exists in this ' +
      'graph to merge onto, so the node is removed rather than left unenriched or wrongly merged.',
  },
  {
    id: 'builder:custom',
    action: 'flag',
    notes: 'Generic catch-all placeholder (source text named no specific yard), not a real company.',
  },
  {
    id: 'builder:various',
    action: 'flag',
    notes: 'Generic catch-all placeholder (source text named no specific yard), not a real company.',
  },
  {
    id: 'builder:mixed',
    action: 'flag',
    notes: 'Generic catch-all placeholder (source text named no specific yard), not a real company.',
  },
  {
    id: 'builder:custom-rebuild',
    action: 'flag',
    notes: 'Generic catch-all placeholder (source text named no specific yard), not a real company.',
  },
  {
    id: 'builder:motorsailer',
    action: 'flag',
    notes: 'A hull/rig configuration type, not a builder name.',
  },
  {
    id: 'builder:arcadia-sherpa',
    action: 'mergeInto',
    targetId: 'builder:arcadia',
    notes: '"Sherpa" is a model line of Arcadia Yachts; folded onto the real builder node.',
  },
];

function applySuspectNodeActions(db) {
  for (const entry of SUSPECT_NODE_ACTIONS) {
    if (!nodeExists(db, entry.id)) continue;

    if (entry.action === 'remove') {
      removeNodeAndEdges(db, entry.id);
      continue;
    }

    if (entry.action === 'mergeInto') {
      mergeNode(db, entry.id, entry.targetId);
      continue;
    }

    if (entry.action === 'flag') {
      const row = getFullNode(db, entry.id);
      const attrs = parseAttrsJson(row.attrs_json);
      attrs.placeholder = true;
      if (!attrs.notes) attrs.notes = entry.notes;
      upsertNode(db, { id: entry.id, type: row.type, name: row.name, attrs });
      continue;
    }

    if (entry.action === 'retype') {
      const row = getFullNode(db, entry.id);
      const attrs = { ...entry.extraAttrs, notes: entry.notes, provenance: ['builder-enrichment-cleanup'] };
      upsertNode(db, { id: entry.newId, type: entry.newType, name: row.name, attrs });
      removeNodeAndEdges(db, entry.id);
      continue;
    }
  }
}

// --- 3. Special one-off fixes --------------------------------------------

// Somnio's Builder cell in the source corpus (file 20) reads "Winch Design
// / Vard" — one string conflating an interior-design studio (Winch Design)
// with the actual shipyard (Vard, a real, separately-researched builder
// node). Re-point the built_by edge to the real shipyard and add a
// designed_by edge to the Winch Design designer node created by
// designerMapper.js (from research/round2/designer-directory.md's own
// "Winch Design" row) — see research/round2/builder-enrichment.md's
// Suspect nodes entry for "Winch Design/Vard".
function fixWinchDesignVard(db) {
  const conflatedId = 'builder:winch-design-vard';
  if (!nodeExists(db, conflatedId)) return;

  const realBuilderId = 'builder:vard';
  const winchDesignerId = 'designer:winch-design';

  const builtByEdges = db
    .prepare("SELECT src FROM edges WHERE dst = ? AND rel = 'built_by'")
    .all(conflatedId);

  for (const { src: yachtId } of builtByEdges) {
    if (nodeExists(db, realBuilderId)) {
      upsertEdge(db, { src: yachtId, rel: 'built_by', dst: realBuilderId });
    }
    if (nodeExists(db, winchDesignerId)) {
      upsertEdge(db, { src: yachtId, rel: 'designed_by', dst: winchDesignerId });
    }
  }

  removeNodeAndEdges(db, conflatedId);
}

// "(Naval-inspired)" is a mis-extracted style descriptor ("naval-inspired
// exterior styling"), not a real design studio (research/round2/
// designer-directory.md's Coverage notes). Yacht Valor already carries a
// grounded designed_by edge to its real INTERIOR designer, Bannenberg &
// Rowell, from the same source row's "Designers (Ext/Int)" pair
// (knowledge/10) — no real exterior-designer name is recoverable from the
// source, so the edge to the artifact node is dropped rather than
// re-pointed to a guess, per the research doc's own recommendation.
function fixNavalInspiredArtifact(db) {
  removeNodeAndEdges(db, 'designer:naval-inspired');
}

// Coordinator addendum (grounded via research/round3/marina-enrichment.md's
// "Weichai equivalence" section): "Weichai Group" is the informal name of
// the legal entity "Weichai Holding Group Co., Ltd." — chain: Shandong
// Heavy Industry Group -> Weichai Holding Group Co., Ltd. ("Weichai Group")
// -> Weichai Power Co., Ltd. (2002) -> acquired Moteurs Baudouin (2009).
// Closes the TASK-017 residual LOW (the two nodes were left deliberately
// unmerged pending this grounding).
function fixWeichaiMerge(db) {
  const dupId = 'company:weichai-group';
  const canonicalId = 'company:weichai-holding-group';
  if (!nodeExists(db, dupId) || !nodeExists(db, canonicalId)) return;

  mergeNode(db, dupId, canonicalId);

  const row = getFullNode(db, canonicalId);
  const attrs = parseAttrsJson(row.attrs_json);
  const note =
    '"Weichai Group" is the informal name of this legal entity. Chain: Shandong Heavy Industry Group -> ' +
    'Weichai Holding Group Co., Ltd. ("Weichai Group") -> Weichai Power Co., Ltd. (2002) -> acquired Moteurs ' +
    'Baudouin (2009). See research/round3/marina-enrichment.md\'s "Weichai equivalence" section.';
  attrs.notes = attrs.notes ? `${attrs.notes} ${note}` : note;
  upsertNode(db, { id: canonicalId, type: row.type, name: 'Weichai Holding Group Co., Ltd.', attrs });
}

// --- 4. TASK-020: yacht rename/duplicate merges --------------------------
// Grounded in research/round3/yacht-specs.md's "Renames found" section
// (the first 4 pairs — same real hull, old-name and current-name nodes
// both already existed separately in the graph) plus two further
// ingestion-artifact duplicates the same research pass flagged by name
// ("Graph has 2 duplicate nodes for this yacht" / a `-<builder-slug>`
// id-collision suffix on an identical-LOA same-name pair). The renamed
// hull's `former_names` attr (populated by yachtSpecMapper.js's
// FORMER_NAMES_MAP) always lands on the CANONICAL (`to`) side.
//
// Deliberately NOT merged this round (see knowledge/93's own Curation
// notes for the full reasoning): the two "Kismet" nodes for DIFFERENT real
// yachts (122m current vs the 95m ex-Kismet/now-Whisper hull — only the
// LATTER is merged below, onto Whisper, never onto the 122m node); the two
// "Ulysses"-adjacent nodes (Multiverse's former identity has no separate
// existing node to merge); "Sophia" (108m vs 97m) — flagged as only
// "likely" the same mis-scaled hull, not a "confirmed" rename, left for a
// future pass.
export const YACHT_MERGE_MAP = [
  { from: 'yacht:jubilee', to: 'yacht:kaos' },
  // Same hull, two ids from an id-collision suffix (yachtMapper.js mints a
  // `-<builder-slug>` suffix when a same-named row looks like a possibly-
  // different yacht) — 110m vs 110.1m, well within realistic cross-source
  // rounding drift for the same 2017 Oceanco hull.
  { from: 'yacht:kaos-custom', to: 'yacht:kaos' },
  { from: 'yacht:lana', to: 'yacht:mar' },
  { from: 'yacht:cc-summer', to: 'yacht:madsummer' },
  // The GRAPH's 95m "Kismet" node (Lürssen 2014) is the SAME hull as its
  // separately-existing "Whisper" node (renamed 2023) — NOT the current,
  // unrelated 122m "Kismet" (Shahid Khan's new yacht), which this merge
  // map never references and leaves completely untouched.
  { from: 'yacht:kismet-lurssen', to: 'yacht:whisper' },
  // "Graph has 2 duplicate nodes for this yacht" (research/round3/
  // yacht-specs.md, Prince Abdulaziz row) — same 147m Helsingør Værft hull.
  { from: 'yacht:prince-abdulaziz-helsingor-vaerft', to: 'yacht:prince-abdulaziz' },
];

// --- 5. TASK-020: Rybovich marina merge -----------------------------------
// research/round3/marina-enrichment.md's own enrichment-table row:
// "Safe Harbor Rybovich (= 'Rybovich Superyacht Marina' dup node)" — same
// West Palm Beach facility, acquired by Safe Harbor in 2021. Canonical =
// the current post-acquisition operating name.
export const MARINA_MERGE_MAP = [{ from: 'marina:rybovich-superyacht-marina', to: 'marina:safe-harbor-rybovich' }];

// --- 6. TASK-020: data-quality flags (RIO, MOSAIQUE) ----------------------
// research/round3/yacht-specs.md's Coverage notes: "The RIO node (203m in
// the graph) could not be matched to any real 203m yacht — every source
// found for 'RIO' describes a 62m CRN motor yacht... looks like a data/
// parsing error" and "the only well-documented 'Mosaique' found is a
// 49.9m Turquoise Yachts vessel... The 164m graph value could not be
// corroborated; likely a data/parse error." Per the ticket: flag, don't
// delete (no grounding to justify removal, only suspicion) — a small,
// curated mechanism (this map), never a hand-edit of graph.json.
export const QUALITY_FLAGS = [
  {
    id: 'yacht:rio',
    dataQuality: 'unverified — no matching real vessel found (2026-07 research pass)',
  },
  {
    id: 'yacht:mosaique',
    dataQuality: 'unverified — no matching real vessel found (2026-07 research pass)',
  },
];

function applyDataQualityFlags(db) {
  for (const { id, dataQuality } of QUALITY_FLAGS) {
    if (!nodeExists(db, id)) continue;
    const row = getFullNode(db, id);
    const attrs = parseAttrsJson(row.attrs_json);
    attrs.data_quality = dataQuality;
    upsertNode(db, { id, type: row.type, name: row.name, attrs });
  }
}

/**
 * Runs the full graph cleanup pass (see module header): duplicate builder
 * merges, suspect-node reclassification/removal/flagging, the two special
 * cross-type fixes, the Weichai company merge, TASK-020's yacht rename/
 * duplicate merges, the Rybovich marina merge, and the RIO/MOSAIQUE
 * data-quality flags. Idempotent — safe to call after every ingest run (a
 * repeat call is a no-op: every merge source/suspect id has already been
 * deleted, and re-flagging an already-flagged node is a harmless no-op
 * overwrite of the same string).
 */
export function applyGraphCleanup(db) {
  for (const { from, to } of BUILDER_MERGE_MAP) {
    mergeNode(db, from, to);
  }

  applySuspectNodeActions(db);
  fixWinchDesignVard(db);
  fixNavalInspiredArtifact(db);
  fixWeichaiMerge(db);

  for (const { from, to } of YACHT_MERGE_MAP) {
    mergeNode(db, from, to);
  }

  for (const { from, to } of MARINA_MERGE_MAP) {
    mergeNode(db, from, to);
  }

  applyDataQualityFlags(db);
}
