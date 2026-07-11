// app/src/__tests__/chartLabelMismatch.spec.ts
//
// TASK-018 review follow-up (MEDIUM): the fix for axe's
// `label-content-name-mismatch` on BarChartH/BarChartV (the "&#32;" sibling
// text-node trick — see those components' TASK-018 comments) was previously
// only verified once, by hand, against real Lighthouse/Chrome; nothing in
// the automated suite would catch a future regression (e.g. someone
// "cleaning up" the &#32; hack, or reordering the <text> elements again).
// This file makes that check itself durable and automated: it runs the
// real axe-core rule (not a structural proxy for it) against a live-mounted
// linked chart, using the canvas stub in ./support/axeCanvasStub.ts to work
// around the one thing that otherwise stops this specific rule from
// evaluating at all under jsdom.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import * as axeCore from 'axe-core';
import BarChartH from '@/components/charts/BarChartH.vue';
import BarChartV from '@/components/charts/BarChartV.vue';
import { routes } from '@/router';
import { installAxeCanvasStub } from './support/axeCanvasStub';

const axe = (axeCore as unknown as { default?: typeof axeCore }).default ?? axeCore;

let restoreCanvasStub: () => void;
beforeAll(() => {
  restoreCanvasStub = installAxeCanvasStub();
});
afterAll(() => {
  restoreCanvasStub();
});

let wrapper: VueWrapper | undefined;
let mountEl: HTMLElement | undefined;
afterAll(() => {
  wrapper?.unmount();
  mountEl?.remove();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mount()'s
// props type is specific to whichever component overload TS picks; a single
// helper shared between BarChartH and BarChartV needs to widen it.
function mountLinked(component: any, props: Record<string, unknown>): VueWrapper {
  const router = createRouter({ history: createMemoryHistory(), routes });
  mountEl = document.createElement('div');
  document.body.appendChild(mountEl);
  wrapper = mount(component, { attachTo: mountEl, global: { plugins: [router] }, props });
  return wrapper;
}

async function runRule(container: Element) {
  return axe.run(container, { runOnly: ['label-content-name-mismatch'] });
}

describe('axe: label-content-name-mismatch on linked charts (real rule, not a structural proxy)', () => {
  it('BarChartH: a linked row is not flagged', async () => {
    const w = mountLinked(BarChartH, {
      title: 'Top builders',
      items: [{ label: 'Lurssen', value: 43, link: { name: 'entity', params: { id: 'builder:lurssen' } } }],
    });
    const results = await runRule(w.element);
    expect(results.incomplete, 'rule errored instead of evaluating — canvas stub regressed?').toHaveLength(0);
    expect(results.violations).toHaveLength(0);
  });

  it('BarChartV: a linked bucket is not flagged', async () => {
    const w = mountLinked(BarChartV, {
      title: 'Yachts by decade',
      buckets: [{ label: '2010s', value: 95, link: { name: 'query', params: {} } }],
    });
    const results = await runRule(w.element);
    expect(results.incomplete, 'rule errored instead of evaluating — canvas stub regressed?').toHaveLength(0);
    expect(results.violations).toHaveLength(0);
  });

  it('regression proof: the rule genuinely catches a reintroduced mismatch (colon, no separator)', async () => {
    // Not a component mount — a minimal, deliberately broken fixture proving
    // this check isn't vacuously green (i.e. that a real "Lurssen: 43
    // yachts" style aria-label over two adjacent, un-spaced <text> nodes
    // — the exact bug Lighthouse originally caught — genuinely fails).
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.innerHTML =
      '<g tabindex="0" role="link" aria-label="Lurssen: 43 yachts"><text>Lurssen</text><text>43 yachts</text></g>';
    const results = await runRule(el);
    expect(results.incomplete).toHaveLength(0);
    expect(results.violations.length).toBeGreaterThan(0);
    expect(results.violations[0].id).toBe('label-content-name-mismatch');
    el.remove();
  });
});
