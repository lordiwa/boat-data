// TASK-032 AC4: a 3-token search over the REAL graph stays under 20 ms and the index is built once per load.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it, vi } from 'vitest';
import { useGraphStore } from '@/stores/graph';
import { parseQuery, searchEntries } from '@/utils/search';

const file = resolve(__dirname, '../../../public/data/graph.json');
const present = existsSync(file);
if (!present) console.warn(`SKIPPED: TASK-032 benchmark needs ${file} (run npm run sync-graph); not a pass.`);

describe('global search benchmark (real graph)', () => {
  // Harm: a per-keystroke scan slower than 20 ms makes typing lag; rebuilding the index per search wastes it.
  it.skipIf(!present)('3-token query < 20 ms; searchIndex built once per load', async () => {
    setActivePinia(createPinia());
    const data = JSON.parse(readFileSync(file, 'utf8'));
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => data }));
    const store = useGraphStore();
    await store.load();
    const index = store.searchIndex;
    expect(index.length).toBe(data.nodes.length);
    const q = parseQuery('dry stack fort lauderdale', store.searchVocab);
    searchEntries(index, q); // warm-up
    const t0 = performance.now();
    const hits = searchEntries(index, q);
    const ms = performance.now() - t0;
    console.log(`search 3 tokens over ${index.length} nodes: ${ms.toFixed(2)} ms, ${hits.length} hits`);
    expect(hits.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(20);
    const wall = parseQuery('a '.repeat(2500), store.searchVocab); // pasted wall of one-letter words: de-duplicated to one term
    const w0 = performance.now();
    searchEntries(index, wall);
    const wallMs = performance.now() - w0;
    console.log(`search 2500 one-letter words: ${wallMs.toFixed(2)} ms`);
    expect(wallMs).toBeLessThan(20);
    await store.load(); // already loaded: must not rebuild
    expect(store.searchIndex).toBe(index);
  });
});
