// ingest/tests/clubMapper.spec.js
//
// TASK-004: yacht-club mapper. Fixtures are real excerpts copied verbatim
// from the /knowledge corpus:
//   - 40_Comprehensive_Data_on_Japanese_Yacht_Clubs.md, lines 27-45
//     (Region | Club Name | Location | Founding Year | Website | Key
//     Facilities/Activities — the "Region" + "Location" columns both alias
//     to tableParser's canonical "region" key, producing region/region_2).
//   - 33_Russia_Yacht_Clubs_Data_Compilation.md, lines 22-31 (Name |
//     Location | Founding Year | Details/Facilities/History — includes the
//     real ragged section-header row "| **Moscow Area ...** |" that must
//     NOT become a spurious club node, and a real pre-1900 founding year,
//     1867, which normalize.js's parseYear() would miss (1900-2099 only)
//     but parseHistoricalYear() catches).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapClubTables } from '../src/mappers/clubMapper.js';

// --- Real fixture: file 40, lines 27-45 (Japan clubs overview table) ---
const FIXTURE_40_JAPAN = `
| Region | Club Name | Location | Founding Year | Website | Key Facilities/Activities |
|--------|-----------|----------|---------------|---------|---------------|
| Kanto | Enoshima Yacht Club | Enoshima, Fujisawa, Kanagawa | 1964 | https://eyc.jp/ | Founded as host for 1964 Tokyo Olympics sailing; promotes sailing and ocean culture; live camera and weather info available . Burgee: N/A. Address: 1-12-2 Enoshima, Fujisawa-shi, Kanagawa ZIP:251-0036. |
| Kansai | Osaka Hokko Yacht Club | Konohana-ku, Osaka | 1988 | https://ohyc-yacht.com/ | Located at Osaka Hokko Marina; hosts international races like Melbourne Osaka Cup. Address: 2-13-18 Tsuneyoshi, Konohana-ku, Osaka 554-0052. Email: info@ohyc-yacht.com. |
`;

// --- Real fixture: file 33, lines 22-31 (Russia clubs table, including
// the real ragged section-header row and a pre-1900 founding year) ---
const FIXTURE_33_RUSSIA = `
| Name | Location | Founding Year | Details/Facilities/History |
|------|----------|---------------|----------------------------|
| **Moscow Area (Moskovskaya Oblast and Reservoirs)** |
| Royal Yacht Club | Khimki Reservoir, Moscow | Unknown | Accommodates up to 190 yachts (6-40m); crane for 100 tonnes; restaurant, hotel, gym, pool, sauna; 24/7 security, electricity/water at pier; access to Volga River. Mooring fee: Not specified. |
| Moscow Imperial River Yacht-Club | Moscow (restored building) | 1867 | Historical club; published rowing/sailing manual in 1889; building restored in 2014; limited modern details available. |
`;

// --- Synthetic fixture: an unrelated table shape that must be skipped
// (no name/club_name column at all). ---
const FIXTURE_SYNTHETIC_OFF_SCHEMA = `
| County | Number of Yacht Clubs | List of Yacht Clubs |
|--------|-----------------------|---------------------|
| Suffolk | 34 | Babylon Yacht Club, Bay Shore Yacht Club |
`;

// --- Real fixture (reviewer HIGH 1 repro): file 40's SEPARATE
// docking-facilities table, lines 143-149 — same column shape as the real
// clubs table (Region|Name|...|Location|...) but with an extra Type
// column reading "Port"/"Marina", not club data at all. ---
const FIXTURE_40_DOCKING = `
| Region | Name | Type | Location | Key Facilities/Capacities |
|--------|------|------|----------|---------------------------|
| Hokkaido | Muroran Port | Port | Muroran-shi | Cruise and general docking; protected harbor. |
| Hokkaido | Otaru Port Marina | Marina | Otaru | Up to large yachts; fuel, repairs; good for Alaska departures. |
`;

// --- Real fixture (reviewer HIGH 1 repro): file 34's "Best Yacht Clubs in
// Turkey" sheet, lines 237-243 — deliberately mixes real yacht clubs
// ("Yacht Club") with marinas ("Marina with Club Facilities") in ONE
// table, by the corpus author's own framing. ---
const FIXTURE_34_TURKEY = `
| Name | Type | Location/Region | Website | Description | Facilities | History/Notes |
|------|------|-----------------|---------|-------------|------------|---------------|
| Istanbul Sailing Club | Yacht Club | Istanbul | http://www.istanbulyelken.org.tr/ | Premier sailing club promoting yachting and racing in the Bosporus area, hosting events and training. | Sailing courses, racing events, boat storage, social gatherings. | Established to foster sailing culture in Istanbul; active in national and international regattas. |
| Atakoy Marina Yacht Club | Marina with Club Facilities | Istanbul (Bakirkoy District, European Side) | N/A | Luxury marina with integrated yacht club services; popular for superyachts and social activities near the city center. | Berths for 700+ vessels (up to 100m), swimming pool, tennis courts, restaurants, 24/7 security, technical maintenance, shopping center, hotel access. | Expanded in 2017 for mega yachts; proximity to Ataturk Airport; part of Istanbul's western yachting scene; Golden Anchor award winner. |
`;

// --- Real fixture (reviewer HIGH 1 repro): file 26's Miami docking table,
// lines 85-94 — a generic name+location table where only 3 of 8 rows are
// real "... Yacht Club" entries; the rest are marinas/boatyards with no
// Type column to disambiguate. ---
const FIXTURE_26_MIAMI = `
| Name | Location | Type/Capacity | Amenities | Rates (Approx.) | Contact |
|------|----------|---------------|-----------|-----------------|---------|
| Miami Beach Marina | Miami Beach (300 Alton Rd, Miami Beach, FL 33139) | Wet slips; up to 250' LOA, various slips | Fresh water, electricity, cable/phone hookups; walkway access; nearby dining/shopping | Transient $5-6/ft/night; long-term contact for quotes | (305) 673-6000 |
| Bayshore Landing Marina | Coconut Grove (2550 S Bayshore Dr, Miami, FL 33133) | Wet slips; 111 slips, up to 130' | Electrical/water hookups; waterfront dining (seafood, Starbucks); yacht sales, charters | Transient/short stays available; long-term quotes on request | Facebook: bayshorelandingmarina |
| Loggerhead South Miami Marina | Homestead (24777 SW 87th Ave, Homestead, FL 33032) | Dry storage; 210 slips, up to 38' | Restaurant, fuel dock, service dept, picnic/grill areas, captain's lounge | Competitive dry storage rates; contact for details | (305) 258-3500; southmiami@equitylifestyle.com |
| Rickenbacker Marina | Key Biscayne (3301 Rickenbacker Causeway, Miami, FL 33149) | Wet slips and boatyard | Fuel, repairs, storage | Contact for rates | (305) 361-1900 |
| Hurricane Cove Marina & Boatyard | Miami (1884 NW North River Dr, Miami, FL 33125) | Wet slips, boatyard | Repairs, storage, fuel | Contact for rates | (305) 324-0841 |
| Sunset Harbour Yacht Club (Private) | Miami Beach (1928 Purdy Ave, Miami Beach, FL 33139) | Wet slips for members | Club amenities, dining | Members only; contact for membership | (305) 398-6800 |
| Coral Reef Yacht Club (Private) | Coconut Grove (2484 S Bayshore Dr, Miami, FL 33133) | Wet slips for members | Club events, dining | Members only | (305) 858-1733 |
| Key Biscayne Yacht Club (Private) | Key Biscayne (180 Harbor Dr, Key Biscayne, FL 33149) | Wet slips for members | Sailing programs, dining | Members only | (305) 361-9171 |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'club-mapper-test-')), 'graph.db');
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
  return !!db.prepare('SELECT 1 FROM edges WHERE src = ? AND rel = ? AND dst = ?').get(src, rel, dst);
}

describe('mapClubTables — Japan fixture (Region + Location both present)', () => {
  it('creates a YachtClub node with founded/website/facilities and a LOCATED_IN edge to the broad Region column', () => {
    const tables = parseTables(FIXTURE_40_JAPAN);
    const result = mapClubTables(db, tables, '40_Comprehensive_Data_on_Japanese_Yacht_Clubs.md');

    expect(result.clubs).toBe(2);
    const enoshima = getNode('club:enoshima-yacht-club');
    expect(enoshima).not.toBeNull();
    expect(enoshima.type).toBe('club');
    expect(enoshima.attrs.founded).toEqual({ value: 1964, raw: '1964' });
    expect(enoshima.attrs.website).toBe('https://eyc.jp/');
    expect(enoshima.attrs.facilities).toMatch(/1964 Tokyo Olympics/);
    expect(enoshima.attrs.provenance).toEqual(['40_Comprehensive_Data_on_Japanese_Yacht_Clubs.md']);

    // "Region" (Kanto) is the LOCATED_IN target, not "Location" (the finer
    // city-level column).
    expect(edgeExists('club:enoshima-yacht-club', 'located_in', 'region:kanto')).toBe(true);
  });
});

describe('mapClubTables — Russia fixture (section-header row + pre-1900 founding year)', () => {
  let result;

  beforeEach(() => {
    const tables = parseTables(FIXTURE_33_RUSSIA);
    result = mapClubTables(db, tables, '33_Russia_Yacht_Clubs_Data_Compilation.md');
  });

  it('does not create a spurious club node for the ragged section-header row', () => {
    expect(getNode('club:moscow-area-moskovskaya-oblast-and-reservoirs')).toBeNull();
    expect(result.clubs).toBe(2); // Royal Yacht Club + Moscow Imperial River Yacht-Club only
  });

  it('captures a real pre-1900 founding year via parseHistoricalYear (parseYear alone would miss it)', () => {
    const moscowImperial = getNode('club:moscow-imperial-river-yacht-club');
    expect(moscowImperial.attrs.founded).toEqual({ value: 1867, raw: '1867' });
  });

  it('leaves founded null when the cell says "Unknown"', () => {
    const royal = getNode('club:royal-yacht-club');
    expect(royal.attrs.founded).toBeNull();
  });

  it('resolves the single "Location" column as the LOCATED_IN region (unknown region, own node)', () => {
    expect(edgeExists('club:royal-yacht-club', 'located_in', 'region:khimki-reservoir-moscow')).toBe(true);
  });
});

describe('mapClubTables — schema guard', () => {
  it('skips a table with no name/club_name column rather than mistaking it for club data', () => {
    const tables = parseTables(FIXTURE_SYNTHETIC_OFF_SCHEMA);
    const result = mapClubTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.clubs).toBe(0);
    expect(countByType('club')).toBe(0);
  });
});

// Regression (reviewer finding, HIGH 1): a table with the same name+region
// shape as real club data is NOT club data just because it has that shape
// — a Type column meaning "Port"/"Marina" must route rows away from clubs.
describe('mapClubTables — Type-column routing (regression: HIGH 1, file 40 docking-facilities table)', () => {
  it('does not create a club for a cargo port (Type: Port) and skips it entirely', () => {
    const tables = parseTables(FIXTURE_40_DOCKING);
    const result = mapClubTables(db, tables, '40_Comprehensive_Data_on_Japanese_Yacht_Clubs.md');

    expect(getNode('club:muroran-port')).toBeNull();
    expect(getNode('marina:muroran-port')).toBeNull();
    expect(result.clubs).toBe(0);
  });

  it('routes a Type: Marina row to a Marina node instead of a club', () => {
    const tables = parseTables(FIXTURE_40_DOCKING);
    const result = mapClubTables(db, tables, '40_Comprehensive_Data_on_Japanese_Yacht_Clubs.md');

    expect(getNode('club:otaru-port-marina')).toBeNull();
    const marina = getNode('marina:otaru-port-marina');
    expect(marina).not.toBeNull();
    expect(marina.type).toBe('marina');
    expect(result.marinas).toBe(1);
    expect(edgeExists('marina:otaru-port-marina', 'located_in', 'region:hokkaido')).toBe(true);
  });
});

describe('mapClubTables — Type-column routing (regression: HIGH 1, file 34 Turkey "Best Yacht Clubs" sheet)', () => {
  it('creates a club for a "Yacht Club" typed row and a marina (not a club) for a "Marina with Club Facilities" typed row', () => {
    const tables = parseTables(FIXTURE_34_TURKEY);
    const result = mapClubTables(db, tables, '34_Turkey_Yacht_Charter_Data_Sheets.md');

    expect(result.clubs).toBe(1);
    expect(result.marinas).toBe(1);

    const sailingClub = getNode('club:istanbul-sailing-club');
    expect(sailingClub).not.toBeNull();
    expect(sailingClub.type).toBe('club');

    expect(getNode('club:atakoy-marina-yacht-club')).toBeNull();
    const atakoy = getNode('marina:atakoy-marina-yacht-club');
    expect(atakoy).not.toBeNull();
    expect(atakoy.type).toBe('marina');
  });
});

// Regression (reviewer finding, HIGH 1): a generic name+location table
// with NO Type column and NO "Club Name" header must not be presumed club
// data just because most rows are marinas that happen to sit next to a
// few real yacht clubs — skip the whole table rather than guess.
describe('mapClubTables — majority-name heuristic (regression: HIGH 1, file 26 Miami docking table)', () => {
  it('skips the whole table when fewer than half the row names say "club"', () => {
    const tables = parseTables(FIXTURE_26_MIAMI);
    const result = mapClubTables(db, tables, '26_Boat_Docking_Options_in_Miami.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.clubs).toBe(0);
    expect(getNode('club:sunset-harbour-yacht-club-private')).toBeNull();
    expect(getNode('club:rickenbacker-marina')).toBeNull();
  });
});

describe('mapClubTables — idempotency', () => {
  it('running twice over the same input yields identical node/edge counts', () => {
    const tables = parseTables(FIXTURE_40_JAPAN);
    mapClubTables(db, tables, '40_Comprehensive_Data_on_Japanese_Yacht_Clubs.md');
    const firstClubs = countByType('club');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapClubTables(db, tables, '40_Comprehensive_Data_on_Japanese_Yacht_Clubs.md');
    expect(countByType('club')).toBe(firstClubs);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('module importability', () => {
  it('exposes mapClubTables as a named export', async () => {
    const mod = await import('../src/mappers/clubMapper.js');
    expect(typeof mod.mapClubTables).toBe('function');
  });
});
