// ingest/tests/tableParser.spec.js
//
// TASK-002: markdown table parser with header validation. Fixtures below
// are real excerpts copied verbatim from two files in /knowledge so tests
// stay grounded in the actual Grok-export format without depending on the
// full 9MB corpus:
//   - 42_Monaco_Yacht_Show_Key_Players_Charters.md (gold-standard 9-col
//     yacht/charter table, plus a second, differently-shaped table further
//     down the same file)
//   - 20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md (10-col
//     yacht/owner/builder table)

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseTables,
  parseFile,
  normalizeHeader,
  tableMatchesSchema,
} from '../src/parsers/tableParser.js';

// --- Real fixture: file 42, main Monaco charter-yacht table (lines 38-44) ---
const FIXTURE_42_MAIN = `
### Featured Charter Yachts and Rentals

| Yacht Name | Builder | Length (m/ft) | Year (Delivery/Refit) | Weekly Rate (EUR/USD) | Guests/Crew | Key Features | Big Player/Charter Company | Source Citation |
|------------|---------|---------------|-------------------------------|-----------------------|-------------|--------------|----------------------------|-----------------|
| Breakthrough | Feadship | 118.8/390 | 2025 | €3,500,000+ | 12/46 | World's first hydrogen superyacht; infinity pool, 14 balconies, hair salon, RYA water sports center. Largest at MYS 2025. | Various (e.g., BOAT International) |  |
| Gigia | Lürssen | 85/279 | 2005/2024 | Not specified (high-end) | 12/NA | Northern European craftsmanship; contemporary refit; largest charter at MYS 2025 anchor. | YachtCharterFleet |  |
| Alfa Nero | Oceanco | 81/266 | 2007 | Not specified | 12/NA | Iconic design; at anchor during MYS. | YachtCharterFleet |  |
| Alfa G | Oceanco | 60/197 | 2024 | Not specified | NA | Timeless sophistication; 2024 refit. | YachtCharterFleet |  |
| O'Madeleine | Golden Yachts | 60/197 | 2025 | Not specified | NA | Sleek debut at MYS; indulgent Riviera escapes. | YachtCharterFleet |  |
`;

// --- Real fixture: file 42, second (differently-shaped) table further down
// the same file (lines 98-102), used to test multi-table extraction and
// unknown-header slugging ("Builder/Year", "Guests/Crew", "Features"). ---
const FIXTURE_42_SECOND = `
| Yacht Name | Length | Builder/Year | Weekly Rate | Guests/Crew | Features |
|------------|---------|--------------|-------------|-------------|----------|
| BREAKTHROUGH | 118.8m | Feadship/2025 | €3,500,000 | 12/46 | Hydrogen-powered, infinity pool, 14 balconies |
| HERE COMES THE SUN | 89m | Amels/2017 (refit 2021) | €165,000,000 (sale) | 12/30 | 6m extension, custom interiors |
| BOARDWALK | 77m | Feadship/2021 | N/A | 12/NA | Resort-style comfort, elegant design |
`;

const FIXTURE_42_MULTI = `${FIXTURE_42_MAIN}\n${FIXTURE_42_SECOND}`;

// --- Real fixture: file 20, first Grok table (lines 14-19) ---
const FIXTURE_20_MAIN = `
| Yacht Name | Owner | Net Worth | Length | Builder | Year | Estimated Value | Annual Running Cost | Key Features | Personal Website |
|------------|--------|-----------|--------|---------|------|-------------------|--------------------------|--------------|------------------|
| Big Data | Unknown | N/A | 16.15 m (53 ft) | Beneteau | Unknown | Unknown | Unknown | Modern and comfortable interior with wooden elements, ample storage, bright open saloon including dining table and relaxation area with sofa; available for charter in the Mediterranean for racing, tourism, groups, promotions, and photo sessions. | [bigdatayacht.com](https://bigdatayacht.com) |
| Dilbar | Alisher Usmanov (legally owned by sister Gulbahor Ismailova) | $18.4 billion | 156 m (511 ft) | Lurssen | 2016 | $800 million | $50-80 million | Largest indoor pool on a yacht (25m long); swimming pool; helicopter pad; custom Airbus H175 helicopter tender; Venetian Aft Helm Limo, Chase 31, and Chase Tender; steel hull, aluminum superstructure; 6,000 nm range; seized in 2022 due to sanctions. | None mentioned |
| Azzam | Mohammed bin Zayed Al Nahyan | N/A | 180 m (590 ft) | Lurssen | 2013 | $600 million | $50-75 million | Bullet-proof master suite; sophisticated missile defense system; rumored submarine; shallow draft for high speed; Empire style interior; two gas turbines and two diesel engines (94,000 hp). | None mentioned |
| Eclipse | Roman Abramovich | N/A | 162 m (533 ft) | Blohm + Voss | 2010 | $700 million | $50-70 million | Two helipads; swimming pool; mini-submarine; missile detection system; anti-paparazzi laser system; dance floor; exterior fireplace; two swimming pools; hybrid propulsion; refitted in 2015. | None mentioned |
`;

describe('parseTables — real fixture: file 42 (Monaco charter table)', () => {
  const tables = parseTables(FIXTURE_42_MAIN);

  it('extracts exactly one table', () => {
    expect(tables).toHaveLength(1);
  });

  it('returns the raw headers as found in the markdown', () => {
    expect(tables[0].headers).toEqual([
      'Yacht Name',
      'Builder',
      'Length (m/ft)',
      'Year (Delivery/Refit)',
      'Weekly Rate (EUR/USD)',
      'Guests/Crew',
      'Key Features',
      'Big Player/Charter Company',
      'Source Citation',
    ]);
  });

  it('normalizes known aliases to canonical snake_case keys', () => {
    expect(tables[0].normalizedHeaders[0]).toBe('name');
    expect(tables[0].normalizedHeaders[1]).toBe('builder');
    expect(tables[0].normalizedHeaders[2]).toBe('loa');
    expect(tables[0].normalizedHeaders[3]).toBe('year');
    expect(tables[0].normalizedHeaders[4]).toBe('weekly_rate');
  });

  it('preserves unknown headers as normalized snake_case slugs instead of dropping them', () => {
    // "Guests/Crew", "Key Features", "Big Player/Charter Company", "Source
    // Citation" are not in the canonical alias list — must survive as slugs.
    expect(tables[0].normalizedHeaders.slice(5)).toEqual([
      'guests_crew',
      'key_features',
      'big_player_charter_company',
      'source_citation',
    ]);
  });

  it('returns 5 rows keyed by normalized header', () => {
    expect(tables[0].rows).toHaveLength(5);
    expect(tables[0].rows[0]).toMatchObject({
      name: 'Breakthrough',
      builder: 'Feadship',
      loa: '118.8/390',
      year: '2025',
      weekly_rate: '€3,500,000+',
      guests_crew: '12/46',
    });
    expect(tables[0].rows[4]).toMatchObject({
      name: "O'Madeleine",
      builder: 'Golden Yachts',
      loa: '60/197',
      year: '2025',
    });
  });

  it('handles the real blank trailing cell (Source Citation is empty for every row)', () => {
    for (const row of tables[0].rows) {
      expect(row.source_citation).toBe('');
    }
  });
});

describe('parseTables — real fixture: file 42, two tables in one document', () => {
  const tables = parseTables(FIXTURE_42_MULTI);

  it('returns one table object per pipe table found (2 tables)', () => {
    expect(tables).toHaveLength(2);
    expect(tables[0].rows).toHaveLength(5);
    expect(tables[1].rows).toHaveLength(3);
  });

  it('slugs unknown compound headers from the second table ("Builder/Year", "Guests/Crew", "Features")', () => {
    expect(tables[1].normalizedHeaders).toEqual([
      'name',
      'loa',
      'builder_year',
      'weekly_rate',
      'guests_crew',
      'features',
    ]);
  });

  it('reads correct sample values from the second table', () => {
    expect(tables[1].rows[1]).toMatchObject({
      name: 'HERE COMES THE SUN',
      loa: '89m',
      builder_year: 'Amels/2017 (refit 2021)',
      weekly_rate: '€165,000,000 (sale)',
    });
  });
});

describe('parseTables — real fixture: file 20 (mega yachts w/ personal websites)', () => {
  const tables = parseTables(FIXTURE_20_MAIN);

  it('extracts exactly one table with 10 headers and 4 rows', () => {
    expect(tables).toHaveLength(1);
    expect(tables[0].headers).toHaveLength(10);
    expect(tables[0].rows).toHaveLength(4);
  });

  it('normalizes the known columns and slugs the unknown ones', () => {
    expect(tables[0].normalizedHeaders).toEqual([
      'name',
      'owner',
      'net_worth',
      'loa',
      'builder',
      'year',
      'estimated_value',
      'annual_running_cost',
      'key_features',
      'personal_website',
    ]);
  });

  it('reads correct sample field values, including a value containing a markdown link', () => {
    expect(tables[0].rows[0]).toMatchObject({
      name: 'Big Data',
      owner: 'Unknown',
      builder: 'Beneteau',
      loa: '16.15 m (53 ft)',
      personal_website: '[bigdatayacht.com](https://bigdatayacht.com)',
    });
    expect(tables[0].rows[1]).toMatchObject({
      name: 'Dilbar',
      owner: 'Alisher Usmanov (legally owned by sister Gulbahor Ismailova)',
      net_worth: '$18.4 billion',
      loa: '156 m (511 ft)',
      builder: 'Lurssen',
      year: '2016',
    });
  });
});

describe('normalizeHeader — required alias mappings', () => {
  it('maps every required alias to its canonical snake_case key', () => {
    const cases = {
      'Yacht Name': 'name',
      Name: 'name',
      Vessel: 'name',
      Builder: 'builder',
      Shipyard: 'builder',
      Yard: 'builder',
      LOA: 'loa',
      Length: 'loa',
      'Length (m)': 'loa',
      'Length (m/ft)': 'loa',
      'LOA (m)': 'loa',
      Beam: 'beam',
      Year: 'year',
      'Year Built': 'year',
      Built: 'year',
      Delivered: 'year',
      'Year Delivered': 'year',
      Owner: 'owner',
      'Weekly Rate': 'weekly_rate',
      Rate: 'weekly_rate',
      'Price/Week': 'weekly_rate',
      'Weekly Charter Rate': 'weekly_rate',
      Guests: 'guests',
      Cabins: 'cabins',
      Crew: 'crew',
      Designer: 'designer',
      Region: 'region',
      Location: 'region',
      Country: 'region',
      Source: 'source',
    };
    for (const [raw, expected] of Object.entries(cases)) {
      expect(normalizeHeader(raw)).toBe(expected);
    }
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(normalizeHeader('  yacht name  ')).toBe('name');
    expect(normalizeHeader('BUILDER')).toBe('builder');
    expect(normalizeHeader('  Owner')).toBe('owner');
  });

  it('strips markdown bold/backtick formatting before matching', () => {
    expect(normalizeHeader('**Yacht Name**')).toBe('name');
    expect(normalizeHeader('`Builder`')).toBe('builder');
    expect(normalizeHeader('**`Owner`**')).toBe('owner');
  });

  it('preserves an unknown header as a normalized snake_case slug rather than dropping it', () => {
    expect(normalizeHeader('Net Worth (Owner)')).toBe('net_worth_owner');
    expect(normalizeHeader('Personal Website')).toBe('personal_website');
  });
});

describe('parseTables — full alias sweep in a single synthetic table', () => {
  const markdown = `
| Yacht Name | Shipyard | LOA (m) | Beam | Year Built | Owner | Price/Week | Guests | Cabins | Crew | Designer | Country | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Test | TestYard | 50 | 10 | 2020 | Jane | 100000 | 12 | 6 | 10 | Jon Bannenberg | Monaco | TestSource |
`;
  const tables = parseTables(markdown);

  it('normalizes every column to its canonical key in one pass', () => {
    expect(tables[0].normalizedHeaders).toEqual([
      'name',
      'builder',
      'loa',
      'beam',
      'year',
      'owner',
      'weekly_rate',
      'guests',
      'cabins',
      'crew',
      'designer',
      'region',
      'source',
    ]);
  });

  it('rows are keyed by the normalized headers', () => {
    expect(tables[0].rows[0]).toEqual({
      name: 'Test',
      builder: 'TestYard',
      loa: '50',
      beam: '10',
      year: '2020',
      owner: 'Jane',
      weekly_rate: '100000',
      guests: '12',
      cabins: '6',
      crew: '10',
      designer: 'Jon Bannenberg',
      region: 'Monaco',
      source: 'TestSource',
    });
  });
});

describe('parseTables — column-collision dedup', () => {
  it('keeps both columns with distinct keys and no value loss when two headers normalize to the same key', () => {
    const markdown = '| Year | Built |\n|--|--|\n| 2020 | 2021 |\n';
    const tables = parseTables(markdown);
    expect(tables[0].normalizedHeaders).toEqual(['year', 'year_2']);
    expect(tables[0].rows[0]).toEqual({ year: '2020', year_2: '2021' });
  });
});

describe('parseTables — separator-required guard (false-positive protection)', () => {
  it('does not parse a pipe-bearing prose line as a table when no |---| separator row follows', () => {
    const tables = parseTables('Pick option A | option B | option C for lunch.');
    expect(tables).toHaveLength(0);
  });
});

describe('parseTables — robustness edge cases', () => {
  it('unescapes an escaped pipe (\\|) inside a cell rather than splitting on it', () => {
    const markdown = `
| Name | Note |
|------|------|
| Foo | Bar \\| Baz |
`;
    const tables = parseTables(markdown);
    expect(tables).toHaveLength(1);
    expect(tables[0].rows).toHaveLength(1);
    expect(tables[0].rows[0]).toEqual({ name: 'Foo', note: 'Bar | Baz' });
  });

  it('pads a ragged row (fewer cells than headers) with empty strings rather than throwing', () => {
    const markdown = `
| A | B | C |
|---|---|---|
| 1 | 2 |
`;
    expect(() => parseTables(markdown)).not.toThrow();
    const tables = parseTables(markdown);
    expect(tables[0].rows[0]).toEqual({ a: '1', b: '2', c: '' });
  });

  it('handles blank/empty cells without throwing', () => {
    const markdown = `
| A | B | C |
|---|---|---|
| 1 |  | 3 |
`;
    const tables = parseTables(markdown);
    expect(tables[0].rows[0]).toEqual({ a: '1', b: '', c: '3' });
  });

  it('parses tables whose rows omit leading/trailing pipes', () => {
    const markdown = `
A | B
---|---
1 | 2
3 | 4
`;
    const tables = parseTables(markdown);
    expect(tables).toHaveLength(1);
    expect(tables[0].normalizedHeaders).toEqual(['a', 'b']);
    expect(tables[0].rows).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('returns an empty array for markdown with zero pipe tables, without throwing', () => {
    const markdown = `
# Just a heading

Some prose with no tables at all. Maybe a stray - dash - but no pipes.
`;
    expect(() => parseTables(markdown)).not.toThrow();
    expect(parseTables(markdown)).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseTables('')).toEqual([]);
  });
});

describe('tableMatchesSchema', () => {
  it('returns true when all required keys are present among the normalized headers', () => {
    const [table] = parseTables(FIXTURE_42_MAIN);
    expect(tableMatchesSchema(table, ['name', 'builder', 'loa'])).toBe(true);
  });

  it('returns false when a required key is missing, guarding against filename-lying tables', () => {
    // e.g. a file named like a yacht-data scrape that actually opens with an
    // unrelated salary/position table (as file 62_*.md does in the corpus).
    const salaryMarkdown = `
| Position | Salary |
|----------|--------|
| Captain  | 90000  |
`;
    const [salaryTable] = parseTables(salaryMarkdown);
    expect(tableMatchesSchema(salaryTable, ['name', 'builder'])).toBe(false);
    // The unknown headers are still preserved (not dropped), so a caller
    // can validate against them explicitly instead.
    expect(tableMatchesSchema(salaryTable, ['position', 'salary'])).toBe(true);
  });
});

describe('parseFile', () => {
  let tmpDir;
  let filePath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'table-parser-test-'));
    filePath = path.join(tmpDir, 'fixture.md');
    fs.writeFileSync(filePath, FIXTURE_20_MAIN, 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads a file from disk and returns the same result as parseTables on its contents', () => {
    const fromFile = parseFile(filePath);
    const fromString = parseTables(FIXTURE_20_MAIN);
    expect(fromFile).toEqual(fromString);
  });
});

describe('module importability', () => {
  it('exposes parseTables, parseFile, normalizeHeader, tableMatchesSchema as named exports', async () => {
    const mod = await import('../src/parsers/tableParser.js');
    expect(typeof mod.parseTables).toBe('function');
    expect(typeof mod.parseFile).toBe('function');
    expect(typeof mod.normalizeHeader).toBe('function');
    expect(typeof mod.tableMatchesSchema).toBe('function');
  });
});
