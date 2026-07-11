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

/**
 * Generic executor for a NODE_ACTIONS-shaped array (remove / mergeInto /
 * flag / retype) — shared by TASK-019's builder-focused
 * SUSPECT_NODE_ACTIONS and TASK-021's person-focused PERSON_NODE_ACTIONS,
 * so both reuse the exact same, already-tested mechanics rather than two
 * parallel copies.
 *
 * TASK-021 addition: `retype` entries may set `carryEdges: true` (e.g. a
 * yacht's owned_by edge to an institutional entity like "Turkish
 * Republic" should follow the node to its correct type, `company`, not be
 * dropped the way TASK-019's builder retypes intentionally dropped their
 * built_by edges, which had no valid target to re-point to).
 */
function applyNodeActions(db, actions) {
  for (const entry of actions) {
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
      const attrs = { ...entry.extraAttrs, notes: entry.notes, provenance: entry.provenance || ['builder-enrichment-cleanup'] };
      upsertNode(db, { id: entry.newId, type: entry.newType, name: row.name, attrs });

      if (entry.carryEdges) {
        const srcEdges = db.prepare('SELECT rel, dst, attrs_json FROM edges WHERE src = ?').all(entry.id);
        for (const e of srcEdges) {
          upsertEdge(db, { src: entry.newId, rel: e.rel, dst: e.dst, attrs: e.attrs_json ? JSON.parse(e.attrs_json) : null });
        }
        const dstEdges = db.prepare('SELECT src, rel, attrs_json FROM edges WHERE dst = ?').all(entry.id);
        for (const e of dstEdges) {
          upsertEdge(db, { src: e.src, rel: e.rel, dst: entry.newId, attrs: e.attrs_json ? JSON.parse(e.attrs_json) : null });
        }
      }

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

// --- 7. TASK-021: person dedupe (name-variant duplicates) -----------------
// research/round4/person-enrichment.md's Coverage notes: "the 110 nodes
// represent roughly 70-75 distinct real individuals" — the rest are name-
// variant duplicates of the same person (four nodes for Sheikh Mansour,
// three for Sheikh Mohammed, three for Alisher Usmanov's ownership
// structure, etc). Canonical side = the fullest proper name, per the same
// "keep the fuller name" rule as BUILDER_MERGE_MAP. All owned_by edges
// (yacht -> person) carry over via the shared mergeNode().
export const PERSON_MERGE_MAP = [
  { from: 'person:alisher-usmanov-legally-owned-by-sister-gulbahor-ismailova', to: 'person:alisher-usmanov' },
  { from: 'person:alisher-usmanov-via-sister', to: 'person:alisher-usmanov' },
  { from: 'person:alisher-usmanov-via-sister-gulbahor-ismailova', to: 'person:alisher-usmanov' },
  { from: 'person:bill-gates-support-vessel', to: 'person:bill-gates' },
  { from: 'person:dubai-royal-mohammed-bin-rashid-al-maktoum', to: 'person:sheikh-mohammed-bin-rashid-al-maktoum' },
  { from: 'person:sheikh-mohammed', to: 'person:sheikh-mohammed-bin-rashid-al-maktoum' },
  { from: 'person:eike-batista-previously', to: 'person:eike-batista-previous' },
  // Jeff Bezos (rumored)'s Flying Fox claim carries over with its
  // 'rumored' confidence tier intact (set by personMapper.js before this
  // hook runs) — not asserted as fact, just not silently dropped either;
  // Dmitry Kamenshchik's separate, more-credible Flying Fox claim is left
  // untouched (both claims coexist on the yacht, appropriately hedged).
  { from: 'person:jeff-bezos-rumored', to: 'person:jeff-bezos' },
  // Same real individual — the mismatched-builder Dragonfly (Silveryachts)
  // edge is dropped BEFORE this merge runs (see
  // fixSergeyBrinRumoredArtifact), so nothing incorrect carries over.
  { from: 'person:sergey-brin-rumored', to: 'person:sergey-brin' },
  { from: 'person:laurene-powell-jobs-steve-jobs-family', to: 'person:laurene-powell-jobs' },
  { from: 'person:liu-qiangdong-jd-com', to: 'person:liu-qiangdong' },
  // Four nodes, one fact ("Octopus now belongs to Roger Samuelsson, ex-
  // Paul-Allen-estate") recorded four different ways across the corpus.
  { from: 'person:estate-of-paul-allen-now-roger-samuelsson', to: 'person:roger-samuelsson' },
  { from: 'person:previously-paul-allen-now-others', to: 'person:roger-samuelsson' },
  { from: 'person:roger-samuelsson-ex-paul-allen-estate', to: 'person:roger-samuelsson' },
  { from: 'person:sheikh-mansour', to: 'person:sheikh-mansour-bin-zayed-al-nahyan' },
  { from: 'person:uae-mansour-bin-zayed', to: 'person:sheikh-mansour-bin-zayed-al-nahyan' },
  { from: 'person:uae-mansour-bin-zayed-al-nahyan', to: 'person:sheikh-mansour-bin-zayed-al-nahyan' },
  { from: 'person:oman-royal-sultan-haitham', to: 'person:sultan-haitham-bin-tariq' },
  { from: 'person:oman-royal-sultan-haitham-bin-tariq', to: 'person:sultan-haitham-bin-tariq' },
  { from: 'person:saudi-royal-mohammed-bin-salman', to: 'person:mohammed-bin-salman' },
  // The node's own name ("... estate") is a graph labeling error — MBZ is
  // alive and UAE's current President (research/round4/
  // person-enrichment.md, row 113) — not a genuine ownership-chain node.
  { from: 'person:uae-royal-mohammed-bin-zayed-al-nahyan-estate', to: 'person:mohammed-bin-zayed-al-nahyan' },
  { from: 'person:various-residential-superyacht', to: 'person:various-residential' },
];

// --- 8. TASK-021: person retype/flag -------------------------------------
// research/round4/person-enrichment.md's Coverage notes: "institutional/
// state placeholders that are not people at all." Reuses the SAME
// action-executor mechanics as TASK-019's SUSPECT_NODE_ACTIONS (see
// applyNodeActions) — retype for identifiable institutional entities
// (carrying their owned_by edge, since it's real institutional ownership,
// not a data error with no valid target), flag for purely generic
// "we don't know who" filler.
export const PERSON_NODE_ACTIONS = [
  {
    id: 'person:indonesian-corporate',
    action: 'retype',
    newId: 'company:indonesian-corporate',
    newType: 'company',
    extraAttrs: { kind: 'anonymous corporate entity' },
    carryEdges: true,
    provenance: ['person-enrichment-cleanup'],
    notes: 'Linked to J7 Explorer; "not an individual" per research — an anonymous corporate owner, not a real person.',
  },
  {
    id: 'person:egyptian-presidential-yacht',
    action: 'retype',
    newId: 'company:egyptian-presidential-yacht',
    newType: 'company',
    extraAttrs: { kind: 'state institution' },
    carryEdges: true,
    provenance: ['person-enrichment-cleanup'],
    notes: 'Institutional (Egyptian state) owner of El Mahrousa — not a real person.',
  },
  {
    id: 'person:turkish-republic',
    action: 'retype',
    newId: 'company:turkish-republic',
    newType: 'company',
    extraAttrs: { kind: 'state institution' },
    carryEdges: true,
    provenance: ['person-enrichment-cleanup'],
    notes: 'Institutional (Turkish state) owner of Savarona (presidential/state yacht) — not a real person.',
  },
  {
    id: 'person:bahrain-royal',
    action: 'flag',
    notes: 'Generic royal-family placeholder (Al Salamah) — no single named individual confirmed.',
  },
  {
    id: 'person:omani-royal-family',
    action: 'flag',
    notes: 'Generic royal-family placeholder (Fulk Al Salamah) — distinct from the specifically-named Sultan Haitham bin Tariq, who also has his own confirmed edge to the same yacht.',
  },
  {
    id: 'person:qatar-royal',
    action: 'flag',
    notes: 'Generic royal-family placeholder (Al Mirqab, Katara) — no single named individual confirmed.',
  },
  {
    id: 'person:saudi-royal',
    action: 'flag',
    notes: 'Generic royal-family placeholder (Alexander, Prince Abdulaziz, Turama) — no single named individual confirmed.',
  },
  {
    id: 'person:mixed-e-g-more-lurssen-feadship',
    action: 'flag',
    notes: 'Aggregate placeholder for "Various 110-112m" filler yachts in a top-50 list — not a real owner.',
  },
  {
    id: 'person:unknown-charter-focused',
    action: 'flag',
    notes: 'Generic placeholder (Loon) — no owner identified.',
  },
  {
    id: 'person:unknown-custom-build',
    action: 'flag',
    notes: 'Generic placeholder (Mansion Yacht) — no owner identified.',
  },
  {
    id: 'person:unknown-disputed',
    action: 'flag',
    notes: 'Generic placeholder (Alfa Nero, pre-2024-sale ownership dispute) — no owner identified.',
  },
  {
    id: 'person:unknown-previously-imperial-yachts',
    action: 'flag',
    notes: 'Generic placeholder (Mar, managed via Imperial Yachts) — beneficial owner undisclosed.',
  },
  {
    id: 'person:various-residential',
    action: 'flag',
    notes: 'Generic placeholder for Somnio\'s multiple unit "owners" — not a single real owner.',
  },
  {
    id: 'person:previously-david-geffen-now-others',
    action: 'flag',
    notes: 'Ownership-chain placeholder (Pelorus) — Geffen\'s link to Pelorus specifically (vs. his confirmed Rising Sun) was not corroborated; likely a graph placeholder error, not a real ownership fact to merge elsewhere.',
  },
];

// --- 9. TASK-021: ownership corrections -----------------------------------
// The 4 contradicted/unsupported attributions research/round4/
// person-enrichment.md flagged. Two of the four (Eike Batista -> H3
// "Unconfirmed"; the Opera dual claim, both sides "Disputed") are handled
// simply by personMapper.js's own ownership_confidence tagging once
// knowledge/95 carries those exact tiers verbatim — no special-case code
// needed. The other two need bespoke handling:

// Tatiana's owned_by edge names Bilal Hydrie; public sources instead name
// Shapoor Mistry (Shapoorji Pallonji Group) as the real owner. Shapoor
// Mistry has no existing graph node (not one of the 110 researched
// persons) — minting one is a deliberate, narrow exception to "never mint
// a person" (this is a factual CORRECTION with a real, named replacement,
// not speculative new data).
function fixTatianaOwnership(db) {
  const yachtId = 'yacht:tatiana';
  const wrongOwnerId = 'person:bilal-hydrie';
  if (!nodeExists(db, yachtId)) return;
  if (!edgeExistsInternal(db, yachtId, 'owned_by', wrongOwnerId)) return;

  const correctOwnerId = 'person:shapoor-mistry';
  if (!nodeExists(db, correctOwnerId)) {
    upsertNode(db, {
      id: correctOwnerId,
      type: 'person',
      name: 'Shapoor Mistry',
      attrs: {
        nationality: 'Indian',
        industry: 'Real estate/construction conglomerate (Shapoorji Pallonji Group)',
        role: 'Chairman, Shapoorji Pallonji Group',
        status: 'Living',
        notes:
          'Real owner of Tatiana (80m Bilgin, 2021) per public sources — corrects a misattribution to Bilal Hydrie ' +
          'inherited from the source corpus. See research/round4/person-enrichment.md.',
        provenance: ['person-enrichment-cleanup'],
      },
    });
  }

  db.prepare("DELETE FROM edges WHERE src = ? AND rel = 'owned_by' AND dst = ?").run(yachtId, wrongOwnerId);
  upsertEdge(db, { src: yachtId, rel: 'owned_by', dst: correctOwnerId, attrs: { ownership_confidence: 'confirmed' } });
}

// Sergey Brin (rumored) links to "Dragonfly (Silveryachts)" (yacht:
// dragonfly-silveryachts) — a DIFFERENT, smaller yacht node whose builder
// doesn't match the real Dragonfly (Lürssen) Brin actually owns. Merging
// the rumored node's PERSON identity onto the real Sergey Brin is correct
// (same individual), but the mismatched-builder edge itself must be
// DROPPED first — carrying it over would incorrectly attribute a second,
// unrelated yacht to Brin.
function fixSergeyBrinRumoredArtifact(db) {
  db.prepare(
    "DELETE FROM edges WHERE src = 'yacht:dragonfly-silveryachts' AND rel = 'owned_by' AND dst = 'person:sergey-brin-rumored'"
  ).run();
}

function edgeExistsInternal(db, src, rel, dst) {
  return !!db.prepare('SELECT 1 FROM edges WHERE src = ? AND rel = ? AND dst = ?').get(src, rel, dst);
}

// --- 10. TASK-021: club dedupe --------------------------------------------
// research/round4/club-enrichment.md's Coverage notes: "Likely duplicate
// nodes worth a dedup pass." Canonical side = the fuller/more-current
// name per the club's own published history (see each entry's comment).
export const CLUB_MERGE_MAP = [
  // Same institution recorded three times from different source docs.
  { from: 'club:first-yacht-club-in-florida', to: 'club:florida-yacht-club' },
  { from: 'club:the-florida-yacht-club-duplicate-entry-in-sources', to: 'club:florida-yacht-club' },
  { from: 'club:royal-vancouver-yacht-club-rvyc', to: 'club:royal-vancouver-yacht-club' },
  // "Cleveland Yachting Club" carries the club's own sourced founding year
  // (1878, cycrr.org) — kept canonical over "Cleveland Yacht Club" (graph
  // 1904, no independent source of its own).
  { from: 'club:cleveland-yacht-club', to: 'club:cleveland-yachting-club' },
  { from: 'club:nautical-club-of-vouliagmeni-nov', to: 'club:nautical-club-of-vouliagmeni' },
  { from: 'club:west-vancouver-yacht-club-wvyc', to: 'club:west-vancouver-yacht-club' },
  { from: 'club:the-royal-yacht-club-of-tasmania', to: 'club:royal-yacht-club-of-tasmania' },
  { from: 'club:deep-cove-yacht-club-sports-club', to: 'club:deep-cove-yacht-club' },
];

// --- 11. TASK-021: yacht LOA quality corrections (EIV, MYSTERE) -----------
// research/round4/person-enrichment.md's Suspect yachts table: EIV's graph
// LOA (160m) is a confirmed data error (real EIV is 48.8m, Rossinavi
// 2020); MYSTERE's graph LOA (109m) is a confirmed feet-to-meters
// conversion bug (real MYSTERE is 33.29m/109ft, Mangusta 2023). Same
// "small curated mechanism, never a hand-edit" discipline as QUALITY_FLAGS
// above — the WRONG value is preserved in attrs.conflicts (with the
// correction's own rationale) rather than silently discarded, so the
// mistake stays traceable.
//
// TASK-023 item 0 fix: a length-shaped correction ALSO records the
// pre-correction `meters` value in attrs.loa_aliases (see
// applyYachtQualityCorrections below). Without this, a second full-corpus
// ingest run re-reads the SAME still-uncorrected raw corpus row (this hook
// only ever rewrites the graph node, never the source /knowledge files) and
// yachtMapper.js's classifyCandidate() sees the corrected node's loa.meters
// (e.g. EIV's 48.8) disagree with the raw row's loa (160) — a definite
// MISMATCH by its old logic, even though every OTHER comparable field
// (builder) still agrees — and mints a disambiguated "-2" sibling
// (yacht:eiv-2) every single re-ingest. yachtMapper.js's classifyCandidate()
// now also accepts a candidate LOA that matches one of the existing node's
// attrs.loa_aliases as a non-mismatch (see that module's own comment), so
// the historical raw value stays a recognized alias of the corrected node
// forever, and a double-ingest is byte-stable
// (tests/realCorpusExport.spec.js's "full-graph double-ingest idempotency"
// describe block).
export const YACHT_QUALITY_CORRECTIONS = [
  {
    id: 'yacht:eiv',
    field: 'loa',
    correctedValue: { meters: 48.8, raw: '48.8m' },
    note:
      'Graph LOA (160m) was a confirmed data error (~3.3x too large) — real EIV is a 48.8m Rossinavi (2020). ' +
      'Corrected per research/round4/person-enrichment.md\'s Suspect yachts table.',
  },
  {
    id: 'yacht:mystere',
    field: 'loa',
    correctedValue: { meters: 33.29, raw: '33.29m (109ft)' },
    note:
      'Graph LOA (109m) conflated "109 ft" with "109 m" (a feet-to-meters conversion bug) — real MYSTERE is a ' +
      '33.29m/109ft Mangusta (2023). Corrected per research/round4/person-enrichment.md\'s Suspect yachts table.',
  },
];

// True when `a` and `b` already represent the same corrected value (e.g. a
// repeat call on an already-corrected node) — guards
// applyYachtQualityCorrections's conflict/alias recording below against
// treating the CURRENT (already-correct) value as a fresh "old" value to
// preserve every time this idempotent hook re-runs (once per ingest).
function sameCorrectionValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function applyYachtQualityCorrections(db) {
  for (const { id, field, correctedValue, note } of YACHT_QUALITY_CORRECTIONS) {
    if (!nodeExists(db, id)) continue;
    const row = getFullNode(db, id);
    const attrs = parseAttrsJson(row.attrs_json);
    const oldValue = attrs[field];
    const alreadyCorrected = Boolean(oldValue) && sameCorrectionValue(oldValue, correctedValue);

    attrs[field] = correctedValue;

    if (oldValue && !alreadyCorrected) {
      const oldRaw = (oldValue && oldValue.raw) || JSON.stringify(oldValue);
      const conflicts = { ...(attrs.conflicts || {}) };
      const entry = `${oldRaw} (superseded — ${note})`;
      const existingList = conflicts[field] || [];
      conflicts[field] = existingList.includes(entry) ? existingList : [...existingList, entry];
      attrs.conflicts = conflicts;

      // TASK-023 item 0 fix: for a length-shaped field (currently only
      // `loa`, the one field yachtMapper.js's resolver actually consults —
      // see classifyCandidate()), remember the pre-correction numeric value
      // as a matcher-consumable alias, keyed `<field>_aliases`, so a future
      // re-ingest's raw (still-uncorrected) corpus row keeps resolving onto
      // this SAME node instead of a re-ingest seeing a MISMATCH and minting
      // a disambiguated sibling. Deduped so a repeat cleanup run (or a
      // future correction of the SAME field on the SAME node) never grows
      // this list with a value it already holds.
      if (typeof oldValue.meters === 'number') {
        const aliasKey = `${field}_aliases`;
        const existingAliases = attrs[aliasKey] || [];
        if (!existingAliases.includes(oldValue.meters)) {
          attrs[aliasKey] = [...existingAliases, oldValue.meters];
        }
      }
    }

    upsertNode(db, { id, type: row.type, name: row.name, attrs });
  }
}

/**
 * Runs the full graph cleanup pass (see module header): duplicate builder
 * merges, suspect-node reclassification/removal/flagging, the two special
 * cross-type fixes, the Weichai company merge, TASK-020's yacht rename/
 * duplicate merges, the Rybovich marina merge, the RIO/MOSAIQUE data-
 * quality flags, and TASK-021's person/club dedupe, person retype/flag,
 * ownership corrections, and yacht LOA quality corrections. Idempotent —
 * safe to call after every ingest run (a repeat call is a no-op: every
 * merge source/suspect id has already been deleted, and re-flagging/re-
 * correcting an already-handled node is a harmless no-op overwrite of the
 * same values).
 */
export function applyGraphCleanup(db) {
  for (const { from, to } of BUILDER_MERGE_MAP) {
    mergeNode(db, from, to);
  }

  applyNodeActions(db, SUSPECT_NODE_ACTIONS);
  applyNodeActions(db, PERSON_NODE_ACTIONS);
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

  // TASK-021: ownership corrections run BEFORE the generic person merge
  // map, so Sergey Brin (rumored)'s mismatched edge is dropped before its
  // node (and any remaining edges) would otherwise be carried over by the
  // generic merge.
  fixTatianaOwnership(db);
  fixSergeyBrinRumoredArtifact(db);

  for (const { from, to } of PERSON_MERGE_MAP) {
    mergeNode(db, from, to);
  }

  for (const { from, to } of CLUB_MERGE_MAP) {
    mergeNode(db, from, to);
  }

  applyYachtQualityCorrections(db);
}
