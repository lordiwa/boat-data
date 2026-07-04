// ingest/tests/proseMapper.spec.js
//
// TASK-005: maps proseParser.js sheets into Marina/YachtClub/Person nodes.
// Fixtures reuse the same real corpus excerpts as proseParser.spec.js
// (files 17, 67, 74) plus synthetic sheets for the dedup/skip contract
// (built directly as { heading, locationHint, fields, startLine } objects,
// matching detectProseSheets' documented output shape — see
// proseParser.spec.js for proof the real corpus text actually produces
// sheets in this shape).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { detectProseSheets } from '../src/parsers/proseParser.js';
import { classifySheet, mapProseSheets } from '../src/mappers/proseMapper.js';

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'prose-mapper-test-')), 'graph.db');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
});

describe('classifySheet', () => {
  it('classifies a heading containing "Yacht Club" as club', () => {
    const sheet = { heading: 'Bradenton Yacht Club', locationHint: 'Palmetto, FL', fields: { founded: '1946' } };
    expect(classifySheet(sheet, undefined)).toBe('club');
  });

  it('classifies via a marina-specific field signal even without a keyword in the heading', () => {
    const sheet = { heading: 'Some Random Name', locationHint: null, fields: { travelift_tonnage: '50 ton' } };
    expect(classifySheet(sheet, undefined)).toBe('marina');
  });

  it('classifies a sheet with an owner field as person', () => {
    const sheet = { heading: 'Amadea', locationHint: 'Suleiman Kerimov', fields: { owner: 'Suleiman Kerimov, a billionaire' } };
    expect(classifySheet(sheet, undefined)).toBe('person');
  });

  it('uses typeHint as a tie-breaker only when the sheet has a field AND a real location', () => {
    const sheetWithRealLocation = { heading: 'Founding & Early Era', locationHint: 'Fort Lauderdale', fields: { founded: '1966' } };
    expect(classifySheet(sheetWithRealLocation, 'marina')).toBe('marina');

    // Regression lock (real corpus finding): a year-range locationHint must
    // NOT let the typeHint fallback fire — otherwise a generic historical
    // subheading with a stray "founded" match becomes a bogus marina.
    const sheetWithYearRange = { heading: 'Founding & Early Jacksonville Era', locationHint: '1885–1910s', fields: { founded: '1887' } };
    expect(classifySheet(sheetWithYearRange, 'marina')).toBe('unknown');
  });

  it('never uses typeHint for person (no ownership evidence at all otherwise)', () => {
    const sheet = { heading: 'Some Heading', locationHint: 'Miami', fields: { notes: 'just some notes' } };
    expect(classifySheet(sheet, 'person')).toBe('unknown');
  });

  it("treats sectionHint: 'marina' (file 55's directory-list shape) as authoritative", () => {
    const sheet = { heading: 'Bay of Islands Marina', locationHint: 'Opua, Northland', fields: {}, sectionHint: 'marina' };
    expect(classifySheet(sheet, undefined)).toBe('marina');
  });

  it('returns unknown for a sheet with no fields and no keyword/hint signal', () => {
    const sheet = { heading: 'Some Random Section', locationHint: null, fields: {} };
    expect(classifySheet(sheet, undefined)).toBe('unknown');
  });
});

describe('mapProseSheets — real excerpt: file 17 (marina)', () => {
  const FIXTURE_17_BRADFORD = `**GROK YACHT TERMINAL — BRADFORD MARINE (FORT LAUDERDALE) FULL DEEP DIVE**

**Contact & Booking**
- **Address**: 3051 West State Road 84, Fort Lauderdale, FL 33312
- **Dockage / Refit / Repair**: Tel: 954.791.3800 | service@bradford-marine.com | Fax: 954.583.8759
`;

  it('creates a marina node with a LOCATED_IN edge to the resolved region', () => {
    const sheets = detectProseSheets(FIXTURE_17_BRADFORD);
    const result = mapProseSheets(db, sheets, '17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md', 'marina');

    expect(result.marinas).toBe(1);
    expect(result.regions).toBe(1);
    expect(result.edges).toBeGreaterThanOrEqual(1);

    const node = db.prepare("SELECT * FROM nodes WHERE id = 'marina:bradford-marine'").get();
    expect(node).toBeDefined();
    expect(node.name).toBe('Bradford Marine');
    const attrs = JSON.parse(node.attrs_json);
    expect(attrs.address).toBe('3051 West State Road 84, Fort Lauderdale, FL 33312');
    expect(attrs.provenance).toEqual(['17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md']);

    const edge = db
      .prepare("SELECT * FROM edges WHERE src = 'marina:bradford-marine' AND rel = 'located_in'")
      .get();
    expect(edge).toBeDefined();
    expect(edge.dst).toBe('region:fort-lauderdale');
  });
});

describe('mapProseSheets — dedup against a Wave-A node (acceptance criterion 2)', () => {
  it('merges a prose marina sheet into an EXISTING Wave-A marina node with the same id, combining provenance', () => {
    // Simulates marinaMapper.js's own upsert for the same real-world marina
    // (same id convention: marina:<slug(normalizeName(name))>), as if a
    // Wave-A pipe table had already been ingested first.
    upsertNode(db, {
      id: 'marina:bradford-marine',
      type: 'marina',
      name: 'Bradford Marine',
      attrs: { established: { value: 1966, raw: '1966' }, provenance: ['16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md'] },
    });

    const sheets = [
      {
        heading: 'Bradford Marine',
        locationHint: 'Fort Lauderdale',
        fields: { address: '3051 West State Road 84, Fort Lauderdale, FL 33312' },
        startLine: 588,
      },
    ];

    const result = mapProseSheets(db, sheets, '17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md', 'marina');
    expect(result.marinas).toBe(1);

    const rows = db.prepare("SELECT * FROM nodes WHERE id = 'marina:bradford-marine'").all();
    expect(rows).toHaveLength(1); // one node, not two

    const attrs = JSON.parse(rows[0].attrs_json);
    expect(attrs.established.value).toBe(1966); // preserved from the Wave-A node
    expect(attrs.address).toBe('3051 West State Road 84, Fort Lauderdale, FL 33312'); // added by Wave-B
    expect(attrs.provenance).toEqual(
      expect.arrayContaining(['16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md', '17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md'])
    );
  });
});

describe('mapProseSheets — real excerpt: file 74 (person + conservative yacht-ownership linking)', () => {
  const FIXTURE_74_AMADEA = `1. **Amadea** (Suleiman Kerimov)
   - **Details**: 348 feet, valued at $300 million, seized in Fiji on May 5, 2022.
   - **Owner**: Suleiman Kerimov, a billionaire sanctioned for alleged money laundering.
`;

  it('creates the person node, and adds an OWNED_BY edge only when the yacht node already exists', () => {
    upsertNode(db, { id: 'yacht:amadea', type: 'yacht', name: 'Amadea' });

    const sheets = detectProseSheets(FIXTURE_74_AMADEA);
    const result = mapProseSheets(db, sheets, '74_Seized_Yachts_of_Russian_Oligarchs.md', 'person');

    expect(result.persons).toBe(1);
    const person = db.prepare("SELECT * FROM nodes WHERE id = 'person:suleiman-kerimov'").get();
    expect(person).toBeDefined();

    const edge = db.prepare("SELECT * FROM edges WHERE src = 'yacht:amadea' AND rel = 'owned_by'").get();
    expect(edge).toBeDefined();
    expect(edge.dst).toBe('person:suleiman-kerimov');
  });

  it('never creates a new yacht node from prose when the yacht does not already exist', () => {
    const sheets = detectProseSheets(FIXTURE_74_AMADEA);
    mapProseSheets(db, sheets, '74_Seized_Yachts_of_Russian_Oligarchs.md', 'person');

    const yachtNode = db.prepare("SELECT * FROM nodes WHERE id = 'yacht:amadea'").get();
    expect(yachtNode).toBeUndefined();

    const edge = db.prepare("SELECT * FROM edges WHERE rel = 'owned_by'").get();
    expect(edge).toBeUndefined();

    // The person is still created from the narrative even without a link.
    const person = db.prepare("SELECT * FROM nodes WHERE id = 'person:suleiman-kerimov'").get();
    expect(person).toBeDefined();
  });
});

describe('mapProseSheets — skipped report (acceptance criterion 3)', () => {
  it('reports an implausible (truncation-placeholder) heading rather than dropping it silently or guessing', () => {
    // Real fixture shape (see marinaMapper.spec.js's own MEDIUM-2 regression
    // lock): a corpus row that reads "... (5+ more like X, Y, Z)" instead
    // of a real entity name — isPlausibleEntityName (normalize.js, shared
    // with every Wave-A mapper) rejects it outright.
    const sheets = [
      { heading: '... (5+ more like Sivota, Paxos Gaios, Kyparissia)', locationHint: null, fields: { travelift_tonnage: '50 ton' }, startLine: 42 },
    ];
    const result = mapProseSheets(db, sheets, '35_Comprehensive_Greece_Yachting_Fixture.md', 'marina');

    expect(result.marinas).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({
      sourceFile: '35_Comprehensive_Greece_Yachting_Fixture.md',
      startLine: 42,
      heading: '... (5+ more like Sivota, Paxos Gaios, Kyparissia)',
    });
    expect(result.skipped[0].reason).toBeTruthy();
  });

  it('reports an unclassified sheet with no recognized fields', () => {
    const sheets = [{ heading: 'Some Random Section', locationHint: null, fields: {}, startLine: 7 }];
    const result = mapProseSheets(db, sheets, 'some_file.md', undefined);

    expect(result.skipped).toEqual([
      { sourceFile: 'some_file.md', startLine: 7, heading: 'Some Random Section', reason: 'no recognized fields' },
    ]);
  });
});

// MEDIUM 3 regression lock: real fixture, file 55 lines 404/484/491 — real
// yacht clubs ("Perth Flying Squadron Yacht Club", "Royal Brighton Yacht
// Club", "Sandringham Yacht Club") listed under the file's "### Marinas"
// section heading, so proseParser's directory-list scan tags them with
// sectionHint: 'marina'. Before this fix, sectionHint fired before
// CLUB_HEADING_RE in classifySheet, minting a SECOND, duplicate marina:
// node for a real-world entity that already existed (or would later exist)
// as a club: node — both nodes co-existed for the same club.
describe('classifySheet / mapProseSheets — Yacht Club heading wins over a marina sectionHint (MEDIUM 3)', () => {
  it('classifySheet: an explicit "Yacht Club" name overrides sectionHint: "marina"', () => {
    const sheet = {
      heading: 'Sandringham Yacht Club',
      locationHint: 'Sandringham',
      fields: {},
      sectionHint: 'marina',
    };
    expect(classifySheet(sheet, undefined)).toBe('club');
  });

  it('mapProseSheets: creates ONLY a club: node, never a duplicate marina: node, for a directory-list yacht club entry', () => {
    const sheets = [
      { heading: 'Sandringham Yacht Club', locationHint: 'Sandringham', fields: {}, startLine: 491, sectionHint: 'marina' },
    ];
    const result = mapProseSheets(db, sheets, '55_Pacific_Coast_Marinas_and_Boatyards_Guide.md', undefined);

    expect(result.clubs).toBe(1);
    expect(result.marinas).toBe(0);

    const clubNode = db.prepare("SELECT * FROM nodes WHERE id = 'club:sandringham-yacht-club'").get();
    expect(clubNode).toBeDefined();
    const marinaNode = db.prepare("SELECT * FROM nodes WHERE id = 'marina:sandringham-yacht-club'").get();
    expect(marinaNode).toBeUndefined();
  });

  it('merges into an EXISTING club: node with the same slug rather than creating a duplicate', () => {
    upsertNode(db, {
      id: 'club:royal-brighton-yacht-club',
      type: 'club',
      name: 'Royal Brighton Yacht Club',
      attrs: { founded: { value: 1904, raw: '1904' }, provenance: ['some_other_file.md'] },
    });

    const sheets = [
      { heading: 'Royal Brighton Yacht Club', locationHint: 'Middle Brighton', fields: {}, startLine: 484, sectionHint: 'marina' },
    ];
    mapProseSheets(db, sheets, '55_Pacific_Coast_Marinas_and_Boatyards_Guide.md', undefined);

    const rows = db.prepare("SELECT * FROM nodes WHERE id = 'club:royal-brighton-yacht-club'").all();
    expect(rows).toHaveLength(1);
    const attrs = JSON.parse(rows[0].attrs_json);
    expect(attrs.founded.value).toBe(1904); // preserved from the existing node
    expect(attrs.provenance).toEqual(
      expect.arrayContaining(['some_other_file.md', '55_Pacific_Coast_Marinas_and_Boatyards_Guide.md'])
    );

    const marinaNode = db.prepare("SELECT * FROM nodes WHERE id = 'marina:royal-brighton-yacht-club'").get();
    expect(marinaNode).toBeUndefined();
  });
});
