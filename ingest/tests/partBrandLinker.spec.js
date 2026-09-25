// ingest/tests/partBrandLinker.spec.js
//
// TASK-025 (Round 7) AC6 introduced this module; TASK-026 (Round 8) residual
// (6) fixes a gap the round-7 tests never covered: the candidate query never
// excluded placeholder-flagged nodes (attrs.placeholder === true), so a
// part description that happens to mention a placeholder builder's name
// (e.g. "Custom") could link onto it as if it were a real brand.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode } from '../src/db.js';
import { ensureKnownPartBrandNodes, linkPartBrands } from '../src/mappers/partBrandLinker.js';

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'part-brand-linker-test-')), 'graph.db');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(path.dirname(tmpDbPath), { recursive: true, force: true });
});

function edgeExists(src, rel, dst) {
  return !!db.prepare('SELECT 1 FROM edges WHERE src = ? AND rel = ? AND dst = ?').get(src, rel, dst);
}

describe('linkPartBrands — excludes placeholder-flagged candidate nodes (TASK-026 residual 6)', () => {
  it('does NOT link a part to a placeholder-flagged builder even when its name appears in the description', () => {
    upsertNode(db, { id: 'part:gadget', type: 'part', name: 'Gadget', attrs: { description: 'A component made by Bespoke, a specialist manufacturer.' } });
    upsertNode(db, { id: 'builder:bespoke', type: 'builder', name: 'Bespoke', attrs: { placeholder: true } });

    const result = linkPartBrands(db);

    expect(edgeExists('part:gadget', 'made_by', 'builder:bespoke')).toBe(false);
    expect(result.edges).toBe(0);
  });

  it('DOES link a part to a non-placeholder builder whose name appears unambiguously in the description', () => {
    upsertNode(db, { id: 'part:widget', type: 'part', name: 'Widget', attrs: { description: 'A component made by Realyard, a specialist manufacturer.' } });
    upsertNode(db, { id: 'builder:realyard', type: 'builder', name: 'Realyard' });

    const result = linkPartBrands(db);

    expect(edgeExists('part:widget', 'made_by', 'builder:realyard')).toBe(true);
    expect(result.edges).toBe(1);
  });

  it('excludes a placeholder-flagged company/engine node too (the exclusion is generic across candidate types)', () => {
    upsertNode(db, { id: 'part:thing', type: 'part', name: 'Thing', attrs: { description: 'Manufactured by Placeholderco under license.' } });
    upsertNode(db, { id: 'company:placeholderco', type: 'company', name: 'Placeholderco', attrs: { placeholder: true } });

    const result = linkPartBrands(db);

    expect(edgeExists('part:thing', 'made_by', 'company:placeholderco')).toBe(false);
    expect(result.edges).toBe(0);
  });
});

describe('ensureKnownPartBrandNodes — unaffected by the placeholder-exclusion fix', () => {
  it('still mints the Seakeeper seed node when a part node exists', () => {
    upsertNode(db, { id: 'part:gyro-stabiliser', type: 'part', name: 'Gyro Stabiliser', attrs: {} });

    const result = ensureKnownPartBrandNodes(db);

    expect(result.minted).toBe(1);
    const row = db.prepare("SELECT * FROM nodes WHERE id = 'company:seakeeper'").get();
    expect(row).toBeTruthy();
  });
});

describe('module importability', () => {
  it('exposes ensureKnownPartBrandNodes and linkPartBrands as named exports', async () => {
    const mod = await import('../src/mappers/partBrandLinker.js');
    expect(typeof mod.ensureKnownPartBrandNodes).toBe('function');
    expect(typeof mod.linkPartBrands).toBe('function');
  });
});
