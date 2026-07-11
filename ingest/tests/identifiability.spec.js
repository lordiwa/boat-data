// ingest/tests/identifiability.spec.js
//
// TASK-024: yacht identifiability classification, Rule B (supersedes
// TASK-023 item 4's Rule A/v1 "any one signal is enough" rule) — see
// identifiability.js's own module header for the exact rule. Mirrors the
// same synthetic-db fixture pattern as graphCleanup.spec.js.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { classifyYachtIdentifiability, NEGATIVE_EVIDENCE_TABLE } from '../src/mappers/identifiability.js';

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

describe('classifyYachtIdentifiability — Rule B (>=2 of 4 independent signals)', () => {
  it('classifies a yacht with only a year attr (1 signal) as a FRAGMENT (Rule B tightens v1\'s single-signal rule)', () => {
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A', attrs: { year: { value: 2020, raw: '2020' } } });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:a').attrs.identifiability).toBe('fragment');
  });

  it('classifies a yacht with only a meaningful built_by edge (1 signal) as a FRAGMENT', () => {
    upsertNode(db, { id: 'yacht:b', type: 'yacht', name: 'B', attrs: {} });
    upsertNode(db, { id: 'builder:x', type: 'builder', name: 'X' });
    upsertEdge(db, { src: 'yacht:b', rel: 'built_by', dst: 'builder:x' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:b').attrs.identifiability).toBe('fragment');
  });

  it('classifies a yacht with only knowledge/93 research provenance (1 signal) as a FRAGMENT', () => {
    upsertNode(db, {
      id: 'yacht:c',
      type: 'yacht',
      name: 'C',
      attrs: { provenance: ['20_Mega_Yachts_with_Personal_Websites_Data_Scrape.md', '93_Yacht_Spec_Completion.md'] },
    });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:c').attrs.identifiability).toBe('fragment');
  });

  it('classifies a yacht with only a spec attr (e.g. gt) as a FRAGMENT', () => {
    upsertNode(db, { id: 'yacht:s', type: 'yacht', name: 'S', attrs: { gt: 499 } });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:s').attrs.identifiability).toBe('fragment');
  });

  it('classifies a yacht with year + a meaningful built_by edge (2 signals) as IDENTIFIABLE', () => {
    upsertNode(db, { id: 'yacht:d', type: 'yacht', name: 'D', attrs: { year: { value: 2019, raw: '2019' } } });
    upsertNode(db, { id: 'builder:y', type: 'builder', name: 'Y' });
    upsertEdge(db, { src: 'yacht:d', rel: 'built_by', dst: 'builder:y' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:d').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with a spec attr + research provenance (2 signals) as IDENTIFIABLE', () => {
    upsertNode(db, {
      id: 'yacht:e',
      type: 'yacht',
      name: 'E',
      attrs: { beam: { meters: 10, raw: '10' }, provenance: ['97_Yacht_Spec_Completion_Round6.md'] },
    });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:e').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with a data_quality flag + year (2 signals) as IDENTIFIABLE', () => {
    upsertNode(db, {
      id: 'yacht:f',
      type: 'yacht',
      name: 'F',
      attrs: { data_quality: 'unverified', year: { value: 2001, raw: '2001' } },
    });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:f').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a yacht with former_names + a meaningful built_by edge (2 signals) as IDENTIFIABLE', () => {
    upsertNode(db, { id: 'yacht:g', type: 'yacht', name: 'G', attrs: { former_names: ['Old Name'] } });
    upsertNode(db, { id: 'builder:z', type: 'builder', name: 'Z' });
    upsertEdge(db, { src: 'yacht:g', rel: 'built_by', dst: 'builder:z' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:g').attrs.identifiability).toBe('identifiable');
  });

  it('classifies a bare charter-listing yacht (0 signals) as a fragment', () => {
    upsertNode(db, { id: 'yacht:h', type: 'yacht', name: 'H', attrs: { loa: { meters: 40, raw: '40' } } });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:h').attrs.identifiability).toBe('fragment');
  });

  it('does not classify non-yacht nodes at all', () => {
    upsertNode(db, { id: 'builder:zz', type: 'builder', name: 'ZZ', attrs: {} });

    classifyYachtIdentifiability(db);

    expect(getNode('builder:zz').attrs.identifiability).toBeUndefined();
  });

  it('is idempotent: re-running on an already-classified graph does not change the classification', () => {
    upsertNode(db, { id: 'yacht:h', type: 'yacht', name: 'H', attrs: { loa: { meters: 40, raw: '40' } } });

    classifyYachtIdentifiability(db);
    classifyYachtIdentifiability(db);

    expect(getNode('yacht:h').attrs.identifiability).toBe('fragment');
  });

  it('re-derives from scratch on every call rather than accumulating: a fragment that later gains a second signal is reclassified as identifiable', () => {
    upsertNode(db, { id: 'yacht:i', type: 'yacht', name: 'I', attrs: { year: { value: 2021, raw: '2021' } } });
    classifyYachtIdentifiability(db);
    expect(getNode('yacht:i').attrs.identifiability).toBe('fragment');

    upsertNode(db, {
      id: 'yacht:i',
      type: 'yacht',
      name: 'I',
      attrs: { year: { value: 2021, raw: '2021' }, gt: 499 },
    });
    classifyYachtIdentifiability(db);
    expect(getNode('yacht:i').attrs.identifiability).toBe('identifiable');
  });

  it('returns a { identifiable, fragment } count summary', () => {
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A', attrs: { year: { value: 2020, raw: '2020' } } });
    upsertNode(db, { id: 'yacht:h', type: 'yacht', name: 'H', attrs: { loa: { meters: 40, raw: '40' } } });

    const result = classifyYachtIdentifiability(db);

    expect(result).toEqual({ identifiable: 0, fragment: 2 });
  });
});

describe('classifyYachtIdentifiability — Rule B builder exclusions (AC2: builder:various/custom/placeholder never count)', () => {
  it('does not count a built_by edge to builder:various as a signal, even combined with year', () => {
    upsertNode(db, { id: 'yacht:j', type: 'yacht', name: 'J', attrs: { year: { value: 2015, raw: '2015' } } });
    upsertNode(db, { id: 'builder:various', type: 'builder', name: 'Various' });
    upsertEdge(db, { src: 'yacht:j', rel: 'built_by', dst: 'builder:various' });

    classifyYachtIdentifiability(db);

    // Only 1 real signal (year) — builder:various is explicitly excluded.
    expect(getNode('yacht:j').attrs.identifiability).toBe('fragment');
  });

  it('does not count a built_by edge to builder:custom as a signal, even combined with year', () => {
    upsertNode(db, { id: 'yacht:k', type: 'yacht', name: 'K', attrs: { year: { value: 2015, raw: '2015' } } });
    upsertNode(db, { id: 'builder:custom', type: 'builder', name: 'Custom' });
    upsertEdge(db, { src: 'yacht:k', rel: 'built_by', dst: 'builder:custom' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:k').attrs.identifiability).toBe('fragment');
  });

  it('does not count a built_by edge to any placeholder-flagged builder (attrs.placeholder === true), even combined with year', () => {
    upsertNode(db, { id: 'yacht:l', type: 'yacht', name: 'L', attrs: { year: { value: 2015, raw: '2015' } } });
    upsertNode(db, { id: 'builder:mixed', type: 'builder', name: 'Mixed', attrs: { placeholder: true } });
    upsertEdge(db, { src: 'yacht:l', rel: 'built_by', dst: 'builder:mixed' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:l').attrs.identifiability).toBe('fragment');
  });

  it('DOES count a built_by edge to a real, non-placeholder builder as a signal', () => {
    upsertNode(db, { id: 'yacht:m', type: 'yacht', name: 'M', attrs: { year: { value: 2015, raw: '2015' } } });
    upsertNode(db, { id: 'builder:real-yard', type: 'builder', name: 'Real Yard' });
    upsertEdge(db, { src: 'yacht:m', rel: 'built_by', dst: 'builder:real-yard' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:m').attrs.identifiability).toBe('identifiable');
  });
});

describe('classifyYachtIdentifiability — Rule B negative evidence (round5 skip lists)', () => {
  it('demotes a skip-listed name back to FRAGMENT even though it clears the base >=2 threshold via year + a real builder edge (the AQA/The Jackson case)', () => {
    upsertNode(db, { id: 'yacht:aqa', type: 'yacht', name: 'AQA', attrs: { year: { value: 2022, raw: '2022' } } });
    upsertNode(db, { id: 'builder:inace', type: 'builder', name: 'Inace' });
    upsertEdge(db, { src: 'yacht:aqa', rel: 'built_by', dst: 'builder:inace' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:aqa').attrs.identifiability).toBe('fragment');
  });

  it('the same skip-listed name IS identifiable when it also carries a spec attr (the override only demotes year+builder-only matches)', () => {
    upsertNode(db, {
      id: 'yacht:aqa',
      type: 'yacht',
      name: 'AQA',
      attrs: { year: { value: 2022, raw: '2022' }, gt: 499 },
    });
    upsertNode(db, { id: 'builder:inace', type: 'builder', name: 'Inace' });
    upsertEdge(db, { src: 'yacht:aqa', rel: 'built_by', dst: 'builder:inace' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:aqa').attrs.identifiability).toBe('identifiable');
  });

  it('the same skip-listed name IS identifiable when it also carries research-pass provenance', () => {
    upsertNode(db, {
      id: 'yacht:the-jackson',
      type: 'yacht',
      name: 'The Jackson',
      attrs: {
        year: { value: 2017, raw: '2017' },
        provenance: ['97_Yacht_Spec_Completion_Round6.md'],
      },
    });
    upsertNode(db, { id: 'builder:horizon', type: 'builder', name: 'Horizon' });
    upsertEdge(db, { src: 'yacht:the-jackson', rel: 'built_by', dst: 'builder:horizon' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:the-jackson').attrs.identifiability).toBe('identifiable');
  });

  it('a skip-listed name with fewer than 2 base signals stays a fragment regardless (no override needed)', () => {
    upsertNode(db, { id: 'yacht:panam', type: 'yacht', name: 'Panam', attrs: {} });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:panam').attrs.identifiability).toBe('fragment');
  });

  it('a NON-skip-listed name with year + real builder edge (2 signals) stays identifiable (the override is name-specific)', () => {
    upsertNode(db, { id: 'yacht:not-skip-listed', type: 'yacht', name: 'Totally Fine Yacht', attrs: { year: { value: 2020, raw: '2020' } } });
    upsertNode(db, { id: 'builder:real', type: 'builder', name: 'Real Yard' });
    upsertEdge(db, { src: 'yacht:not-skip-listed', rel: 'built_by', dst: 'builder:real' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:not-skip-listed').attrs.identifiability).toBe('identifiable');
  });

  it('NEGATIVE_EVIDENCE_TABLE is exported, non-empty, and every entry cites a source', () => {
    expect(Array.isArray(NEGATIVE_EVIDENCE_TABLE)).toBe(true);
    expect(NEGATIVE_EVIDENCE_TABLE.length).toBeGreaterThan(50);
    for (const entry of NEGATIVE_EVIDENCE_TABLE) {
      expect(typeof entry.name).toBe('string');
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.source).toBe('string');
      expect(entry.source).toContain('research/round5/');
    }
  });

  it('matches skip-listed names case/whitespace-insensitively (e.g. "aqa" matches "AQA")', () => {
    upsertNode(db, { id: 'yacht:aqa2', type: 'yacht', name: 'aqa', attrs: { year: { value: 2022, raw: '2022' } } });
    upsertNode(db, { id: 'builder:inace2', type: 'builder', name: 'Inace' });
    upsertEdge(db, { src: 'yacht:aqa2', rel: 'built_by', dst: 'builder:inace2' });

    classifyYachtIdentifiability(db);

    expect(getNode('yacht:aqa2').attrs.identifiability).toBe('fragment');
  });
});

describe('module importability', () => {
  it('exposes classifyYachtIdentifiability as a named export', async () => {
    const mod = await import('../src/mappers/identifiability.js');
    expect(typeof mod.classifyYachtIdentifiability).toBe('function');
  });
});
