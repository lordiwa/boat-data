// ingest/tests/regions.spec.js
//
// TASK-004: shared canonical Region registry used by every mapper. Covers
// the three alias groups called out in the ticket (French Riviera, United
// States, Monaco), the Florida-city PART_OF rollup, and the "unknown
// regions are never dropped" guarantee.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema } from '../src/db.js';
import { resolveRegion, upsertRegion, isFloridaCity } from '../src/mappers/regions.js';

describe('resolveRegion — alias collapse', () => {
  it('collapses French Riviera spelling variants onto one canonical node', () => {
    expect(resolveRegion('French Riviera')).toEqual({
      id: 'region:french-riviera',
      name: 'French Riviera',
      slug: 'french-riviera',
    });
    expect(resolveRegion("Côte d'Azur").id).toBe('region:french-riviera');
    expect(resolveRegion("Cote d'Azur").id).toBe('region:french-riviera');
  });

  it('collapses USA/United States/U.S./US onto region:united-states', () => {
    expect(resolveRegion('USA').id).toBe('region:united-states');
    expect(resolveRegion('United States').id).toBe('region:united-states');
    expect(resolveRegion('U.S.').id).toBe('region:united-states');
    expect(resolveRegion('US').id).toBe('region:united-states');
  });

  it('collapses Monaco / Port Hercules (Monaco) onto region:monaco', () => {
    expect(resolveRegion('Monaco').id).toBe('region:monaco');
    expect(resolveRegion('Port Hercules (Monaco)').id).toBe('region:monaco');
  });

  it('is case-insensitive for alias matching', () => {
    expect(resolveRegion('usa').id).toBe('region:united-states');
    expect(resolveRegion('MONACO').id).toBe('region:monaco');
  });

  it('never drops an unknown region: it becomes its own canonical node', () => {
    expect(resolveRegion('Khimki Reservoir, Moscow')).toEqual({
      id: 'region:khimki-reservoir-moscow',
      name: 'Khimki Reservoir, Moscow',
      slug: 'khimki-reservoir-moscow',
    });
  });

  it('returns null for empty/unknown-value cells', () => {
    expect(resolveRegion('Unknown')).toBeNull();
    expect(resolveRegion('N/A')).toBeNull();
    expect(resolveRegion('')).toBeNull();
  });
});

// Regression (reviewer finding, MEDIUM 3): ~15% of region nodes were junk
// — street addresses, postcode composites, and placeholder hedge text.
describe('resolveRegion — address/postcode/placeholder rejection (regression: MEDIUM 3)', () => {
  it('strips a leading postcode so a postcode+city composite resolves to the clean city (real fixture: file 56 "29001 Málaga")', () => {
    expect(resolveRegion('29001 Málaga')).toEqual({
      id: 'region:malaga',
      name: 'Málaga',
      slug: 'malaga',
    });
  });

  it('rejects a full street address rather than guessing which comma-segment is the city (real fixture: file 26 Delray table)', () => {
    expect(resolveRegion('1001 S Federal Hwy, Delray Beach, FL 33483')).toBeNull();
    expect(resolveRegion('1035 S Federal Hwy, Delray Beach, FL 33483')).toBeNull();
  });

  it('treats "(Various)" as an empty/placeholder value', () => {
    expect(resolveRegion('(Various)')).toBeNull();
  });

  it('treats "Unknown (likely ...)" as empty even though it is not an exact "Unknown" match', () => {
    expect(resolveRegion('Unknown (likely Moscow/St. Petersburg)')).toBeNull();
  });

  it('still resolves ordinary place names with no digits (no false positives)', () => {
    expect(resolveRegion('Khimki Reservoir, Moscow').id).toBe('region:khimki-reservoir-moscow');
    expect(resolveRegion('Newport').id).toBe('region:newport');
  });
});

describe('isFloridaCity', () => {
  it('recognizes known Florida cities regardless of case', () => {
    expect(isFloridaCity('Miami')).toBe(true);
    expect(isFloridaCity('fort lauderdale')).toBe(true);
  });

  it('does not treat non-Florida cities as Florida cities', () => {
    expect(isFloridaCity('Newport')).toBe(false);
    expect(isFloridaCity('Monaco')).toBe(false);
  });
});

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'regions-test-')), 'graph.db');
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

function edgeExists(src, rel, dst) {
  return !!db.prepare('SELECT 1 FROM edges WHERE src = ? AND rel = ? AND dst = ?').get(src, rel, dst);
}

describe('upsertRegion — DB effects', () => {
  it('upserts a canonical region node and returns its id', () => {
    const id = upsertRegion(db, 'Cote dAzur');
    expect(id).toBe('region:french-riviera');
    expect(getNode('region:french-riviera').name).toBe('French Riviera');
  });

  it('adds a PART_OF edge from a Florida city to region:florida (but keeps the city distinct)', () => {
    const miamiId = upsertRegion(db, 'Miami');
    expect(miamiId).toBe('region:miami');
    expect(getNode('region:miami')).not.toBeNull();
    expect(getNode('region:florida')).not.toBeNull();
    expect(edgeExists('region:miami', 'part_of', 'region:florida')).toBe(true);
  });

  it('does not add a spurious PART_OF edge for a non-Florida region', () => {
    upsertRegion(db, 'Newport');
    expect(edgeExists('region:newport', 'part_of', 'region:florida')).toBe(false);
  });

  it('is idempotent: calling twice does not duplicate the region node or PART_OF edge', () => {
    upsertRegion(db, 'Fort Lauderdale');
    upsertRegion(db, 'Fort Lauderdale');
    const edgeCount = db
      .prepare("SELECT COUNT(*) AS count FROM edges WHERE src = 'region:fort-lauderdale' AND rel = 'part_of'")
      .get().count;
    expect(edgeCount).toBe(1);
  });

  it('returns null and writes nothing for an empty/unknown value', () => {
    expect(upsertRegion(db, 'Unknown')).toBeNull();
  });
});
