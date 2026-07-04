// ingest/tests/companyMapper.spec.js
//
// TASK-004: broker/charter/management/platform mapper. Fixtures are real
// excerpts copied verbatim from the /knowledge corpus:
//   - 41_Comprehensive_Monaco_Yacht_Charter_Guide.md, lines 18-33 (broker
//     directory: Company Name | Address (if available) | Phone/Email/
//     Website (if available) | Brief Description/Notes — many cells
//     literally read "Not available", which isEmptyValue() alone does not
//     treat as empty).
//   - 21_Online_Yacht_Brokerage_Competitors_and_Innovations.md, lines
//     18-20 (Platform | Description | Key Features | Focus Areas) and
//     lines 87-89 (Website | Description | Global Reach — no name column
//     at all; the website itself is the identifier).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema } from '../src/db.js';
import { parseTables } from '../src/parsers/tableParser.js';
import { mapCompanyTables } from '../src/mappers/companyMapper.js';

// --- Real fixture: file 41, lines 18-33 (subset) ---
const FIXTURE_41_BROKERS = `
| Company Name              | Address (if available)                  | Phone/Email/Website (if available) | Brief Description/Notes |
|---------------------------|-----------------------------------------|------------------------------------|--------------------------|
| Edmiston and Company      | 57 rue Grimaldi, Monaco                 | Not available                     | Leading superyacht brokerage. |
| IYC                       | Les Caravelles, 25 Blvd Albert 1er, Monaco | +377 97982424 / oxana.vergne@iyc.com | International yacht company for charters. |
| Med Yacht Services        | 25 Boulevard Albert 1er, Monaco         | Not available                     | Yacht management and charters. |
`;

// --- Real fixture: file 21, lines 18-20 ---
const FIXTURE_21_PLATFORM = `
| Platform | Description | Key Features | Focus Areas |
|----------|-------------|--------------|-------------|
| YachtWorld.com | One of the oldest and largest global databases for yachts and boats, founded in the 1990s and now part of Boats Group. It lists over 100,000 vessels worldwide. | Advanced search filters, broker directories, high-res photos/videos, market insights, and integration with other Boats Group sites. | High-end yachts, superyachts, sailboats, powerboats; strong in brokerage with professional listings. |
`;

// --- Real fixture: file 21, lines 87-89 (no name column; website is the
// identifier) ---
const FIXTURE_21_WEBSITE_ONLY = `
| Website | Description | Global Reach |
|---------|-------------|--------------|
| unitedyacht.com | World's largest yacht brokerage with 250+ brokers in 104 locations, focusing on sales and listings. | Worldwide (104 locations) |
`;

// --- Real fixture: file 21, lines 317 + 346 (same "Website|Description|
// Global Reach" table; fraseryachts.com is listed once with real data,
// then re-listed under a later category heading as an empty
// "(duplicate)" row) ---
const FIXTURE_21_DUPLICATE = `
| Website | Description | Global Reach |
|---------|-------------|--------------|
| fraseryachts.com | Leading luxury yacht brokerage for sales and charters. | Worldwide |
| hmy.com | Yacht sales and brokerage with multiple Florida locations. | USA/Global |
| fraseryachts.com (duplicate) | | |
| hmy.com (duplicate) | | |
`;

// --- Real fixture: file 21, line 941 (a full prose sentence abusing the
// Website-as-identifier column instead of a real URL) ---
const FIXTURE_21_PROSE_JUNK = `
| Website | Description | Global Reach/Location |
|---------|-------------|-----------------------|
| No significant non-.com charters found in Europe-specific search, but cross-referenced from brokers: breezeyachtingswiss.swiss (includes charters). | See above. | Switzerland/Global |
`;

// --- Synthetic fixture (HIGH 2b regression): a table that DOES have a
// recognized name column (company_name) plus a website column — a row
// with an empty/NA company_name must be SKIPPED, never fall back to
// minting a company node named after the raw URL. ---
const FIXTURE_SYNTHETIC_NAME_COLUMN_WITH_WEBSITE = `
| Company Name | Website | Description |
|--------------|---------|-------------|
| Real Broker Co | https://realbroker.example.com | A real, named brokerage. |
| Not available | https://should-not-become-a-name.example.com | Row with no real company name. |
`;

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'company-mapper-test-')), 'graph.db');
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

describe('mapCompanyTables — broker directory (real fixture: file 41 Monaco)', () => {
  let result;

  beforeEach(() => {
    const tables = parseTables(FIXTURE_41_BROKERS);
    result = mapCompanyTables(db, tables, '41_Comprehensive_Monaco_Yacht_Charter_Guide.md');
  });

  it('creates Company nodes, classifying kind as "broker" from the description text', () => {
    expect(result.companies).toBe(3);
    const edmiston = getNode('company:edmiston-and-company');
    expect(edmiston).not.toBeNull();
    expect(edmiston.type).toBe('company');
    expect(edmiston.attrs.kind).toBe('broker');
    expect(edmiston.attrs.address).toBe('57 rue Grimaldi, Monaco');
  });

  it('treats "Not available" as empty (not a literal address/phone value)', () => {
    const edmiston = getNode('company:edmiston-and-company');
    expect(edmiston.attrs.phone).toBeNull();
  });

  it('extracts phone from a combined Phone/Email/Website cell', () => {
    const iyc = getNode('company:iyc');
    expect(iyc.attrs.phone).toBe('+377 97982424');
    expect(iyc.attrs.kind).toBe('charter');
  });

  it('classifies kind as "management" when the description mentions management', () => {
    const med = getNode('company:med-yacht-services');
    expect(med.attrs.kind).toBe('management');
  });

  it('adds a BASED_IN edge to Monaco derived from the last comma segment of the address', () => {
    expect(edgeExists('company:edmiston-and-company', 'based_in', 'region:monaco')).toBe(true);
  });
});

describe('mapCompanyTables — platform comparison table (real fixture: file 21)', () => {
  it('classifies kind as "platform" when the identifier column is "Platform"', () => {
    const tables = parseTables(FIXTURE_21_PLATFORM);
    mapCompanyTables(db, tables, '21_Online_Yacht_Brokerage_Competitors_and_Innovations.md');

    const yachtworld = getNode('company:yachtworld-com');
    expect(yachtworld).not.toBeNull();
    expect(yachtworld.attrs.kind).toBe('platform');
    expect(yachtworld.attrs.locations).toMatch(/superyachts/);
  });
});

describe('mapCompanyTables — website-only identifier (real fixture: file 21)', () => {
  it('uses the website column itself as the company identifier when there is no name column', () => {
    const tables = parseTables(FIXTURE_21_WEBSITE_ONLY);
    const result = mapCompanyTables(db, tables, '21_Online_Yacht_Brokerage_Competitors_and_Innovations.md');

    expect(result.companies).toBe(1);
    const united = getNode('company:unitedyacht-com');
    expect(united).not.toBeNull();
    expect(united.attrs.locations).toBe('Worldwide (104 locations)');
    // No comma in "unitedyacht.com" to derive a region from -> no BASED_IN edge.
    expect(db.prepare("SELECT COUNT(*) AS count FROM edges WHERE src = 'company:unitedyacht-com'").get().count).toBe(
      0
    );
  });
});

// Regression (reviewer finding, MEDIUM 2): "fraseryachts.com (duplicate)"
// is the SAME real-world company re-listed under a later category heading
// with empty description/global_reach cells — it must merge into the
// original entry, not mint a second, separate, near-empty node.
describe('mapCompanyTables — "(duplicate)" suffix merges into the base entity (regression: MEDIUM 2)', () => {
  it('strips the "(duplicate)" suffix so both rows resolve to the same company id', () => {
    const tables = parseTables(FIXTURE_21_DUPLICATE);
    const result = mapCompanyTables(db, tables, '21_Online_Yacht_Brokerage_Competitors_and_Innovations.md');

    expect(result.companies).toBe(4); // 2 unique companies, processed twice each
    expect(countByType('company')).toBe(2); // fraseryachts.com + hmy.com only

    const fraser = getNode('company:fraseryachts-com');
    expect(fraser).not.toBeNull();
    expect(fraser.name).toBe('fraseryachts.com');
    // Real description survives; the empty "(duplicate)" row didn't wipe it.
    expect(fraser.attrs.notes).toBe('Leading luxury yacht brokerage for sales and charters.');
  });
});

// Regression (reviewer finding, MEDIUM 2): a full prose sentence abusing
// the Website-as-identifier column must not become a node name.
describe('mapCompanyTables — name-plausibility filter (regression: MEDIUM 2)', () => {
  it('rejects a prose-sentence "name" (> 80 chars / sentence punctuation) rather than creating a junk company', () => {
    const tables = parseTables(FIXTURE_21_PROSE_JUNK);
    const result = mapCompanyTables(db, tables, '21_Online_Yacht_Brokerage_Competitors_and_Innovations.md');

    expect(result.companies).toBe(0);
    expect(countByType('company')).toBe(0);
  });
});

// Regression (reviewer finding, HIGH 2b): never fall back to the website
// column as the node NAME when the table has a real name-like column —
// only when a row's own name cell is empty should it be skipped, not
// papered over with a raw URL.
describe('mapCompanyTables — website is never used as a name when a name column exists (regression: HIGH 2b)', () => {
  it('skips a row with an empty company_name instead of naming it after its website', () => {
    const tables = parseTables(FIXTURE_SYNTHETIC_NAME_COLUMN_WITH_WEBSITE);
    const result = mapCompanyTables(db, tables, 'synthetic-name-column-with-website.md');

    expect(result.companies).toBe(1);
    expect(getNode('company:real-broker-co')).not.toBeNull();
    expect(getNode('company:https-should-not-become-a-name-example-com')).toBeNull();
    expect(countByType('company')).toBe(1);
  });
});

describe('mapCompanyTables — schema guard', () => {
  it('skips a table with no name/company_name/platform/website identifier', () => {
    const tables = parseTables(`
| Category       | Length (Meters)     | Length (Feet)      |
|----------------|---------------------|--------------------|
| Superyacht     | 24–60m             | 79–197ft          |
`);
    const result = mapCompanyTables(db, tables, 'synthetic-off-schema.md');

    expect(result.skippedTables).toHaveLength(1);
    expect(result.companies).toBe(0);
    expect(countByType('company')).toBe(0);
  });
});

describe('mapCompanyTables — idempotency', () => {
  it('running twice over the same input yields identical node/edge counts', () => {
    const tables = parseTables(FIXTURE_41_BROKERS);
    mapCompanyTables(db, tables, '41_Comprehensive_Monaco_Yacht_Charter_Guide.md');
    const firstCompanies = countByType('company');
    const firstEdges = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;

    mapCompanyTables(db, tables, '41_Comprehensive_Monaco_Yacht_Charter_Guide.md');
    expect(countByType('company')).toBe(firstCompanies);
    expect(db.prepare('SELECT COUNT(*) AS count FROM edges').get().count).toBe(firstEdges);
  });
});

describe('module importability', () => {
  it('exposes mapCompanyTables as a named export', async () => {
    const mod = await import('../src/mappers/companyMapper.js');
    expect(typeof mod.mapCompanyTables).toBe('function');
  });
});
