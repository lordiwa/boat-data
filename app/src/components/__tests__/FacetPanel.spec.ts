// TASK-030: FacetPanel rendering contract.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FacetPanel from '@/components/FacetPanel.vue';
import { buildFacetIndex, computeFacetViews } from '@/utils/facets';
import { fixtureGraph } from '@/__tests__/support/facetFixture';

// Harm: a zero-count value that vanishes (instead of being disabled) strands the user, and a band
// button without aria-pressed is invisible state for screen-reader users.
describe('FacetPanel', () => {
  it('renders zero-count values disabled (not hidden) and band buttons with aria-pressed', () => {
    const g = fixtureGraph();
    const idx = buildFacetIndex('marina', g.nodes.filter((n) => n.type === 'marina'), g.meta.facets?.marina);
    const views = computeFacetViews({ subdivision: ['Florida'], berths_band: ['150-400'] }, idx);
    const w = mount(FacetPanel, { props: { facets: views.facets, geo: views.geo, activeCount: 2 } });

    const fuelDock = w.findAll('fieldset[data-facet="facility_category"] label').find((l) => l.text().includes('Fuel dock'))!;
    expect(fuelDock.exists()).toBe(true);
    expect((fuelDock.find('input').element as HTMLInputElement).disabled).toBe(true);

    const bands = w.findAll('fieldset[data-facet="berths_band"] button');
    expect(bands.map((b) => b.text().split(' ')[0])).toEqual(['<50', '50-150', '150-400', '400+']);
    expect(bands.map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
    expect(bands.map((b) => b.attributes('disabled') !== undefined)).toEqual([true, true, false, true]);
    expect(w.findAll('fieldset legend').length).toBeGreaterThan(5);
  });
});
