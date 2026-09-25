# DataYacht

DataYacht turns a corpus of scattered yacht research notes into a queryable
knowledge graph and a fast web interface — a personal "Wikipedia for
yachts." Source material lives as 80+ curated markdown documents under
`knowledge/`, covering yachts, builders, marinas, yacht clubs, owners,
engines, and the relationships between them.

The pipeline has three stages. The **ingestion pipeline** (`ingest/`) parses
`knowledge/*.md` into a SQLite `nodes`/`edges` graph, then exports it as a
single generated `ingest/data/graph.json`. The **Vue app** (`app/`) syncs
that file into `app/public/data/graph.json` at dev/build time and serves it
as a static asset the SPA fetches on startup, rendering cross-linked entity
pages, search, guided queries, and reports entirely client-side — there is
no live backend. The **deploy target** is Firebase Hosting, serving the
built SPA and its baked-in `graph.json` as static files.

## Quickstart

Ingest the knowledge corpus into a graph:

```sh
cd ingest
npm install
npm run ingest
```

This creates/updates `ingest/data/graph.db` (SQLite) and exports
`ingest/data/graph.json`.

Run the app in dev mode:

```sh
cd app
npm install
npm run dev
```

`predev` / `prebuild` automatically copy the latest `ingest/data/graph.json`
into `app/public/data/graph.json` before Vite starts — see
`app/scripts/sync-graph.mjs`.

## Deploy (Firebase Hosting)

Hosting config lives at the repo root (`firebase.json`, `.firebaserc`)
because it needs to serve `app/dist` — the SPA build output — while sitting
alongside `ingest/` and `knowledge/`.

**The site is live at <https://boat-site-e66fb.web.app>** (Firebase project
`boat-site-e66fb`). The steps below are only needed on a fresh machine or to
retarget a different project.

### One-time setup

1. The Firebase CLI is a devDependency of `app/` — `npm install` in `app/`
   provides it, so no global install is required.
2. Authenticate: `npx firebase login`.
3. Choose a Firebase project:
   - `.firebaserc` at the repo root pins the `default` alias to
     `boat-site-e66fb`, so a normal deploy needs no further setup.
   - To target a *different* project, create one at
     [console.firebase.google.com](https://console.firebase.google.com) (or run
     `firebase projects:create`), then update the alias from the repo root:

     ```sh
     firebase use --add
     ```

     and selecting your project when prompted (this rewrites the `default`
     alias in `.firebaserc`).

### Routine deploy

```sh
cd app
npm run deploy
```

This runs `npm run build` (which regenerates `dist/`, including
`dist/data/graph.json`) and then `firebase deploy --only hosting --config
../firebase.json`, which points the Firebase CLI at the root-level
`firebase.json` so it can be run from `app/` without duplicating hosting
config in two places.

### Data refresh flow

Since `graph.json` is baked into the build (not fetched from a live
backend), refreshing the deployed data is: re-run ingestion, rebuild, and
redeploy.

```sh
cd ingest && npm run ingest      # re-parses knowledge/*.md -> graph.json
cd ../app && npm run deploy      # sync-graph copies graph.json into dist, then deploys
```

### Hosting config

- `firebase.json` (repo root): `public` is `app/dist`; a catch-all rewrite
  sends every route to `/index.html` so the Vue Router's client-side routes
  (e.g. `/entity/yacht:koru`) resolve correctly on refresh/deep-link.
  Cache headers: `/data/graph.json` gets a modest `max-age=3600,
  stale-while-revalidate=86400` (data can change on redeploy), while
  `/assets/**` (hashed filenames from the Vite build) get
  `max-age=31536000, immutable`.
- `.firebaserc` (repo root): the `default` project alias.

### Smoke-test checklist (run after every deploy)

On the live Hosting URL (`https://<project-id>.web.app` or your custom
domain):

- [ ] Home page loads and the graph data is visible (entity counts /
      listing render, not a blank page or fetch error).
- [ ] Search works: type a query (e.g. a yacht or builder name) and get
      matching results.
- [ ] One guided query returns results.
- [ ] One report page renders (tables/graphics populated, not empty).
- [ ] A deep link to an entity page (e.g. `/entity/yacht:koru`) loads
      directly (not a 404) — confirms the SPA rewrite is live.

## Local verification without deploying

You can validate the hosting config and SPA rewrite behavior without a
Firebase login:

```sh
cd app
npm run build
npx serve -s dist -l 5050
```

Then check:

- `curl http://localhost:5050/` -> `200`, app shell HTML.
- `curl http://localhost:5050/data/graph.json` -> `200`, ~1.9 MB.
- `curl http://localhost:5050/entity/yacht:koru` -> `200`, app shell HTML
  (confirms SPA-fallback routing works before it's wired into Firebase's
  own rewrite rule).
