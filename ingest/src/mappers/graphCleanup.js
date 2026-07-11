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

  // --- TASK-023 item 3: ~17-18 grounded duplicate-hull merges -------------
  // research/round5/yacht-specs-55-70m.md's Coverage notes list 12 named
  // clusters (several as pairs/triples of the same real hull); research/
  // round5/yacht-specs-under35m.md's Suspect entries add 3 more (Amevi/
  // Batello, Al Mirqab, H3). `to` is chosen as whichever side already
  // carries (or, after this round's other cleanup steps run, WILL carry)
  // the correctly-attributed builder — never guessed, always grounded in
  // the research doc's own per-entry rationale (cited per line below).
  // Deliberately NOT merged (per the ticket's own instruction): "Katina"
  // (Brodosplit, populated) / "Lady Beth" (Lürssen) — research found no
  // grounded evidence either second node is the SAME real vessel (a
  // different, unrelated well-documented "Katina"/"Lady Beth" of that
  // builder simply wasn't found publicly) — left unmerged, same
  // "GROUNDED merges only" discipline as every prior round's merge maps.

  // "Nomad" (69.5m Oceanfast megayacht) recorded as two nodes — a clean
  // "Nomad" (id nomad-oceanfast) and a messy markdown-artifact name
  // "**Nomad** (ex-Aussie Rules)" with no builder resolved at all. The
  // UNRELATED, much smaller 30m "Nomad" (South Pacific fast MY, id
  // `yacht:nomad`) is a genuinely different real yacht and is never
  // referenced by this merge map.
  { from: 'yacht:nomad-ex-aussie-rules', to: 'yacht:nomad-oceanfast' },
  // Argus: 1971-built/2022-refit expedition conversion, recorded twice
  // under two equally-generic placeholder builder tags (`custom-rebuild`/
  // `custom`) — same real vessel per research, no distinguishing evidence
  // either way, so the plain "Argus" id is kept canonical.
  { from: 'yacht:argus-custom', to: 'yacht:argus' },
  // Amor a Vida: CRN's first hybrid-propulsion 67m hull, double-counted
  // under two builder-id spellings that graphCleanup's own BUILDER_MERGE_MAP
  // (crn -> crn-yachts) already reconciles to the same real company.
  { from: 'yacht:amor-a-vida-crn-yachts', to: 'yacht:amor-a-vida' },
  // Loon: Icon Yachts' 67m flagship (ex "Icon"), double-counted under two
  // builder-id spellings (icon -> icon-yachts, also already reconciled by
  // BUILDER_MERGE_MAP).
  { from: 'yacht:loon-icon', to: 'yacht:loon' },
  // Alchemy/Alchemia: same 65.99m Rossinavi hull (Vitruvius Yachts design)
  // — "Alchemia" is a spelling-variant duplicate; no separate "Alchemia"
  // hull was found by any source. "Alchemy" is the correct/real name.
  { from: 'yacht:alchemia', to: 'yacht:alchemy' },
  // Roma/RoMa: same 61.8m Viareggio Superyachts (VSY) hull — "RoMa"'s own
  // builder tag (bare `builder:viareggio`) is ALSO the "town name, not a
  // company" suspect node SUSPECT_NODE_ACTIONS already removes above, so
  // this merge simply consolidates onto the correctly-attributed "Roma".
  { from: 'yacht:roma-viareggio', to: 'yacht:roma' },
  // After You: Damen Yachting's first "Xplorer 60" hull, recorded three
  // times — a generic-builder placeholder (`various`), the correctly-
  // attributed real builder (`damen-yachting`), and a third node whose
  // builder tag is literally the brand name "Xplorer" (Damen Yachting's
  // own yacht brand, not a separate shipyard, per research). Both
  // duplicates fold onto the correctly-attributed node.
  { from: 'yacht:after-you', to: 'yacht:after-you-damen-yachting' },
  { from: 'yacht:after-you-xplorer', to: 'yacht:after-you-damen-yachting' },
  // St David: same 60m Benetti hull (ex "Xanadu") under a real builder tag
  // and a generic `custom` placeholder duplicate.
  { from: 'yacht:st-david-custom', to: 'yacht:st-david' },
  // Andrea L / Andreas L: same 60m Benetti hull (rename chain Amnesia ->
  // Andreas L -> MIMI -> LA BLANCA) — "Andrea L" is a spelling-variant
  // duplicate; "Andreas L" matches the vessel's own documented rename
  // chain and is kept canonical.
  { from: 'yacht:andrea-l', to: 'yacht:andreas-l' },
  // Come Together: Amels 60 Limited Editions hull (ex-project "Witchcraft"),
  // recorded three times — a generic `custom` placeholder and a node whose
  // builder tag is the retyped `person:y-co`/`company:y-co` brokerage
  // (never a real shipyard) both fold onto the correctly-attributed Amels
  // node.
  { from: 'yacht:come-together-custom', to: 'yacht:come-together' },
  { from: 'yacht:come-together-y-co', to: 'yacht:come-together' },
  // Pink Shadow: Damen Yachting's only "Xplorer 58" hull, same three-node
  // pattern as After You/Come Together above (generic `custom` placeholder
  // + a Y.CO-tagged duplicate) folding onto the correctly-attributed node.
  { from: 'yacht:pink-shadow-custom', to: 'yacht:pink-shadow' },
  { from: 'yacht:pink-shadow-y-co', to: 'yacht:pink-shadow' },
  // Loewe: Tankoa's T55 Sportiva 2nd hull, recorded twice — one node's own
  // cached `_resolution.builderId` nonsensically points to
  // `builder:sportiva-55` (a model-designation string that leaked into the
  // builder field; that suspect builder node is itself already removed by
  // SUSPECT_NODE_ACTIONS above, so this is a dangling/stale reference, not
  // a real second builder claim) — merging onto the correctly-attributed
  // `loewe-tankoa` node (real builder Tankoa) resolves the remnant.
  { from: 'yacht:loewe', to: 'yacht:loewe-tankoa' },

  // Amevi/Batello: the SAME Oceanco Y701 80m hull under its rename chain
  // (Aalto -> Amevi -> Batello, current) — research/round5/
  // yacht-specs-under35m.md consolidates onto the CURRENT name, "Batello".
  { from: 'yacht:amevi', to: 'yacht:batello' },
  // Al Mirqab: the Emir of Qatar's 133m yacht, recorded twice with
  // conflicting builder claims (`kusch-yachts` vs the correct, real
  // `peters-schiffbau` — already corrected in knowledge/93's own row for
  // this same node). Canonical id kept as the cleaner `yacht:al-mirqab`;
  // its mismatched `built_by` edge to `builder:kusch-yachts` is dropped by
  // fixAlMirqabBuilderConflict() (below) so only the correct
  // `builder:peters-schiffbau` edge survives the merge.
  { from: 'yacht:al-mirqab-peters-schiffbau', to: 'yacht:al-mirqab' },
  // H3: Oceanco's 105m rebuild (real, well-documented — see knowledge/93's
  // own H3 row), double-counted alongside a thin `various`/`loa: "70+"`
  // placeholder duplicate with no other data.
  { from: 'yacht:h3-various', to: 'yacht:h3' },

  // --- TASK-024 review LOW 1: DB9 merge -----------------------------------
  // Palmer Johnson's first PJ170 SportYacht hull, recorded twice: a
  // 52.36m node (`yacht:db9`, correctly gap-filled by knowledge/97's own
  // "DB9" spec row — LOA matches to the centimetre) and a thin duplicate
  // (`yacht:db9-palmer-johnson`, LOA rounded to 50m by a different source
  // doc, no other spec data). research/round5/yacht-specs-45-55m.md's own
  // DB9 row documents this exact pair as "the same real vessel ... left
  // unmerged this round ... documented here for a future pass" — grounded
  // by that citation, this ticket closes it. `to` is the already-spec'd
  // node so no data is lost either way.
  { from: 'yacht:db9-palmer-johnson', to: 'yacht:db9' },

  // --- TASK-025 (Round 7): dupe-pair merges -------------------------------
  // research/round7/02_dupe_pairs_loa_carryover.md's Sub-task 1. Each pair's
  // own builder-misattribution (if any) is fixed BEFORE this loop runs, by
  // fixSamsaraBuilderMisattribution / fixMokaBuilderMisattribution below —
  // see their own comments for why a plain merge alone isn't enough for
  // those two pairs.

  // Samsara: the SAME 88.5m Oceanco hull (delivered 2015 as Infinity, later
  // Cloud 9, now Samsara) recorded twice under two different (and, for
  // yacht:samsara, factually WRONG) builder attributions. True builder is
  // Oceanco, not Benetti — no confirmed Benetti-built "Samsara" exists in
  // any source found. Survivor = the already-correctly-attributed node.
  { from: 'yacht:samsara', to: 'yacht:samsara-oceanco' },
  // Moka: the SAME 42.2m Sanlorenzo-built hull recorded twice from the
  // identical source-file row — BOTH nodes' stored builder ("Overmarine"/
  // "Overmarine Group") is wrong (a mix-up with an unrelated, much larger
  // 49.9m Mangusta/Overmarine "Moka"). Survivor = the richer duplicate
  // (carries `cabins: 5`).
  { from: 'yacht:moka-overmarine', to: 'yacht:moka' },
  // That's Amore: an orphan builder-id duplicate (`builder:grandi-yatcilik`,
  // no corresponding builder node anywhere in the graph) of the same 42.9m
  // Grandi Yatcilik Mimarlik gulet already correctly resolved on the
  // survivor (`builder:grandi-yatcilik-mimarlik`, a real, resolvable
  // builder node).
  { from: 'yacht:that-s-amore-grandi-yatcilik', to: 'yacht:that-s-amore' },
  // Dream: the SAME 107m converted mega yacht (ex-Poseidonos, Olympic Yacht
  // Services) recorded THREE times — two orphan-builder-id duplicates
  // (`builder:olympic`, `builder:olympic-yacht`, neither an actual builder
  // node) folding onto the graph's already-correctly-resolved canonical
  // `yacht:dream` (real `builder:olympic-yacht-services` edge, richest
  // attrs: guests 36, crew 40).
  { from: 'yacht:dream-olympic', to: 'yacht:dream' },
  { from: 'yacht:dream-olympic-yacht', to: 'yacht:dream' },
  // Ahpo -> Lady Jorgia: the SAME 115.1m Lürssen hull (Project Enzo,
  // delivered 2021 to Michael Lee-Chin as Ahpo), sold May 2023 to Patrick
  // Dovigi and renamed Lady Jorgia. Survivor keeps the CURRENT name
  // (Lady Jorgia); mergeNode() re-points ALL of Ahpo's edges onto the
  // survivor, so BOTH real ownership periods (Michael Lee-Chin, Patrick
  // Dovigi) survive as separate owned_by edges — mergeNode() never drops
  // one to make room for the other. `former_names` gains "Ahpo" via
  // yachtSpecMapper.js's FORMER_NAMES_MAP (set directly by knowledge/98's
  // own Lady Jorgia row, independent of this merge's own timing).
  { from: 'yacht:ahpo', to: 'yacht:lady-jorgia' },
];

// --- TASK-024 review LOW 2: same-name-conflict identity notes -----------
// research/round5's band files flag 7 yacht nodes where a same-named REAL
// public vessel exists, but its documented builder/LOA/hull-number
// contradicts THIS graph node's own recorded combination (see each entry's
// own citation) — not a data value to correct (no single alternate value
// is confidently grounded), so recorded as a node-level identity-mismatch
// note in `attrs.conflicts.identity` rather than guessed at or silently
// left implicit. `identity` is a RESERVED key within attrs.conflicts (see
// yachtSpecMapper.js's own module header for the general per-field
// convention this reserves against) — it is never a real yacht attr name,
// so it can never collide with a genuine per-field value conflict. Same
// "small curated mechanism, never a hand-edit of graph.json" discipline as
// QUALITY_FLAGS/YACHT_QUALITY_CORRECTIONS above. These same 7 names are
// also carried into identifiability.js's NEGATIVE_EVIDENCE_TABLE (Rule B's
// negative-evidence skip list) — the two mechanisms are independent (this
// one annotates the node; that one affects scoring) but grounded in the
// same research citations.
export const YACHT_CONFLICT_NOTES = [
  {
    id: 'yacht:aqa',
    note:
      'Graph describes a 49m Inace-built expedition yacht (2022). Public yacht databases only show an unrelated ' +
      '28.01m "AQA" (Export Yachts, 1996) — no record of a 49m Inace-built AQA found. Likely a very new/private ' +
      'build not yet indexed, or a data-extraction mismatch. See research/round5/yacht-specs-45-55m.md.',
  },
  {
    id: 'yacht:grace-australian-yacht-builders',
    note:
      'Graph describes a 52.4m Australian Yacht Builders "Grace". Public records show two distinct "Grace" yachts ' +
      '(a 58.5m Australian Yacht Builders vessel, 1991, and an unrelated 52.3m Amels, 2009) — neither matches this ' +
      'node\'s exact 52.4m + Australian Yacht Builders combination. See research/round5/yacht-specs-45-55m.md.',
  },
  {
    id: 'yacht:panam',
    note:
      'Graph describes a 49m "Panam" attributed (in part) to CCN. The only public "Panam" is a 40.2m Baglietto-' +
      'built, CCN-constructed yacht (2021) — 8.8m shorter than this node\'s recorded length. See research/round5/' +
      'yacht-specs-45-55m.md.',
  },
  {
    id: 'yacht:starburst-iv',
    note:
      'Graph describes a 47m Bilgin-built "Starburst IV". The only public record found is "Starburst III" (47.4m ' +
      'Bilgin, 2017) — no "Starburst IV" is documented; likely a naming confusion with Starburst III in the source ' +
      'corpus. See research/round5/yacht-specs-45-55m.md.',
  },
  {
    id: 'yacht:night-fury-ii',
    note:
      'Graph describes a 49.9m Columbus-built "Night Fury II". The only public record is a 43.0m Columbus ' +
      'Atlantique 43 (2024) — 6.9m shorter than this node\'s recorded length; builder matches but LOA does not. ' +
      'See research/round5/yacht-specs-45-55m.md.',
  },
  {
    id: 'yacht:little-perle',
    note:
      'Graph describes a 50m "Little Perle". The only public "Little Perle" is a 30m Moonen (2008) — no 50m ' +
      'vessel of this name exists in yacht databases; probably a graph misattribution during ingestion. See ' +
      'research/round5/yacht-specs-45-55m.md.',
  },
  {
    id: 'yacht:the-jackson',
    note:
      'Graph describes a 37m Horizon-built "The Jackson" (2017). The only "The Jackson" with strong web presence ' +
      'is an unrelated 62.5m Sydney Harbour dinner-cruise/event vessel (a commercial function-boat, not a private ' +
      'Horizon yacht) — could not confirm the graph\'s 37m/Horizon/2017 entry against any source. See research/' +
      'round5/yacht-specs-35-45m.md and yacht-specs-45-55m.md.',
  },

  // --- TASK-025 (Round 7): stay-split pairs (dupe-pair grounding insufficient) ---
  {
    id: 'yacht:sophia',
    note:
      'Graph describes a 108m ("108/354") Benetti-attributed "Sophia," claimed as a sister ship to IJE. This does ' +
      'not check out: Benetti\'s actual 100m+ "Giga Season" trio (2019-2020) is IJE (108m), LANA (107m), and ' +
      'LUMINOSITY (107m) — not "Mar" and "Sophia." No independent source (SuperYachtTimes, Boat International, ' +
      'YachtCharterFleet, Benetti\'s own site) corroborates a Benetti-built 108m yacht named Sophia — likely ' +
      'fabricated/unsubstantiated data riding on the real IJE/LANA/LUMINOSITY story, not simply a feet/metres ' +
      'artifact of the separate, well-grounded 97m Feadship "Sophia" (yacht:sophia-feadship). See ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 1(d).',
  },
  {
    id: 'yacht:lady-beth-lurssen',
    note:
      'Graph describes a 55m Lürssen-attributed "Lady Beth." No Lürssen-built "Lady Beth" has been found in any ' +
      'source searched (Boat International, SuperYachtTimes, YachtBuyer, YachtCharterFleet, Northrop & Johnson, ' +
      'IYC, CharterWorld, Marine Project, Out of the Blue Yacht Charters) — every documented "Lady Beth" is the ' +
      'same 54.86m Newcastle Marine hull (see yacht:lady-beth, fully spec\'d this round). See ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Lady Beth addendum ("Identity verification" section).',
  },
];

function applyYachtConflictNotes(db) {
  for (const { id, note } of YACHT_CONFLICT_NOTES) {
    if (!nodeExists(db, id)) continue;
    const row = getFullNode(db, id);
    const attrs = parseAttrsJson(row.attrs_json);
    const conflicts = { ...(attrs.conflicts || {}) };
    const existing = conflicts.identity || [];
    conflicts.identity = existing.includes(note) ? existing : [...existing, note];
    attrs.conflicts = conflicts;
    upsertNode(db, { id, type: row.type, name: row.name, attrs });
  }
}

// --- TASK-025 (Round 7) review fix (HIGH): non-yacht stay-split notes ----
// research/round7/02_dupe_pairs_loa_carryover.md's Sub-task 1(f):
// builder:olympic-yacht-services (the present-day Olympic Yacht Shipyard/
// OYS refit yard, oys.gr — publicly credited with the Dream mega-yacht
// conversion) vs marina:olympic-marine-lavrion (Olympic Marine S.A., a
// separate marina/boatyard complex, olympicmarine.gr — 680 berths, founded
// 1969) — related-but-distinct roles in the same Lavrio, Attica waterfront
// cluster. One secondary source hints Olympic Marine was itself "founded in
// Lavrio under the initial name of Olympic Yachts," suggesting possible
// shared historical lineage, but this is not strong enough grounding to
// assert they are the identical legal entity TODAY, and their present-day
// web presences are separate. STAY-SPLIT, no merge action taken — but
// recorded here (rather than left silently implicit) so the verdict is
// visible on-graph, same discipline as YACHT_CONFLICT_NOTES above.
// yachtSpecMapper.js's attrs.conflicts.identity reserved-key convention is
// yacht-specific in NAME only, not mechanism — this generic executor
// reuses the identical shape for the two non-yacht node types this ticket
// needs it for (builder, marina).
export const NODE_STAY_SPLIT_NOTES = [
  {
    id: 'builder:olympic-yacht-services',
    note:
      'Distinct from marina:olympic-marine-lavrion (Olympic Marine S.A., a separate marina/boatyard complex in ' +
      'the same Lavrio, Greece waterfront cluster) — STAY-SPLIT: related-but-distinct roles (refit yard vs ' +
      'berthing facility); one secondary source hints at shared historical lineage but grounding is insufficient ' +
      'to assert they are the identical legal entity today. See ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 1(f).',
  },
  {
    id: 'marina:olympic-marine-lavrion',
    note:
      'Distinct from builder:olympic-yacht-services (Olympic Yacht Shipyard/OYS, a separate refit yard in the ' +
      'same Lavrio, Greece waterfront cluster) — STAY-SPLIT: related-but-distinct roles (berthing facility vs ' +
      'refit yard); one secondary source hints at shared historical lineage but grounding is insufficient to ' +
      'assert they are the identical legal entity today. See ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 1(f).',
  },
];

function applyNodeStaySplitNotes(db) {
  for (const { id, note } of NODE_STAY_SPLIT_NOTES) {
    if (!nodeExists(db, id)) continue;
    const row = getFullNode(db, id);
    const attrs = parseAttrsJson(row.attrs_json);
    const conflicts = { ...(attrs.conflicts || {}) };
    const existing = conflicts.identity || [];
    conflicts.identity = existing.includes(note) ? existing : [...existing, note];
    attrs.conflicts = conflicts;
    upsertNode(db, { id, type: row.type, name: row.name, attrs });
  }
}

// TASK-023 item 3: research/round5/yacht-specs-under35m.md's own Suspect
// entries flag Al Mirqab's two graph nodes as carrying "no reconciliation
// between the two builder claims" — `builder:kusch-yachts` (wrong) vs
// `builder:peters-schiffbau` (the real, correct builder, matching
// knowledge/93's own already-corrected row for this same yacht). Dropped
// BEFORE the YACHT_MERGE_MAP merge above runs, mirroring
// fixSergeyBrinRumoredArtifact's "drop the wrong edge before the generic
// merge carries it over" pattern — otherwise the merged node would end up
// with two contradictory `built_by` edges.
function fixAlMirqabBuilderConflict(db) {
  db.prepare(
    "DELETE FROM edges WHERE src = 'yacht:al-mirqab' AND rel = 'built_by' AND dst = 'builder:kusch-yachts'"
  ).run();
}

// --- TASK-025 (Round 7): pre-merge builder-misattribution fixes ----------
// Same "drop the wrong edge BEFORE the generic merge carries it over"
// pattern as fixAlMirqabBuilderConflict/fixSergeyBrinRumoredArtifact above —
// research/round7/02_dupe_pairs_loa_carryover.md's Sub-task 1.

// Samsara's real builder is Oceanco (see the YACHT_MERGE_MAP entry above);
// yacht:samsara's own built_by edge to builder:benetti is a confirmed
// misattribution, not a competing fact, and must never land on the merge
// survivor (yacht:samsara-oceanco, whose own built_by -> builder:oceanco
// edge is already correct).
function fixSamsaraBuilderMisattribution(db) {
  db.prepare("DELETE FROM edges WHERE src = 'yacht:samsara' AND rel = 'built_by' AND dst = 'builder:benetti'").run();
}

// Review fix (LOW, round 1): knowledge/98's Samsara row routes its ~6,700nm
// range estimate to attrs.conflicts.range_nm via yachtSpecMapper.js's
// isApproxRaw handling (same mechanism as La Datcha's own ~6,000nm entry —
// see that node's row) — but because the row's ambiguous same-name
// tie-break always lands on yacht:samsara (the "from" side of the
// samsara -> samsara-oceanco merge below), and yacht:samsara-oceanco (the
// "to"/survivor side) already carries its OWN non-null attrs.conflicts
// object (the pre-existing "features" duplication), mergeNode()'s
// whole-key first-non-empty-wins merge never copies the "from" side's
// conflicts.range_nm over — it's silently dropped. Restored directly here,
// run AFTER the merge (see applyGraphCleanup's call ordering), same
// approx-estimate note text convention as yachtSpecMapper.js's own
// approxConflictNote().
function fixSamsaraRangeConflict(db) {
  const id = 'yacht:samsara-oceanco';
  if (!nodeExists(db, id)) return;
  const row = getFullNode(db, id);
  const attrs = parseAttrsJson(row.attrs_json);
  const conflicts = { ...(attrs.conflicts || {}) };
  const note = '~6700 (estimate — not stored as a confirmed value; see source Notes)';
  const existing = conflicts.range_nm || [];
  conflicts.range_nm = existing.includes(note) ? existing : [...existing, note];
  attrs.conflicts = conflicts;
  upsertNode(db, { id, type: row.type, name: row.name, attrs });
}

// BOTH Moka nodes' stored builder (Overmarine/Overmarine Group) is wrong —
// the real 42.2m Moka is Sanlorenzo-built (see the YACHT_MERGE_MAP entry
// above). Drops the wrong edge from both nodes (so the merge never carries
// it over) and adds the correct one directly onto the survivor.
function fixMokaBuilderMisattribution(db) {
  db.prepare(
    "DELETE FROM edges WHERE src IN ('yacht:moka', 'yacht:moka-overmarine') AND rel = 'built_by' AND dst = 'builder:overmarine-group'"
  ).run();
  if (nodeExists(db, 'yacht:moka') && nodeExists(db, 'builder:sanlorenzo')) {
    upsertEdge(db, { src: 'yacht:moka', rel: 'built_by', dst: 'builder:sanlorenzo' });
  }
}

// research/round7/02_dupe_pairs_loa_carryover.md's Sub-task 2 Navetta 68
// note: the graph resolves this node to `builder:custom`, but the LOA that
// matches to the centimetre (20.53m) belongs specifically to Absolute
// Yachts' Navetta 68 model — Custom Line's own "Navetta" series is named
// directly in metres (Navetta 30/33/37/42...), not "68", so a Custom Line
// match is implausible. Independent of the LOA correction
// (YACHT_QUALITY_CORRECTIONS below) — corrects the builder edge, not a
// scalar attr.
function fixNavetta68Builder(db) {
  if (!nodeExists(db, 'yacht:navetta-68')) return;
  db.prepare("DELETE FROM edges WHERE src = 'yacht:navetta-68' AND rel = 'built_by' AND dst = 'builder:custom'").run();
  if (nodeExists(db, 'builder:absolute')) {
    upsertEdge(db, { src: 'yacht:navetta-68', rel: 'built_by', dst: 'builder:absolute' });
  }
}

// research/round7/02_dupe_pairs_loa_carryover.md's Lady Beth addendum:
// confirmed builder Newcastle Marine (also styled "Newcastle Shipyard" in
// charter listings) for the 54.86m hull. yachtSpecMapper.js never creates
// builder edges (see knowledge/98's own Curation notes), so this small
// dedicated fixup adds it directly — same pattern as fixWinchDesignVard's
// one-off edge repair above.
//
// Review fix (MEDIUM, round 1): the node's primary-ingestion built_by edge
// resolved to the generic `builder:custom` placeholder (the raw corpus row
// named no specific yard) — same delete-then-add pattern as
// fixNavetta68Builder above, so the node ends up with exactly one, correct
// built_by edge instead of two (the real Newcastle Marine PLUS the
// placeholder).
function fixLadyBethBuiltBy(db) {
  if (!nodeExists(db, 'yacht:lady-beth')) return;
  db.prepare("DELETE FROM edges WHERE src = 'yacht:lady-beth' AND rel = 'built_by' AND dst = 'builder:custom'").run();
  if (nodeExists(db, 'builder:newcastle-marine')) {
    upsertEdge(db, { src: 'yacht:lady-beth', rel: 'built_by', dst: 'builder:newcastle-marine' });
  }
}

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

  // --- TASK-025 (Round 7): corpus-confusion quarantine ---------------------
  // research/round7/01_weakest_tier_yacht_specs.md's own "UNRESOLVED — no
  // specs applied" rows: the stored LOA/builder/year combination on each of
  // these 3 nodes matches no real, public vessel found — quarantined rather
  // than force-matched to an unrelated same-named hull (Nomad/Relentless
  // each already have a correctly-attributed, fully-spec'd real hull under
  // a SEPARATE graph node — yacht:nomad-oceanfast / the real 43-44m Trinity
  // Relentless is not itself a graph node — neither is conflated with these
  // quarantined nodes).
  {
    id: 'yacht:nomad',
    dataQuality:
      'unresolved — graph LOA is 30m, but the only well-documented Oceanfast "Nomad" publicly found is the ' +
      '69.5m hull (already spec\'d separately as yacht:nomad-oceanfast); no public 30m Oceanfast "Nomad" exists ' +
      'in any source searched, so no specs applied rather than force-matched. See ' +
      'research/round7/01_weakest_tier_yacht_specs.md.',
  },
  {
    id: 'yacht:relentless',
    dataQuality:
      'unresolved — graph LOA is 34m, but the only public Trinity Yachts "Relentless" is 43.28-44.2m (145ft), a ' +
      '~10m mismatch; no specs applied rather than force-matched to a different-sized real hull. See ' +
      'research/round7/01_weakest_tier_yacht_specs.md.',
  },
  {
    id: 'yacht:sahana',
    dataQuality:
      'unresolved — the graph\'s 75m/2025/Feadship combination matches no real vessel found; the two closest ' +
      'candidates (a 36m Oceanfast charter yacht also named "Sahana," and Feadship\'s genuine 73m "Hasna") each ' +
      'fail to match on either name or size/builder, so no specs applied. See ' +
      'research/round7/01_weakest_tier_yacht_specs.md.',
  },
  // Not part of the corpus-confusion trio above — a different reason for no
  // spec row: Mansion Yacht is a per-model product-line spec (Stainless
  // Structures' beach-launchable line), not a single named, registry-
  // tracked hull, so no hull-specific figures exist to confirm at all.
  {
    id: 'yacht:mansion-yacht',
    dataQuality:
      'no hull-specific registry record exists — "Mansion Yacht" is Stainless Structures\' beach-launchable ' +
      'product line, not a single named vessel; only the flagship model\'s published (per-model, not per-hull) ' +
      'dimensions were found, which per this project\'s never-guess rule are not stored as confirmed individual-' +
      'hull attrs. See research/round7/01_weakest_tier_yacht_specs.md.',
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

  // TASK-023 item 2: ~15 model-number/feet-as-LOA corrections identified
  // across research/round5's four band files — the same failure class as
  // EIV/MYSTERE above: a production model's own number (usually a
  // feet-based model-line designation) was parsed by the ingestion
  // pipeline's LOA column as if it were a metres figure. Two modes, per
  // the ticket's own instruction:
  //   - the research grounds a real LOA (a specific/derived metres figure,
  //     even if only an approximate feet->metres conversion of the model
  //     name): `correctedValue` carries it, same as EIV/MYSTERE.
  //   - the research only proves the CURRENT value wrong without
  //     establishing a single confident true LOA (Pardo 50: two research
  //     band files give two different approximate conversions with no
  //     resolution between them; Admiral 72: no source corroborates that a
  //     specific hull of this description even exists): `correctedValue:
  //     null` blanks the field and `dataQuality` records why (applied by
  //     applyYachtQualityCorrections below), rather than guessing.
  {
    // TASK-025 (Round 7) sub-task 2: supersedes the round-5 ~17.3m estimate
    // with the exact, official Riva spec-table figure.
    id: 'yacht:rivale-56',
    field: 'loa',
    correctedValue: { meters: 17.27, raw: "17.27m (56'8\")" },
    note:
      '"56" is the foot-based model number of the Riva 56 Rivale, not a 56m LOA — confirmed exact figure is ' +
      '17.27m (56\'8") per the official Riva model page, cross-checked via YachtBuyer. Corrected per ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 2 (supersedes the round-5 ~17.3m estimate).',
  },
  {
    // TASK-025 (Round 7) sub-task 2: the round-5 18.28m value was Arcadia's
    // own "Hull Length" spec, a shorter, DIFFERENT field from Overall
    // Length — a correction, not just a re-confirmation.
    id: 'yacht:arcadia-sherpa-60',
    field: 'loa',
    correctedValue: { meters: 18.67, raw: '18.67m' },
    note:
      '"60" is Arcadia Yachts\' own Sherpa model-line number, not metres. The previously-stored 18.28m is ' +
      'Arcadia\'s own published "Hull Length" figure, NOT Overall Length — confirmed true Overall Length is ' +
      '18.67m per Arcadia Yachts\' own Sherpa 60 Technical Data page. Corrected per ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 2.',
  },
  {
    // TASK-025 (Round 7) sub-task 2: confirms/refines the round-5 21.06m
    // estimate to the exact official spec-table figure.
    id: 'yacht:sunseeker-manhattan-65',
    field: 'loa',
    correctedValue: { meters: 21.08, raw: "21.08m (69'2\")" },
    note:
      '"65" is the Sunseeker Manhattan 65 model\'s (loosely foot-based) name, not metres — confirmed exact LOA is ' +
      '21.08m (69\'2") per YachtBuyer\'s official spec table. Corrected per ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 2 (supersedes the round-5 21.06m estimate).',
  },
  {
    // TASK-025 (Round 7) sub-task 2: near-exact refinement (20.52m ->
    // 20.53m) of the round-5 estimate to Absolute Yachts' own official
    // model-page figure.
    id: 'yacht:navetta-68',
    field: 'loa',
    correctedValue: { meters: 20.53, raw: '20.53m' },
    note:
      '"68" is the Absolute Navetta 68 model\'s foot-based name, not metres — confirmed exact LOA is 20.53m per ' +
      'Absolute Yachts\' own official Navetta 68 model page. Corrected per ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 2 (supersedes the round-5 20.52m estimate). ' +
      'Builder edge separately corrected to Absolute Yachts by fixNavetta68Builder (this node had resolved to ' +
      'builder:custom, a mis-attribution — Custom Line\'s own "Navetta" series is named directly in metres, not ' +
      '"68").',
  },
  {
    // TASK-025 (Round 7) sub-task 2: exact figure from Ferretti's own model
    // page, supersedes the round-5 ~20.2m estimate.
    id: 'yacht:yamas',
    field: 'loa',
    correctedValue: { meters: 20.24, raw: '20.24m (Ferretti 670)' },
    note:
      'The graph\'s original 67m LOA mistook the Ferretti 670 model\'s own model number for a length — confirmed ' +
      'exact LOA is 20.24m per the official Ferretti Yachts 670 model page. Corrected per ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 2 (supersedes the round-5 ~20.2m estimate).',
  },
  {
    id: 'yacht:isa-120',
    field: 'loa',
    correctedValue: { meters: 36.6, raw: '~36.6m (120ft)' },
    note:
      '"120" is ISA Yachts\' foot-based "120" model-line designation, not metres — real LOA is ~120ft/36.6m. ' +
      'Corrected per research/round5/yacht-specs-under35m.md\'s Suspect entries.',
  },
  {
    id: 'yacht:majesty-120',
    field: 'loa',
    correctedValue: { meters: 36.5, raw: '~36.5m (120ft)' },
    note:
      '"120" is Gulf Craft\'s foot-based Majesty 120 model designation, not metres — real LOA is ~120ft/36.5m. ' +
      'Corrected per research/round5/yacht-specs-under35m.md\'s Suspect entries.',
  },
  {
    id: 'yacht:pardo-50',
    field: 'loa',
    correctedValue: null,
    dataQuality:
      'unit-bug: "50" is Cantiere del Pardo\'s foot-based Pardo 50 model designation (a ~15-16m day/sport ' +
      'cruiser), not a 50m LOA — research/round5\'s 45-55m and under-35m band files give two differing ' +
      'approximate conversions (~16.25m vs ~15.5m) with no single confidently-grounded true LOA, so the field is ' +
      'blanked rather than guessed (2026-07 research pass).',
    note:
      '"50" is the Pardo 50 model\'s foot-based designation (a day/sport cruiser, not a 50m superyacht) — the true ' +
      'LOA is blanked rather than guessed because research/round5\'s two band files give differing approximate ' +
      'conversions (~15.5m vs ~16.25m) with no single confidently-grounded figure.',
  },
  {
    id: 'yacht:admiral-72-giorgio-armani',
    field: 'loa',
    correctedValue: null,
    dataQuality:
      'unit-bug: "72" is a foot-based Admiral/Overmarine Armani-collaboration model designation (~22m if the ' +
      'conversion is accurate), not a 72m LOA — no corroborating source confirms a specific hull of this ' +
      'description exists, so the field is blanked rather than guessed (2026-07 research pass).',
    note:
      '"72" is a foot-based Admiral/Overmarine Armani-collaboration model designation (72ft ≈ 22m) — blanked ' +
      'rather than guessed because no source corroborates a confirmed, specific hull of this description. Per ' +
      'research/round5/yacht-specs-under35m.md\'s Suspect entries.',
  },

  // --- TASK-025 (Round 7) ---------------------------------------------------
  {
    id: 'yacht:gigia',
    field: 'year',
    correctedValue: {
      value: 2017,
      raw: '2017 (delivered as "Areti"; the stored "2005" component was a data-entry error; 2024 refit is genuine)',
    },
    note:
      'Confirmed delivery year is 2017 (as "Areti," for Igor Makarov; renamed Amatasia 2019, then Gigia 2023) — ' +
      'the stored "2005/2024" combined year had no supporting source found anywhere for the 2005 component. ' +
      'Corrected per research/round7/01_weakest_tier_yacht_specs.md\'s headline finding.',
  },
  // Samsara's confirmed exact LOA (88.5m) applied directly onto the FINAL
  // merge-survivor id (yacht:samsara-oceanco), run AFTER the
  // samsara -> samsara-oceanco merge above — see graphCleanup.js's own
  // applyGraphCleanup() call ordering and knowledge/98's own Curation notes
  // for why this can't simply be a yachtSpecMapper.js row (both pre-merge
  // "Samsara" nodes share the identical pre-round-7 raw LOA of 88m, so the
  // mapper's own tie-break can't distinguish them on LOA alone).
  {
    id: 'yacht:samsara-oceanco',
    field: 'loa',
    correctedValue: { meters: 88.5, raw: '88.5m' },
    note:
      'Confirmed exact LOA for the real Oceanco-built hull (Y710, delivered 2015 as Infinity) is 88.5m — the ' +
      'previously-stored 88m was a rounded figure. Corrected per ' +
      'research/round7/01_weakest_tier_yacht_specs.md\'s headline finding and ' +
      'research/round7/02_dupe_pairs_loa_carryover.md\'s Sub-task 1(a).',
  },
  // Lady Beth's confirmed exact LOA — same "yachtSpecMapper.js never writes
  // the loa field at all" reason as every other LOA correction in this
  // array (the knowledge/98 spec row's own LOA column is disambiguation-
  // only). Applied directly by id (no merge/ambiguity involved here — see
  // knowledge/98's own Curation notes for how this node's tied-LOA
  // resolution against yacht:lady-beth-lurssen was independently verified).
  {
    id: 'yacht:lady-beth',
    field: 'loa',
    correctedValue: { meters: 54.86, raw: '54.86m (180ft)' },
    note:
      'Confirmed exact LOA for the real Newcastle Marine hull (delivered 2011) is 54.86m — the previously-stored ' +
      '55m was a rounded figure. Corrected per research/round7/02_dupe_pairs_loa_carryover.md\'s Lady Beth ' +
      'addendum.',
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
  for (const { id, field, correctedValue, note, dataQuality } of YACHT_QUALITY_CORRECTIONS) {
    if (!nodeExists(db, id)) continue;
    const row = getFullNode(db, id);
    const attrs = parseAttrsJson(row.attrs_json);
    const oldValue = attrs[field];
    const alreadyCorrected = Boolean(oldValue) && sameCorrectionValue(oldValue, correctedValue);

    attrs[field] = correctedValue;

    // TASK-023 item 2: an entry may blank the field (correctedValue: null)
    // rather than correct it to a numeric value, when the research only
    // proves the CURRENT value wrong without establishing a single
    // confident true LOA (see this array's own per-entry comments, e.g.
    // Pardo 50, Admiral 72). `dataQuality` records why, same convention as
    // graphCleanup.js's own QUALITY_FLAGS map (attrs.data_quality, never a
    // delete).
    if (dataQuality) attrs.data_quality = dataQuality;

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
 * quality flags, TASK-021's person/club dedupe, person retype/flag,
 * ownership corrections, and yacht LOA quality corrections, and TASK-024's
 * DB9 merge plus the 7 same-name-conflict identity notes. Idempotent —
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

  // TASK-023 item 3: drop Al Mirqab's mismatched built_by edge BEFORE the
  // generic yacht merge below carries it over (see fixAlMirqabBuilderConflict's
  // own comment).
  fixAlMirqabBuilderConflict(db);

  // TASK-025 (Round 7): same "drop the wrong edge BEFORE the generic merge
  // carries it over" pattern, for the Samsara/Moka dupe pairs.
  fixSamsaraBuilderMisattribution(db);
  fixMokaBuilderMisattribution(db);

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

  // TASK-025 (Round 7): independent builder-edge fixes (not merges/scalar
  // corrections) — order relative to the two blocks above doesn't matter
  // (neither yacht:navetta-68 nor yacht:lady-beth is a merge source/target
  // this round), grouped here for readability.
  fixNavetta68Builder(db);
  fixLadyBethBuiltBy(db);

  // TASK-025 (Round 7) review fix (LOW): restores Samsara's ~6,700nm range
  // estimate onto the FINAL merge-survivor id, run AFTER the
  // samsara -> samsara-oceanco merge above (see fixSamsaraRangeConflict's
  // own comment for why the merge alone loses it).
  fixSamsaraRangeConflict(db);

  // TASK-024 review LOW 2: same-name-conflict identity notes — runs last,
  // after every merge above, so it always targets the FINAL canonical node
  // id for each of the 7 flagged yachts (none of the 7 is itself a merge
  // source/target this round, but this ordering keeps the invariant true
  // for any future round that changes that). TASK-025 (Round 7) adds 2 more
  // entries (Sophia, Lady Beth (Lürssen)) to the same YACHT_CONFLICT_NOTES
  // table this function reads.
  applyYachtConflictNotes(db);

  // TASK-025 (Round 7) review fix (HIGH): non-yacht stay-split notes
  // (Olympic Marine / Olympic Yacht Services) — same "runs last" reasoning
  // as applyYachtConflictNotes above, though neither of this pair is a
  // merge source/target either.
  applyNodeStaySplitNotes(db);
}
