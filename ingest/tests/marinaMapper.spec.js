// ingest/tests/marinaMapper.spec.js
//
// TASK-004: marina/haul-out yard mapper. Fixtures are real excerpts copied
// verbatim from the /knowledge corpus:
//   - 16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md, lines 835-843
//     (Facility | Location | Lift Capacity | Max LOA/Beam | Marina
//     Integration | Key Services | SSG Listed? — the "Rhode Island"
//     regional table, repeated with minor header variants throughout the
//     file).
//   - 17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md, lines 257-265 (Yard
//     Name | Type | Location (Venice) | Haul-Out / Capacity | Services |
//     Contact / Notes | Primary Sources Scraped — "Location (Venice)" is
//     NOT an exact match for tableParser's "Location" alias, hence the
//     distinct `location_venice` header key exercised here).
//   - 56_Yacht_Parking_Spots_in_Mediterranean_Spain.md, lines 48-63 (Marina
//     Name | Location | Max Yacht Length | Total Berths | ... | Address |
//     Phone/Email | Website | ... — regression fixture for reviewer
//     finding HIGH 2: 'marina_name' was missing from NAME_KEYS, so these
//     tables fell through to companyMapper's website-fallback and minted
//     Company nodes named after raw URLs instead of Marina nodes).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapMarinaTables } from '../src/mappers/marinaMapper.js';

// --- Real fixture: file 16, lines 835-843 ---
const FIXTURE_16_RI = `
| Facility                          | Location              | Lift Capacity                  | Max LOA/Beam          | Marina Integration | Key Services                     | SSG Listed? |
|-----------------------------------|-----------------------|--------------------------------|------------------------|--------------------|----------------------------------|-------------|
| Safe Harbor Newport Shipyard     | Newport              | 500T + 200T + 150T            | 300+ ft / 36 ft      | Yes (3,500 ft docks) | Full refit, paint, rigging      | Yes        |
| Hinckley Yacht Services RI       | Portsmouth/Middletown| 160 tons                      | Mid-large yachts     | Yes               | Interior/exterior projects      | Yes        |
`;

// --- Real fixture: file 17, lines 257-265 (Venice yard directory) ---
const FIXTURE_17_VENICE = `
| Yard Name                      | Type                  | Location (Venice)     | Haul-Out / Capacity                  | Services                          | Contact / Notes                          | Primary Sources Scraped                  |
|--------------------------------|-----------------------|-----------------------|--------------------------------------|-----------------------------------|-------------------------------------------|-------------------------------------------|
| Venezia Certosa Marina        | Modern Marina + Yard | Certosa Island       | 220T travel lift (up to ~60m)       | Refit, repair, wintering         | +39 041 5208588; info@ventodivenezia.it | Official site, Yachting Pages, Navily, Ocean Posse, old marina PDFs |
`;

// --- Real fixture: file 56, lines 48-63 (Spain marina directory, with
// Address/Phone/Website/Detailed Features columns) ---
const FIXTURE_56_SPAIN = `
| Marina Name | Location | Max Yacht Length | Total Berths | Sample Mooring Fee (40ft yacht/night) | Address | Phone/Email | Website | Detailed Features/Amenities | Profile/Bio |
|-------------|----------|------------------|--------------|---------------------------------------|---------|-------------|---------|-----------------------------|-------------|
| IGY Málaga Marina | Málaga, Costa del Sol | 180m | 33 | $110 (estimate; varies) | Muelle Uno, Paseo del Muelle Uno, 29001 Málaga | +34 952 229 476 / malaga@igymarinas.com | https://www.igymarinas.com/marinas/igy-malaga-marina | Restaurants, crew facilities, 24/7 security, fuel, repairs; close to beaches and airport. | A dedicated superyacht marina developed in 2020 by IGY and partners. Centrally located in Málaga, it provides premium services with easy access to Andalusian culture and the airport—great for charters and extended stays. |
| Marina Port Vell | Barcelona, Catalonia | 190m | 151 | $110 | Moll de la Barceloneta, 08039 Barcelona | +34 934 842 300 / info@marinaportvell.com | https://marinaportvell.com | 24/7 security, business center, heliport, yacht club, restaurants, shops, Wi-Fi, repair facilities; central to La Rambla and Gothic Quarter. | A premier superyacht homeport renovated in 2015, with one of the world's longest piers (400m). Strategically located between the western Mediterranean and Caribbean, it's a modern, urban marina focused on luxury and connectivity—great for city explorers and trans-Atlantic prep. |
`;

// --- Real fixture: file 35, lines 980-992 (Greece Ionian marinas table,
// including the real truncation-placeholder row "... (5+ more like
// Sivota, Paxos Gaios, Kyparissia)") ---
const FIXTURE_35_GREECE = `
| Name                  | Location/Region | Berths | Max LOA (m) | Draft (m) | Services                                      | Rates (€/night 12-15m High/Low) | Notes                                                                 |
|-----------------------|-----------------|--------|-------------|-----------|-----------------------------------------------|---------------------------------|-----------------------------------------------------------------------|
| Nidri Quay           | Lefkada/Ionian | 200   | 20         | 3        | Water, electricity, shops                     | 30 / 20                        | Waterfalls nearby; lively.                                            |
| Sami Port            | Kefalonia/Ionian | 100   | 40         | 5        | Ferry hub, basic facilities                   | 25-35 / 20-25                  | Melissani cave tours.                                                 |
| ... (5+ more like Sivota, Paxos Gaios, Kyparissia) | ... | ... | ... | ... | ... | ... | ... (Full: Smaller Ionian quays for island-hopping).                  |
`;

// --- Synthetic fixture: off-schema table (no facility/yard identifier). ---
const FIXTURE_SYNTHETIC_OFF_SCHEMA = `
| Region / Area              | Count (Practical) | Standout Examples (with Key Specs) |
|----------------------------|--------------------|-------------------------------------|
| NYC / Bronx / City Island | 2–3              | City Island Yacht Sales (30T lift) |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'marina-mapper-test-')), 'graph.db');
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

describe('mapMarinaTables — "Facility | Location | Lift Capacity" shape (real fixture: file 16 RI)', () => {
  let result;

  beforeEach(() => {
    const tables = parseTables(FIXTURE_16_RI);
    result = mapMarinaTables(db, tables, '16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md');
  });

  it('creates Marina nodes with travelift_tonnage/max_loa (CAN_SERVICE encoded as a node attr) and provenance', () => {
    expect(result.marinas).toBe(2);
    const newport = getNode('marina:safe-harbor-newport-shipyard');
    expect(newport).not.toBeNull();
    expect(newport.type).toBe('marina');
    // "500T + 200T + 150T" -> first/primary lift tonnage.
    expect(newport.attrs.travelift_tonnage).toEqual({ tons: 500, raw: '500T + 200T + 150T' });
    // Regression (reviewer finding, MEDIUM 1): "300+ ft / 36 ft" must parse
    // to the LOA (300ft, first-listed, ~91.44m), not the beam (36ft, the
    // second figure) — an earlier version reused normalize.js's
    // parseLength(), whose ft-regex requires digits directly adjacent to
    // "ft" (mod whitespace); the "+" after "300" broke that match and it
    // silently fell through to "36 ft" instead. marinaMapper.js now has its
    // own dedicated max-LOA parser with an explicit "+?" to survive this.
    expect(newport.attrs.max_loa.meters).toBeCloseTo(91.44, 1);
    expect(newport.attrs.max_loa.raw).toBe('300+ ft / 36 ft');
    expect(newport.attrs.provenance).toEqual(['16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md']);
  });

  it('creates a LOCATED_IN edge to the (unknown, own-node) Region resolved from the Location column', () => {
    expect(edgeExists('marina:safe-harbor-newport-shipyard', 'located_in', 'region:newport')).toBe(true);
    expect(edgeExists('marina:hinckley-yacht-services-ri', 'located_in', 'region:portsmouth-middletown')).toBe(true);
  });
});

describe('mapMarinaTables — "Yard Name | Location (Venice)" shape (real fixture: file 17)', () => {
  it('uses the location_venice header (not the canonical "region" alias) for the LOCATED_IN edge, and extracts phone from Contact/Notes', () => {
    const tables = parseTables(FIXTURE_17_VENICE);
    const result = mapMarinaTables(db, tables, '17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md');

    expect(result.marinas).toBe(1);
    const certosa = getNode('marina:venezia-certosa-marina');
    expect(certosa).not.toBeNull();
    expect(certosa.attrs.phone).toBe('+39 041 5208588');
    expect(edgeExists('marina:venezia-certosa-marina', 'located_in', 'region:certosa-island')).toBe(true);
  });
});

// Regression (reviewer finding, HIGH 2): 'marina_name' (file 56's real
// header slug) must be recognized so these tables are claimed by
// marinaMapper, not misrouted to companyMapper's website-identifier
// fallback (which was minting Company nodes named after raw URLs).
describe('mapMarinaTables — "Marina Name" header recognition (regression: HIGH 2, file 56 Spain marinas)', () => {
  it('creates Marina nodes (not Company nodes) with a clean max_loa from "Max Yacht Length" and a direct berths count', () => {
    const tables = parseTables(FIXTURE_56_SPAIN);
    const result = mapMarinaTables(db, tables, '56_Yacht_Parking_Spots_in_Mediterranean_Spain.md');

    expect(result.marinas).toBe(2);
    const igyMalaga = getNode('marina:igy-malaga-marina');
    expect(igyMalaga).not.toBeNull();
    expect(igyMalaga.type).toBe('marina');
    expect(igyMalaga.attrs.max_loa).toEqual({ meters: 180, raw: '180m' });
    expect(igyMalaga.attrs.berths).toBe(33);

    const portVell = getNode('marina:marina-port-vell');
    expect(portVell.attrs.max_loa).toEqual({ meters: 190, raw: '190m' });
    expect(portVell.attrs.berths).toBe(151);
  });

  it('resolves the LOCATED_IN region from "Location" (not a postcode fragment from Address)', () => {
    const tables = parseTables(FIXTURE_56_SPAIN);
    mapMarinaTables(db, tables, '56_Yacht_Parking_Spots_in_Mediterranean_Spain.md');

    expect(edgeExists('marina:igy-malaga-marina', 'located_in', 'region:malaga-costa-del-sol')).toBe(true);
    expect(getNode('region:29001-malaga')).toBeNull();
  });
});

// Regression (found during reviewer's requested quality re-check, same
// class of bug as MEDIUM 2): a corpus table can include a truncation-
// placeholder row instead of a real entity — must not mint a marina node
// named "... (5+ more like Sivota, Paxos Gaios, Kyparissia)".
describe('mapMarinaTables — rejects truncation-placeholder rows (regression, real fixture: file 35 Greece)', () => {
  it('creates real marinas but skips the "... (more like ...)" placeholder row', () => {
    const tables = parseTables(FIXTURE_35_GREECE);
    const result = mapMarinaTables(db, tables, '35_Comprehensive_Greece_Yachting_Data_Report.md');

    expect(result.marinas).toBe(2); // Nidri Quay + Sami Port only
    expect(getNode('marina:nidri-quay')).not.toBeNull();
    expect(getNode('marina:sami-port')).not.toBeNull();
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM nodes WHERE type = 'marina' AND name LIKE '%more like%'").get().count
    ).toBe(0);
  });
});

describe('mapMarinaTables — schema guard', () => {
  it('skips a table with no facility/yard-name identifier column', () => {
    const tables = parseTables(FIXTURE_SYNTHETIC_OFF_SCHEMA);
    const result = mapMarinaTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.marinas).toBe(0);
    expect(countByType('marina')).toBe(0);
  });
});

describe('mapMarinaTables — idempotency', () => {
  it('running twice over the same input yields identical node/edge counts', () => {
    const tables = parseTables(FIXTURE_16_RI);
    mapMarinaTables(db, tables, '16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md');
    const firstMarinas = countByType('marina');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapMarinaTables(db, tables, '16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md');
    expect(countByType('marina')).toBe(firstMarinas);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('module importability', () => {
  it('exposes mapMarinaTables as a named export', async () => {
    const mod = await import('../src/mappers/marinaMapper.js');
    expect(typeof mod.mapMarinaTables).toBe('function');
  });
});
