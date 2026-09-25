// ingest/tests/websiteHygiene.spec.js
//
// TASK-026 (Round 8), lane C hygiene — research/round8/
// 05_company_edges_and_hygiene.md's Finding 2 (website pollution: markdown
// links, URL paths, schemes, emails) + Finding 3 (absence sentinels stored
// as a present value on yacht.class_society/imo/flag). A retrofit hook that
// sweeps every already-ingested node, same "run once after every file"
// pattern as graphCleanup.js's applyGraphCleanup(). Deliberately its own
// commit, separable from Round 8's builder enrichment (see this ticket's
// scope note on why).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { applyWebsiteHygiene } from '../src/mappers/websiteHygiene.js';

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'website-hygiene-test-')), 'graph.db');
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

describe('applyWebsiteHygiene — website normalization (Finding 2)', () => {
  it('normalizes a markdown-link-wrapped website to a bare domain', () => {
    upsertNode(db, { id: 'club:eyc', type: 'club', name: 'Enoshima Yacht Club', attrs: { website: '[www.ayc.ca](http://www.ayc.ca/)' } });

    const result = applyWebsiteHygiene(db);

    expect(getNode('club:eyc').attrs.website).toBe('www.ayc.ca');
    expect(result.websitesNormalized).toBe(1);
  });

  it('strips an http(s):// scheme', () => {
    upsertNode(db, { id: 'club:eyc2', type: 'club', name: 'X', attrs: { website: 'https://eyc.jp/' } });

    applyWebsiteHygiene(db);

    expect(getNode('club:eyc2').attrs.website).toBe('eyc.jp');
  });

  it('strips a trailing URL path', () => {
    upsertNode(db, { id: 'marina:aci', type: 'marina', name: 'ACI Marina', attrs: { website: 'aci-marinas.com/marina/aci-dubrovnik' } });

    applyWebsiteHygiene(db);

    expect(getNode('marina:aci').attrs.website).toBe('aci-marinas.com');
  });

  it('clears an email-address "website" value entirely rather than storing it', () => {
    upsertNode(db, { id: 'company:abys', type: 'company', name: 'ABYS Yachting', attrs: { website: 'info@abys-yachting.com' } });

    const result = applyWebsiteHygiene(db);

    expect(getNode('company:abys').attrs).not.toHaveProperty('website');
    expect(result.websitesCleared).toBe(1);
  });

  it('leaves an already-clean bare-domain website untouched (no write, idempotent)', () => {
    upsertNode(db, { id: 'builder:absolute', type: 'builder', name: 'Absolute', attrs: { website: 'absoluteyachts.com' } });

    const result = applyWebsiteHygiene(db);

    expect(getNode('builder:absolute').attrs.website).toBe('absoluteyachts.com');
    expect(result.websitesNormalized).toBe(0);
    expect(result.websitesCleared).toBe(0);
  });
});

describe('applyWebsiteHygiene — absence sentinels (Finding 3)', () => {
  it('clears yacht.class_society when it stores a "not found" sentinel', () => {
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A', attrs: { class_society: 'n/a (not found)' } });

    const result = applyWebsiteHygiene(db);

    expect(getNode('yacht:a').attrs).not.toHaveProperty('class_society');
    expect(result.sentinelsCleared).toBe(1);
  });

  it('clears yacht.imo and yacht.flag sentinels', () => {
    upsertNode(db, { id: 'yacht:b', type: 'yacht', name: 'B', attrs: { imo: 'n/a (not found)', flag: '— (not found)' } });

    applyWebsiteHygiene(db);

    const node = getNode('yacht:b');
    expect(node.attrs).not.toHaveProperty('imo');
    expect(node.attrs).not.toHaveProperty('flag');
  });

  it('does NOT clear a real yacht status-shaped value (defunct is real data, not a sentinel) — sanity check via flag field', () => {
    upsertNode(db, { id: 'yacht:c', type: 'yacht', name: 'C', attrs: { flag: 'Cayman Islands' } });

    applyWebsiteHygiene(db);

    expect(getNode('yacht:c').attrs.flag).toBe('Cayman Islands');
  });

  it('does NOT clear class_society/imo/flag sentinel-shaped text on a NON-yacht node type (scoped to yacht only, per Finding 3)', () => {
    upsertNode(db, { id: 'company:x', type: 'company', name: 'X', attrs: { imo: 'n/a (not found)' } });

    applyWebsiteHygiene(db);

    // Not a real company field anyway, but proves the sweep is type-scoped
    // rather than blindly nulling any node's imo-shaped attr.
    expect(getNode('company:x').attrs.imo).toBe('n/a (not found)');
  });
});

describe('applyWebsiteHygiene — idempotency', () => {
  it('running twice yields identical node state', () => {
    upsertNode(db, { id: 'builder:x', type: 'builder', name: 'X', attrs: { website: 'https://x.com/path' } });

    applyWebsiteHygiene(db);
    const first = JSON.stringify(getNode('builder:x'));
    applyWebsiteHygiene(db);
    const second = JSON.stringify(getNode('builder:x'));

    expect(second).toBe(first);
  });
});

describe('module importability', () => {
  it('exposes applyWebsiteHygiene as a named export', async () => {
    const mod = await import('../src/mappers/websiteHygiene.js');
    expect(typeof mod.applyWebsiteHygiene).toBe('function');
  });
});
