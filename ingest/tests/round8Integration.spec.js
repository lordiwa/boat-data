// ingest/tests/round8Integration.spec.js
//
// TASK-026 (Round 8 integration): runs the FULL real /knowledge corpus
// pipeline once (same beforeAll-shared-db pattern as round7Integration.spec.js,
// for the same performance reason — many independent assertions against one
// post-ingest snapshot) and checks this ticket's acceptance criteria against
// the real data: builder attr coverage (AC1), placeholder exclusion end-to-
// end (AC2), pinned exact `founded` values (AC7), and the target metric
// floor (AC9). Every pinned value below is read directly from
// knowledge/99_Global_Builder_Enrichment_Round8.md — never invented.

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'round8-integration-test-'));
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

// ---------------------------------------------------------------------
// AC1: builder attr coverage. Amended target (>=83.5%, see TASK-026's
// orchestrator comment) is NOT quite met by the honest, real measured
// number: every one of knowledge/99's 84 curated rows applies cleanly (0
// gaps — independently verified against the graph), so the 83.44% actually
// achieved is fully explained by an interaction the amendment's own
// cell-level math didn't account for: lane C's website-hygiene commit
// (mandated by this same ticket, piece 5) legitimately clears 2 further
// builder.website absence-sentinel cells OUTSIDE this round's 84 enriched
// rows (builder:trinity-yachts, builder:viareggio-superyachts — both were
// already-enriched pre-Round-8 nodes whose website stored "— (site
// defunct)"/"— (no stable official site found)" as if it were a value).
// 536 - 2 = 534 of 640 = 83.44%, 0.06pp (1 cell) short of >=83.5%. Per this
// ticket's own instruction ("report the real figure and let the shortfall
// stand"), this pins the ACTUAL achieved floor rather than the unmet
// literal target — see this round's hand-off report for the full
// explanation and the explicit recommendation that AC1 be treated as
// "not met, with cause" rather than silently declared green.
// ---------------------------------------------------------------------
describe('Round 8 — AC1: builder attr coverage', () => {
  it('builder attr% is >= 83.4 (the honest achieved floor — 0.06pp/1 cell short of the amended >=83.5% target; see comment above)', () => {
    const builderStats = completeness.byType.find((r) => r.type === 'builder');
    expect(builderStats).toBeTruthy();
    // eslint-disable-next-line no-console
    console.log(`[round8] builder attr%% = ${builderStats.attrPct} (count=${builderStats.count})`);
    expect(builderStats.attrPct).toBeGreaterThanOrEqual(83.4);
  });

  it('the builder node COUNT is unchanged at 160 (this mapper never mints)', () => {
    const builderStats = completeness.byType.find((r) => r.type === 'builder');
    expect(builderStats.count).toBe(160);
  });
});

// ---------------------------------------------------------------------
// AC2: placeholder builders are never enriched by Round 8.
// ---------------------------------------------------------------------
describe('Round 8 — AC2: the 5 placeholder builders carry no Round-8 provenance', () => {
  const PLACEHOLDER_BUILDER_IDS = [
    'builder:custom',
    'builder:various',
    'builder:custom-rebuild',
    'builder:mixed',
    'builder:motorsailer',
  ];

  it.each(PLACEHOLDER_BUILDER_IDS)('%s stays flagged attrs.placeholder === true and gains no 99_Global_Builder_Enrichment_Round8.md provenance', (id) => {
    const n = node(id);
    expect(n, `expected ${id} to exist`).toBeTruthy();
    expect(n.attrs.placeholder).toBe(true);
    const provenance = n.attrs.provenance || [];
    expect(provenance).not.toContain('99_Global_Builder_Enrichment_Round8.md');
  });
});

// ---------------------------------------------------------------------
// AC7: pinned exact `founded` values from knowledge/99's own table —
// bare 4-digit numbers, range-locked, never a raw/prose value.
// ---------------------------------------------------------------------
describe('Round 8 — AC7: pinned founded years (knowledge/99)', () => {
  const PINNED_FOUNDED = [
    ['builder:absolute', 2002],
    ['builder:picchiotti', 1575],
    ['builder:derecktor', 1947],
    ['builder:hakvoort', 1919],
    ['builder:tankoa', 2007],
  ];

  it.each(PINNED_FOUNDED)('%s founded === %i (bare number, not a string/prose value)', (id, expected) => {
    const n = node(id);
    expect(n, `expected ${id} to exist`).toBeTruthy();
    expect(n.attrs.founded).toBe(expected);
    expect(typeof n.attrs.founded).toBe('number');
  });

  // TASK-026 fix round (review LOW): renamed from "every builder.founded
  // value..." — this lock only ever checked `typeof === 'number'` entries,
  // silently skipping legacy STRING founded values carried over from
  // earlier rounds (e.g. builder:broward "1948", builder:alloy-yachts
  // "1985", and several prose-heavy cells like builder:feadship "1949
  // (component yards 1849 and 1906)" that aren't reducible to a single bare
  // year at all). Widening this lock to also range-check the string cells
  // would require re-implementing year-extraction logic inside the test —
  // the exact risk class this fix round exists to close — so instead the
  // name is corrected to state its real (numeric-only) scope. Normalizing
  // the mixed string/number `founded` type graph-wide is a deliberate,
  // out-of-scope Round 9 item (do not do it here).
  it('every NUMERIC builder.founded value in the graph is a plausible 4-digit year (range lock; legacy string-typed founded cells are out of scope — see comment above)', () => {
    const builders = graph.nodes.filter((n) => n.type === 'builder');
    const currentYear = new Date().getFullYear();
    for (const b of builders) {
      if (b.attrs && b.attrs.founded !== undefined && typeof b.attrs.founded === 'number') {
        expect(b.attrs.founded, `${b.id} founded`).toBeGreaterThanOrEqual(1200);
        expect(b.attrs.founded, `${b.id} founded`).toBeLessThanOrEqual(currentYear);
      }
    }
  });

  it('Cassens-Werft carries the [conflict: ...] marker text in attrs.conflicts.founded, not silently overwritten', () => {
    const n = node('builder:cassens-werft');
    expect(n).toBeTruthy();
    expect(n.attrs.founded).toBe(1875);
    const conflicts = (n.attrs.conflicts && n.attrs.conflicts.founded) || [];
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.join(' ')).toMatch(/2004/);
  });
});

// ---------------------------------------------------------------------
// AC9: target metric (identifiable-only) does not regress below 7.36.
// ---------------------------------------------------------------------
describe('Round 8 — AC9: target metric floor', () => {
  it('overallIdentifiable >= 7.36', () => {
    // eslint-disable-next-line no-console
    console.log(`[round8] overall (all-nodes) = ${completeness.overall}`);
    console.log(`[round8] overall (identifiable-only, TARGET METRIC) = ${completeness.overallIdentifiable}`);
    expect(completeness.overallIdentifiable).toBeGreaterThanOrEqual(7.36);
  });
});

// ---------------------------------------------------------------------
// AC11: the 11 placeholder PERSON nodes are never treated as real owners.
// ---------------------------------------------------------------------
describe('Round 8 — AC11: placeholder person nodes stay inert', () => {
  const PLACEHOLDER_PERSON_IDS = [
    'person:bahrain-royal',
    'person:omani-royal-family',
    'person:qatar-royal',
    'person:saudi-royal',
    'person:mixed-e-g-more-lurssen-feadship',
    'person:unknown-charter-focused',
    'person:unknown-custom-build',
    'person:unknown-disputed',
    'person:unknown-previously-imperial-yachts',
    'person:various-residential',
    'person:previously-david-geffen-now-others',
  ];

  it.each(PLACEHOLDER_PERSON_IDS)('%s carries attrs.placeholder === true', (id) => {
    const n = node(id);
    expect(n, `expected ${id} to exist`).toBeTruthy();
    expect(n.attrs.placeholder).toBe(true);
  });

  it('none of the placeholder person nodes is ever the target of a made_by edge (partBrandLinker.js candidate query never includes type "person")', () => {
    for (const id of PLACEHOLDER_PERSON_IDS) {
      const edges = db.prepare("SELECT COUNT(*) AS c FROM edges WHERE dst = ? AND rel = 'made_by'").get(id).c;
      expect(edges, `expected ${id} to carry 0 made_by edges`).toBe(0);
    }
  });

  it('none of the placeholder person nodes carries Round-8 provenance (no mapper touched in this round resolves onto a person node — deferred to Round 9 per this ticket\'s AC11)', () => {
    for (const id of PLACEHOLDER_PERSON_IDS) {
      const n = node(id);
      const provenance = (n.attrs && n.attrs.provenance) || [];
      expect(provenance).not.toContain('99_Global_Builder_Enrichment_Round8.md');
    }
  });
});

// ---------------------------------------------------------------------
// Residual (6): partBrandLinker excludes placeholder candidates end-to-end.
// ---------------------------------------------------------------------
describe('Round 8 — residual (6): no made_by edge targets a placeholder-flagged node', () => {
  it('every made_by edge target is a non-placeholder node', () => {
    const madeByEdges = db.prepare("SELECT dst FROM edges WHERE rel = 'made_by'").all();
    for (const { dst } of madeByEdges) {
      const targetNode = node(dst);
      expect(targetNode, `expected made_by target ${dst} to exist`).toBeTruthy();
      expect(targetNode.attrs.placeholder, `${dst} must not be placeholder-flagged`).not.toBe(true);
    }
  });
});

// ---------------------------------------------------------------------
// Residual (7): no yacht is classified identifiable solely via a dangling
// built_by edge (the real-corpus form of the regression identifiability.spec.js
// already covers synthetically).
// ---------------------------------------------------------------------
describe('Round 8 — residual (7): dangling built_by edges never contribute identifiability signal', () => {
  it('every built_by edge in the committed graph points at a builder id that actually exists', () => {
    const builderIds = new Set(graph.nodes.filter((n) => n.type === 'builder').map((n) => n.id));
    const builtByEdges = graph.edges.filter((e) => e.rel === 'built_by');
    const dangling = builtByEdges.filter((e) => !builderIds.has(e.dst));
    expect(dangling, JSON.stringify(dangling)).toEqual([]);
  });
});
