// TASK-030: facet engine specs. Each test names the harm it prevents.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  applyFacetSelection,
  buildFacetIndex,
  compareBands,
  computeCounts,
  computeFacetViews,
  parseSelection,
  resolveSelection,
  selectionToQuery,
} from '@/utils/facets';
import { fixtureGraph } from '@/__tests__/support/facetFixture';
import type { GraphExport } from '@/types/graph';

const g = fixtureGraph();
const index = (type: string) =>
  buildFacetIndex(type, g.nodes.filter((n) => n.type === type), g.meta.facets?.[type]);
const ids = (s: Set<string>) => [...s].sort();

describe('facet engine', () => {
  // Harm: a wrong OR/AND mix silently shows the wrong rows (or hides the right ones) in the table.
  it('ORs within a facet, ANDs across facets, and counts each facet with itself removed', () => {
    const idx = index('marina');
    expect(ids(applyFacetSelection({ facility_category: ['dry stack', 'boatyard'] }, idx))).toEqual(['m1', 'm2', 'm3', 'm4', 'm6']);
    expect(ids(applyFacetSelection({ facility_category: ['dry stack', 'boatyard'], berths_band: ['150-400'] }, idx))).toEqual(['m1', 'm2']);
    expect(ids(applyFacetSelection({ services: ['repair', 'fuel'] }, idx))).toEqual(['m1', 'm2']);
    expect(applyFacetSelection({}, idx).size).toBe(6);

    const sel = { subdivision: ['Florida'], facility_category: ['dry stack'] };
    const counts = computeCounts(sel, idx);
    // own facet removed: boatyard stays selectable (1 Florida boatyard), fuel dock has none (0)
    expect(counts.get('facility_category')!.get('boatyard')).toBe(1);
    expect(counts.get('facility_category')!.get('fuel dock')).toBe(0);
    // other facets see the full selection (Florida AND dry stack = m1 only)
    expect(counts.get('berths_band')!.get('150-400')).toBe(1);
    expect(counts.get('berths_band')!.get('50-150')).toBe(0);
  });

  // Harm: alphabetical band order ('120+' before '24-40') makes the length buttons unreadable.
  it('orders bands by numeric lower bound with pre-/< first', () => {
    const sorted = (v: string[]) => [...v].sort(compareBands);
    expect(sorted(['120+', '24-40', '60-90', '15-24', '90-120', '40-60'])).toEqual(['15-24', '24-40', '40-60', '60-90', '90-120', '120+']);
    expect(sorted(['1980s', 'pre-1980', '2000s'])).toEqual(['pre-1980', '1980s', '2000s']);
    expect(sorted(['400+', '<50', '150-400', '50-150'])).toEqual(['<50', '50-150', '150-400', '400+']);
    expect(sorted(['20+', '<=8', '9-12'])).toEqual(['<=8', '9-12', '20+']);
  });

  // Harm: a shared/reloaded URL loses or corrupts the selection, or one bad value breaks the whole view.
  it('round-trips the selection through the URL and drops unknown values silently', () => {
    const idx = index('marina');
    const sel = { facility_category: ['dry stack', 'boatyard'], subdivision: ['Florida'], country: ['US'], city: ['Anping, Tainan'] };
    const qs = selectionToQuery(sel, idx);
    expect(qs.facility_category).toBe('dry stack,boatyard');
    const back = Object.fromEntries(new URLSearchParams(new URLSearchParams(qs).toString()));
    expect(parseSelection(back, idx).selection).toEqual(sel);

    const bad = parseSelection({ facility_category: 'zzz', subdivision: 'Florida', country: 'United States', berths_band: 'dry stack,150-400' }, idx);
    expect(bad.selection).toEqual({ subdivision: ['Florida'], country: ['US'], berths_band: ['150-400'] });
  });

  // Harm: the default hides fragments again after the user removed the chip, or overrides an explicit selection.
  it('applies the yacht complete=true default only when the URL carries no facet key', () => {
    const y = index('yacht');
    expect(resolveSelection({}, y)).toEqual({ selection: { complete: ['true'] }, isDefault: true });
    expect(resolveSelection({ loa_band: '60-90' }, y)).toEqual({ selection: { loa_band: ['60-90'] }, isDefault: false });
    expect(resolveSelection({ complete: 'all' }, y)).toEqual({ selection: {}, isDefault: false });
    expect(selectionToQuery({}, y)).toEqual({ complete: 'all' });
    expect(resolveSelection({}, index('marina')).selection).toEqual({});
  });
});

// Harm: a slow filter makes every checkbox click janky on the 1,206-marina list (AC7: < 50 ms).
const realGraphPath = path.resolve(fileURLToPath(import.meta.url), '../../../../public/data/graph.json');
if (!existsSync(realGraphPath)) {
  console.warn(`facet benchmark skipped: ${realGraphPath} is absent (run npm run sync-graph)`);
}
describe.skipIf(!existsSync(realGraphPath))('facet performance on the real graph', () => {
  it('filters the real marinas with 5 active facets and recomputes all counts in under 50 ms', () => {
    const real: GraphExport = JSON.parse(readFileSync(realGraphPath, 'utf8'));
    const nodes = real.nodes.filter((n) => n.type === 'marina');
    const idx = buildFacetIndex('marina', nodes, real.meta.facets?.marina);
    const sel = {
      facility_category: ['wet-slip marina', 'club marina'],
      berths_band: ['150-400', '400+'],
      services: ['fuel'],
      country: ['US'],
      subdivision: ['Florida'],
    };
    computeFacetViews(sel, idx); // warm-up
    const start = performance.now();
    const matched = applyFacetSelection(sel, idx);
    computeFacetViews(sel, idx);
    const ms = performance.now() - start;
    expect(nodes.length).toBe(1206);
    expect(matched.size).toBeGreaterThan(0);
    expect(ms).toBeLessThan(50);
  });
});
