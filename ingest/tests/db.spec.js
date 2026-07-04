// ingest/tests/db.spec.js
//
// Regression locks for the shared db helper (ingest/src/db.js) and the
// nodes/edges schema it establishes. Each spec uses a fresh temp SQLite
// file per test so runs never collide or leave stale state.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'graph-db-test-')),
    'graph.db'
  );
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(path.dirname(tmpDbPath), { recursive: true, force: true });
});

describe('initSchema', () => {
  it('creates the nodes and edges tables with the documented columns', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((row) => row.name);
    expect(tables).toContain('nodes');
    expect(tables).toContain('edges');

    const nodeCols = db.prepare('PRAGMA table_info(nodes)').all();
    expect(nodeCols.map((c) => c.name)).toEqual(['id', 'type', 'name', 'attrs_json']);
    const idCol = nodeCols.find((c) => c.name === 'id');
    expect(idCol.pk).toBe(1);
    const typeCol = nodeCols.find((c) => c.name === 'type');
    expect(typeCol.notnull).toBe(1);

    const edgeCols = db.prepare('PRAGMA table_info(edges)').all();
    expect(edgeCols.map((c) => c.name)).toEqual(['id', 'src', 'rel', 'dst', 'attrs_json']);
    const srcCol = edgeCols.find((c) => c.name === 'src');
    expect(srcCol.notnull).toBe(1);
    const relCol = edgeCols.find((c) => c.name === 'rel');
    expect(relCol.notnull).toBe(1);
    const dstCol = edgeCols.find((c) => c.name === 'dst');
    expect(dstCol.notnull).toBe(1);
  });

  it('creates all five documented indexes', () => {
    const indexNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index'")
      .all()
      .map((row) => row.name);

    for (const expected of [
      'idx_nodes_type',
      'idx_nodes_name',
      'idx_edges_src',
      'idx_edges_rel',
      'idx_edges_dst',
    ]) {
      expect(indexNames).toContain(expected);
    }
  });

  it('enforces a UNIQUE constraint on edges(src, rel, dst)', () => {
    // sqlite_master won't list the UNIQUE column constraint as a named
    // index directly here (it becomes an autoindex), so assert behavior:
    // a direct duplicate raw INSERT (bypassing upsertEdge) must fail.
    db.prepare(
      'INSERT INTO edges (src, rel, dst, attrs_json) VALUES (?, ?, ?, NULL)'
    ).run('a', 'owns', 'b');

    expect(() =>
      db
        .prepare('INSERT INTO edges (src, rel, dst, attrs_json) VALUES (?, ?, ?, NULL)')
        .run('a', 'owns', 'b')
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('is idempotent: calling initSchema again on an existing db does not throw', () => {
    expect(() => initSchema(db)).not.toThrow();
    // Table/index set is unchanged.
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((row) => row.name);
    expect(tables).toContain('nodes');
    expect(tables).toContain('edges');
  });

  it('is idempotent across process restarts: reopening the same file and re-initializing works', () => {
    db.close();
    const reopened = openDb(tmpDbPath);
    expect(() => initSchema(reopened)).not.toThrow();
    const tables = reopened
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row) => row.name);
    expect(tables).toContain('nodes');
    expect(tables).toContain('edges');
    reopened.close();
    // Reassign so afterEach's db.close() doesn't double-close.
    db = { close: () => {} };
  });
});

describe('upsertNode', () => {
  it('round-trips a node insert', () => {
    upsertNode(db, {
      id: 'yacht:1',
      type: 'yacht',
      name: 'Serenity',
      attrs: { lengthFt: 42 },
    });

    const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get('yacht:1');
    expect(row).toEqual({
      id: 'yacht:1',
      type: 'yacht',
      name: 'Serenity',
      attrs_json: JSON.stringify({ lengthFt: 42 }),
    });
  });

  it('updates an existing node on conflict rather than duplicating it', () => {
    upsertNode(db, { id: 'yacht:1', type: 'yacht', name: 'Serenity' });
    upsertNode(db, { id: 'yacht:1', type: 'yacht', name: 'Serenity II' });

    const rows = db.prepare('SELECT * FROM nodes WHERE id = ?').all('yacht:1');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Serenity II');
  });

  it('requires id and type', () => {
    expect(() => upsertNode(db, { type: 'yacht' })).toThrow();
    expect(() => upsertNode(db, { id: 'yacht:1' })).toThrow();
  });

  it('preserves name and attrs on a later partial upsert that omits them', () => {
    upsertNode(db, {
      id: 'yacht:1',
      type: 'yacht',
      name: 'Serenity',
      attrs: { lengthFt: 42 },
    });

    // A later partial upsert (e.g. a mapper that only knows the id/type
    // at this point) must NOT wipe out the previously stored name/attrs
    // with NULL.
    upsertNode(db, { id: 'yacht:1', type: 'yacht' });

    const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get('yacht:1');
    expect(row.type).toBe('yacht');
    expect(row.name).toBe('Serenity');
    expect(row.attrs_json).toBe(JSON.stringify({ lengthFt: 42 }));
  });
});

describe('upsertEdge', () => {
  it('round-trips an edge insert', () => {
    upsertEdge(db, { src: 'yacht:1', rel: 'built_by', dst: 'builder:1', attrs: { year: 1998 } });

    const row = db
      .prepare('SELECT src, rel, dst, attrs_json FROM edges WHERE src = ? AND rel = ? AND dst = ?')
      .get('yacht:1', 'built_by', 'builder:1');
    expect(row).toEqual({
      src: 'yacht:1',
      rel: 'built_by',
      dst: 'builder:1',
      attrs_json: JSON.stringify({ year: 1998 }),
    });
  });

  it('is idempotent on (src, rel, dst): re-running upsertEdge does not create duplicate edges', () => {
    upsertEdge(db, { src: 'yacht:1', rel: 'built_by', dst: 'builder:1' });
    upsertEdge(db, { src: 'yacht:1', rel: 'built_by', dst: 'builder:1' });
    upsertEdge(db, { src: 'yacht:1', rel: 'built_by', dst: 'builder:1' });

    const count = db
      .prepare('SELECT COUNT(*) AS count FROM edges WHERE src = ? AND rel = ? AND dst = ?')
      .get('yacht:1', 'built_by', 'builder:1').count;
    expect(count).toBe(1);
  });

  it('treats a different rel between the same src/dst as a distinct edge', () => {
    upsertEdge(db, { src: 'yacht:1', rel: 'built_by', dst: 'builder:1' });
    upsertEdge(db, { src: 'yacht:1', rel: 'owned_by', dst: 'builder:1' });

    const count = db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;
    expect(count).toBe(2);
  });

  it('requires src, rel, and dst', () => {
    expect(() => upsertEdge(db, { rel: 'built_by', dst: 'builder:1' })).toThrow();
    expect(() => upsertEdge(db, { src: 'yacht:1', dst: 'builder:1' })).toThrow();
    expect(() => upsertEdge(db, { src: 'yacht:1', rel: 'built_by' })).toThrow();
  });

  it('preserves attrs on a later partial upsert that omits them', () => {
    upsertEdge(db, { src: 'yacht:1', rel: 'built_by', dst: 'builder:1', attrs: { year: 1998 } });

    // A later re-upsert of the same (src, rel, dst) that doesn't supply
    // attrs must NOT wipe out the previously stored attrs with NULL.
    upsertEdge(db, { src: 'yacht:1', rel: 'built_by', dst: 'builder:1' });

    const row = db
      .prepare('SELECT attrs_json FROM edges WHERE src = ? AND rel = ? AND dst = ?')
      .get('yacht:1', 'built_by', 'builder:1');
    expect(row.attrs_json).toBe(JSON.stringify({ year: 1998 }));
  });
});

describe('module importability', () => {
  it('exposes openDb, initSchema, upsertNode, upsertEdge as named exports', async () => {
    const mod = await import('../src/db.js');
    expect(typeof mod.openDb).toBe('function');
    expect(typeof mod.initSchema).toBe('function');
    expect(typeof mod.upsertNode).toBe('function');
    expect(typeof mod.upsertEdge).toBe('function');
  });
});
