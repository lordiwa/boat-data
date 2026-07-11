// ingest/tests/sizeClassLinker.spec.js
//
// TASK-025 (Round 7) AC6: structural edges derived ONLY from existing
// canonical attrs — every yacht node with a canonical numeric `loa.meters`
// must gain exactly one CLASSIFIED_AS edge to the correct `size_class` node,
// using the "stored 24/30/60/100m convention" already published on the four
// size_class nodes themselves (sizeClassMapper.js / knowledge/90):
//   size_class:boat-yacht   — <24m
//   size_class:superyacht   — 24m to <60m (some sources start at 30m; both
//                              24 and 30 are exercised below as sanity
//                              checks within the same bucket)
//   size_class:megayacht    — 60m to <100m
//   size_class:gigayacht    — >=100m
//
// This is a NEW module this ticket introduces (`../src/mappers/
// sizeClassLinker.js`, mirroring ingest.js's linkYachtRegions()/
// linkEngineOemSupplies() retrofit-hook pattern — see graphCleanup.js's own
// module header for that naming precedent) — it does not exist yet, so
// every test below fails at import time until TASK-025's IMPL phase adds it.
// Two exports are expected:
//   - sizeClassIdForLength(meters): pure boundary-classification function.
//   - linkYachtSizeClasses(db): the DB-level hook — for every yacht node
//     with a numeric attrs.loa.meters, upserts a `classified_as` edge to the
//     matching size_class node (only when that node already exists in `db`
//     — never invents one). Idempotent (safe to call twice).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { sizeClassIdForLength, linkYachtSizeClasses } from '../src/mappers/sizeClassLinker.js';

describe('sizeClassIdForLength — pure boundary classification (24/60/100m thresholds, 30m sanity check)', () => {
  it('classifies just-below 24m as boat-yacht', () => {
    expect(sizeClassIdForLength(23.99)).toBe('size_class:boat-yacht');
  });

  it('classifies exactly 24m as superyacht (lower boundary is inclusive)', () => {
    expect(sizeClassIdForLength(24)).toBe('size_class:superyacht');
  });

  it('classifies 30m as superyacht (mid-range sanity check, not a distinct boundary)', () => {
    expect(sizeClassIdForLength(30)).toBe('size_class:superyacht');
  });

  it('classifies just-below 60m as superyacht', () => {
    expect(sizeClassIdForLength(59.99)).toBe('size_class:superyacht');
  });

  it('classifies exactly 60m as megayacht (lower boundary is inclusive)', () => {
    expect(sizeClassIdForLength(60)).toBe('size_class:megayacht');
  });

  it('classifies just-below 100m as megayacht', () => {
    expect(sizeClassIdForLength(99.99)).toBe('size_class:megayacht');
  });

  it('classifies exactly 100m as gigayacht (lower boundary is inclusive)', () => {
    expect(sizeClassIdForLength(100)).toBe('size_class:gigayacht');
  });

  it('classifies a very large yacht (180m, Azzam-scale) as gigayacht', () => {
    expect(sizeClassIdForLength(180.6)).toBe('size_class:gigayacht');
  });

  it('returns null for a non-numeric/missing length rather than guessing', () => {
    expect(sizeClassIdForLength(null)).toBeNull();
    expect(sizeClassIdForLength(undefined)).toBeNull();
    expect(sizeClassIdForLength(NaN)).toBeNull();
  });
});

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'size-class-linker-test-')), 'graph.db');
  db = openDb(tmpDbPath);
  initSchema(db);

  // The 4 real size_class nodes, seeded exactly as sizeClassMapper.js/
  // knowledge/90 produce them in the real graph (id + type only matter for
  // this hook; attrs are irrelevant to edge derivation).
  for (const id of ['size_class:boat-yacht', 'size_class:superyacht', 'size_class:megayacht', 'size_class:gigayacht']) {
    upsertNode(db, { id, type: 'size_class', name: id, attrs: {} });
  }
});

afterEach(() => {
  db.close();
  fs.rmSync(path.dirname(tmpDbPath), { recursive: true, force: true });
});

function edgesFrom(srcId) {
  return db.prepare("SELECT src, rel, dst FROM edges WHERE src = ? AND rel = 'classified_as'").all(srcId);
}

describe('linkYachtSizeClasses — DB-level hook (synthetic db)', () => {
  it('links a yacht with a canonical numeric loa.meters to exactly one correct size_class node', () => {
    upsertNode(db, { id: 'yacht:test-superyacht', type: 'yacht', name: 'Test Superyacht', attrs: { loa: { meters: 45, raw: '45m' } } });

    const result = linkYachtSizeClasses(db);

    expect(result.edges).toBeGreaterThanOrEqual(1);
    const edges = edgesFrom('yacht:test-superyacht');
    expect(edges).toHaveLength(1);
    expect(edges[0].dst).toBe('size_class:superyacht');
  });

  it('gains NO classified_as edge for a yacht with no canonical loa.meters (no invention)', () => {
    upsertNode(db, { id: 'yacht:test-no-loa', type: 'yacht', name: 'Test No LOA', attrs: { loa: null } });
    upsertNode(db, { id: 'yacht:test-raw-only-loa', type: 'yacht', name: 'Test Raw-Only LOA', attrs: { loa: { meters: null, raw: 'Variable (custom)' } } });

    linkYachtSizeClasses(db);

    expect(edgesFrom('yacht:test-no-loa')).toEqual([]);
    expect(edgesFrom('yacht:test-raw-only-loa')).toEqual([]);
  });

  it('links every one of the 4 boundary/bucket yachts to its correct size_class node in one pass', () => {
    const fixtures = [
      ['yacht:test-boat', 18, 'size_class:boat-yacht'],
      ['yacht:test-super', 24, 'size_class:superyacht'],
      ['yacht:test-mega', 60, 'size_class:megayacht'],
      ['yacht:test-giga', 100, 'size_class:gigayacht'],
    ];
    for (const [id, meters, ,] of fixtures) {
      upsertNode(db, { id, type: 'yacht', name: id, attrs: { loa: { meters, raw: `${meters}m` } } });
    }

    linkYachtSizeClasses(db);

    for (const [id, , expectedDst] of fixtures) {
      const edges = edgesFrom(id);
      expect(edges, `expected ${id} to carry exactly one classified_as edge`).toHaveLength(1);
      expect(edges[0].dst).toBe(expectedDst);
    }
  });

  it('is idempotent: calling twice does not duplicate the classified_as edge', () => {
    upsertNode(db, { id: 'yacht:test-idempotent', type: 'yacht', name: 'Test Idempotent', attrs: { loa: { meters: 88, raw: '88m' } } });

    linkYachtSizeClasses(db);
    linkYachtSizeClasses(db);

    expect(edgesFrom('yacht:test-idempotent')).toHaveLength(1);
  });
});
