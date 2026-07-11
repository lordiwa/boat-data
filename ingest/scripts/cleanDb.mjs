// ingest/scripts/cleanDb.mjs
//
// TASK-024 review residual 6 (root-cause hardening): deletes the local
// ingest/data/graph.db (+ its WAL/SHM/journal sidecar files) before a
// fresh `node src/ingest.js` run, via `npm run ingest:clean`.
//
// WHY THIS EXISTS: `npm run ingest` (plain `node src/ingest.js`) opens
// ingest/data/graph.db if it already exists and upserts into it — by
// design, so a single ingest run is internally idempotent (upsertNode/
// upsertEdge never duplicate a row). But upserts only ADD/UPDATE; nothing
// in the pipeline ever DELETES a node/edge that the CURRENT mapper code no
// longer produces. Across many manual `npm run ingest` invocations during a
// long dev session (iterating on mapper code between runs), that db file
// can accumulate stale rows/attrs a clean run would never produce on its
// own — the exact TASK-024 review HIGH finding (a committed graph.json
// exported from such a stale db, differing from a true clean-slate run on
// ~200 yacht nodes' attrs, though every per-type COUNT still matched).
//
// This is intentionally a SEPARATE script from `npm run ingest`, not a
// change to ingest.js's own default behavior: the real-corpus
// double-ingest-idempotency test suite (see tests/realCorpusExport.spec.js)
// specifically calls runIngest() TWICE against the SAME db on purpose, to
// verify a second run doesn't mint new nodes — always wiping the db first
// would defeat that test's entire point. Use `npm run ingest:clean`
// (this script) specifically whenever regenerating the artifact that gets
// COMMITTED (ingest/data/graph.json) for a PR/release, and plain
// `npm run ingest` for iterative dev/testing where reusing the existing db
// is fine (or even desired, for speed).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');

const sidecarSuffixes = ['', '-wal', '-shm', '-journal'];
for (const suffix of sidecarSuffixes) {
  const filePath = path.join(dataDir, `graph.db${suffix}`);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
    console.log(`[clean-db] removed ${filePath}`);
  }
}
console.log('[clean-db] done — next `npm run ingest` will build graph.db from scratch.');
