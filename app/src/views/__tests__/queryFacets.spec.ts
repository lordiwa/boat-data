// TASK-031 AC1: the query builder's condition editor offers vocabulary dropdowns for facet/geo fields only.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { routes } from '@/router';
import { useGraphStore } from '@/stores/graph';
import { fixtureGraph } from '@/__tests__/support/facetFixture';
import QueryView from '@/views/QueryView.vue';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('QueryView facet fields', () => {
  // Harm: a free-text box for a controlled vocabulary invites typos that match nothing, and a dropdown on a raw
  // number field would block range filters.
  it('facet field -> grouped fields + multi-select with counts + "Open in browse"; raw attribute -> number input', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => fixtureGraph() }));
    await useGraphStore(pinia).load();
    const router = createRouter({ history: createMemoryHistory(), routes });
    router.push('/query?type=marina');
    await router.isReady();
    const w = mount(QueryView, { global: { plugins: [pinia, router] } });
    await flushPromises();

    await w.findAll('button').find((b) => b.text() === 'Add filter' || b.text() === '+ Add filter')!.trigger('click');
    const field = w.find('select[aria-label="Field"]');
    expect(w.findAll('optgroup').map((g) => g.attributes('label'))).toEqual(['Categories', 'Location', 'Attributes', 'Relations']);

    await field.setValue('cat_facility_category');
    const values = w.find('select[multiple]');
    expect(values.attributes('aria-label')).toBe('Facility type values');
    expect(values.findAll('option').map((o) => o.text())).toEqual(['Boatyard (4)', 'Dry stack (2)', 'Fuel dock (1)']);
    expect(w.find('select[aria-label="Comparison"]').findAll('option').map((o) => o.text())).toEqual(['is any of', 'is not']);
    expect(w.find('a[href^="/browse/marina"]').exists()).toBe(false);

    await values.setValue(['dry stack', 'boatyard']);
    expect(w.find('.query-view__describe').text()).toBe('Showing marinas where Facility type is any of Boatyard, Dry stack.');
    expect(w.find('a.btn').text()).toBe('Open in browse');
    expect(w.find('a.btn').attributes('href')).toBe('/browse/marina?facility_category=boatyard,dry+stack');

    await field.setValue('berths');
    expect(w.find('select[multiple]').exists()).toBe(false);
    expect(w.find('input[type="number"]').exists()).toBe(true);
    expect(w.find('a.btn').exists()).toBe(false);

    // Harm: a shared link that silently loses its filter (or keeps values the vocabulary lacks) shows a sentence,
    // URL and multi-select that disagree. Restore from route.query, prune unknown values, drop empty/unknown filters.
    await field.setValue('cat_facility_category');
    expect(w.text()).toContain('Hold Ctrl (or Cmd) to select several.');
    const restore = async (query: string) => {
      const r = createRouter({ history: createMemoryHistory(), routes });
      r.push(`/query?type=marina&${query}`);
      await r.isReady();
      const m = mount(QueryView, { global: { plugins: [pinia, r] } });
      await flushPromises();
      return m;
    };
    const ok = await restore('f=cat_facility_category.in.dry+stack,zzz');
    expect(ok.vm.$route.query.f).toEqual(['cat_facility_category.in.dry stack']);
    const selected = ok.find('select[multiple]').findAll('option').filter((o) => (o.element as HTMLOptionElement).selected);
    expect(selected.map((o) => o.text())).toEqual(['Dry stack (2)']);
    expect(ok.find('.query-view__describe').text()).toBe('Showing marinas where Facility type is Dry stack.');
    // ISO codes the engine matches (geo.country_code) must survive the prune, as typed.
    const iso = await restore('f=geo_country.in.US');
    expect(iso.findAll('tbody tr')).toHaveLength(3);
    expect([iso.vm.$route.query.f].flat()).toEqual(['geo_country.in.US']);
    const none = await restore('f=cat_facility_category.in.zzz&f=cat_constructor.in.x');
    expect(none.find('select[multiple]').exists()).toBe(false);
    expect(none.find('.query-view__describe').text()).toBe('Showing all marinas.');
  });
});
