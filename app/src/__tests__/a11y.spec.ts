// app/src/__tests__/a11y.spec.ts
//
// TASK-018: automated accessibility audit + regression lock. Mounts the
// full app (App.vue + real router + real pinia) at every route with the
// real ingest/data/graph.json (same file EntityView/EntityListView/
// ReportsView fetch in production — see reports/__tests__/definitions.spec.ts
// for the same "load the real export" pattern), then runs axe-core against
// the rendered DOM and asserts zero critical/serious violations per route.
//
// axe-core's `color-contrast` rule is disabled here: it needs real
// layout/paint to sample rendered pixel colors, and jsdom doesn't implement
// layout or apply Vue SFC scoped <style> blocks the way a browser does, so
// under jsdom the rule is unreliable in both directions (it would neither
// reliably catch a real contrast bug nor reliably pass a fine one). AA
// contrast is instead locked by src/__tests__/contrast.spec.ts, computed
// directly from the real color tokens/alphas in style.css.
//
// axe's `label-content-name-mismatch` rule (WCAG 2.5.3 — this is the exact
// rule that caught BarChartH/V's aria-label bug during TASK-018's review)
// is left enabled and made to actually work here via
// support/axeCanvasStub.ts's canvas stub — see that file's header comment
// for why one is needed at all under jsdom. See chartLabelMismatch.spec.ts
// for a narrower, dedicated test of this same rule against the charts
// specifically (including proof the check isn't vacuous).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import * as axeCore from 'axe-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import App from '@/App.vue';
import { routes } from '@/router';
import { useGraphStore } from '@/stores/graph';
import type { GraphExport } from '@/types/graph';
import { installAxeCanvasStub } from './support/axeCanvasStub';

const axe = (axeCore as unknown as { default?: typeof axeCore }).default ?? axeCore;

let restoreCanvasStub: () => void;
beforeAll(() => {
  restoreCanvasStub = installAxeCanvasStub();
});
afterAll(() => {
  restoreCanvasStub();
});

const graphJsonPath = path.resolve(fileURLToPath(import.meta.url), '../../../../ingest/data/graph.json');
const graphJson: GraphExport = JSON.parse(readFileSync(graphJsonPath, 'utf8'));

const sampleYacht = graphJson.nodes.find((n) => n.type === 'yacht');
if (!sampleYacht) throw new Error('fixture assumption broken: real graph.json has no yacht node');

const AXE_OPTIONS: axeCore.RunOptions = {
  resultTypes: ['violations'],
  rules: { 'color-contrast': { enabled: false } },
};

function formatViolations(violations: axeCore.Result[]): string {
  return violations
    .map((v) => {
      const targets = v.nodes.map((n) => n.target.join(' ')).join(', ');
      return `- [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} node(s): ${targets}`;
    })
    .join('\n');
}

async function expectNoSeriousViolations(container: Element): Promise<void> {
  const results = await axe.run(container, AXE_OPTIONS);
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  if (serious.length > 0) {
    throw new Error(`Critical/serious axe-core violations found:\n${formatViolations(serious)}`);
  }
}

let wrapper: VueWrapper | undefined;
let mountEl: HTMLElement | undefined;

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  mountEl?.remove();
  mountEl = undefined;
  vi.unstubAllGlobals();
});

async function mountRoute(targetPath: string): Promise<VueWrapper> {
  const pinia = createPinia();
  setActivePinia(pinia);
  const graph = useGraphStore(pinia);

  // Store.load() just needs `.ok`/`.status`/`.statusText`/`.json()` — a
  // plain stub avoids re-serializing/re-parsing the ~1.9MB real export on
  // every one of this file's routes.
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => graphJson,
  }));
  await graph.load();

  const router = createRouter({ history: createMemoryHistory(), routes });
  router.push(targetPath);
  await router.isReady();

  mountEl = document.createElement('div');
  document.body.appendChild(mountEl);

  wrapper = mount(App, {
    attachTo: mountEl,
    global: { plugins: [pinia, router] },
  });
  await flushPromises();
  return wrapper;
}

describe('accessibility audit: zero critical/serious axe-core violations per route', () => {
  it('/ (Home)', async () => {
    const w = await mountRoute('/');
    expect(w.find('h1').exists()).toBe(true);
    await expectNoSeriousViolations(w.element);
  });

  it('/explore (Explore)', async () => {
    const w = await mountRoute('/explore');
    await expectNoSeriousViolations(w.element);
  });

  it('/query (Query builder)', async () => {
    const w = await mountRoute('/query');
    await expectNoSeriousViolations(w.element);
  });

  it('/reports (Reports — charts + tables)', async () => {
    const w = await mountRoute('/reports');
    await expectNoSeriousViolations(w.element);
  });

  it('/browse/yacht (EntityListView + DataTable, known type)', async () => {
    const w = await mountRoute('/browse/yacht');
    await expectNoSeriousViolations(w.element);
  });

  it('/browse/not-a-real-type (EntityListView, unknown-type message)', async () => {
    const w = await mountRoute('/browse/not-a-real-type');
    await expectNoSeriousViolations(w.element);
  });

  it(`/entity/${sampleYacht!.id} (EntityView, real yacht — AttrPanel + QuickActions + relationships)`, async () => {
    const w = await mountRoute(`/entity/${sampleYacht!.id}`);
    await expectNoSeriousViolations(w.element);
  });

  it('/entity/not-a-real-id (EntityView, not-found message)', async () => {
    const w = await mountRoute('/entity/not-a-real-id');
    await expectNoSeriousViolations(w.element);
  });

  it('/accessibility (accessibility statement page)', async () => {
    const w = await mountRoute('/accessibility');
    expect(w.text()).toMatch(/WCAG 2\.1 Level AA/);
    expect(w.text()).toMatch(/srparca@gmail\.com/);
    await expectNoSeriousViolations(w.element);
  });
});
