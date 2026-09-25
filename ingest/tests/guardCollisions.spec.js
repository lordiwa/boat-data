// ingest/tests/guardCollisions.spec.js
//
// TASK-017/TASK-019/TASK-020/TASK-021: a cross-guard collision matrix.
// Every mapper's schema guard must claim ONLY its own real-shaped table —
// never a table shaped for one of the other entity types. Each individual
// mapper spec file already spot-checks a couple of these pairs; this file
// is the single place that proves the FULL matrix (TASK-021: 16 guards x
// 16 real-shaped fixtures), so a new guard added in the future has an
// obvious place to add its own row/column rather than requiring every
// existing spec file to be hunted down and updated by hand.
//
// yachtMapper.js doesn't export its own guard function (ingest.js keeps a
// small private duplicate — see ingest.js's own module-header comment on
// why), so this file duplicates that same tiny check rather than reaching
// into ingest.js's internals.

import { describe, it, expect } from 'vitest';
import { parseTables } from '../src/parsers/tableParser.js';
import { isClubTable } from '../src/mappers/clubMapper.js';
import { isMarinaTable } from '../src/mappers/marinaMapper.js';
import { isCompanyTable } from '../src/mappers/companyMapper.js';
import { isEngineTable, isEngineManufacturerTable } from '../src/mappers/engineMapper.js';
import { isShipyardTable } from '../src/mappers/shipyardMapper.js';
import { isEngineModelTable } from '../src/mappers/engineModelMapper.js';
import { isPartTable } from '../src/mappers/partMapper.js';
import { isSizeClassTable } from '../src/mappers/sizeClassMapper.js';
import { isBuilderEnrichmentTable } from '../src/mappers/builderEnrichmentMapper.js';
import { isBuilderEnrichmentRound8Table } from '../src/mappers/builderEnrichmentRound8Mapper.js';
import { isDesignerTable } from '../src/mappers/designerMapper.js';
import { isYachtSpecTable } from '../src/mappers/yachtSpecMapper.js';
import { isMarinaEnrichmentTable } from '../src/mappers/marinaMapper.js';
import { isPersonEnrichmentTable } from '../src/mappers/personMapper.js';
import { isClubEnrichmentTable } from '../src/mappers/clubMapper.js';

// Mirrors ingest.js's own private isYachtTable exactly (see that file's
// module header for why it can't import yachtMapper's internal check).
const YACHT_REQUIRED_ANY_OF = ['builder', 'loa', 'year'];
function isYachtTable(table) {
  const present = new Set(table.normalizedHeaders);
  if (!present.has('name')) return false;
  return YACHT_REQUIRED_ANY_OF.some((key) => present.has(key));
}

const GUARDS = {
  yacht: isYachtTable,
  club: isClubTable,
  marina: isMarinaTable,
  company: isCompanyTable,
  engine: isEngineTable,
  shipyard: isShipyardTable,
  engineManufacturer: isEngineManufacturerTable,
  engineModel: isEngineModelTable,
  part: isPartTable,
  sizeClass: isSizeClassTable,
  builderEnrichment: isBuilderEnrichmentTable,
  builderEnrichmentRound8: isBuilderEnrichmentRound8Table,
  designer: isDesignerTable,
  yachtSpec: isYachtSpecTable,
  marinaEnrichment: isMarinaEnrichmentTable,
  personEnrichment: isPersonEnrichmentTable,
  clubEnrichment: isClubEnrichmentTable,
};

// One real-shaped, single-table fixture per entity type (verbatim/close-to
// -verbatim excerpts from the real corpus/curated knowledge docs — see
// each mapper's own spec file for the full provenance of each shape).
const FIXTURES = {
  yacht: `
| Yacht Name | Owner | Length | Builder | Year | Region |
|------------|--------|--------|---------|------|--------|
| Big Data | Unknown | 16.15 m (53 ft) | Beneteau | 2019 | French Riviera |
`,
  club: `
| Region | Club Name | Location | Founding Year | Website | Key Facilities/Activities |
|--------|-----------|----------|---------------|---------|---------------|
| Kanto | Enoshima Yacht Club | Enoshima, Fujisawa, Kanagawa | 1964 | https://eyc.jp/ | Founded as host for 1964 Tokyo Olympics sailing. |
`,
  marina: `
| Facility                          | Location              | Lift Capacity                  | Max LOA/Beam          | Marina Integration | Key Services                     | SSG Listed? |
|-----------------------------------|-----------------------|--------------------------------|------------------------|--------------------|----------------------------------|-------------|
| Safe Harbor Newport Shipyard     | Newport              | 500T + 200T + 150T            | 300+ ft / 36 ft      | Yes (3,500 ft docks) | Full refit, paint, rigging      | Yes        |
`,
  company: `
| Company Name              | Address (if available)                  | Phone/Email/Website (if available) | Brief Description/Notes |
|---------------------------|-----------------------------------------|------------------------------------|--------------------------|
| Edmiston and Company      | 57 rue Grimaldi, Monaco                 | Not available                     | Leading superyacht brokerage. |
`,
  engine: `
| Tier | Manufacturer          | Parent/Brand          | Strengths & Reputation                          | Best For                     | Power Range          | Notes |
|------|-----------------------|-----------------------|-------------------------------------------------|------------------------------|----------------------|-------|
| 1    | MTU                   | Rolls-Royce           | Best power-to-weight | Superyachts | 500 – 10,000+ kW | Often considered #1 |
`,
  shipyard: `
| Shipyard                | Country     | City      | Operator     | Facility Type       | Dry Docks | Max LOA (m) | Max Tonnage (t) | Dock Dimensions | Lift Type      | Services                          | Founded | Website              | Notes                       |
|--------------------------|-------------|-----------|--------------|----------------------|-----------|-------------|------------------|------------------|-----------------|------------------------------------|---------|----------------------|------------------------------|
| Feadship Aalsmeer Yard   | Netherlands | Aalsmeer  | Feadship     | Builder Yard         | 3         | 160m        | 15000            | 200m x 40m       | Syncrolift      | New build, Refit, Sea trials      | 1849    | https://feadship.nl  | Royal Dutch shipbuilder.    |
`,
  engineManufacturer: `
| Brand | Parent Company | Country | Founded | Engine Types | Power Range | Notable Models | Segment | Status | Website | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| MTU | Rolls-Royce plc | Germany | 1909 | inboard diesel | Series 2000 | Series 2000, Series 4000 | yacht, superyacht | active | mtu-solutions.com | Part of Rolls-Royce Power Systems. |
`,
  engineModel: `
| Model/Series | Brand | Years | Type | Power (hp) | Segment | Notes |
|---|---|---|---|---|---|---|
| Verado 600 V12 | Mercury Marine | 2021- | 7.6L naturally aspirated V12 | 600 | consumer/flagship outboard | World's first V12 outboard. |
`,
  part: `
| Part  | Category         | Location                       | Description                                                                 | Applies To |
|-------|------------------|---------------------------------|-------------------------------------------------------------------------------|------------|
| Bow   | hull & structure | forward-most point of the hull | The front-most part of the hull, where the vessel first meets the water.     | all        |
`,
  sizeClass: `
| Class      | Length Threshold          | GT Range                | Typical Crew            | Definition Used By         | Example Vessels        | Notes |
|------------|---------------------------|--------------------------|--------------------------|------------------------------|--------------------------|-------|
| Superyacht | 24m+ (79ft+)              | ~500-3,000 GT (varies)   | 3-16 depending on size  | Most common convention      | Amels 60, Heesen 50m    | Conflict noted. |
`,
  builderEnrichment: `
| Builder | Country | City | Founded | Specialty | Status | Parent Company | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Lurssen | Germany | Bremen-Vegesack | 1875 | custom steel/aluminium megayachts | active | family-owned | lurssen.com | 51 yachts in graph |
`,
  builderEnrichmentRound8: `
| Builder | Country | Founded | Website | Specialty | Notes |
|---|---|---|---|---|---|
| Absolute | Italy | 2002 | absoluteyachts.com | flybridge/coupé/navetta motor yachts; composite construction | Founded by Sergio Maggi & Marcello Bè in Podenzano (Piacenza). |
`,
  designer: `
| Designer | Country | City | Founded | Discipline | Notable Yachts | Status | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Bannenberg & Rowell | UK | London | 2003 | exterior design, interior design | Joy, Elandess 2 | active | bannenbergandrowell.com | Direct descendant studio |
`,
  yachtSpec: `
| Yacht | Builder | Year | LOA (m) | Beam (m) | Draft (m) | GT | Max Speed (kn) | Range (nm) | Flag | Class Society | IMO | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Azzam | Lürssen | 2013 | 180 | 20.8 | 4.3 | 13,136 | 32+ | | Abu Dhabi, UAE | | 9693367 | World's longest private motor yacht. |
`,
  marinaEnrichment: `
| Marina | Country | City | Berths | Max LOA (m) | Max Draft (m) | Fuel Dock | Website | Notes |
|---|---|---|---|---|---|---|---|---|
| Marina Ibiza | Spain | Ibiza Town, Balearic Islands | 85 | 60 | 10 | Yes | marinaibiza.com | Formerly "Ibiza Magna." |
`,
  personEnrichment: `
| Person | Nationality | Industry | Role/Title | Status | Ownership Confidence | Notes |
|---|---|---|---|---|---|---|
| Bernard Arnault | French | Luxury goods (LVMH) | Chairman/CEO, LVMH | Living | Confirmed | Owns Symphony (101.5m Feadship). |
`,
  clubEnrichment: `
| Club | City | Country | Founded | Website | Notes |
|---|---|---|---|---|---|
| Chicago Yacht Club | Chicago, IL | USA | 1875 | chicagoyachtclub.org | Organized by 37 yachtsmen. |
`,
};

describe('guard collision matrix — every guard claims ONLY its own fixture', () => {
  const types = Object.keys(FIXTURES);

  for (const fixtureType of types) {
    const [table] = parseTables(FIXTURES[fixtureType]);

    for (const guardType of types) {
      const shouldClaim = fixtureType === guardType;
      const label = shouldClaim
        ? `${guardType} guard claims its own "${fixtureType}" fixture`
        : `${guardType} guard does NOT claim the "${fixtureType}" fixture`;

      it(label, () => {
        expect(GUARDS[guardType](table)).toBe(shouldClaim);
      });
    }
  }
});
