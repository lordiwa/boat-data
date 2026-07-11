# ingest

Ingestion pipeline for DataYacht. Parses the `/knowledge` markdown corpus
into a SQLite `nodes`/`edges` graph (see `src/db.js` for the schema), then
exports `ingest/data/graph.json` (consumed by the Vue app) and writes the
`reports/ingestion-summary.md` / `reports/completeness.json` reports.

## Setup

```sh
cd ingest
npm install
```

## Run

```sh
npm run ingest
```

This opens (creating if needed) `ingest/data/graph.db`, applies the schema
idempotently, and logs a summary of node/edge counts by type. It is safe
to run repeatedly for iterative dev/testing — re-running does not create
duplicate rows or duplicate schema objects, and every mapper/retrofit hook
(graphCleanup.js, regionCanonicalization.js, identifiability.js, ...) is
idempotent.

The database path can be overridden with the `GRAPH_DB_PATH` environment
variable, e.g.:

```sh
GRAPH_DB_PATH=./data/tmp.db npm run ingest
```

### Regenerating the COMMITTED `ingest/data/graph.json`/`reports/completeness.json`

**Always use a clean-slate run when regenerating the artifacts that get
committed for a PR/release — never just `npm run ingest` against whatever
`ingest/data/graph.db` happens to already exist on disk:**

```sh
npm run ingest:clean   # deletes graph.db (+ WAL/SHM/journal), then ingests fresh
npm run score
```

**Why this matters (TASK-024 review HIGH incident):** `ingest/data/graph.db`
is git-ignored and, once created, persists across every subsequent
`npm run ingest` invocation — upsertNode/upsertEdge only ADD or UPDATE rows,
nothing in the pipeline ever DELETES a node/edge a current mapper no longer
produces. Across many manual `npm run ingest` runs during a dev session
(iterating on mapper code between runs), that db file can silently
accumulate stale rows/attrs (e.g. a notes/conflicts field appended to on
every run instead of being idempotently deduped) that a true clean-slate
run would never produce. Because upserts never delete, every per-type node
COUNT still matched what a clean run would produce — only individual
nodes' attrs content drifted — so this class of staleness does NOT show up
in count-based tests; it was caught in review by diffing a clean-slate
export against the committed one (now automated — see
`tests/realCorpusExport.spec.js`'s "committed artifact freshness" describe
block, which fails loudly if a future commit of `ingest/data/graph.json`
isn't reproducible from a clean-slate ingest).

`npm run ingest:clean` (see `scripts/cleanDb.mjs`) is a SEPARATE script from
`npm run ingest`, not a change to its default behavior — the double-ingest
idempotency test suite specifically calls the pipeline twice against the
SAME db on purpose (to verify a second run mints nothing new), so wiping
the db on every `npm run ingest` call would defeat that test's point.

## Test

```sh
npm test
```

## Layout

- `src/db.js` — shared SQLite helper: `openDb()`, `initSchema(db)`,
  `upsertNode(db, {...})`, `upsertEdge(db, {...})`.
- `src/ingest.js` — entry point (`npm run ingest`).
- `src/parsers/` — corpus parsers (markdown -> raw records).
- `src/mappers/` — mappers (raw records -> graph nodes/edges) plus the
  retrofit-hook cleanup passes (graphCleanup.js, regionCanonicalization.js,
  identifiability.js) that run once per ingest, after every file's nodes
  exist.
- `src/exporters/` — exporters (SQLite graph -> `ingest/data/graph.json`).
- `src/reporters/` — the ingestion-summary and completeness-score reports.
- `scripts/cleanDb.mjs` — deletes the local `graph.db` (+ sidecars) before
  a fresh ingest; used by `npm run ingest:clean` (see "Regenerating the
  COMMITTED..." above).
- `tests/` — vitest specs.

## Schema

```
nodes(id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT, attrs_json TEXT)
edges(id INTEGER PRIMARY KEY AUTOINCREMENT, src TEXT NOT NULL, rel TEXT NOT NULL,
      dst TEXT NOT NULL, attrs_json TEXT, UNIQUE(src, rel, dst))

idx_nodes_type, idx_nodes_name, idx_edges_src, idx_edges_rel, idx_edges_dst
```
