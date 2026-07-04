// ingest/src/db.js
//
// Shared SQLite helper for the ingestion pipeline's nodes+edges graph
// database. Uses better-sqlite3 (synchronous, zero-config, no server).
//
// Schema:
//   nodes(id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT, attrs_json TEXT)
//   edges(id INTEGER PRIMARY KEY AUTOINCREMENT, src TEXT NOT NULL,
//         rel TEXT NOT NULL, dst TEXT NOT NULL, attrs_json TEXT)
//     UNIQUE(src, rel, dst) so re-ingestion never creates duplicate edges.
//
// Indexes: idx_nodes_type, idx_nodes_name, idx_edges_src, idx_edges_rel,
// idx_edges_dst.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default DB path lives at ingest/data/graph.db. Configurable via the
// GRAPH_DB_PATH env var so tests (and future tooling) can point at a
// temporary database instead of the real one.
export const DEFAULT_DB_PATH = path.resolve(__dirname, '..', 'data', 'graph.db');

export function resolveDbPath() {
  return process.env.GRAPH_DB_PATH
    ? path.resolve(process.env.GRAPH_DB_PATH)
    : DEFAULT_DB_PATH;
}

/**
 * Opens (creating if necessary) the SQLite database at the given path
 * (defaults to resolveDbPath()) and returns the better-sqlite3 Database
 * instance. Does NOT apply the schema; call initSchema(db) for that.
 */
export function openDb(dbPath = resolveDbPath()) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/**
 * Applies the nodes/edges schema and indexes. Idempotent: safe to call
 * on every run, whether the tables already exist or not.
 */
export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,
      name       TEXT,
      attrs_json TEXT
    );

    CREATE TABLE IF NOT EXISTS edges (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      src        TEXT NOT NULL,
      rel        TEXT NOT NULL,
      dst        TEXT NOT NULL,
      attrs_json TEXT,
      UNIQUE (src, rel, dst)
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
    CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
    CREATE INDEX IF NOT EXISTS idx_edges_src  ON edges(src);
    CREATE INDEX IF NOT EXISTS idx_edges_rel  ON edges(rel);
    CREATE INDEX IF NOT EXISTS idx_edges_dst  ON edges(dst);
  `);
  return db;
}

/**
 * Inserts or updates a node by id. attrs may be a plain object (will be
 * JSON-serialized) or a pre-serialized JSON string.
 *
 * On conflict, optional columns (type, name, attrs_json) are preserved
 * via COALESCE(excluded.col, col) rather than unconditionally overwritten,
 * so a later partial upsert that omits a field (e.g. {id, type} only)
 * cannot wipe out previously stored name/attrs with NULL.
 */
export function upsertNode(db, { id, type, name = null, attrs = null }) {
  if (!id) throw new Error('upsertNode: id is required');
  if (!type) throw new Error('upsertNode: type is required');

  const attrsJson = serializeAttrs(attrs);

  const stmt = db.prepare(`
    INSERT INTO nodes (id, type, name, attrs_json)
    VALUES (@id, @type, @name, @attrs_json)
    ON CONFLICT(id) DO UPDATE SET
      type = COALESCE(excluded.type, type),
      name = COALESCE(excluded.name, name),
      attrs_json = COALESCE(excluded.attrs_json, attrs_json)
  `);
  return stmt.run({ id, type, name, attrs_json: attrsJson });
}

/**
 * Inserts an edge (src, rel, dst), ignoring duplicates so re-ingestion
 * never creates repeat edges. On conflict, attrs_json is preserved via
 * COALESCE(excluded.attrs_json, attrs_json): a repeat insert that supplies
 * attrs updates them, but a repeat insert that omits attrs (attrs = null)
 * preserves whatever was previously stored rather than overwriting it
 * with NULL.
 */
export function upsertEdge(db, { src, rel, dst, attrs = null }) {
  if (!src) throw new Error('upsertEdge: src is required');
  if (!rel) throw new Error('upsertEdge: rel is required');
  if (!dst) throw new Error('upsertEdge: dst is required');

  const attrsJson = serializeAttrs(attrs);

  const stmt = db.prepare(`
    INSERT INTO edges (src, rel, dst, attrs_json)
    VALUES (@src, @rel, @dst, @attrs_json)
    ON CONFLICT(src, rel, dst) DO UPDATE SET
      attrs_json = COALESCE(excluded.attrs_json, attrs_json)
  `);
  return stmt.run({ src, rel, dst, attrs_json: attrsJson });
}

function serializeAttrs(attrs) {
  if (attrs === null || attrs === undefined) return null;
  if (typeof attrs === 'string') return attrs;
  return JSON.stringify(attrs);
}
