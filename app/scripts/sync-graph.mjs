// app/scripts/sync-graph.mjs
//
// TASK-007: copies the ingestion pipeline's generated graph.json into
// app/public/data/ so Vite serves it as a static asset the SPA can fetch()
// at startup. Runs as a predev/prebuild step so `npm run dev` / `npm run
// build` always ship the latest export without a manual copy step.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const src = path.resolve(appRoot, '..', 'ingest', 'data', 'graph.json');
const destDir = path.resolve(appRoot, 'public', 'data');
const dest = path.resolve(destDir, 'graph.json');

if (!fs.existsSync(src)) {
  console.error(`[sync-graph] source graph not found at ${src}`);
  console.error('[sync-graph] run the ingestion pipeline first (ingest/src/ingest.js) to generate it.');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

const { size } = fs.statSync(dest);
console.log(`[sync-graph] copied ${src} -> ${dest} (${(size / 1024 / 1024).toFixed(2)} MB)`);
