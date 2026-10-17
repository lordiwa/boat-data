// TASK-034: Home landing page over the fixture graph (figures, links, states, search focus).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { routes } from '@/router';
import { useGraphStore } from '@/stores/graph';
import { fixtureGraph } from '@/__tests__/support/facetFixture';
import type { GraphNode } from '@/types/graph';
import HomeView from '@/views/HomeView.vue';
import GlobalSearch from '@/components/GlobalSearch.vue';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const COUNTRIES = [
  ['US', 'United States', 721],
  ['NZ', 'New Zealand', 120],
  ['TW', 'Taiwan', 90],
  ['AU', 'Australia', 80],
  ['FR', 'France', 70],
  ['IT', 'Italy', 60],
] as const;

interface Opts {
  /** Extra nodes appended to the fixture (meta.types, node_count and by_type kept consistent). */
  extra?: GraphNode[];
  /** Replaces meta.geo.countries verbatim (for malformed payloads). */
  countries?: unknown;
  /** Overrides meta.node_count (0 simulates a loaded but empty graph). */
  nodeCount?: number;
}

async function setup(mode: 'ok' | 'error' | 'pending', Comp = HomeView, opts: Opts = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const data = fixtureGraph();
  for (const n of opts.extra ?? []) {
    data.nodes.push(n);
    (data.indexes.by_type[n.type] ??= []).push(n.id);
    data.meta.types[n.type] = (data.meta.types[n.type] ?? 0) + 1;
    data.meta.node_count += 1;
  }
  if (opts.nodeCount !== undefined) data.meta.node_count = opts.nodeCount;
  data.meta.geo = {
    countries: (opts.countries ?? COUNTRIES.map(([iso2, name, node_count]) => ({ iso2, name, node_count }))) as never,
  };
  vi.stubGlobal('fetch', async () => {
    if (mode === 'pending') return new Promise(() => {});
    return mode === 'error'
      ? { ok: false, status: 500, statusText: 'Boom', json: async () => ({}) }
      : { ok: true, status: 200, statusText: 'OK', json: async () => data };
  });
  const pending = useGraphStore(pinia).load().catch(() => {});
  if (mode !== 'pending') await pending;
  const router = createRouter({ history: createMemoryHistory(), routes });
  router.push('/');
  await router.isReady();
  const w = mount(Comp, { attachTo: document.body, global: { plugins: [pinia, router] } });
  await flushPromises();
  return w;
}

describe('HomeView', () => {
  // Harm: hard-coded or stale figures would misstate the size of the graph; a 0-count tile misleads about coverage.
  it('shows figures and tiles from the loaded graph and omits absent types', async () => {
    const w = await setup('ok');
    expect(w.find('.figures').text().replace(/\s+/g, ' ')).toBe('10 nodes, 0 edges and 6 countries.');
    const tiles = w.findAll('.tile').map((t) => [t.attributes('data-type'), t.find('.tile__count').text()]);
    expect(tiles).toEqual([['yacht', '3'], ['marina', '7']]);
    expect(w.find('.stat-card').exists()).toBe(false);
    expect(w.findAll('h1').length).toBe(1);
  });

  // Harm: a wrong route or lost ?country= sends visitors to an unfiltered or missing page.
  it('links CTAs, steps and top-five coverage to the stated routes and queries', async () => {
    // Three Taiwanese shipyards outnumber the two Taiwanese marinas, so TW must link to shipyards, not the marina fallback.
    const shipyards: GraphNode[] = ['s1', 's2', 's3'].map((id) => ({
      id, type: 'shipyard', name: id, attrs: { geo: { country_code: 'TW', country: 'Taiwan' } },
    }));
    const w = await setup('ok', HomeView, { extra: shipyards });
    const hrefs = w.findAll('a').map((a) => a.attributes('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining(['/explore', '/query', '/accessibility']),
    );
    expect(w.findAll('a').find((a) => a.text() === 'Start exploring')!.attributes('href')).toBe('/explore');
    const cov = w.findAll('.coverage__link').map((a) => a.attributes('href'));
    expect(cov).toEqual([
      '/browse/marina?country=US',
      '/browse/marina?country=NZ',
      '/browse/shipyard?country=TW',
    ]);
  });

  // Harm: a malformed meta.geo entry throws in render and blanks Home; a country with no nodes links to an unfiltered list.
  it('skips malformed or node-less country entries, keeps the top five by count, and shows empty copy for an empty graph', async () => {
    const nodes: GraphNode[] = ['FR', 'IT', 'DE', 'ES', 'PT', 'ZZ', 'ABC'].map((cc) => ({
      id: `n-${cc}`, type: 'marina', name: cc, attrs: { geo: { country_code: cc, country: cc } },
    }));
    const countries = [
      null,
      { iso2: 'ZZ', name: 'No count' },
      { iso2: 'ABC', name: 'Bad code', node_count: 99 },
      { iso2: 'xx', name: 'Nowhere', node_count: 500 },
      { iso2: 'US', name: 'United States', node_count: 721 },
      { iso2: 'it', name: 'Italy', node_count: 60 },
      { iso2: 'IT', name: 'Italy again', node_count: 59 },
      { iso2: 'FR', name: 'France', node_count: 70 },
      { iso2: 'DE', name: 'Germany', node_count: 50 },
      { iso2: 'ES', name: 'Spain', node_count: 40 },
      { iso2: 'PT', name: 'Portugal', node_count: 30 },
    ];
    const w = await setup('ok', HomeView, { extra: nodes, countries });
    expect(w.findAll('.coverage__link').map((a) => a.attributes('href'))).toEqual([
      '/browse/marina?country=US', // 721; XX (500, no nodes) is skipped
      '/browse/marina?country=FR',
      '/browse/marina?country=IT',
      '/browse/marina?country=DE',
      '/browse/marina?country=ES',
    ]);
    const notArray = await setup('ok', HomeView, { countries: { iso2: 'US' } });
    expect(notArray.find('.figures').text().replace(/\s+/g, ' ')).toContain('0 countries');
    expect(notArray.find('.coverage__link').exists()).toBe(false);
    const empty = await setup('ok', HomeView, { nodeCount: 0 });
    expect(empty.text()).toContain('no data yet');
    for (const sel of ['.figures', '.tile', '.coverage__link']) expect(empty.find(sel).exists()).toBe(false);
  });

  // Harm: figures or coverage links rendered before/without data would show 0s or dead links.
  it('renders no figures or coverage while loading or on error', async () => {
    const loading = await setup('pending');
    expect(loading.text()).toContain('Loading the knowledge graph');
    const failed = await setup('error');
    expect(failed.text()).toContain('Could not load the graph');
    for (const w of [loading, failed]) {
      expect(w.find('.figures').exists()).toBe(false);
      expect(w.find('.tile').exists()).toBe(false);
      expect(w.find('.coverage__link').exists()).toBe(false);
    }
  });

  // Harm: a Search CTA that does nothing leaves keyboard and mouse users without the promised entry point.
  it('Search CTA focuses the global search input', async () => {
    const Page = defineComponent({ render: () => h('div', [h(GlobalSearch), h(HomeView)]) });
    const w = await setup('ok', Page);
    expect(document.activeElement?.tagName).not.toBe('INPUT');
    await w.findAll('button').find((b) => b.text().startsWith('Search by name'))!.trigger('click');
    expect(document.activeElement).toBe(w.find('input[type="search"]').element);
  });
});
