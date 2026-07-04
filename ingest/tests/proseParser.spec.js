// ingest/tests/proseParser.spec.js
//
// TASK-005: prose data-sheet extractor (Wave B). Fixtures are real excerpts
// copied verbatim from the /knowledge corpus:
//   - 67_First_Yacht_Club_in_Florida_History_and_Impact.md, line 119
//     (a club heading + narrative paragraph, no labeled bullets at all —
//     "founded"/"located at" are extracted via PROSE_PATTERNS regex).
//   - 17_Oldest_Real_Deal_Yacht_Haul_Out_Marinas.md, lines 588-611
//     (the "GROK YACHT TERMINAL — BRADFORD MARINE (FORT LAUDERDALE) FULL
//     DEEP DIVE" heading + its "**Contact & Booking**" labeled-bullet
//     cluster).
//   - 15_Billionaire_Superyacht_Owners_and_Dataset.md, lines 12-20 (a plain,
//     non-bold "Name — Name2" bullet heading followed by plain "* Label:
//     value" bullets).
//   - 74_Seized_Yachts_of_Russian_Oligarchs.md, lines 40-44 (a numbered
//     bold heading with an owner parenthetical, plus bold-bulleted fields).
//   - 55_Pacific_Coast_Marinas_and_Boatyards_Guide.md, lines 669-670 and
//     720-721 (the flat "### Marinas"/"### Boatyards" directory-list shape
//     with no per-entry heading at all), plus line 404/484/491 (real yacht
//     clubs listed under a "### Marinas" section) and line 844 ("Avi Avi
//     Marina Boatyard - (1000-ton slipway)", an entry with NO location at
//     all before its parenthetical).
//   - 16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md, lines 105-156 (a
//     "## Grok" turn opening with an inline-bold entity name, followed by a
//     generic "### Key Differentiating Equipment & Haul-Out Capabilities"
//     subheading whose own labeled bullets belong to that entity, not to
//     the subheading itself — the MEDIUM-2 regression fix).
//
// TASK-005 fast-follow (post-review MEDIUM 1/2/3 fixes):
//   MEDIUM 1 — street-address-without-house-number region rejection
//     (isRealLocationHint / resolveLocationHint) and the directory-scan
//     rest-string-starting-with-'(' bug.
//   MEDIUM 2 — generic markdown subheadings ("### Marina", "### Rates",
//     "### Dockage & Facilities") are now transparent (not their own bogus
//     entity, and don't close the enclosing one), so their fields fall
//     through to the real, nearest-preceding entity heading.
//   MEDIUM 3 — see proseMapper.spec.js: a "Yacht Club" heading listed under
//     file 55's "### Marinas" section classifies as club, not marina.

import { describe, it, expect } from 'vitest';
import {
  detectProseSheets,
  matchFieldLine,
  maskTableLines,
  FIELD_PATTERNS,
  isRealLocationHint,
  resolveLocationHint,
} from '../src/parsers/proseParser.js';

describe('FIELD_PATTERNS', () => {
  it('is documented and extensible: every canonical field maps to at least one alias', () => {
    for (const [field, aliases] of Object.entries(FIELD_PATTERNS)) {
      expect(Array.isArray(aliases)).toBe(true);
      expect(aliases.length).toBeGreaterThan(0);
      expect(typeof field).toBe('string');
    }
  });
});

describe('matchFieldLine', () => {
  it('matches a bold-bulleted "Label: value" line and canonicalizes a known alias', () => {
    const result = matchFieldLine('- **Address**: 3051 West State Road 84, Fort Lauderdale, FL 33312');
    expect(result).toEqual({
      label: 'Address',
      canonical: 'address',
      value: '3051 West State Road 84, Fort Lauderdale, FL 33312',
    });
  });

  it('matches a bold, non-bulleted "Label: value" line', () => {
    const result = matchFieldLine('**Founded**: 1966');
    expect(result.canonical).toBe('founded');
    expect(result.value).toBe('1966');
  });

  it('matches a plain (non-bold) bulleted line only for a KNOWN alias', () => {
    const known = matchFieldLine('* Owner: Jeff Bezos (Amazon founder)');
    expect(known.canonical).toBe('owner');
    expect(known.value).toBe('Jeff Bezos (Amazon founder)');

    // An unrecognized plain label is not trusted as a field line at all —
    // without a bold marker, a random "Word: sentence" line elsewhere in
    // the corpus is too likely to be a false positive.
    const unknown = matchFieldLine('* Vibe: pretty great honestly');
    expect(unknown).toBeNull();
  });

  it('returns null for an ordinary prose line', () => {
    expect(matchFieldLine('Just a regular sentence about a marina.')).toBeNull();
  });
});

describe('maskTableLines', () => {
  it('masks a markdown pipe table (header + separator + rows) but not surrounding prose', () => {
    const lines = [
      '## Some Yacht Club (Somewhere, FL)',
      '',
      '| Yacht Name | Owner |',
      '|------------|--------|',
      '| Big Data | Unknown |',
      '',
      'Founded in 1950, this club is great.',
    ];
    const masked = maskTableLines(lines);
    expect(masked.has(2)).toBe(true);
    expect(masked.has(3)).toBe(true);
    expect(masked.has(4)).toBe(true);
    expect(masked.has(0)).toBe(false);
    expect(masked.has(6)).toBe(false);
  });
});

describe('detectProseSheets — real excerpt: file 67 (club heading + narrative paragraph)', () => {
  const FIXTURE_67_BRADENTON = `## Bradenton Yacht Club (Palmetto, FL)
Located at 4307 Snead Island Road, Palmetto, the Bradenton Yacht Club (BYC) is a gem on the Manatee River, founded in 1946. Its 140-slip marina accommodates vessels up to 70 feet, with excellent dockage facilities. The club boasts a vibrant social scene, with a dining room serving coastal cuisine and a tiki bar for casual vibes. Members praise the friendly atmosphere and competitive pricing compared to other Southwest Florida clubs. BYC hosts regattas and fishing tournaments, making it a hub for boating enthusiasts.

## Clearwater Yacht Club (Clearwater, FL)
Situated at 830 S. Bayway Blvd, the Clearwater Yacht Club (CYC), founded in 1911, is a family-oriented club overlooking Clearwater Bay.
`;

  it('extracts the club name, location, founding year, and address from a pure-narrative section', () => {
    const sheets = detectProseSheets(FIXTURE_67_BRADENTON);
    const bradenton = sheets.find((s) => s.heading === 'Bradenton Yacht Club');

    expect(bradenton).toBeDefined();
    expect(bradenton.locationHint).toBe('Palmetto, FL');
    expect(bradenton.fields.founded).toBe('1946');
    expect(bradenton.fields.address).toBe('4307 Snead Island Road, Palmetto');
  });

  it('bounds each club heading to its own section (does not bleed into the next club)', () => {
    const sheets = detectProseSheets(FIXTURE_67_BRADENTON);
    const clearwater = sheets.find((s) => s.heading === 'Clearwater Yacht Club');

    expect(clearwater).toBeDefined();
    expect(clearwater.fields.founded).toBe('1911');
    // Clearwater's own text never mentions Palmetto's street address.
    expect(clearwater.fields.address).toBeUndefined();
  });
});

describe('detectProseSheets — real excerpt: file 17 (GROK boilerplate heading + labeled-bullet cluster)', () => {
  const FIXTURE_17_BRADFORD = `**GROK YACHT TERMINAL — BRADFORD MARINE (FORT LAUDERDALE) FULL DEEP DIVE**
*(Live March 2026 data scrape: official site + cross-verified directories.)*

**History & Legacy**
Founded in 1966 as a family-owned operation, Bradford Marine has evolved into a premier full-service facility.

**Services Overview**
- **Haul/Block/Launch**: Synchrolift + Travelift combos with full bottom prep.
- **Repairs & Refits**: Complete from minor maintenance to full custom projects.

**Contact & Booking**
- **Address**: 3051 West State Road 84, Fort Lauderdale, FL 33312
- **Dockage / Refit / Repair**: Tel: 954.791.3800 | service@bradford-marine.com | Fax: 954.583.8759

**Unique Selling Points**
Massive covered space + in-house everything reduces timelines and costs.
`;

  it('resolves the marina name and location out of the GROK boilerplate heading (stripping the DEEP DIVE suffix)', () => {
    const sheets = detectProseSheets(FIXTURE_17_BRADFORD);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].heading).toBe('Bradford Marine');
    expect(sheets[0].locationHint).toBe('Fort Lauderdale');
  });

  it('collects labeled-bullet fields from every generic sub-section within the same entity section', () => {
    const sheets = detectProseSheets(FIXTURE_17_BRADFORD);
    const [sheet] = sheets;

    expect(sheet.fields.address).toBe('3051 West State Road 84, Fort Lauderdale, FL 33312');
    // Falls back to the prose-pattern "founded in <year>" match, since
    // "Founded in 1966..." here is a narrative sentence, not its own
    // labeled bullet.
    expect(sheet.fields.founded).toBe('1966');
  });
});

describe('detectProseSheets — real excerpt: file 15 (plain bullet "Owner — Yacht" heading)', () => {
  const FIXTURE_15_BEZOS = `* Jeff Bezos — Koru

* Owner: Jeff Bezos (Amazon founder)

* Yacht: Koru — 127 m sailing superyacht

* Flag/Homeport: Cayman Islands

* Builder: Oceanco

* Original Cost: ~US$ 500 million
`;

  it('opens a section from the plain "Name — Name2" bullet heading once labeled fields confirm it', () => {
    const sheets = detectProseSheets(FIXTURE_15_BEZOS);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].heading).toBe('Jeff Bezos');
    expect(sheets[0].fields.owner).toBe('Jeff Bezos (Amazon founder)');
    expect(sheets[0].fields.yacht_name).toBe('Koru — 127 m sailing superyacht');
    expect(sheets[0].fields.builder).toBe('Oceanco');
  });

  it('does not open a section for a coincidental "Capitalized — Capitalized" line with no labeled fields after it', () => {
    const sheets = detectProseSheets('* Fort Lauderdale — Marina\n\nJust some unrelated prose.\n');
    expect(sheets).toHaveLength(0);
  });
});

describe('detectProseSheets — real excerpt: file 74 (numbered bold heading with owner parenthetical)', () => {
  const FIXTURE_74_AMADEA = `1. **Amadea** (Suleiman Kerimov)
   - **Details**: 348 feet, valued at $300 million, seized in Fiji on May 5, 2022, pursuant to a U.S. warrant.
   - **Owner**: Suleiman Kerimov, a billionaire sanctioned for alleged money laundering and ties to the Russian government.
   - **Status**: Docked in the U.S. (Honolulu, Hawaii, as of 2022), costing U.S. taxpayers over $7 million annually to maintain.

2. **Sailing Yacht A** (Andrey Melnichenko)
   - **Details**: 469 feet, valued at $440-578 million, seized in Trieste, Italy, on March 11, 2022.
   - **Owner**: Andrey Melnichenko, a fertilizer and coal magnate, sanctioned by the EU.
`;

  it('extracts the yacht name (heading) and owner field for each numbered entry', () => {
    const sheets = detectProseSheets(FIXTURE_74_AMADEA);
    const amadea = sheets.find((s) => s.heading === 'Amadea');

    expect(amadea).toBeDefined();
    expect(amadea.locationHint).toBe('Suleiman Kerimov');
    expect(amadea.fields.owner).toContain('Suleiman Kerimov');
    expect(amadea.fields.notes).toContain('348 feet');
  });

  it('bounds each numbered entry to its own section', () => {
    const sheets = detectProseSheets(FIXTURE_74_AMADEA);
    const sailingYachtA = sheets.find((s) => s.heading === 'Sailing Yacht A');

    expect(sailingYachtA).toBeDefined();
    expect(sailingYachtA.fields.owner).toContain('Andrey Melnichenko');
    expect(sailingYachtA.fields.owner).not.toContain('Kerimov');
  });
});

describe('detectProseSheets — real excerpt: file 55 (flat marina/boatyard directory list)', () => {
  const FIXTURE_55_DIRECTORY = `## New Zealand

### Marinas
- **Bay of Islands Marina** - Opua, Northland
- **Gulf Harbour Marina** - Whangaparaoa, Auckland

### Boatyards
- **Babcock (NZ) Ltd** - Devonport, Auckland (dry-dock, haulout; capacity: 160m length, 22m beam, 7.5m draft, 10,000 tonnage)
- **Doug's Opua Boatyard** - Opua, Northland (haulout; capacity: 14m length, 6.2m beam, 16m draft)
`;

  it('extracts a plain "Name - City" directory entry with no other fields as its own marina sheet', () => {
    const sheets = detectProseSheets(FIXTURE_55_DIRECTORY);
    const bayOfIslands = sheets.find((s) => s.heading === 'Bay of Islands Marina');

    expect(bayOfIslands).toBeDefined();
    expect(bayOfIslands.locationHint).toBe('Opua, Northland');
    expect(bayOfIslands.sectionHint).toBe('marina');
  });

  it('extracts inline capacity data from a directory entry\'s trailing parenthetical', () => {
    const sheets = detectProseSheets(FIXTURE_55_DIRECTORY);
    const babcock = sheets.find((s) => s.heading === 'Babcock (NZ) Ltd');

    expect(babcock).toBeDefined();
    expect(babcock.locationHint).toBe('Devonport, Auckland');
    expect(babcock.fields.max_loa).toBe('160m');
    expect(babcock.fields.travelift_tonnage).toContain('10,000');
  });

  it('does not scan directory-list entries outside a "Marinas"/"Boatyards" section', () => {
    const outside = `## New Zealand

- **Not A Real Entry** - Somewhere
`;
    const sheets = detectProseSheets(outside);
    expect(sheets.find((s) => s.heading === 'Not A Real Entry')).toBeUndefined();
  });
});

describe('isRealLocationHint', () => {
  it('rejects a bare year or decade range', () => {
    expect(isRealLocationHint('1907–1926')).toBe(false);
    expect(isRealLocationHint('1885–1910s')).toBe(false);
  });

  it('rejects report-boilerplate vocabulary', () => {
    expect(isRealLocationHint('Top Verified + Scraped')).toBe(false);
    expect(isRealLocationHint('REDO + DOUBLE-CHECKED — LIVE MARCH 2026')).toBe(false);
  });

  it('rejects a leading-digit street address fragment', () => {
    expect(isRealLocationHint('578 Royal Esplanade, Manly')).toBe(false);
  });

  it('accepts a real place name', () => {
    expect(isRealLocationHint('Palmetto, FL')).toBe(true);
    expect(isRealLocationHint('Fort Lauderdale')).toBe(true);
  });
});

// MEDIUM 1 regression lock: real fixtures, file 55's AU/NZ marina
// directory, whose locations are frequently a bare street name (no house
// number) rather than a full address or a plain city.
describe('resolveLocationHint — street address without a house number (MEDIUM 1)', () => {
  it('extracts the suburb after the last comma instead of rejecting the whole hint', () => {
    expect(resolveLocationHint('Marina Drive, Ascot')).toBe('Ascot');
    expect(resolveLocationHint('Petra Street, East Fremantle')).toBe('East Fremantle');
    expect(resolveLocationHint('The Esplanade, Esperance')).toBe('Esperance');
    // Multi-segment: the street-suffix word can be in an EARLIER segment
    // than the real suburb — always take the LAST comma segment.
    expect(resolveLocationHint('Challenger Harbour, Mews Road, Fremantle')).toBe('Fremantle');
  });

  it('is reflected in isRealLocationHint (still real location evidence, just needs cleanup)', () => {
    expect(isRealLocationHint('Marina Drive, Ascot')).toBe(true);
  });

  it('still rejects a full, leading-digit street address outright', () => {
    expect(resolveLocationHint('578 Royal Esplanade, Manly')).toBeNull();
  });

  it('rejects when nothing plausible remains after the street suffix (no real suburb)', () => {
    expect(resolveLocationHint('Marina Drive, Rd')).toBeNull();
  });

  it('leaves an ordinary "City, ST" hint untouched (no street-suffix word present)', () => {
    expect(resolveLocationHint('Newport, Rhode Island')).toBe('Newport, Rhode Island');
  });
});

// MEDIUM 1 regression lock: real fixture, file 55 line 844 ("- Avi Avi
// Marina Boatyard - (1000-ton slipway)") — a directory entry whose "rest"
// is ENTIRELY parenthetical, with nothing before the '(' at all.
describe('detectProseSheets — directory entry with no location before its parenthetical (MEDIUM 1)', () => {
  it('captures the capacity info without minting a bogus "(1000-ton slipway)" location', () => {
    const fixture = `### Boatyards
- Avi Avi Marina Boatyard - (1000-ton slipway)
`;
    const sheets = detectProseSheets(fixture);
    const entry = sheets.find((s) => s.heading === 'Avi Avi Marina Boatyard');

    expect(entry).toBeDefined();
    expect(entry.locationHint).toBeNull();
  });
});

// MEDIUM 2 regression lock: real fixture, file 16 lines 105-159 — a
// "## Grok" turn that opens with an inline-bold entity name ("**Bradford
// Marine — Fort Lauderdale** stands out..."), followed by a generic
// "### Key Differentiating Equipment & Haul-Out Capabilities" subheading.
describe('detectProseSheets — generic subheading is transparent; fields fall through to parent (MEDIUM 2)', () => {
  const FIXTURE_16_CAMACHEE = `## Grok

**Camachee Yacht Yard — St. Augustine** is a well-regarded, full-service boatyard integrated with the adjacent Windward Camachee Cove Yacht Harbor.

### Key Differentiating Equipment & Haul-Out Capabilities
Camachee focuses on efficient, mid-range haul-outs rather than ultra-heavy lifts or massive dry docks:

- **Travelift** — Primary haul-out tool: **50-ton capacity** (confirmed across multiple sources like Waterway Guide and Yelp).

### Dockage & Facilities
- **Slips**: ~230-260 total (sources vary: 260 slips + linear docks ~1,446 ft).
`;

  it('does not mint a bogus "Key Differentiating Equipment & Haul-Out Capabilities" or "Dockage & Facilities" entity', () => {
    const sheets = detectProseSheets(FIXTURE_16_CAMACHEE);
    expect(sheets.find((s) => s.heading?.includes('Key Differentiating'))).toBeUndefined();
    expect(sheets.find((s) => s.heading === 'Dockage & Facilities')).toBeUndefined();
  });

  it('attaches the travelift field (and the later slips field) to the real entity, Camachee Yacht Yard', () => {
    const sheets = detectProseSheets(FIXTURE_16_CAMACHEE);
    const camachee = sheets.find((s) => s.heading === 'Camachee Yacht Yard');

    expect(camachee).toBeDefined();
    expect(camachee.fields.travelift_tonnage).toContain('50-ton');
    expect(camachee.fields.berths).toContain('230-260');
  });
});
