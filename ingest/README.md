# ingest

Ingestion pipeline for DataYacht. Parses the `/knowledge` markdown corpus
into a SQLite `nodes`/`edges` graph (see `src/db.js` for the schema), and
will later export a generated `graph.json` for the Vue client.

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
to run repeatedly — re-running does not create duplicate rows or duplicate
schema objects.

The database path can be overridden with the `GRAPH_DB_PATH` environment
variable, e.g.:

```sh
GRAPH_DB_PATH=./data/tmp.db npm run ingest
```

## Test

```sh
npm test
```

## Layout

- `src/db.js` — shared SQLite helper: `openDb()`, `initSchema(db)`,
  `upsertNode(db, {...})`, `upsertEdge(db, {...})`.
- `src/ingest.js` — entry point (`npm run ingest`).
- `src/parsers/` — corpus parsers (markdown -> raw records). Empty for now.
- `src/mappers/` — mappers (raw records -> graph nodes/edges). Empty for now.
- `src/exporters/` — exporters (SQLite graph -> `graph.json`). Empty for now.
- `tests/` — vitest specs.

## Schema

```
nodes(id TEXT PRIMARY KEY, type TEXT NOT NULL, name TEXT, attrs_json TEXT)
edges(id INTEGER PRIMARY KEY AUTOINCREMENT, src TEXT NOT NULL, rel TEXT NOT NULL,
      dst TEXT NOT NULL, attrs_json TEXT, UNIQUE(src, rel, dst))

idx_nodes_type, idx_nodes_name, idx_edges_src, idx_edges_rel, idx_edges_dst
```
