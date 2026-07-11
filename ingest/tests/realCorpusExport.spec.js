// ingest/tests/realCorpusExport.spec.js
//
// TASK-006: the one real-corpus regression lock the ticket calls for
// ("a real-corpus assertion on totals-match") — runs the full pipeline
// against the actual /knowledge corpus (not a synthetic fixture) and
// proves the graph.json export's node/edge totals exactly match the live
// SQLite row counts, with zero loss. Everything else in this ticket's
// test coverage uses small synthetic corpora/dbs for speed (see
// graphExporter.spec.js / summaryReport.spec.js); this file is the
// deliberate exception, and is why it's the slowest spec in the suite
// (a handful of seconds to scan all ~80 real corpus files).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

let tmpDir;
let tmpDbPath;
let tmpGraphJsonPath;
let tmpSummaryReportPath;
let tmpSkippedProseReportPath;
let originalGraphDbPath;
let originalGraphJsonPath;
let originalSummaryReportPath;
let originalSkippedProseReportPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'real-corpus-export-test-'));
  tmpDbPath = path.join(tmpDir, 'graph.db');
  tmpGraphJsonPath = path.join(tmpDir, 'graph.json');
  tmpSummaryReportPath = path.join(tmpDir, 'ingestion-summary.md');
  tmpSkippedProseReportPath = path.join(tmpDir, 'skipped-prose.md');

  originalGraphDbPath = process.env.GRAPH_DB_PATH;
  originalGraphJsonPath = process.env.GRAPH_JSON_PATH;
  originalSummaryReportPath = process.env.INGESTION_SUMMARY_REPORT_PATH;
  originalSkippedProseReportPath = process.env.SKIPPED_PROSE_REPORT_PATH;

  process.env.GRAPH_DB_PATH = tmpDbPath;
  process.env.GRAPH_JSON_PATH = tmpGraphJsonPath;
  process.env.INGESTION_SUMMARY_REPORT_PATH = tmpSummaryReportPath;
  process.env.SKIPPED_PROSE_REPORT_PATH = tmpSkippedProseReportPath;
  // Deliberately do NOT set KNOWLEDGE_DIR: this test wants the real
  // /knowledge corpus (resolveKnowledgeDir()'s default), not a fixture.
});

afterEach(() => {
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

describe('real corpus — export totals match SQLite exactly', () => {
  it('graph.json node/edge counts equal the live database row counts after a full real ingest', async () => {
    const { runIngest } = await import('../src/ingest.js');

    const result = runIngest();

    // Sanity: this really did scan the full real corpus, not an empty/tiny
    // fixture (matches the ticket's documented real-corpus ballpark).
    expect(result.totalNodes).toBeGreaterThan(3000);
    expect(result.totalEdges).toBeGreaterThan(1500);

    const db = new Database(tmpDbPath, { readonly: true });
    const sqliteNodeCount = db.prepare('SELECT COUNT(*) AS count FROM nodes').get().count;
    const sqliteEdgeCount = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;
    db.close();

    expect(fs.existsSync(tmpGraphJsonPath)).toBe(true);
    const graph = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));

    expect(graph.nodes.length).toBe(sqliteNodeCount);
    expect(graph.edges.length).toBe(sqliteEdgeCount);
    expect(graph.meta.node_count).toBe(sqliteNodeCount);
    expect(graph.meta.edge_count).toBe(sqliteEdgeCount);
    expect(result.exportResult.nodeCount).toBe(sqliteNodeCount);
    expect(result.exportResult.edgeCount).toBe(sqliteEdgeCount);

    // Sum of per-type / per-rel breakdowns must also account for every
    // node/edge (no silent loss in the grouping either).
    const typeSum = Object.values(graph.meta.types).reduce((a, b) => a + b, 0);
    const relSum = Object.values(graph.meta.edge_types).reduce((a, b) => a + b, 0);
    expect(typeSum).toBe(sqliteNodeCount);
    expect(relSum).toBe(sqliteEdgeCount);

    expect(fs.existsSync(tmpSummaryReportPath)).toBe(true);
    const summary = fs.readFileSync(tmpSummaryReportPath, 'utf8');
    expect(summary).toContain(`Nodes: ${sqliteNodeCount}`);
    expect(summary).toContain(`Edges: ${sqliteEdgeCount}`);
  }, 30000);
});

// Review fix (MEDIUM 3): yachtMapper's id assignment is ingestion-order-
// dependent (see ingest.js's module header) — the corpus is scanned in
// sorted filename order, so a future data-enrichment round that adds new
// numbered files should sort AFTER the existing corpus and never shift an
// existing yacht's id. This lock pins the current real-corpus per-type
// counts (as of TASK-017's engine/parts/size-class enrichment) and a small
// sample of well-known yacht ids, so a future round that silently disturbs
// ingestion order (e.g. a new file inserted with a lower sort-order number,
// or a rename that changes a yacht's normalized name) fails loudly here
// instead of quietly reshuffling ids downstream.
describe('real corpus — baseline lock (per-type counts + pinned yacht ids)', () => {
  it('matches the pinned per-type node counts (TASK-017 engine/parts/size-class baseline)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    // `result.totals.<type>` is a running tally of ROWS PROCESSED (it
    // increments on every mention across files, including re-merges of an
    // already-known entity), not the final distinct-node count — the
    // graph.json export's meta.types is the one true per-type node count
    // (see graphExporter.js's buildMeta), so the baseline lock reads from
    // there instead.
    const graph = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));

    // TASK-020: yacht DROPPED from 605 to 599 — 6 rename/duplicate merges
    // via graphCleanup.js's YACHT_MERGE_MAP (jubilee->kaos, kaos-custom->
    // kaos, lana->mar, cc-summer->madsummer, kismet-lurssen->whisper,
    // prince-abdulaziz-helsingor-vaerft->prince-abdulaziz). yachtSpecMapper.js
    // itself never mints a yacht node (605 - 6 = 599).
    // TASK-023 item 3: yacht DROPS again, 599 -> 581 — 18 further grounded
    // duplicate-hull merges via YACHT_MERGE_MAP's new entries (Nomad,
    // Argus, Amor a Vida, Loon, Alchemia->Alchemy, RoMa->Roma, After You x3
    // -> 1, St David, Andrea L->Andreas L, Come Together x3 -> 1, Pink
    // Shadow x3 -> 1, Loewe, Amevi->Batello, Al Mirqab, H3 — see that
    // module's own comment for the full per-cluster citation) — 599 - 18 =
    // 581.
    expect(graph.meta.types.yacht).toBe(581);
    // TASK-019: builder DROPPED from 186 to 160 (documented deliberately —
    // see graphCleanup.js's own module header for the full ledger): 18
    // duplicate-entity-pair merges (17 pairs + 1 extra leg of the Olympic
    // 3-way merge) + 10 suspect-node removals/retypes (Y.CO -> company,
    // Hoek Design -> designer, Philip Zepter/Sportiva 55/Cies - Oassive/
    // Kolotura/Viareggio (bare)/Bali Catamarans removed, Arcadia Sherpa
    // merged into Arcadia, Winch Design/Vard removed) = 28 nodes removed
    // (186 - 28 = 158), + 2 new nodes minted by builderEnrichmentMapper.js
    // for research rows deliberately NOT curated onto a same-first-word
    // existing node (Corsair Marine, Crescent Custom Yachts) = 160.
    expect(graph.meta.types.builder).toBe(160);
    // TASK-021: club DROPPED from 368 to 360 — graphCleanup.js's
    // CLUB_MERGE_MAP merges 8 duplicate pairs (the Florida Yacht Club
    // 3-way group plus 6 further "X" / "X (ABBR)"-style dupes — see that
    // module's own header for the full ledger).
    expect(graph.meta.types.club).toBe(360);
    // TASK-020: marina rose from 893 to 930 — the Rybovich duplicate merge
    // (graphCleanup.js's MARINA_MERGE_MAP, -1) plus marinaMapper.js's new
    // isMarinaEnrichmentTable pass over knowledge/94's 51 rows: 7 rows
    // enrich existing nodes as intended, 6 more rows happen to ALSO match
    // pre-existing nodes from earlier corpus files that this research
    // pass's own grep-only method (no code-execution tool available to
    // it) couldn't detect, and the remaining 38 rows mint new marina
    // nodes (893 - 1 + 38 = 930).
    expect(graph.meta.types.marina).toBe(930);
    // TASK-021: person DROPPED from 110 to 86 — graphCleanup.js's
    // PERSON_MERGE_MAP merges 22 name-variant duplicate pairs (Sheikh
    // Mansour's 4-way group, Sheikh Mohammed's 3-way group, Alisher
    // Usmanov's 3 ownership-structure variants, the Roger Samuelsson/
    // Paul-Allen-estate 3-way group, etc — see that module's own header)
    // and PERSON_NODE_ACTIONS retypes 3 institutional entities to
    // `company` (Indonesian corporate, Egyptian Presidential Yacht,
    // Turkish Republic) — 110 - 22 - 3 = 85... plus 1 new person node
    // (Shapoor Mistry, minted by the Tatiana ownership correction) = 86.
    expect(graph.meta.types.person).toBe(86);
    // TASK-019: designer ROSE from 10 (empty-attrs placeholders) to 60 —
    // designerMapper.js enriches the 9 pre-existing nodes it could resolve
    // by exact name (the 10th, "(Naval-inspired)", is excluded from
    // knowledge/92 — see its own Curation notes and graphCleanup.js's
    // fixNavalInspiredArtifact, which deletes that node) and creates 50 new
    // ones (9 + 50 = 59 rows processed), plus the graph-cleanup pass's
    // Hoek Design retype (builder -> designer) adds one more = 60, well
    // over the ticket's >=55 target.
    expect(graph.meta.types.designer).toBe(60);
    expect(graph.meta.types.shipyard).toBe(236);
    // TASK-017: engine grew from 16 (file-07 tier table only) to 59 after
    // knowledge/89's manufacturer directory merged into/created brand
    // nodes; engine_model/part/size_class are brand-new types this round.
    expect(graph.meta.types.engine).toBe(59);
    expect(graph.meta.types.engine_model).toBe(37);
    expect(graph.meta.types.part).toBe(111);
    expect(graph.meta.types.size_class).toBe(4);
  }, 30000);

  it('resolves a pinned sample of well-known yacht ids unchanged', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const pinnedIds = ['yacht:azzam', 'yacht:eclipse', 'yacht:dilbar', 'yacht:big-data', 'yacht:breakthrough'];
    for (const id of pinnedIds) {
      const row = db.prepare('SELECT id, type FROM nodes WHERE id = ?').get(id);
      expect(row, `expected pinned yacht id ${id} to still exist`).toBeTruthy();
      expect(row.type).toBe('yacht');
    }
    db.close();
  }, 30000);
});

// Review fix (TASK-016 review carry-forward): a cheap sanity range on every
// numeric attr the shipyard/engine/engine-model mappers parse, so a future
// curation mistake (a prose cell like "Nimitz-class capable (Dry Dock 8)"
// silently parsing to tonnage=8, or a stray comma truncating "400,000" to
// 400) fails a real-corpus test immediately instead of shipping a
// nonsensical value. Bounds are deliberately generous (real-world dry docks
// span a few hundred tons to ~1M+ tons; yachts/shipyards span a few metres
// to Newport-News-scale ~700m graving docks; engine outputs span a few
// horsepower to multi-thousand-hp racing/ship engines) — this is a "does
// this look like the right unit/order-of-magnitude" check, not a precise
// business-rule validation.
describe('real corpus — numeric attr range-sanity locks', () => {
  it('every shipyard max_tonnage/max_loa falls within a plausible real-world range', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'shipyard'").all();
    db.close();

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (attrs.max_tonnage !== undefined && attrs.max_tonnage !== null) {
        expect(attrs.max_tonnage, `${row.id} max_tonnage=${attrs.max_tonnage}`).toBeGreaterThanOrEqual(100);
        expect(attrs.max_tonnage, `${row.id} max_tonnage=${attrs.max_tonnage}`).toBeLessThanOrEqual(1_500_000);
      }
      if (attrs.max_loa !== undefined && attrs.max_loa !== null) {
        expect(attrs.max_loa, `${row.id} max_loa=${attrs.max_loa}`).toBeGreaterThanOrEqual(10);
        expect(attrs.max_loa, `${row.id} max_loa=${attrs.max_loa}`).toBeLessThanOrEqual(700);
      }
    }
  }, 30000);

  it('every engine_model power_hp falls within a plausible real-world range (TASK-017)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'engine_model'").all();
    db.close();

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (attrs.power_hp !== undefined && attrs.power_hp !== null) {
        // Review fix (MEDIUM 2): a lower bound of 1 is too weak to catch
        // either of the two real bugs this lane already shipped once — a
        // comma-truncation ("1,650" -> 1) or a prose-digit capture (the
        // Kiekhaefer Aeromarine surface drive's "V8" -> 8) both land inside
        // [1, 10000] and would sail through silently. 2 hp is below any
        // real Mercury/Mercury-Racing model in this corpus (the smallest
        // is the 10 hp Lightning KE-7), so this bound is tight enough to
        // catch a single stray leading digit while still being a range
        // check, not an exact-value assertion.
        expect(attrs.power_hp, `${row.id} power_hp=${attrs.power_hp}`).toBeGreaterThanOrEqual(2);
        expect(attrs.power_hp, `${row.id} power_hp=${attrs.power_hp}`).toBeLessThanOrEqual(10_000);
      }
    }
  }, 30000);

  it('pins the exact power_hp of a sample of known engine_models (catches truncation/prose-digit bugs a range alone would miss)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const pinned = [
      ['engine_model:verado-600-v12', 600],
      // Would-be comma-truncation victim: "1,650 (race fuel) / 1,350 (pump
      // fuel)" must parse to 1650, never 1 (or 1350, the second figure).
      ['engine_model:qc4v-1650', 1650],
      // Would-be prose-digit-capture victim (the HIGH review finding): the
      // "V8" in its Notes/former-Power-cell text must NOT yield 8 — the
      // curated cell is now blank, so this model has no power_hp at all.
      ['engine_model:kiekhaefer-aeromarine-surface-drive-number-six-drive', null],
      // Watts-vs-hp regression: "750 W (~3.5 hp equiv.)" must parse to the
      // hp-equivalent figure (3.5), not the leading Watts number (750).
      ['engine_model:avator-7-5e', 3.5],
    ];

    for (const [id, expected] of pinned) {
      const row = db.prepare('SELECT attrs_json FROM nodes WHERE id = ?').get(id);
      expect(row, `expected pinned engine_model id ${id} to exist`).toBeTruthy();
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (expected === null) {
        expect(attrs.power_hp ?? null, `${id} power_hp`).toBeNull();
      } else {
        expect(attrs.power_hp, `${id} power_hp`).toBe(expected);
      }
    }
    db.close();
  }, 30000);

  // TASK-020: yachtSpecMapper.js's numeric parsing discipline (comma-strip,
  // "~" strip, letter-adjacency rejection) needs the same real-corpus
  // range-sanity check as shipyard/engine_model above. Bounds per the
  // ticket: beam [3,35]m, draft [1,12]m, gt [50,25000], max_speed [5,80]kn,
  // range_nm [500,20000] — two upper bounds widened after real (not parsing
  // bugs) research values that exceed the ticket's own suggested bound:
  // REV Ocean's genuinely-sourced 21,120nm range (an unusually long-legged
  // expedition/research vessel, not a private motor yacht in the strict
  // sense) widens range_nm to 22,000; Somnio's genuinely-sourced 33,500 GT
  // (the world's largest RESIDENTIAL yacht, 222m, an outlier even among
  // megayachts) widens gt to 35,000 — see knowledge/93's own copies of
  // both rows.
  it('every yacht beam/draft/gt/max_speed/range_nm falls within a plausible real-world range', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht'").all();
    db.close();

    expect(rows.length).toBeGreaterThan(0);

    let checkedAny = false;
    for (const row of rows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (attrs.beam && typeof attrs.beam.meters === 'number') {
        checkedAny = true;
        expect(attrs.beam.meters, `${row.id} beam=${attrs.beam.meters}`).toBeGreaterThanOrEqual(3);
        expect(attrs.beam.meters, `${row.id} beam=${attrs.beam.meters}`).toBeLessThanOrEqual(35);
      }
      if (attrs.draft && typeof attrs.draft.meters === 'number') {
        checkedAny = true;
        expect(attrs.draft.meters, `${row.id} draft=${attrs.draft.meters}`).toBeGreaterThanOrEqual(1);
        expect(attrs.draft.meters, `${row.id} draft=${attrs.draft.meters}`).toBeLessThanOrEqual(12);
      }
      if (typeof attrs.gt === 'number') {
        checkedAny = true;
        expect(attrs.gt, `${row.id} gt=${attrs.gt}`).toBeGreaterThanOrEqual(50);
        expect(attrs.gt, `${row.id} gt=${attrs.gt}`).toBeLessThanOrEqual(35_000);
      }
      if (typeof attrs.max_speed === 'number') {
        checkedAny = true;
        expect(attrs.max_speed, `${row.id} max_speed=${attrs.max_speed}`).toBeGreaterThanOrEqual(5);
        expect(attrs.max_speed, `${row.id} max_speed=${attrs.max_speed}`).toBeLessThanOrEqual(80);
      }
      if (typeof attrs.range_nm === 'number') {
        checkedAny = true;
        expect(attrs.range_nm, `${row.id} range_nm=${attrs.range_nm}`).toBeGreaterThanOrEqual(500);
        expect(attrs.range_nm, `${row.id} range_nm=${attrs.range_nm}`).toBeLessThanOrEqual(22_000);
      }
    }
    expect(checkedAny, 'expected at least one yacht to carry a TASK-020 spec field').toBe(true);
  }, 30000);
});

// TASK-021 review fix (MEDIUM, post-ship): research/round4/
// person-enrichment.md's own rows for "Sheikh Mansour"/"Sheikh Mohammed"
// had "Emirati" shifted one column right into Industry, with Nationality
// left holding the generic "— duplicate node —" marker — personMapper.js
// faithfully transcribes whatever's in each column, so the canonical,
// post-merge nodes shipped with industry:'Emirati' and NO nationality at
// all. This locks the column-shift class: any future re-introduction of
// the same bug on either canonical sheikh node fails loudly here instead
// of silently shipping with a missing nationality again.
describe('real corpus — TASK-021 review fix regression lock (Sheikh Mansour/Mohammed column-shift)', () => {
  it('pins one canonical sheikh\'s nationality (not industry) as "Emirati"', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const row = db.prepare("SELECT attrs_json FROM nodes WHERE id = 'person:sheikh-mansour-bin-zayed-al-nahyan'").get();
    db.close();

    expect(row, 'expected the canonical Sheikh Mansour node to exist').toBeTruthy();
    const attrs = JSON.parse(row.attrs_json || '{}');
    expect(attrs.nationality).toBe('Emirati');
  }, 30000);
});

// TASK-022: region canonicalization — real-corpus locks. Regions grew
// 642->900 across enrichment rounds with near-duplicate city variants and a
// handful of prose-name artifacts (see regions.js's Tier 1 REGION_ALIAS_GROUPS
// hardening and regionCanonicalization.js's Tier 2 one-time judgment merges/
// renames/flags for the full per-case rationale).
describe('real corpus — region canonicalization (TASK-022)', () => {
  it('matches the pinned region count (900 baseline - 35 Tier 1 alias-hardening collapses - 8 Tier 2 one-time merges = 857)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const graph = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));
    expect(graph.meta.types.region).toBe(857);
  }, 30000);

  it('spot-check: exactly one West Palm Beach region node (the ", FL" variant never gets minted)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const wpb = db.prepare("SELECT id FROM nodes WHERE id = 'region:west-palm-beach'").get();
    const wpbFl = db.prepare("SELECT id FROM nodes WHERE id = 'region:west-palm-beach-fl'").get();
    db.close();

    expect(wpb, 'expected the canonical West Palm Beach region to exist').toBeTruthy();
    expect(wpbFl, 'the ", FL" variant must never be minted as a separate node').toBeFalsy();
  }, 30000);

  it('spot-check: exactly one Barcelona region node (the ", Catalonia" variant never gets minted)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const barcelona = db.prepare("SELECT id FROM nodes WHERE id = 'region:barcelona'").get();
    const barcelonaCatalonia = db.prepare("SELECT id FROM nodes WHERE id = 'region:barcelona-catalonia'").get();
    db.close();

    expect(barcelona, 'expected the canonical Barcelona region to exist').toBeTruthy();
    expect(barcelonaCatalonia, 'the ", Catalonia" variant must never be minted as a separate node').toBeFalsy();
  }, 30000);

  it("marina:safe-harbor-rybovich carries exactly 2 distinct located_in edges post-cleanup (down from the ticket's documented 3, with no duplicate)", async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db
      .prepare("SELECT DISTINCT dst FROM edges WHERE src = 'marina:safe-harbor-rybovich' AND rel = 'located_in'")
      .all()
      .map((r) => r.dst);
    db.close();

    expect(rows.sort()).toEqual(['region:palm-beach', 'region:west-palm-beach']);
  }, 30000);

  it('no region node whose name contains ";" survives WITHOUT being quarantined (attrs.artifact === true)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db.prepare("SELECT id, name, attrs_json FROM nodes WHERE type = 'region'").all();
    db.close();

    const unquarantined = rows.filter((r) => {
      if (!r.name || !r.name.includes(';')) return false;
      const attrs = JSON.parse(r.attrs_json || '{}');
      return attrs.artifact !== true;
    });
    expect(unquarantined, JSON.stringify(unquarantined)).toEqual([]);
  }, 30000);

  it('no orphan located_in/based_in/part_of edge remains after region canonicalization', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const orphanCount = db
      .prepare(
        `SELECT COUNT(*) AS count FROM edges e
         WHERE NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = e.src)
            OR NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = e.dst)`
      )
      .get().count;
    db.close();

    expect(orphanCount).toBe(0);
  }, 30000);

  it('no node carries duplicate (identical src/rel/dst) located_in edges after merging near-duplicate regions', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const dupes = db
      .prepare(
        `SELECT src, rel, dst, COUNT(*) AS c FROM edges GROUP BY src, rel, dst HAVING c > 1`
      )
      .all();
    db.close();

    expect(dupes, JSON.stringify(dupes)).toEqual([]);
  }, 30000);

  // AC4: hardening — a second full real-corpus ingest must not mint any NEW
  // region variants.
  it('is idempotent on the real corpus for regions specifically: a second full ingest run mints zero new region nodes', async () => {
    const { runIngest } = await import('../src/ingest.js');

    runIngest();
    const dbFirst = new Database(tmpDbPath, { readonly: true });
    const regionCountFirst = dbFirst.prepare("SELECT COUNT(*) AS count FROM nodes WHERE type = 'region'").get().count;
    dbFirst.close();

    runIngest();
    const dbSecond = new Database(tmpDbPath, { readonly: true });
    const regionCountSecond = dbSecond.prepare("SELECT COUNT(*) AS count FROM nodes WHERE type = 'region'").get().count;
    dbSecond.close();

    expect(regionCountFirst).toBe(857);
    expect(regionCountSecond).toBe(857);
  }, 40000);
});

// TASK-023 item 0: full-graph double-ingest idempotency. Formerly scoped to
// region-count-only (see git history) because graphCleanup.js's
// YACHT_QUALITY_CORRECTIONS rewrote yacht:eiv/yacht:mystere's `loa` on the
// first run, so a second run's fresh yachtMapper pass saw the corpus's
// still-wrong raw LOA no longer matching the now-corrected node's loa within
// lengthsMatch's tolerance and minted a disambiguated "-2" sibling
// (yacht:eiv-2/yacht:mystere-2) every time. Fixed by having
// applyYachtQualityCorrections record the pre-correction loa.meters value in
// a new attrs.loa_aliases list, which yachtMapper.js's classifyCandidate now
// also treats as an acceptable match for that field (see both modules' own
// comments) — a second full real-corpus ingest run is now byte-stable
// (identical node/edge totals), so this lock asserts on the WHOLE graph, not
// just regions.
describe('real corpus — full-graph double-ingest idempotency (TASK-023 item 0)', () => {
  it('a second full real-corpus ingest run mints zero new nodes/edges anywhere in the graph', async () => {
    const { runIngest } = await import('../src/ingest.js');

    const first = runIngest();
    const second = runIngest();

    expect(second.totalNodes).toBe(first.totalNodes);
    expect(second.totalEdges).toBe(first.totalEdges);

    const db = new Database(tmpDbPath, { readonly: true });
    const nodeCountsByType = db
      .prepare('SELECT type, COUNT(*) AS count FROM nodes GROUP BY type ORDER BY type')
      .all();
    db.close();

    // Neither of the two known previously-affected yachts (nor any other
    // yacht) gets a disambiguated "-2"/"-3"/... sibling minted on re-ingest.
    const dupSuffixed = nodeCountsByType.find((r) => r.type === 'yacht');
    expect(dupSuffixed).toBeTruthy();
    expect(dupSuffixed.count).toBe(581); // TASK-023 item 3: 599 - 18 duplicate-hull merges = 581 (see baseline lock above)
  }, 60000);

  it('never mints yacht:eiv-2 or yacht:mystere-2 on a second ingest, and both corrected yachts keep their fixed loa', async () => {
    const { runIngest } = await import('../src/ingest.js');

    runIngest();
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const eivDup = db.prepare("SELECT id FROM nodes WHERE id = 'yacht:eiv-2'").get();
    const mystereDup = db.prepare("SELECT id FROM nodes WHERE id = 'yacht:mystere-2'").get();
    const eiv = db.prepare("SELECT attrs_json FROM nodes WHERE id = 'yacht:eiv'").get();
    const mystere = db.prepare("SELECT attrs_json FROM nodes WHERE id = 'yacht:mystere'").get();
    db.close();

    expect(eivDup).toBeFalsy();
    expect(mystereDup).toBeFalsy();

    const eivAttrs = JSON.parse(eiv.attrs_json);
    const mystereAttrs = JSON.parse(mystere.attrs_json);
    expect(eivAttrs.loa.meters).toBe(48.8);
    expect(mystereAttrs.loa.meters).toBeCloseTo(33.29, 2);
  }, 60000);
});

// TASK-023 item 1: yacht long-tail spec completion (knowledge/97, curated
// from research/round5's four band files). yachtSpecMapper.js never mints a
// yacht node, so this only ever ADDS attrs to/reconciles conflicts on
// existing nodes — no yacht node-count change from this file alone (the
// count change observed in the baseline lock above comes entirely from
// item 3's duplicate-hull merges, which happen to run in the same
// applyGraphCleanup() pass).
describe('real corpus — yacht long-tail spec completion (TASK-023 item 1)', () => {
  it('resolves virtually all ~114 knowledge/97 rows (only the pre-existing knowledge/93 Amadea row stays unresolved)', async () => {
    const { runIngest } = await import('../src/ingest.js');
    const result = runIngest();

    expect(result.totals.yachtSpecMatched).toBeGreaterThanOrEqual(200);
    expect(result.totals.yachtSpecUnresolved).toBe(1);
  }, 30000);

  it('adds EIV\'s draft (previously blank) without disturbing its already-corrected loa', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const row = db.prepare("SELECT attrs_json FROM nodes WHERE id = 'yacht:eiv'").get();
    db.close();

    const attrs = JSON.parse(row.attrs_json);
    expect(attrs.draft.meters).toBeCloseTo(2.29, 2);
    expect(attrs.loa.meters).toBe(48.8);
  }, 30000);

  it('resolves the Batello/Amevi rename-merge cluster: former_names populated, Amevi merged away, Batello fully spec\'d', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const amevi = db.prepare("SELECT id FROM nodes WHERE id = 'yacht:amevi'").get();
    const batello = db.prepare("SELECT attrs_json FROM nodes WHERE id = 'yacht:batello'").get();
    db.close();

    expect(amevi).toBeFalsy();
    const attrs = JSON.parse(batello.attrs_json);
    expect(attrs.former_names).toEqual(['Amevi', 'Aalto']);
    expect(attrs.gt).toBe(2500);
  }, 30000);

  it('resolves the Loewe/Loewe-Tankoa cluster onto the correctly-attributed node with full specs, gap-filled through the merge', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const loewe = db.prepare("SELECT id FROM nodes WHERE id = 'yacht:loewe'").get();
    const loeweTankoa = db.prepare("SELECT attrs_json FROM nodes WHERE id = 'yacht:loewe-tankoa'").get();
    db.close();

    expect(loewe).toBeFalsy();
    const attrs = JSON.parse(loeweTankoa.attrs_json);
    expect(attrs.gt).toBe(499);
    expect(attrs.max_speed).toBe(17.5);
  }, 30000);

  it('gives Sportiva 55 (the model-line node, distinct from the Loewe cluster) its own spec data', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const row = db.prepare("SELECT attrs_json FROM nodes WHERE id = 'yacht:sportiva-55'").get();
    db.close();

    expect(row).toBeTruthy();
    const attrs = JSON.parse(row.attrs_json);
    expect(attrs.gt).toBe(499);
  }, 30000);
});

// TASK-023 item 4: identifiability classification + dual scoring, exercised
// against the full real corpus (identifiability.spec.js/completenessScore.spec.js
// already cover the pure-function logic in isolation).
describe('real corpus — yacht identifiability + dual scoring (TASK-023 item 4)', () => {
  it('tags every yacht node with attrs.identifiability, counts summing to the total yacht count', async () => {
    const { runIngest } = await import('../src/ingest.js');
    const result = runIngest();

    const db = new Database(tmpDbPath, { readonly: true });
    const rows = db.prepare("SELECT attrs_json FROM nodes WHERE type = 'yacht'").all();
    db.close();

    const counts = { identifiable: 0, fragment: 0, other: 0 };
    for (const row of rows) {
      const attrs = JSON.parse(row.attrs_json || '{}');
      if (attrs.identifiability === 'identifiable') counts.identifiable += 1;
      else if (attrs.identifiability === 'fragment') counts.fragment += 1;
      else counts.other += 1;
    }

    expect(counts.other).toBe(0); // every yacht node gets a definite classification
    expect(counts.identifiable + counts.fragment).toBe(rows.length);
    expect(counts.fragment).toBeGreaterThan(0); // the real corpus genuinely has bare charter fragments
    expect(counts.identifiable).toBeGreaterThan(0);
    expect(result.totals.yachtIdentifiable).toBe(counts.identifiable);
    expect(result.totals.yachtFragment).toBe(counts.fragment);
  }, 30000);

  it('computeCompleteness on the real exported graph reports both overall scores, with the identifiable-only yacht count strictly less than the all-nodes count', async () => {
    const { runIngest } = await import('../src/ingest.js');
    runIngest();
    const { computeCompleteness } = await import('../src/reporters/completenessScore.js');

    const graph = JSON.parse(fs.readFileSync(tmpGraphJsonPath, 'utf8'));
    const { byType, overall, overallIdentifiable, yachtIdentifiable } = computeCompleteness(graph);
    const yachtAllNodes = byType.find((r) => r.type === 'yacht');

    expect(typeof overall).toBe('number');
    expect(typeof overallIdentifiable).toBe('number');
    expect(yachtIdentifiable.count).toBeLessThan(yachtAllNodes.count);
    expect(yachtIdentifiable.count).toBeGreaterThan(0);
    // Identifiable-only excludes low-attr fragments from yacht's own
    // denominator, so its score should be at least as high as the
    // all-nodes yacht score on the real corpus.
    expect(yachtIdentifiable.score).toBeGreaterThanOrEqual(yachtAllNodes.score);
  }, 30000);
});
