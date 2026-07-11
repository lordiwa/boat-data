// ingest/tests/identifiability.spec.js
//
// TASK-023 item 4: yacht identifiability classification — see
// identifiability.js's own module header for the exact rule. Mirrors the
// same synthetic-db fixture pattern as graphCleanup.spec.js.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { classifyYachtIdentifiability } from '../src/mappers/identifiability.js';

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'identifiability-test-')), 'graph.db');
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

describe('classifyYachtIdentifiability', () => {
  it('classifies a yacht with a year attr as identifiable, even with no builder edge or research coverage', () => {
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A', attrs: { year: { value: 2020, raw: '2020' } } });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:a').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with a built_by edge as identifiable, even with no year or research coverage', () => {
    upsertNode(db, { id: 'yacht:b', type: 'yacht', name: 'B', attrs: {} });
    upsertNode(db, { id: 'builder:x', type: 'builder', name: 'X' });
    upsertEdge(db, { src: 'yacht:b', rel: 'built_by', dst: 'builder:x' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:b').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with knowledge/93 provenance as identifiable, even with no year or builder edge', () => {
    upsertNode(db, {
      id: 'yacht:c',
      type: 'yacht',
      name: 'C',
      attrs: { provenance: ['20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md', '93_Yacht_Spec_Completion.md'] },
    });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:c').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with knowledge/97 provenance as identifiable', () => {
    upsertNode(db, {
      id: 'yacht:d',
      type: 'yacht',
      name: 'D',
      attrs: { provenance: ['97_Yacht_Spec_Completion_Round6.md'] },
    });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:d').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with a data_quality flag as identifiable', () => {
    upsertNode(db, { id: 'yacht:e', type: 'yacht', name: 'E', attrs: { data_quality: 'unverified' } });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:e').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with former_names as identifiable', () => {
    upsertNode(db, { id: 'yacht:f', type: 'yacht', name: 'F', attrs: { former_names: ['Old Name'] } });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:f').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a bare charter-listing yacht (no year, no builder edge, no research coverage) as a fragment', () => {
    upsertNode(db, { id: 'yacht:g', type: 'yacht', name: 'G', attrs: { loa: { meters: 40, raw: '40' } } });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:g').attrs.identifiability).toBe('fragment');
  });

  it('does not classify non-yacht nodes at all', () => {
    upsertNode(db, { id: 'builder:z', type: 'builder', name: 'Z', attrs: {} });

    classifyYachtIdentifiability(db);

    expect(getNode('builder:z').attrs.identifiability).toBeUndefined();
  });

  it('is idempotent: re-running on an already-classified graph does not change the classification', () => {
    upsertNode(db, { id: 'yacht:g', type: 'yacht', name: 'G', attrs: { loa: { meters: 40, raw: '40' } } });

    classifyYachtIdentifiability(db);
    classifyYachtIdentifiability(db);

    expect(getNode('yacht:g').attrs.identifiability).toBe('fragment');
  });

  it('re-derives from scratch on every call rather than accumulating: a fragment that later gains a year is reclassified as identifiable', () => {
    upsertNode(db, { id: 'yacht:h', type: 'yacht', name: 'H', attrs: { loa: { meters: 40, raw: '40' } } });
    classifyYachtIdentifiability(db);
    expect(getNode('yacht:h').attrs.identifiability).toBe('fragment');

    upsertNode(db, { id: 'yacht:h', type: 'yacht', name: 'H', attrs: { loa: { meters: 40, raw: '40' }, year: { value: 2021, raw: '2021' } } });
    classifyYachtIdentifiability(db);
    expect(getNode('yacht:h').attrs.identifiability).toBe('identifiable');
  });

  it('returns a { identifiable, fragment } count summary', () => {
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A', attrs: { year: { value: 2020, raw: '2020' } } });
    upsertNode(db, { id: 'yacht:g', type: 'yacht', name: 'G', attrs: { loa: { meters: 40, raw: '40' } } });

    const result = classifyYachtIdentifiability(db);

    expect(result).toEqual({ identifiable: 1, fragment: 1 });
  });
});

describe('module importability', () => {
  it('exposes classifyYachtIdentifiability as a named export', async () => {
    const mod = await import('../src/mappers/identifiability.js');
    expect(typeof mod.classifyYachtIdentifiability).toBe('function');
  });
});
