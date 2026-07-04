---
project_name: datayacht
project_type: web-saas
generated_at: 2026-07-03T21:52:07.284Z
schema_version: 1
---

## Problem
The user has tons of scattered, unstructured yacht data spread across 82 exported research documents in /knowledge, with no way to query it, explore relationships between vessels, builders, owners and places, or view it in clean, readable form.

### Goals
- Turn the scattered /knowledge corpus into a structured, queryable knowledge graph of yachts, builders, marinas, yacht clubs, owners, engines and related entities
- Provide a Vue 3 web interface to query the graph and read results in easy-to-read tables and graphics
- Behave like a personal 'Wikipedia for yachts' with fast lookup and cross-linked entity pages
- Ship read-only first, with data ingested via scripts, and deploy to Firebase

### Scope (in)
- Ingestion pipeline that extracts entities and relationships from the /knowledge markdown corpus into a SQLite + generated JSON graph
- Vue 3 SPA to browse, search and filter entities
- Data presented as easy-to-read tables and simple graphics
- Cross-linked entity pages (yacht -> builder -> owner -> marina / region)
- Firebase as the eventual deployment target, with local dev first

### Scope (out)
- User accounts and authentication
- Monetization, payments, paywalls, and affiliate links

## Stack
- frontend_framework: vue3-vite
- backend_framework: node-ingestion-scripts (no live backend in v1; static data served with the SPA)
- database: SQLite (nodes + edges tables) plus a generated JSON graph for the client
- web_deployment_target: firebase (local dev first)

## Testing conventions
Use the testing tool that fits this stack — the project standard is to keep a fast unit suite runnable via the project's default test command, and to write a failing test before any new behavior lands. Tests live next to the code they exercise (or under a top-level tests/ tree, whichever already exists in this repo); follow the local convention rather than introducing a new one.

## Linting and formatting
Run the project's linter and formatter before every commit. If the repo ships a config (e.g., .eslintrc, ruff.toml, .prettierrc, gofmt defaults), defer to it without arguing; if no config exists yet, use the ecosystem-standard tool and add a minimal config rather than reformatting the whole tree in a drive-by change.

## Type-specific guidance
- Treat the browser and the backend as separate trust boundaries — never assume client-supplied data is well-formed at HTTP entry points.
- Reach for end-to-end tests sparingly; cover routing and frontend state-transition logic with focused integration tests at the boundary.
- Sessions and auth tokens are sensitive — never log them, and isolate any HTTP middleware that touches them behind a small, reviewable surface.
- Performance budgets matter: measure both server latency and browser time-to-interactive when changing data-fetch patterns.
