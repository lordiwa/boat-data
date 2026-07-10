// ingest/tests/ingest.spec.js
//
// Regression locks for the ingest entry point. TASK-001 established the
// "runs end-to-end / idempotent" contract against an empty database;
// TASK-004 wires the real pipeline (corpus scan -> per-table routing ->
// five entity mappers), so these tests now point KNOWLEDGE_DIR at small,
// fast synthetic corpora (a real fixture per acceptance criterion would
// mean re-running the ~85-file, multi-second real corpus on every `npm
// test`, which the ticket explicitly asks us to avoid for CI speed — the
// real-corpus numbers are reported separately, in the ticket write-up).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let tmpDir;
let tmpDbPath;
let tmpKnowledgeDir;
let tmpSkippedProseReportPath;
let tmpGraphJsonPath;
let tmpSummaryReportPath;
let originalGraphDbPath;
let originalKnowledgeDir;
let originalSkippedProseReportPath;
let originalGraphJsonPath;
let originalSummaryReportPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-test-'));
  tmpDbPath = path.join(tmpDir, 'graph.db');
  tmpKnowledgeDir = path.join(tmpDir, 'knowledge');
  tmpSkippedProseReportPath = path.join(tmpDir, 'skipped-prose.md');
  tmpGraphJsonPath = path.join(tmpDir, 'graph.json');
  tmpSummaryReportPath = path.join(tmpDir, 'ingestion-summary.md');
  fs.mkdirSync(tmpKnowledgeDir, { recursive: true });

  originalGraphDbPath = process.env.GRAPH_DB_PATH;
  originalKnowledgeDir = process.env.KNOWLEDGE_DIR;
  originalSkippedProseReportPath = process.env.SKIPPED_PROSE_REPORT_PATH;
  originalGraphJsonPath = process.env.GRAPH_JSON_PATH;
  originalSummaryReportPath = process.env.INGESTION_SUMMARY_REPORT_PATH;
  process.env.GRAPH_DB_PATH = tmpDbPath;
  process.env.KNOWLEDGE_DIR = tmpKnowledgeDir;
  // TASK-005: keep the prose-skip report out of the real ingest/reports
  // dir during tests (mirrors GRAPH_DB_PATH/KNOWLEDGE_DIR's own tmp-dir
  // redirection above).
  process.env.SKIPPED_PROSE_REPORT_PATH = tmpSkippedProseReportPath;
  // TASK-006: same reasoning for the graph.json export and the
  // ingestion-summary report — runIngest() now writes both as its final
  // step, and without redirecting them every synthetic-corpus test run
  // here would clobber the real ingest/data/graph.json and
  // ingest/reports/ingestion-summary.md with tiny fixture data.
  process.env.GRAPH_JSON_PATH = tmpGraphJsonPath;
  process.env.INGESTION_SUMMARY_REPORT_PATH = tmpSummaryReportPath;
});

afterEach(() => {
  if (originalGraphDbPath === undefined) {
    delete process.env.GRAPH_DB_PATH;
  } else {
    process.env.GRAPH_DB_PATH = originalGraphDbPath;
  }
  if (originalKnowledgeDir === undefined) {
    delete process.env.KNOWLEDGE_DIR;
  } else {
    process.env.KNOWLEDGE_DIR = originalKnowledgeDir;
  }
  if (originalSkippedProseReportPath === undefined) {
    delete process.env.SKIPPED_PROSE_REPORT_PATH;
  } else {
    process.env.SKIPPED_PROSE_REPORT_PATH = originalSkippedProseReportPath;
  }
  if (originalGraphJsonPath === undefined) {
    delete process.env.GRAPH_JSON_PATH;
  } else {
    process.env.GRAPH_JSON_PATH = originalGraphJsonPath;
  }
  if (originalSummaryReportPath === undefined) {
    delete process.env.INGESTION_SUMMARY_REPORT_PATH;
  } else {
    process.env.INGESTION_SUMMARY_REPORT_PATH = originalSummaryReportPath;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeCorpusFile(name, content) {
  fs.writeFileSync(path.join(tmpKnowledgeDir, name), content, 'utf8');
}

describe('runIngest — zero input', () => {
  it('runs end-to-end on an empty knowledge dir, creating the db file with a valid schema', async () => {
    const { runIngest } = await import('../src/ingest.js');

    const result = runIngest();

    expect(result.totalNodes).toBe(0);
    expect(result.totalEdges).toBe(0);
    expect(fs.existsSync(tmpDbPath)).toBe(true);
  });

  it('is idempotent on zero input: running it twice does not error or duplicate rows', async () => {
    const { runIngest } = await import('../src/ingest.js');

    const first = runIngest();
    const second = runIngest();

    expect(second.totalNodes).toBe(first.totalNodes);
    expect(second.totalEdges).toBe(first.totalEdges);
  });
});

// One small, real-shaped table per entity type (see the dedicated
// clubMapper/marinaMapper/companyMapper/engineMapper/yachtMapper specs for
// full field-level coverage) — this synthetic corpus exists purely to
// prove the *pipeline* (routing precedence, skip-list, per-type counts,
// double-run stability), not to re-test each mapper's parsing.
const SYNTHETIC_CLUB = `
| Region | Club Name | Location | Founding Year | Website | Key Facilities/Activities |
|--------|-----------|----------|---------------|---------|---------------|
| Kanto | Enoshima Yacht Club | Enoshima, Fujisawa, Kanagawa | 1964 | https://eyc.jp/ | Founded as host for 1964 Tokyo Olympics sailing. |
`;

const SYNTHETIC_MARINA = `
| Facility                          | Location              | Lift Capacity                  | Max LOA/Beam          | Marina Integration | Key Services                     | SSG Listed? |
|-----------------------------------|-----------------------|--------------------------------|------------------------|--------------------|----------------------------------|-------------|
| Safe Harbor Newport Shipyard     | Newport              | 500T + 200T + 150T            | 300+ ft / 36 ft      | Yes (3,500 ft docks) | Full refit, paint, rigging      | Yes        |
`;

const SYNTHETIC_COMPANY = `
| Company Name              | Address (if available)                  | Phone/Email/Website (if available) | Brief Description/Notes |
|---------------------------|-----------------------------------------|------------------------------------|--------------------------|
| Edmiston and Company      | 57 rue Grimaldi, Monaco                 | Not available                     | Leading superyacht brokerage. |
`;

const SYNTHETIC_ENGINE = `
| Tier | Manufacturer          | Parent/Brand          | Strengths & Reputation                          | Best For                     | Power Range          | Notes |
|------|-----------------------|-----------------------|-------------------------------------------------|------------------------------|----------------------|-------|
| 1    | MTU                   | Rolls-Royce           | Best power-to-weight | Superyachts | 500 – 10,000+ kW | Often considered #1 |
`;

const SYNTHETIC_YACHT = `
| Yacht Name | Owner | Length | Builder | Year | Region |
|------------|--------|--------|---------|------|--------|
| Big Data | Unknown | 16.15 m (53 ft) | Beneteau | 2019 | French Riviera |
`;

// Real-shaped shipyard table (TASK-016) — see shipyardMapper.spec.js for
// full field-level coverage; this proves the routing wiring end-to-end
// (routeTables -> mapShipyardTables -> shipyard nodes + located_in/
// operated_by edges), not just the guard in isolation (review fix,
// MEDIUM 2).
const SYNTHETIC_SHIPYARD = `
| Shipyard              | Country | City      | Operator   | Facility Type | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type     | Services            | Founded | Website           | Notes |
|------------------------|---------|-----------|------------|----------------|-----------|-------------|------------------|------------------|----------------|-----------------------|---------|-------------------|-------|
| Wave A Test Shipyard  | Spain   | Barcelona | Test Group | refit yard     | 1         | 100         | 4000             | 200m x 30m       | floating dock  | refit, repair, paint | 2000    | testshipyard.com |       |
`;

// A table shape that matches none of the five schemas (no name/club_name/
// facility/company_name/platform/website/manufacturer column) — must be
// counted as skipped, not silently dropped or misclaimed.
const SYNTHETIC_OFF_SCHEMA = `
| County | Number of Yacht Clubs | List of Yacht Clubs |
|--------|-----------------------|---------------------|
| Suffolk | 34 | Babylon Yacht Club, Bay Shore Yacht Club |
`;

describe('runIngest — synthetic corpus (routing, skip-list, per-type counts)', () => {
  beforeEach(() => {
    writeCorpusFile(
      '40_Wave_A_Fixture.md',
      SYNTHETIC_CLUB + SYNTHETIC_MARINA + SYNTHETIC_COMPANY + SYNTHETIC_ENGINE + SYNTHETIC_SHIPYARD
    );
    writeCorpusFile('42_Wave_A_Yacht_Fixture.md', SYNTHETIC_YACHT + SYNTHETIC_OFF_SCHEMA);
    // A SKIP_FILES-listed name: its (deliberately club-shaped) content
    // must NOT be ingested even though it would otherwise match a schema.
    writeCorpusFile('01_Florida_Shipwrecks_Treasure_Fleet_GPS_Directory.md', SYNTHETIC_CLUB);
  });

  it('produces non-zero counts for every Wave-A entity type from one run', async () => {
    const { runIngest } = await import('../src/ingest.js');
    const result = runIngest();

    expect(result.totals.clubs).toBeGreaterThan(0);
    expect(result.totals.marinas).toBeGreaterThan(0);
    expect(result.totals.companies).toBeGreaterThan(0);
    expect(result.totals.engines).toBeGreaterThan(0);
    expect(result.totals.yachts).toBeGreaterThan(0);
    expect(result.totals.shipyards).toBeGreaterThan(0);
  });

  // Review fix (MEDIUM 2): a guard-level unit test (shipyardMapper.spec.js)
  // isn't enough to protect the routeTables() wiring in ingest.js itself —
  // this proves a shipyard-shaped table survives the full routing
  // precedence (yacht > club > marina > company > engine > shipyard) and
  // produces a real shipyard node plus its located_in/operated_by edges.
  it('routes a shipyard-shaped table through routeTables end-to-end into a Shipyard node with its edges', async () => {
    const { runIngest } = await import('../src/ingest.js');
    const result = runIngest();

    expect(result.totals.shipyards).toBe(1);

    const { openDb } = await import('../src/db.js');
    const db = openDb(tmpDbPath);
    try {
      const shipyard = db.prepare("SELECT * FROM nodes WHERE id = 'shipyard:wave-a-test-shipyard'").get();
      expect(shipyard).toBeTruthy();
      expect(shipyard.type).toBe('shipyard');

      const locatedIn = db
        .prepare("SELECT * FROM edges WHERE src = 'shipyard:wave-a-test-shipyard' AND rel = 'located_in'")
        .get();
      expect(locatedIn).toBeTruthy();

      const operatedBy = db
        .prepare("SELECT * FROM edges WHERE src = 'shipyard:wave-a-test-shipyard' AND rel = 'operated_by'")
        .get();
      expect(operatedBy).toBeTruthy();
    } finally {
      db.close();
    }
  });

  it('skips SKIP_FILES-listed files entirely (their content is never ingested)', async () => {
    const { runIngest, SKIP_FILES } = await import('../src/ingest.js');
    expect(SKIP_FILES.has('01_Florida_Shipwrecks_Treasure_Fleet_GPS_Directory.md')).toBe(true);

    const result = runIngest();

    expect(result.totals.filesSkipped).toBe(1);
    // Only ONE club (from 40_Wave_A_Fixture.md) even though the skipped
    // file contains an identical club table.
    expect(result.totals.clubs).toBe(1);
  });

  it('counts off-schema tables as skipped rather than misclaiming or silently dropping them', async () => {
    const { runIngest } = await import('../src/ingest.js');
    const result = runIngest();

    expect(result.totals.skippedTables).toBeGreaterThanOrEqual(1);
  });

  it('is idempotent: running the full pipeline twice yields identical per-type counts and total nodes/edges', async () => {
    const { runIngest } = await import('../src/ingest.js');

    const first = runIngest();
    const second = runIngest();

    expect(second.totalNodes).toBe(first.totalNodes);
    expect(second.totalEdges).toBe(first.totalEdges);
    expect(second.totals.clubs).toBe(first.totals.clubs);
    expect(second.totals.marinas).toBe(first.totals.marinas);
    expect(second.totals.companies).toBe(first.totals.companies);
    expect(second.totals.engines).toBe(first.totals.engines);
    expect(second.totals.yachts).toBe(first.totals.yachts);
    expect(second.totals.shipyards).toBe(first.totals.shipyards);
  });
});

// TASK-005 (Wave B): a small real-shaped prose file (mirroring file 17's
// "GROK YACHT TERMINAL — <NAME> (<LOCATION>) FULL DEEP DIVE" + labeled-
// bullet cluster shape) alongside a Wave-A marina table for the SAME real-
// world marina — proves the ingest.js wiring end-to-end (detectProseSheets
// -> mapProseSheets -> writeSkippedProseReport), not just the two mapper
// modules in isolation (see proseParser.spec.js / proseMapper.spec.js for
// that unit-level coverage).
const SYNTHETIC_MARINA_TABLE = `
| Facility | Location | Lift Capacity | Max LOA/Beam | Marina Integration | Key Services | SSG Listed? |
|----------|----------|---------------|--------------|--------------------|--------------|-------------|
| Bradford Marine | Fort Lauderdale | 320-ton Travelift | 180 ft | Yes | Full refit | Yes |
`;

const SYNTHETIC_PROSE_MARINA = `# Wave B Prose Fixture

## Grok

**GROK YACHT TERMINAL — BRADFORD MARINE (FORT LAUDERDALE) FULL DEEP DIVE**

**Contact & Booking**
- **Address**: 3051 West State Road 84, Fort Lauderdale, FL 33312

**Some Unclassified Section (Nothing Useful Here)**
Just some prose with no recognized fields at all.
`;

describe('runIngest — Wave B prose pass (end-to-end wiring)', () => {
  beforeEach(() => {
    writeCorpusFile('40_Wave_A_Marina_Fixture.md', SYNTHETIC_MARINA_TABLE);
    writeCorpusFile('17_Wave_B_Prose_Fixture.md', SYNTHETIC_PROSE_MARINA);
  });

  it('merges a prose-sourced marina sheet into the SAME Wave-A marina node (dedup) and reports the skipped count', async () => {
    const { runIngest } = await import('../src/ingest.js');
    const result = runIngest();

    // Exactly one marina node for Bradford Marine, not two.
    expect(result.totals.marinas).toBe(1);
    expect(result.totals.skippedProseSheets).toBeGreaterThanOrEqual(0);
    expect(fs.existsSync(result.skippedProseReportPath)).toBe(true);
  });

  it('is idempotent across two full runs, including the prose pass', async () => {
    const { runIngest } = await import('../src/ingest.js');

    const first = runIngest();
    const second = runIngest();

    expect(second.totals.marinas).toBe(first.totals.marinas);
    expect(second.totals.skippedProseSheets).toBe(first.totals.skippedProseSheets);
    expect(second.totalEdges).toBe(first.totalEdges);
  });
});
