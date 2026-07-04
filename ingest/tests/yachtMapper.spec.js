// ingest/tests/yachtMapper.spec.js
//
// TASK-003: yacht mapper + entity resolution (dedup). Fixtures are real
// excerpts copied verbatim from the /knowledge corpus so the dedup story
// stays grounded in actual cross-file spelling/value drift:
//   - 20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md, lines 14-21
//     (Dilbar/Azzam/Eclipse spelled "Lurssen", no diacritic)
//   - 13_Celebrity_Yachts_Billionaires_Fleets_and_Hotspots.md, lines
//     249-298 (same yachts + Koru, spelled "Lürssen"/"Blohm+Voss", with
//     slightly different LOA rounding: "162.5m" vs "162 m (533 ft)")
//   - 42_Monaco_Yacht_Show_Key_Players_Charters.md, lines 38-44 (weekly
//     rate money parsing: "Breakthrough" / "€3,500,000+")
//   - 62_Yacht_Builders_Data_Extraction.md, lines 1367-1373 (a salary
//     table living inside a yacht-adjacent-sounding file — must be
//     skipped, not mistaken for yacht data)
// A couple of narrowly-scoped cases (same-name-different-builder,
// M/Y-prefix collapsing, a clean money conflict) don't occur cleanly in
// the corpus within a two-row span, so those are clearly-labeled
// synthetic fixtures.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapYachtTables } from '../src/mappers/yachtMapper.js';

// --- Real fixture: file 20, lines 14-21 ---
const FIXTURE_20_MAIN = `
| Yacht Name | Owner | Net Worth | Length | Builder | Year | Estimated Value | Annual Running Cost | Key Features | Personal Website |
|------------|--------|-----------|--------|---------|------|-------------------|--------------------------|--------------|------------------|
| Big Data | Unknown | N/A | 16.15 m (53 ft) | Beneteau | Unknown | Unknown | Unknown | Modern and comfortable interior with wooden elements, ample storage, bright open saloon including dining table and relaxation area with sofa; available for charter in the Mediterranean for racing, tourism, groups, promotions, and photo sessions. | [bigdatayacht.com](https://bigdatayacht.com) |
| Dilbar | Alisher Usmanov (legally owned by sister Gulbahor Ismailova) | $18.4 billion | 156 m (511 ft) | Lurssen | 2016 | $800 million | $50-80 million | Largest indoor pool on a yacht (25m long); swimming pool; helicopter pad; custom Airbus H175 helicopter tender; Venetian Aft Helm Limo, Chase 31, and Chase Tender; steel hull, aluminum superstructure; 6,000 nm range; seized in 2022 due to sanctions. | None mentioned |
| Azzam | Mohammed bin Zayed Al Nahyan | N/A | 180 m (590 ft) | Lurssen | 2013 | $600 million | $50-75 million | Bullet-proof master suite; sophisticated missile defense system; rumored submarine; shallow draft for high speed; Empire style interior; two gas turbines and two diesel engines (94,000 hp). | None mentioned |
| Eclipse | Roman Abramovich | N/A | 162 m (533 ft) | Blohm + Voss | 2010 | $700 million | $50-70 million | Two helipads; swimming pool; mini-submarine; missile detection system; anti-paparazzi laser system; dance floor; exterior fireplace; two swimming pools; hybrid propulsion; refitted in 2015. | None mentioned |
| Dubai | Sheikh Mohammed bin Rashid Al Maktoum | N/A | 162 m (532 ft) | Platinum Yachts | 2006 | $500 million | $35-50 million | Large pool; disco; submarine garage; helipad; swimming pool; jacuzzi; gym; cinema; grand salon with fireplace; formal dining; library; lounge; massage room; hair salon; sleek modern exterior. | None mentioned |
| Sailing Yacht A | Andrey Melnichenko | N/A | 143 m (468 ft) | Nobiskrug | 2017 | $600 million | $50-75 million | Eight decks; underwater observation pod with 1-ft thick glass; crow's nest at 60m; multiple elevators; rumored personal submarine; four tenders (carbon fiber speedboat, luxury limo, panoramic tender, utility vessel); warmer classic interior with dark woods and copper accents; hybrid diesel-electric propulsion; seized in 2022 due to sanctions. | None mentioned |
`;

// --- Real fixture: file 13, lines 249-250 header/separator + rows 251,
// 253, 256, 298 (Azzam, Eclipse, Dilbar, Koru — a curated, non-contiguous
// but byte-verbatim subset of the 50-row "Top 50 Table" so the fixture
// stays small) ---
const FIXTURE_13_TOP50 = `
| Rank | Yacht Name          | Length     | Year | Builder          | Owner (Verified)                          | Charter? (Est.) | Notes / Celebrity Tie-In |
|------|---------------------|------------|------|------------------|-------------------------------------------|-----------------|--------------------------|
| 1    | Azzam              | 180m      | 2013 | Lürssen         | UAE Royal (Mohammed bin Zayed Al Nahyan estate) | No             | World's largest private; day-boat style |
| 3    | Eclipse            | 162.5m    | 2010 | Blohm+Voss      | Roman Abramovich                         | Rare           | Iconic "fortress" yacht |
| 6    | Dilbar             | 156m      | 2016 | Lürssen         | Alisher Usmanov                          | No             | Largest by volume |
| 48   | Koru               | ~127m (sail) | 2023 | Oceanco      | Jeff Bezos                               | No             | Largest sailing superyacht |
`;

// --- Real fixture: file 42, lines 38-44 (weekly-rate money parsing) ---
const FIXTURE_42_CHARTER = `
| Yacht Name | Builder | Length (m/ft) | Year (Delivery/Refit) | Weekly Rate (EUR/USD) | Guests/Crew | Key Features | Big Player/Charter Company | Source Citation |
|------------|---------|---------------|-------------------------------|-----------------------|-------------|--------------|----------------------------|-----------------|
| Breakthrough | Feadship | 118.8/390 | 2025 | €3,500,000+ | 12/46 | World's first hydrogen superyacht; infinity pool, 14 balconies, hair salon, RYA water sports center. Largest at MYS 2025. | Various (e.g., BOAT International) |  |
`;

// --- Real fixture: file 62, lines 1367-1373 (unrelated salary table that
// must be skipped, not mistaken for yacht data) ---
const FIXTURE_62_SALARY = `
| **Job Title**                  | **Industry**         | **Median Salary (Annual)** | **Demand (Job Openings)** | **Why It's Best**                                                                 |
|-------------------------------|----------------------|----------------------------|--------------------------|----------------------------------------------------------------------------------|
| Real Estate Sales Agent       | Real Estate         | $75,000–$120,000           | High (50+ on Indeed)     | Boca's luxury housing market (e.g., Mizner Park condos) drives demand. High commissions for skilled negotiators. |
`;

// --- Synthetic fixture: same name, definitively different builder/LOA
// (mirrors the real-world "many boats named Serenity" collision called
// out in the ticket, which doesn't happen to occur within a small,
// self-contained excerpt of the required source files). ---
const FIXTURE_SYNTHETIC_SERENITY_COLLISION = `
| Yacht Name | Builder | Length | Year |
|------------|---------|--------|------|
| Serenity | Feadship | 60m | 2015 |
| Serenity | Benetti | 45m | 2018 |
`;

// --- Synthetic fixture: M/Y prefix must not create a second node for a
// yacht already resolved without the prefix. ---
const FIXTURE_SYNTHETIC_MY_PREFIX = `
| Yacht Name | Builder | Length | Year |
|------------|---------|--------|------|
| M/Y Eclipse | Blohm + Voss | 162m | 2010 |
`;

// --- Synthetic fixture: a clean, isolated weekly-rate conflict for the
// same yacht (real fixtures don't happen to disagree on a single field
// while agreeing on everything else within two rows). ---
const FIXTURE_SYNTHETIC_CONFLICT_A = `
| Yacht Name | Builder | Length | Year | Weekly Rate |
|------------|---------|--------|------|-------------|
| Conflicto | Feadship | 70m | 2019 | €650,000 |
`;
const FIXTURE_SYNTHETIC_CONFLICT_B = `
| Yacht Name | Builder | Length | Year | Weekly Rate |
|------------|---------|--------|------|-------------|
| Conflicto | Feadship | 70m | 2019 | €700,000 |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'yacht-mapper-test-')), 'graph.db');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(path.dirname(tmpDbPath), { recursive: true, force: true });
});

function getNode(id) {
  const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, attrs: row.attrs_json ? JSON.parse(row.attrs_json) : null };
}

function countByType(type) {
  return db.prepare('SELECT COUNT(*) AS count FROM nodes WHERE type = ?').get(type).count;
}

function edgeExists(src, rel, dst) {
  return !!db
    .prepare('SELECT 1 FROM edges WHERE src = ? AND rel = ? AND dst = ?')
    .get(src, rel, dst);
}

describe('mapYachtTables — cross-file entity resolution (real fixtures)', () => {
  beforeEach(() => {
    const tables20 = parseTables(FIXTURE_20_MAIN);
    const tables13 = parseTables(FIXTURE_13_TOP50);
    mapYachtTables(db, tables20, '20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md');
    mapYachtTables(db, tables13, '13_Celebrity_Yachts_Billionaires_Fleets_and_Hotspots.md');
  });

  it('collapses the same yacht (Dilbar) from two files into one node with merged attrs and both provenances', () => {
    const dilbar = getNode('yacht:dilbar');
    expect(dilbar).not.toBeNull();
    expect(dilbar.type).toBe('yacht');
    expect(dilbar.attrs.provenance).toEqual([
      '20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md',
      '13_Celebrity_Yachts_Billionaires_Fleets_and_Hotspots.md',
    ]);
    // Both files report the same LOA (511ft/156m vs 156m) -> no conflict.
    expect(dilbar.attrs.loa.meters).toBe(156);
    expect(dilbar.attrs.year.value).toBe(2016);

    // Exactly one yacht node for Dilbar, not two.
    const dilbarNodes = db
      .prepare("SELECT id FROM nodes WHERE type = 'yacht' AND name LIKE 'Dilbar%'")
      .all();
    expect(dilbarNodes).toHaveLength(1);
  });

  it('dedupes the Lurssen/Lürssen builder spelling drift into a single Builder node', () => {
    const dilbar = getNode('yacht:dilbar');
    const azzam = getNode('yacht:azzam');
    expect(countByType('builder')).toBeGreaterThan(0);

    // Both Dilbar (file 20: "Lurssen") and Azzam (file 13: "Lürssen") must
    // resolve to the very same builder id.
    expect(edgeExists('yacht:dilbar', 'built_by', 'builder:lurssen')).toBe(true);
    expect(edgeExists('yacht:azzam', 'built_by', 'builder:lurssen')).toBe(true);

    const lurssenBuilderNodes = db
      .prepare("SELECT id FROM nodes WHERE type = 'builder' AND id = 'builder:lurssen'")
      .all();
    expect(lurssenBuilderNodes).toHaveLength(1);
    expect(dilbar).not.toBeNull();
    expect(azzam).not.toBeNull();
  });

  it('merges Eclipse across files despite "Blohm + Voss" vs "Blohm+Voss" spacing and 162m vs 162.5m LOA rounding (~1m tolerance)', () => {
    const eclipse = getNode('yacht:eclipse');
    expect(eclipse).not.toBeNull();
    expect(eclipse.attrs.provenance).toHaveLength(2);
    // First non-empty LOA wins (file 20's "162 m (533 ft)" -> 162).
    expect(eclipse.attrs.loa.meters).toBe(162);
    expect(edgeExists('yacht:eclipse', 'built_by', 'builder:blohm-voss')).toBe(true);

    const eclipseNodes = db.prepare("SELECT id FROM nodes WHERE type = 'yacht' AND name = 'Eclipse'").all();
    expect(eclipseNodes).toHaveLength(1);
  });

  it('merges Azzam across files (Lurssen/Lürssen, 180m both sides)', () => {
    const azzam = getNode('yacht:azzam');
    expect(azzam).not.toBeNull();
    expect(azzam.attrs.loa.meters).toBe(180);
    expect(azzam.attrs.provenance).toHaveLength(2);
  });

  it('creates a new yacht node for Koru (only present in the second file)', () => {
    const koru = getNode('yacht:koru');
    expect(koru).not.toBeNull();
    expect(koru.attrs.loa.meters).toBe(127);
    expect(koru.attrs.year.value).toBe(2023);
    expect(koru.attrs.provenance).toEqual(['13_Celebrity_Yachts_Billionaires_Fleets_and_Hotspots.md']);
    expect(edgeExists('yacht:koru', 'built_by', 'builder:oceanco')).toBe(true);
  });

  it('creates OWNED_BY edges to Person nodes for real owners', () => {
    expect(edgeExists('yacht:eclipse', 'owned_by', 'person:roman-abramovich')).toBe(true);
    expect(edgeExists('yacht:azzam', 'owned_by', 'person:mohammed-bin-zayed-al-nahyan')).toBe(true);
  });

  it('does not create an OWNED_BY edge when the owner is "Unknown" (Big Data)', () => {
    const bigDataEdges = db
      .prepare("SELECT * FROM edges WHERE src = 'yacht:big-data' AND rel = 'owned_by'")
      .all();
    expect(bigDataEdges).toHaveLength(0);
  });

  // Regression (reviewer finding, MEDIUM 1): file 13's real header is
  // "Owner (Verified)", which normalizeHeader slugs to "owner_verified"
  // (not the canonical "owner" alias) — the mapper must fall back to it
  // instead of silently dropping every file-13 owner.
  it('creates an OWNED_BY edge from the "Owner (Verified)" column (file 13 real header), not just "Owner"', () => {
    expect(edgeExists('yacht:koru', 'owned_by', 'person:jeff-bezos')).toBe(true);
    expect(edgeExists('yacht:azzam', 'owned_by', 'person:uae-royal-mohammed-bin-zayed-al-nahyan-estate')).toBe(
      true
    );
  });
});

describe('mapYachtTables — money parsing (real fixture: file 42 Breakthrough)', () => {
  it('parses the weekly rate into { amount, currency, raw }', () => {
    const tables = parseTables(FIXTURE_42_CHARTER);
    mapYachtTables(db, tables, '42_Monaco_Yacht_Show_Key_Players_Charters.md');

    const breakthrough = getNode('yacht:breakthrough');
    expect(breakthrough).not.toBeNull();
    expect(breakthrough.attrs.weekly_rate).toEqual({
      amount: 3500000,
      currency: 'EUR',
      raw: '€3,500,000+',
    });
    expect(breakthrough.attrs.loa.meters).toBe(118.8);
  });

  // Regression (reviewer finding, MEDIUM 1): file 42's real header is
  // "Guests/Crew" (normalizeHeader slugs it to "guests_crew"), a combined
  // "12/46" cell — the mapper must split it into guests/crew rather than
  // silently dropping both because neither "guests" nor "crew" key exists.
  it('splits a combined "Guests/Crew" cell ("12/46") into guests: 12, crew: 46', () => {
    const tables = parseTables(FIXTURE_42_CHARTER);
    mapYachtTables(db, tables, '42_Monaco_Yacht_Show_Key_Players_Charters.md');

    const breakthrough = getNode('yacht:breakthrough');
    expect(breakthrough.attrs.guests).toBe(12);
    expect(breakthrough.attrs.crew).toBe(46);
  });
});

describe('mapYachtTables — schema guard (real fixture: file 62 salary table)', () => {
  it('skips a non-yacht table (no name/builder/loa/year columns) rather than mistaking it for yacht data', () => {
    const tables = parseTables(FIXTURE_62_SALARY);
    const result = mapYachtTables(db, tables, '62_Yacht_Builders_Data_Extraction.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.yachts).toBe(0);
    expect(countByType('yacht')).toBe(0);
    expect(countByType('builder')).toBe(0);
  });
});

describe('mapYachtTables — name-collision guard (synthetic: two different "Serenity" yachts)', () => {
  it('creates two distinct yacht nodes when the same name has a definitively different builder and LOA', () => {
    const tables = parseTables(FIXTURE_SYNTHETIC_SERENITY_COLLISION);
    const result = mapYachtTables(db, tables, 'synthetic-serenity.md');

    expect(result.yachts).toBe(2);
    const serenityNodes = db
      .prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht' AND name = 'Serenity'")
      .all();
    expect(serenityNodes).toHaveLength(2);

    const ids = serenityNodes.map((r) => r.id).sort();
    expect(ids).toEqual(['yacht:serenity', 'yacht:serenity-benetti']);

    expect(edgeExists('yacht:serenity', 'built_by', 'builder:feadship')).toBe(true);
    expect(edgeExists('yacht:serenity-benetti', 'built_by', 'builder:benetti')).toBe(true);
  });
});

describe('mapYachtTables — M/Y prefix stripping (synthetic, chained onto a real Eclipse node)', () => {
  it('resolves "M/Y Eclipse" to the same yacht node as "Eclipse" rather than creating a duplicate', () => {
    mapYachtTables(db, parseTables(FIXTURE_20_MAIN), '20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md');
    expect(countByType('yacht')).toBeGreaterThan(0);
    const before = countByType('yacht');

    mapYachtTables(db, parseTables(FIXTURE_SYNTHETIC_MY_PREFIX), 'synthetic-my-prefix.md');

    expect(countByType('yacht')).toBe(before); // no new yacht node created
    const eclipse = getNode('yacht:eclipse');
    expect(eclipse.attrs.provenance).toContain('synthetic-my-prefix.md');
  });
});

describe('mapYachtTables — merge semantics: conflicts (synthetic, isolated weekly-rate disagreement)', () => {
  it('keeps the first non-empty weekly_rate and appends the conflicting value instead of dropping it', () => {
    mapYachtTables(db, parseTables(FIXTURE_SYNTHETIC_CONFLICT_A), 'synthetic-a.md');
    mapYachtTables(db, parseTables(FIXTURE_SYNTHETIC_CONFLICT_B), 'synthetic-b.md');

    const conflicto = getNode('yacht:conflicto');
    expect(conflicto.attrs.weekly_rate).toEqual({ amount: 650000, currency: 'EUR', raw: '€650,000' });
    expect(conflicto.attrs.conflicts.weekly_rate).toEqual(['€700,000']);
    expect(conflicto.attrs.provenance).toEqual(['synthetic-a.md', 'synthetic-b.md']);
  });
});

// --- Synthetic fixture: reviewer's exact repro for the HIGH finding —
// a full-data Eclipse row, a name-only Eclipse row (no builder/LOA), and
// a second, definitively different Eclipse (different builder/LOA), all
// in one table. The name-only row is deliberately ambiguous once both
// "Eclipse" candidates exist. ---
const FIXTURE_AMBIGUOUS_ECLIPSE = `
| Yacht Name | Builder | Length | Year |
|------------|---------|--------|------|
| Eclipse | Feadship | 100m | 2015 |
| Eclipse |  |  |  |
| Eclipse | Benetti | 60m | 2018 |
`;

describe('mapYachtTables — ambiguous name-only resolution stays idempotent (regression: HIGH)', () => {
  it('re-running an ambiguous name-only row does not grow the node count (reviewer repro: run1 -> 2 nodes, run2/run3 must stay at 2)', () => {
    const tables = parseTables(FIXTURE_AMBIGUOUS_ECLIPSE);

    mapYachtTables(db, tables, 'ambiguous-eclipse.md');
    const eclipseNodesRun1 = db
      .prepare("SELECT id FROM nodes WHERE type = 'yacht' AND name = 'Eclipse'")
      .all();
    expect(eclipseNodesRun1).toHaveLength(2); // Feadship/100m and Benetti/60m

    mapYachtTables(db, tables, 'ambiguous-eclipse.md');
    const eclipseNodesRun2 = db
      .prepare("SELECT id FROM nodes WHERE type = 'yacht' AND name = 'Eclipse'")
      .all();
    expect(eclipseNodesRun2).toHaveLength(2); // must NOT grow to 3 (yacht:eclipse-2)

    mapYachtTables(db, tables, 'ambiguous-eclipse.md');
    const eclipseNodesRun3 = db
      .prepare("SELECT id FROM nodes WHERE type = 'yacht' AND name = 'Eclipse'")
      .all();
    expect(eclipseNodesRun3).toHaveLength(2); // must NOT grow to 4 (yacht:eclipse-3)

    const totalEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;
    mapYachtTables(db, tables, 'ambiguous-eclipse.md');
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(totalEdges);
  });

  it('provenance does not duplicate across re-runs for the ambiguously-attached name-only row', () => {
    const tables = parseTables(FIXTURE_AMBIGUOUS_ECLIPSE);
    mapYachtTables(db, tables, 'ambiguous-eclipse.md');
    mapYachtTables(db, tables, 'ambiguous-eclipse.md');

    const eclipseNodes = db
      .prepare("SELECT attrs_json FROM nodes WHERE type = 'yacht' AND name = 'Eclipse'")
      .all();
    for (const row of eclipseNodes) {
      const attrs = JSON.parse(row.attrs_json);
      const occurrences = attrs.provenance.filter((f) => f === 'ambiguous-eclipse.md');
      expect(occurrences).toHaveLength(1);
    }
  });
});

describe('mapYachtTables — idempotency', () => {
  it('running the mapper twice over the same inputs yields identical node/edge counts', () => {
    const tables = [...parseTables(FIXTURE_20_MAIN), ...parseTables(FIXTURE_13_TOP50)];

    mapYachtTables(db, tables, 'combined.md');
    const firstYachtCount = countByType('yacht');
    const firstBuilderCount = countByType('builder');
    const firstPersonCount = countByType('person');
    const firstEdgeCount = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapYachtTables(db, tables, 'combined.md');
    const secondYachtCount = countByType('yacht');
    const secondBuilderCount = countByType('builder');
    const secondPersonCount = countByType('person');
    const secondEdgeCount = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    expect(secondYachtCount).toBe(firstYachtCount);
    expect(secondBuilderCount).toBe(firstBuilderCount);
    expect(secondPersonCount).toBe(firstPersonCount);
    expect(secondEdgeCount).toBe(firstEdgeCount);
  });
});

describe('module importability', () => {
  it('exposes mapYachtTables as a named export', async () => {
    const mod = await import('../src/mappers/yachtMapper.js');
    expect(typeof mod.mapYachtTables).toBe('function');
  });
});
