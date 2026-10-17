// TASK-030: EntityView geo breadcrumb + EntityListView filtered CSV, mounted over the fixture graph.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { routes } from '@/router';
import { useGraphStore } from '@/stores/graph';
import { fixtureGraph } from '@/__tests__/support/facetFixture';
import EntityView from '@/views/EntityView.vue';
import EntityListView from '@/views/EntityListView.vue';
import * as csv from '@/utils/csv';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function setup(path: string, component: Component, props: Record<string, string>) {
  const pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => fixtureGraph() }));
  await useGraphStore(pinia).load();
  const router = createRouter({ history: createMemoryHistory(), routes });
  router.push(path);
  await router.isReady();
  const w = mount(component, { props, global: { plugins: [pinia, router] } });
  await flushPromises();
  return w;
}

describe('facet views', () => {
  // Harm: a missing breadcrumb hides the way from a marina to its region; a crumb on a geo-less
  // node would link to a filter that can never match.
  it('EntityView renders country > subdivision > city crumbs linking to the same-type filtered list, and none without attrs.geo', async () => {
    const w = await setup('/entity/m1', EntityView, { id: 'm1' });
    const links = w.findAll('nav[aria-label="Location"] a');
    expect(links.map((a) => a.text())).toEqual(['United States', 'Florida', 'Fort Lauderdale']);
    expect(links.map((a) => a.attributes('href'))).toEqual([
      '/browse/marina?country=US',
      '/browse/marina?country=US&subdivision=Florida',
      '/browse/marina?country=US&subdivision=Florida&city=Fort+Lauderdale',
    ]);
    const none = await setup('/entity/m5', EntityView, { id: 'm5' });
    expect(none.find('nav[aria-label="Location"]').exists()).toBe(false);
  });

  // Harm: CSV that ignores the facet selection exports rows the user cannot see (or misses ones they can).
  it('EntityListView exports exactly the filtered rows, with the location breadcrumb and a chip per value', async () => {
    const spy = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => {});
    const w = await setup('/browse/marina?country=US&subdivision=Florida', EntityListView, { type: 'marina' });
    expect(w.find('.entity-list__crumbs').text().replace(/\s+/g, ' ')).toBe('United States > Florida');
    expect(w.findAll('.chips__chip').length).toBe(2);
    const button = w.findAll('button').find((b) => b.text() === 'Download CSV')!;
    await button.trigger('click');
    const text = spy.mock.calls[0][1];
    const lines = text.trim().split(/\r?\n/);
    expect(lines.length).toBe(1 + 2);
    expect(text).toContain('M1');
    expect(text).toContain('M2');
    expect(text).not.toContain('M3');
  });
});
