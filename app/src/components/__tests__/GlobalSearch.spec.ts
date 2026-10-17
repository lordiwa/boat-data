// TASK-032: GlobalSearch rendering contract (groups, type chips, subtitle, live region, open-as-list).
import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import GlobalSearch from '@/components/GlobalSearch.vue';
import { useGraphStore } from '@/stores/graph';
import { fixtureGraph } from '@/__tests__/support/facetFixture';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const g = fixtureGraph();
  g.nodes.push({ id: 'b1', type: 'builder', name: 'Miami Yachtworks', attrs: {} });
  g.indexes.by_type.builder = ['b1'];
  vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => g }));
  await useGraphStore().load();
  const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/entity/:id', name: 'entity', component: { template: '<div/>' } },
      { path: '/:p(.*)*', component: { template: '<div/>' } },
    ] });
  const w = mount(GlobalSearch, { global: { plugins: [pinia, router] }, attachTo: document.body });
  await router.isReady();
  const input = w.find('input');
  const type = async (text: string) => {
    await input.setValue(text);
    await input.trigger('focus');
    await sleep(150);
    await flushPromises();
  };
  return { w, input, type, router };
}

describe('GlobalSearch', () => {
  // Harm: results with no type grouping/narrowing, or a made-up subtitle for geo-less nodes, mislead the user;
  // a silent live region leaves screen-reader users without a result count; a wrong list link misdirects them.
  it('AC3/AC5/AC6: groups with narrowing chips, subtitle only with geo, live-region count, open-as-list link, keyboard', async () => {
    const { w, input, type, router } = await setup();
    await type('miami');
    const groupNames = w.findAll('.global-search__group-header span:first-child').map((s) => s.text());
    expect(groupNames).toEqual(['Builders', 'Marinas']);
    const options = w.findAll('[role="option"]');
    expect(options[0].find('.global-search__item-sub').exists()).toBe(false); // builder has no attrs.geo
    expect(options[1].find('.global-search__item-sub').text()).toBe('Miami, United States');
    expect(w.get('[data-testid="search-live"]').text()).toBe('2 results');
    expect(w.find('.global-search__open-list').exists()).toBe(false);

    await w.findAll('.global-search__chip').find((c) => c.text().startsWith('Marinas'))!.trigger('click');
    expect(w.findAll('[role="option"]').length).toBe(1);

    await type('zzzz');
    expect(w.get('[data-testid="search-live"]').text()).toBe('No matches for zzzz');

    await type('marina: in:florida facility_category:dry stack');
    const link = w.get('.global-search__open-list');
    expect(link.attributes('href')).toBe('/browse/marina?subdivision=Florida&facility_category=dry%20stack');
    await type('marina: in:florida facility_category:dry stack zz');
    expect(w.find('.global-search__open-list').exists()).toBe(false);

    await type('marina: in:florida');
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(w.findAll('[role="option"]').filter((o) => o.attributes('aria-selected') === 'true').length).toBe(1);
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/entity/m2');
    w.unmount();
  });
});
