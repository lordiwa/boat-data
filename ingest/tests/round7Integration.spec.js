// ingest/tests/round7Integration.spec.js
//
// TASK-025 (Round 7 integration): failing tests encoding the ticket's
// acceptance criteria, grounded in research/round7/01_weakest_tier_yacht_specs.md
// (lane A) and research/round7/02_dupe_pairs_loa_carryover.md (lane B) — see
// each describe block's own citation. Runs the FULL real /knowledge corpus
// pipeline (not a synthetic fixture), same convention as
// ingest/tests/realCorpusExport.spec.js, since every node id this ticket
// touches (yacht:samsara, yacht:ahpo, ...) only exists in the real corpus.
//
// Performance note (deliberate departure from realCorpusExport.spec.js's
// per-test runIngest() convention): this file asserts on ~30 independent
// facts about the SAME post-ingest graph state, so it runs the full
// pipeline exactly ONCE in a file-level beforeAll (not once per `it`) and
// shares the resulting sqlite connection + exported graph.json across every
// test below. Nothing in this file mutates the shared db/graph after
// ingest, so this is safe.
//
// Every id/value below is read directly from the two research files (or
// from knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md /
// knowledge/95_Person_Enrichment_Directory.md for the oligarch lane) —
// never invented. See each block's own comment for the exact citation.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { computeCompleteness } from '../src/reporters/completenessScore.js';

let tmpDir;
let tmpDbPath;
let tmpGraphJsonPath;
let originalGraphDbPath;
let originalGraphJsonPath;
let originalSummaryReportPath;
let originalSkippedProseReportPath;
let db;
let graph;
let nodesById;
let completeness;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'round7-integration-test-'));
  tmpDbPath = path.join(tmpDir, 'graph.db');
  tmpGraphJsonPath = path.join(tmpDir, 'graph.json');
  const tmpSummaryReportPath = path.join(tmpDir, 'ingestion-summary.md');
  const tmpSkippedProseReportPath = path.join(tmpDir, 'skipped-prose.md');

  originalGraphDbPath = process.env.GRAPH_DB_PATH;
  originalGraphJsonPath = process.env.GRAPH_JSON_PATH;
  originalSummaryReportPath = process.env.INGESTION_SUMMARY_REPORT_PATH;
  originalSkippedProseReportPath = process.env.SKIPPED_PROSE_REPORT_PATH;

  process.env.GRAPH_DB_PATH = tmpDbPath;
  process.env.GRAPH_JSON_PATH = tmpGraphJsonPath;
  process.env.INGESTION_SUMMARY_REPORT_PATH = tmpSummaryReportPath;
  process.env.SKIPPED_PROSE_REPORT_PATH = tmpSkippedProseReportPath;

  const { runIngest } = await import('../src/ingest.js');
  runIngest();

  db = new Database(tmpDbPath, { readonly: true });
  graph = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));
  nodesById = new Map(graph.nodes.map((n) => [n.id, n]));
  completeness = computeCompleteness(graph);
}, 60000);

afterAll(() => {
  if (db) db.close();
  if (originalGraphDbPath === undefined) delete process.env.GRAPH_DB_PATH;
  else process.env.GRAPH_DB_PATH = originalGraphDbPath;
  if (originalGraphJsonPath === undefined) delete process.env.GRAPH_JSON_PATH;
  else process.env.GRAPH_JSON_PATH = originalGraphJsonPath;
  if (originalSummaryReportPath === undefined) delete process.env.INGESTION_SUMMARY_REPORT_PATH;
  else process.env.INGESTION_SUMMARY_REPORT_PATH = originalSummaryReportPath;
  if (originalSkippedProseReportPath === undefined) delete process.env.SKIPPED_PROSE_REPORT_PATH;
  else process.env.SKIPPED_PROSE_REPORT_PATH = originalSkippedProseReportPath;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function node(id) {
  return nodesById.get(id) || null;
}

function edgesFrom(src, rel) {
  const q = rel
    ? db.prepare('SELECT src, rel, dst FROM edges WHERE src = ? AND rel = ?').all(src, rel)
    : db.prepare('SELECT src, rel, dst FROM edges WHERE src = ?').all(src);
  return q;
}

// ---------------------------------------------------------------------
// AC2: dupe-pair merges, via graphCleanup.js's YACHT_MERGE_MAP. Survivor
// listed second. research/round7/02_dupe_pairs_loa_carryover.md, Sub-task 1.
// ---------------------------------------------------------------------
describe('Round 7 — dupe-pair merges (research/round7/02_dupe_pairs_loa_carryover.md, Sub-task 1)', () => {
  it('samsara -> samsara-oceanco: builder misattribution merge (Oceanco is the real builder, not Benetti)', () => {
    expect(node('yacht:samsara')).toBeNull();
    const survivor = node('yacht:samsara-oceanco');
    expect(survivor).toBeTruthy();
    expect(survivor.attrs.loa.meters).toBe(88.5);
    // Only the correct built_by edge (Oceanco) survives — the merge must
    // not carry over the Benetti misattribution.
    const builtBy = edgesFrom('yacht:samsara-oceanco', 'built_by');
    expect(builtBy.map((e) => e.dst)).toEqual(['builder:oceanco']);

    // Review fix (LOW, round 1): the ~6,700nm range estimate (knowledge/98's
    // own Samsara row) must survive the tie-break-then-merge path, not be
    // silently dropped by mergeNode()'s shallow conflicts-key merge — see
    // graphCleanup.js's fixSamsaraRangeConflict.
    const rangeConflicts = (survivor.attrs.conflicts && survivor.attrs.conflicts.range_nm) || [];
    expect(rangeConflicts.length).toBeGreaterThan(0);
    expect(rangeConflicts.join(' ')).toMatch(/6700|6,700/);
  });

  it('moka-overmarine -> moka: builder corrected to Sanlorenzo (the real builder of the 42.2m Moka)', () => {
    expect(node('yacht:moka-overmarine')).toBeNull();
    const survivor = node('yacht:moka');
    expect(survivor).toBeTruthy();
    expect(survivor.attrs.cabins).toBe(5);
    const builtBy = edgesFrom('yacht:moka', 'built_by');
    expect(builtBy.map((e) => e.dst)).toEqual(['builder:sanlorenzo']);
  });

  it("that-s-amore-grandi-yatcilik -> that-s-amore: orphan builder-id duplicate folds onto the resolvable-builder node", () => {
    expect(node('yacht:that-s-amore-grandi-yatcilik')).toBeNull();
    const survivor = node('yacht:that-s-amore');
    expect(survivor).toBeTruthy();
    expect(survivor.attrs.cabins).toBe(6);
    const builtBy = edgesFrom('yacht:that-s-amore', 'built_by');
    expect(builtBy.map((e) => e.dst)).toEqual(['builder:grandi-yatcilik-mimarlik']);
  });

  it('dream-olympic AND dream-olympic-yacht -> the existing canonical yacht:dream (both carry orphan builder ids)', () => {
    expect(node('yacht:dream-olympic')).toBeNull();
    expect(node('yacht:dream-olympic-yacht')).toBeNull();
    const survivor = node('yacht:dream');
    expect(survivor).toBeTruthy();
    expect(survivor.attrs.guests).toBe(36);
    expect(survivor.attrs.crew).toBe(40);
    const builtBy = edgesFrom('yacht:dream', 'built_by');
    expect(builtBy.map((e) => e.dst)).toEqual(['builder:olympic-yacht-services']);
  });

  it('ahpo -> lady-jorgia: same Lürssen hull, sold May 2023 and renamed; survivor keeps the current name and gains former_names', () => {
    expect(node('yacht:ahpo')).toBeNull();
    const survivor = node('yacht:lady-jorgia');
    expect(survivor).toBeTruthy();
    expect(survivor.name).toBe('Lady Jorgia');
    expect(survivor.attrs.former_names).toContain('Ahpo');

    // Spec values pinned from research/round7/01_weakest_tier_yacht_specs.md's
    // "Ahpo"/"Lady Jorgia" rows (identical for both, same real hull).
    expect(survivor.attrs.beam.meters).toBe(18.21);
    expect(survivor.attrs.draft.meters).toBe(4.3);
    expect(survivor.attrs.gt).toBe(5257);
    expect(survivor.attrs.max_speed).toBe(18);
    expect(survivor.attrs.flag).toBe('Marshall Islands');
    expect(survivor.attrs.imo).toBe('9855276');

    // Both real ownership periods survive the merge (former owner Michael
    // Lee-Chin, current owner Patrick Dovigi) — mergeNode() re-points ALL
    // of the merged-away node's edges onto the survivor, it never drops one.
    const ownedBy = edgesFrom('yacht:lady-jorgia', 'owned_by').map((e) => e.dst).sort();
    expect(ownedBy).toEqual(['person:michael-lee-chin', 'person:patrick-dovigi']);
  });
});

// ---------------------------------------------------------------------
// AC2: stay-split pairs with a conflicts.identity entry (grounding
// insufficient for a merge) — research/round7/02_dupe_pairs_loa_carryover.md,
// Sub-task 1 (d), plus the Lady Beth addendum's own "no Lürssen Lady Beth"
// finding.
// ---------------------------------------------------------------------
describe('Round 7 — stay-split pairs with a recorded conflicts.identity entry', () => {
  it('sophia (108m "Benetti" claim, likely fabricated) stays split from the grounded 97m sophia-feadship', () => {
    const sophia = node('yacht:sophia');
    const feadship = node('yacht:sophia-feadship');
    expect(sophia).toBeTruthy();
    expect(feadship).toBeTruthy();

    // The grounded node is untouched by this round.
    expect(feadship.attrs.loa.meters).toBe(97);
    expect(feadship.attrs.year.value).toBe(2017);

    const identityNotes = (sophia.attrs.conflicts && sophia.attrs.conflicts.identity) || [];
    expect(identityNotes.length).toBeGreaterThan(0);
    const joined = identityNotes.join(' ').toLowerCase();
    expect(joined).toMatch(/108/);
    expect(joined).toMatch(/fabricat|unsubstantiat|no independent source|not corroborat/);
  });

  it('lady-beth-lurssen carries a conflicts.identity entry recording that no Lürssen-built Lady Beth exists in any source', () => {
    const lurssenNode = node('yacht:lady-beth-lurssen');
    expect(lurssenNode).toBeTruthy();

    const identityNotes = (lurssenNode.attrs.conflicts && lurssenNode.attrs.conflicts.identity) || [];
    expect(identityNotes.length).toBeGreaterThan(0);
    const joined = identityNotes.join(' ').toLowerCase();
    expect(joined).toMatch(/lürssen|lurssen/);
    expect(joined).toMatch(/no .*(lürssen|lurssen).*lady beth|not found|no source/);
  });

  // Review fix (HIGH, round 1): the Olympic Marine / Olympic Yacht Services
  // equivalence was resolved STAY-SPLIT in research/round7/02's Sub-task
  // 1(f), but nothing was recorded on-node — added via graphCleanup.js's
  // NODE_STAY_SPLIT_NOTES (a non-yacht generalization of YACHT_CONFLICT_NOTES).
  it('builder:olympic-yacht-services and marina:olympic-marine-lavrion each carry a cited stay-split conflicts.identity entry', () => {
    const builder = node('builder:olympic-yacht-services');
    const marina = node('marina:olympic-marine-lavrion');
    expect(builder).toBeTruthy();
    expect(marina).toBeTruthy();

    for (const n of [builder, marina]) {
      const identityNotes = (n.attrs.conflicts && n.attrs.conflicts.identity) || [];
      expect(identityNotes.length, `expected ${n.id} to carry a conflicts.identity entry`).toBeGreaterThan(0);
      const joined = identityNotes.join(' ').toLowerCase();
      expect(joined).toMatch(/olympic/);
      expect(joined).toMatch(/stay-split|distinct|insufficient|related-but-distinct/);
      expect(joined).toContain('research/round7/02_dupe_pairs_loa_carryover.md');
    }

    // yacht:dream's own built_by edge is untouched by this note — the pair
    // stays split, no merge action was ever taken.
    const dreamBuiltBy = edgesFrom('yacht:dream', 'built_by');
    expect(dreamBuiltBy.map((e) => e.dst)).toEqual(['builder:olympic-yacht-services']);
  });
});

// ---------------------------------------------------------------------
// AC4: LOA estimate confirmations, via YACHT_QUALITY_CORRECTIONS — exact
// pins from research/round7/02_dupe_pairs_loa_carryover.md, Sub-task 2.
// ---------------------------------------------------------------------
describe('Round 7 — LOA estimate confirmations (research/round7/02_dupe_pairs_loa_carryover.md, Sub-task 2)', () => {
  it('rivale-56: confirmed 17.27m (official Riva spec-table figure, supersedes the round-5 ~17.3m estimate)', () => {
    expect(node('yacht:rivale-56').attrs.loa.meters).toBe(17.27);
  });

  it('arcadia-sherpa-60: confirmed 18.67m Overall Length (the stored 18.28m was Arcadia\'s own "Hull Length" spec, a different field)', () => {
    expect(node('yacht:arcadia-sherpa-60').attrs.loa.meters).toBe(18.67);
  });

  it('sunseeker-manhattan-65: confirmed 21.08m (official spec-table figure)', () => {
    expect(node('yacht:sunseeker-manhattan-65').attrs.loa.meters).toBe(21.08);
  });

  it('navetta-68: confirmed 20.53m AND builder corrected to Absolute Yachts (the real builder of this specific "Navetta 68" model, not Custom Line)', () => {
    const n = node('yacht:navetta-68');
    expect(n.attrs.loa.meters).toBe(20.53);
    const builtBy = edgesFrom('yacht:navetta-68', 'built_by');
    expect(builtBy.map((e) => e.dst)).toEqual(['builder:absolute']);
  });

  it('yamas: confirmed 20.24m (official Ferretti 670 model page, supersedes the round-5 ~20.2m estimate)', () => {
    expect(node('yacht:yamas').attrs.loa.meters).toBe(20.24);
  });
});

// ---------------------------------------------------------------------
// AC1/AC3: Gigia year correction — research/round7/01_weakest_tier_yacht_specs.md.
// ---------------------------------------------------------------------
describe('Round 7 — Gigia year correction', () => {
  it('gigia: year corrected to 2017 (delivered as "Areti"; the stored "2005" component was a data-entry error; 2024 refit is real)', () => {
    const gigia = node('yacht:gigia');
    expect(gigia).toBeTruthy();
    expect(gigia.attrs.year.value).toBe(2017);
  });
});

// ---------------------------------------------------------------------
// AC1: corpus-confusion quarantine — nomad/relentless/sahana must NOT gain
// invented spec attrs, and must carry a conflicts/notes entry referencing
// the mismatch. research/round7/01_weakest_tier_yacht_specs.md's own
// "UNRESOLVED — no specs applied" rows.
// ---------------------------------------------------------------------
describe('Round 7 — corpus-confusion quarantine (no forced enrichment, flagged instead)', () => {
  const SPEC_ATTR_KEYS = ['gt', 'beam', 'draft', 'max_speed', 'range_nm', 'flag', 'imo', 'class_society'];

  function hasAnySpecAttr(attrs) {
    return SPEC_ATTR_KEYS.some((key) => attrs[key] !== undefined && attrs[key] !== null);
  }

  function hasQuarantineNote(attrs) {
    const identityNotes = (attrs.conflicts && attrs.conflicts.identity) || [];
    return identityNotes.length > 0 || Boolean(attrs.data_quality) || Boolean(attrs.notes);
  }

  it('nomad: 30m stored value matches no real vessel (real Oceanfast Nomad is 69.5m) — no specs gained, quarantine note present', () => {
    const n = node('yacht:nomad');
    expect(n).toBeTruthy();
    expect(n.attrs.loa.meters).toBe(30);
    expect(hasAnySpecAttr(n.attrs)).toBe(false);
    expect(hasQuarantineNote(n.attrs)).toBe(true);
  });

  it('relentless: 34m stored value vs the real 43-44m Trinity Relentless — no specs gained, quarantine note present', () => {
    const n = node('yacht:relentless');
    expect(n).toBeTruthy();
    expect(n.attrs.loa.meters).toBe(34);
    expect(hasAnySpecAttr(n.attrs)).toBe(false);
    expect(hasQuarantineNote(n.attrs)).toBe(true);
  });

  it('sahana: 75m/2025/Feadship stored combination matches no real vessel — no specs gained, quarantine note present', () => {
    const n = node('yacht:sahana');
    expect(n).toBeTruthy();
    expect(n.attrs.loa.meters).toBe(75);
    expect(hasAnySpecAttr(n.attrs)).toBe(false);
    expect(hasQuarantineNote(n.attrs)).toBe(true);
  });
});

// ---------------------------------------------------------------------
// AC1: weakest-tier band enrichment — a representative sample of exact
// confirmed values pinned from research/round7/01_weakest_tier_yacht_specs.md's
// spec table (single-source, unambiguous cells only — cells the research
// file itself flags "sources vary" or prefixes "~" are deliberately NOT
// pinned here, since they must NOT land as confirmed attrs).
// ---------------------------------------------------------------------
describe('Round 7 — weakest-tier band enrichment (exact-value sample)', () => {
  it('la-datcha: draft 3.8m, gt 2560, max_speed 14.5kn, flag Panama, imo 9849021', () => {
    const n = node('yacht:la-datcha');
    expect(n.attrs.draft.meters).toBe(3.8);
    expect(n.attrs.gt).toBe(2560);
    expect(n.attrs.max_speed).toBe(14.5);
    expect(n.attrs.flag).toBe('Panama');
    expect(n.attrs.imo).toBe('9849021');
  });

  it('luna: beam 20.54m, draft 5.97m, gt 5655, max_speed 22.5kn, imo 1010222', () => {
    const n = node('yacht:luna');
    expect(n.attrs.beam.meters).toBe(20.54);
    expect(n.attrs.draft.meters).toBe(5.97);
    expect(n.attrs.gt).toBe(5655);
    expect(n.attrs.max_speed).toBe(22.5);
    expect(n.attrs.imo).toBe('1010222');
  });

  it('lauren-l: draft 3.95m, max_speed 15.5kn, range_nm 3400, flag Cayman Islands, imo 9246827', () => {
    const n = node('yacht:lauren-l');
    expect(n.attrs.draft.meters).toBe(3.95);
    expect(n.attrs.max_speed).toBe(15.5);
    expect(n.attrs.range_nm).toBe(3400);
    expect(n.attrs.flag).toBe('Cayman Islands');
    expect(n.attrs.imo).toBe('9246827');
  });

  it('excellence: beam 14.45m, draft 3.45m, gt 2115, max_speed 17kn, range_nm 5000, flag Cayman Islands, imo 9823144', () => {
    const n = node('yacht:excellence');
    expect(n.attrs.beam.meters).toBe(14.45);
    expect(n.attrs.draft.meters).toBe(3.45);
    expect(n.attrs.gt).toBe(2115);
    expect(n.attrs.max_speed).toBe(17);
    expect(n.attrs.range_nm).toBe(5000);
    expect(n.attrs.flag).toBe('Cayman Islands');
    expect(n.attrs.imo).toBe('9823144');
  });

  it('infinity: draft 4.7m, gt 4980, max_speed 18.5kn, flag Cayman Islands, imo 9817896', () => {
    const n = node('yacht:infinity');
    expect(n.attrs.draft.meters).toBe(4.7);
    expect(n.attrs.gt).toBe(4980);
    expect(n.attrs.max_speed).toBe(18.5);
    expect(n.attrs.flag).toBe('Cayman Islands');
    expect(n.attrs.imo).toBe('9817896');
  });

  // Ticket-mandated range locks (LOA within [10,200]m, beam [3,35]m, draft
  // [1,10]m, gt [50,20000], max_speed [8,40]kn), scoped to exactly the 23
  // weakest-tier ids named in the ticket — a narrower/differently-bounded
  // check than realCorpusExport.spec.js's existing whole-corpus sanity lock
  // (which has no LOA bound at all).
  //
  // DEVELOPER NOTE (IMPL phase, TASK-025): 'yacht:ahpo' is deliberately
  // EXCLUDED from this list (the ticket's own 23-name enumeration includes
  // it, but the SAME ticket's AC2 requires ahpo -> lady-jorgia to be a real
  // graph MERGE — see the "dupe-pair merges" describe block above, whose
  // very first assertion is `expect(node('yacht:ahpo')).toBeNull()`). A
  // node can't simultaneously not-exist (merged away) and exist-with-valid-
  // range-locked-attrs in the same post-ingest snapshot; keeping 'yacht:ahpo'
  // in this array made the two describe blocks mutually unsatisfiable by
  // any implementation. 'yacht:lady-jorgia' (the merge survivor, carrying
  // the identical researched spec values per research/round7/01's headline
  // finding) remains in this list and is still fully exercised.
  const WEAKEST_TIER_IDS = [
    'yacht:atlantis-ii', 'yacht:dragonfly-silveryachts', 'yacht:elements', 'yacht:excellence',
    'yacht:gigia', 'yacht:infinity', 'yacht:j7-explorer', 'yacht:la-datcha', 'yacht:lady-jorgia',
    'yacht:lauren-l', 'yacht:liva-o', 'yacht:luna', 'yacht:mansion-yacht', 'yacht:navtilvs', 'yacht:nomad',
    'yacht:relentless', 'yacht:sahana', 'yacht:samsara-oceanco', 'yacht:tatiana', 'yacht:viva', 'yacht:zen',
  ];

  it('every weakest-tier node with a numeric spec attr stays within the ticket\'s range locks', () => {
    for (const id of WEAKEST_TIER_IDS) {
      const n = node(id);
      expect(n, `expected ${id} to still exist`).toBeTruthy();
      const attrs = n.attrs;
      if (typeof attrs.loa?.meters === 'number') {
        expect(attrs.loa.meters, `${id} loa`).toBeGreaterThanOrEqual(10);
        expect(attrs.loa.meters, `${id} loa`).toBeLessThanOrEqual(200);
      }
      if (typeof attrs.beam?.meters === 'number') {
        expect(attrs.beam.meters, `${id} beam`).toBeGreaterThanOrEqual(3);
        expect(attrs.beam.meters, `${id} beam`).toBeLessThanOrEqual(35);
      }
      if (typeof attrs.draft?.meters === 'number') {
        expect(attrs.draft.meters, `${id} draft`).toBeGreaterThanOrEqual(1);
        expect(attrs.draft.meters, `${id} draft`).toBeLessThanOrEqual(10);
      }
      if (typeof attrs.gt === 'number') {
        expect(attrs.gt, `${id} gt`).toBeGreaterThanOrEqual(50);
        expect(attrs.gt, `${id} gt`).toBeLessThanOrEqual(20000);
      }
      if (typeof attrs.max_speed === 'number') {
        expect(attrs.max_speed, `${id} max_speed`).toBeGreaterThanOrEqual(8);
        expect(attrs.max_speed, `${id} max_speed`).toBeLessThanOrEqual(40);
      }
    }
  });

  it('Mansion Yacht keeps its per-model "~" estimate figures OUT of confirmed numeric attrs (no hull-specific registry record exists)', () => {
    const n = node('yacht:mansion-yacht');
    expect(n).toBeTruthy();
    // The research file explicitly marks Mansion Yacht's LOA/beam/draft as
    // `~` per-model estimates, not a confirmed individual hull — none of
    // gt/max_speed/range_nm/flag/imo exist for it either.
    expect(n.attrs.gt ?? null).toBeNull();
    expect(n.attrs.max_speed ?? null).toBeNull();
    expect(n.attrs.range_nm ?? null).toBeNull();
    expect(n.attrs.imo ?? null).toBeNull();
  });
});

// ---------------------------------------------------------------------
// AC3: Lady Beth research carry-over — research/round7/02_dupe_pairs_loa_carryover.md's
// addendum ("Lady Beth research pass").
// ---------------------------------------------------------------------
describe('Round 7 — Lady Beth research carry-over', () => {
  it('yacht:lady-beth gains the full confirmed spec set, former_names, and a Newcastle Marine built_by edge', () => {
    const n = node('yacht:lady-beth');
    expect(n).toBeTruthy();
    expect(n.attrs.loa.meters).toBe(54.86);
    expect(n.attrs.beam.meters).toBe(10.36);
    expect(n.attrs.draft.meters).toBe(3.05);
    expect(n.attrs.gt).toBe(1100);
    expect(n.attrs.range_nm).toBe(4500);
    expect(n.attrs.flag).toBe('Cayman Islands');
    expect(n.attrs.year.value).toBe(2011);
    expect(n.attrs.former_names).toEqual(expect.arrayContaining(['Harbour Island', 'Sovereign', 'Loon']));

    // Review fix (MEDIUM, round 1): exactly one built_by edge — the
    // primary-ingestion placeholder builder:custom edge must be replaced,
    // not merely supplemented (see graphCleanup.js's fixLadyBethBuiltBy).
    const builtBy = edgesFrom('yacht:lady-beth', 'built_by');
    expect(builtBy.map((e) => e.dst)).toEqual(['builder:newcastle-marine']);
  });

  it('yacht:lady-beth does NOT store max_speed as a single confirmed number (sources vary 15.5-16kn)', () => {
    const n = node('yacht:lady-beth');
    expect(typeof n.attrs.max_speed).not.toBe('number');
  });

  it('yacht:lady-beth clears the identifiability bar (year + spec attrs) despite being on the negative-evidence skip list', () => {
    const n = node('yacht:lady-beth');
    expect(n.attrs.identifiability).toBe('identifiable');
  });
});

// ---------------------------------------------------------------------
// AC5: oligarch yacht ingestion — knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md
// (feet/value figures) + knowledge/95_Person_Enrichment_Directory.md
// (ownership confidence tiers). Minting these 7 yacht nodes is explicitly
// sanctioned by this ticket.
// ---------------------------------------------------------------------
describe('Round 7 — oligarch yacht ingestion (sanctioned minting, knowledge/74 + knowledge/95)', () => {
  const FEET_TO_METERS = 0.3048;

  const OLIGARCH_YACHTS = [
    // [yachtId, personId, loaFeet|null, valueUsd, ownershipTier]
    ['yacht:amadea', 'person:suleiman-kerimov', 348, 300_000_000, 'confirmed'],
    ['yacht:tango', 'person:viktor-vekselberg', 255, 90_000_000, 'confirmed'],
    ['yacht:phi', 'person:sergei-naumenko', 192, 50_000_000, 'widely reported'],
    ['yacht:lady-anastasia', 'person:alexander-mikheev', 157, 7_000_000, 'widely reported'],
    ['yacht:lena', 'person:gennady-timchenko', 132, 8_000_000, 'widely reported'],
    ['yacht:valerie', 'person:sergei-chemezov', null, 153_000_000, 'widely reported'],
    ['yacht:royal-romance', 'person:viktor-medvedchuk', 300, 200_000_000, 'widely reported'],
  ];

  it.each(OLIGARCH_YACHTS)(
    '%s: identifiable yacht node, owned_by %s with ownership_confidence %s, value $%i',
    (yachtId, personId, loaFeet, valueUsd, tier) => {
      const n = node(yachtId);
      expect(n, `expected ${yachtId} to be minted this round`).toBeTruthy();
      expect(n.type).toBe('yacht');
      expect(n.attrs.identifiability).toBe('identifiable');
      expect(n.attrs.value.amount).toBe(valueUsd);

      if (loaFeet !== null) {
        expect(n.attrs.loa.meters).toBeCloseTo(loaFeet * FEET_TO_METERS, 0);
      }

      const ownedBy = db
        .prepare("SELECT dst, attrs_json FROM edges WHERE src = ? AND rel = 'owned_by'")
        .all(yachtId);
      const toPerson = ownedBy.find((e) => e.dst === personId);
      expect(toPerson, `expected ${yachtId} owned_by -> ${personId}`).toBeTruthy();
      const edgeAttrs = JSON.parse(toPerson.attrs_json || '{}');
      expect(edgeAttrs.ownership_confidence).toBe(tier);
    }
  );
});

// ---------------------------------------------------------------------
// AC6: structural edges derived ONLY from existing canonical attrs.
// ---------------------------------------------------------------------
describe('Round 7 — structural edges: size_class classification', () => {
  it('size_class edge% reaches 100 in the completeness report (every size_class node is now connected)', () => {
    const sizeClassStats = completeness.byType.find((r) => r.type === 'size_class');
    expect(sizeClassStats).toBeTruthy();
    expect(sizeClassStats.edgePct).toBe(100);
  });

  it('every yacht with a canonical numeric loa.meters carries exactly one classified_as edge to a size_class node', () => {
    const yachtRows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht'").all();
    const validSizeClassIds = new Set([
      'size_class:boat-yacht',
      'size_class:superyacht',
      'size_class:megayacht',
      'size_class:gigayacht',
    ]);

    let checkedAny = false;
    for (const row of yachtRows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (typeof attrs.loa?.meters !== 'number') continue;
      checkedAny = true;
      const edges = db
        .prepare("SELECT dst FROM edges WHERE src = ? AND rel = 'classified_as'")
        .all(row.id);
      expect(edges, `expected ${row.id} (loa=${attrs.loa.meters}) to carry exactly one classified_as edge`).toHaveLength(1);
      expect(validSizeClassIds.has(edges[0].dst)).toBe(true);
    }
    expect(checkedAny).toBe(true);
  });
});

describe('Round 7 — structural edges: part manufacturer/brand edges (derived only, no invention)', () => {
  it('part edge% is lifted above 0 in the completeness report', () => {
    const partStats = completeness.byType.find((r) => r.type === 'part');
    expect(partStats).toBeTruthy();
    expect(partStats.edgePct).toBeGreaterThan(0);
  });

  it('NOT every part node gains an edge — the derivation is grounded/selective, not invented for all 111 parts', () => {
    const partStats = completeness.byType.find((r) => r.type === 'part');
    expect(partStats.edgePct).toBeLessThan(100);

    const totalParts = db.prepare("SELECT COUNT(*) AS c FROM nodes WHERE type = 'part'").get().c;
    const connectedParts = db
      .prepare(
        `SELECT COUNT(DISTINCT id) AS c FROM (
           SELECT id FROM nodes WHERE type = 'part' AND id IN (SELECT src FROM edges)
           UNION
           SELECT id FROM nodes WHERE type = 'part' AND id IN (SELECT dst FROM edges)
         )`
      )
      .get().c;
    expect(connectedParts).toBeGreaterThan(0);
    expect(connectedParts).toBeLessThan(totalParts);
  });
});

// ---------------------------------------------------------------------
// AC7: hardening — yachtMapper's conflicts.<field> arrays must never
// accumulate a literal duplicate value (the bug: mergeAttrs() only compares
// a NEW conflicting value against the currently-stored merged value, never
// against values it has already recorded in attrs.conflicts[field] — so a
// third/fourth source row repeating the SAME differing text pushes another
// identical copy in). Exercised on the real corpus, where this bug already
// visibly duplicates yacht:excellence's "Futuristic pool/Jacuzzi" (6x),
// yacht:elements's "Modern amenities" (7x), yacht:samsara-oceanco's
// "Wellness-focused refit" (5x), and yacht:lady-beth's "Spacious" (2x)
// conflicts.features entries.
// ---------------------------------------------------------------------
describe('Round 7 — hardening: yachtMapper conflicts.features dedupe quirk', () => {
  it('no yacht node carries a literal duplicate entry inside attrs.conflicts.features', () => {
    const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht'").all();
    const offenders = [];
    for (const row of rows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      const featureConflicts = attrs.conflicts && attrs.conflicts.features;
      if (!Array.isArray(featureConflicts)) continue;
      const distinct = new Set(featureConflicts);
      if (distinct.size !== featureConflicts.length) {
        offenders.push({ id: row.id, featureConflicts });
      }
    }
    expect(offenders, JSON.stringify(offenders)).toEqual([]);
  });
});
