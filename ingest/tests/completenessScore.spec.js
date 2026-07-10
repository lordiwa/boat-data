// ingest/tests/completenessScore.spec.js
//
// TASK-016: completeness-score reporter. computeCompleteness() is pure
// (no file I/O) so these tests build a small synthetic graph.json-shaped
// fixture and verify the scoring math directly, rather than exercising
// the CLI's file reads/writes.

import { describe, it, expect } from 'vitest';
import { computeCompleteness, REQUIRED_ATTRS, TYPE_WEIGHTS } from '../src/reporters/completenessScore.js';

function edge(src, rel, dst) {
  return { src, rel, dst, attrs: {} };
}

describe('computeCompleteness — per-type attr%/edge%/score', () => {
  it('yacht: 0.7 * avg-required-attr-fraction + 0.3 * edge-fraction', () => {
    // yacht requires 6 attrs (loa, year, guests, cabins, crew, value).
    // Node A: all 6 present (fraction 1) + has an edge.
    // Node B: 3 of 6 present (fraction 0.5) + no edge.
    // avg attr fraction = 0.75, edge fraction = 0.5.
    // score = 0.7*0.75 + 0.3*0.5 = 0.675 -> *10 = 6.75.
    const graph = {
      nodes: [
        {
          id: 'yacht:a',
          type: 'yacht',
          name: 'A',
          attrs: { loa: 50, year: 2020, guests: 10, cabins: 5, crew: 8, value: 1000000 },
        },
        {
          id: 'yacht:b',
          type: 'yacht',
          name: 'B',
          attrs: { loa: 40, year: 2019, guests: 8 },
        },
      ],
      edges: [edge('yacht:a', 'built_by', 'builder:x')],
    };

    const { byType } = computeCompleteness(graph);
    const yacht = byType.find((r) => r.type === 'yacht');

    expect(yacht.count).toBe(2);
    expect(yacht.attrPct).toBeCloseTo(75, 4);
    expect(yacht.edgePct).toBeCloseTo(50, 4);
    expect(yacht.score).toBeCloseTo(6.75, 4);
  });

  it('shipyard: an OR-group (dry_docks OR lift_type) is satisfied by either attr alone', () => {
    // shipyard requires 7 items: country, city, facility_type,
    // [dry_docks|lift_type], [max_loa|max_tonnage], services, website.
    // Node has country/city/facility_type/dry_docks/max_tonnage/services
    // present (website missing) -> 6/7 satisfied.
    const graph = {
      nodes: [
        {
          id: 'shipyard:a',
          type: 'shipyard',
          name: 'A',
          attrs: {
            country: 'Netherlands',
            city: 'Aalsmeer',
            facility_type: 'Builder Yard',
            dry_docks: 3,
            max_tonnage: 15000,
            services: ['Refit'],
          },
        },
      ],
      edges: [edge('shipyard:a', 'located_in', 'region:aalsmeer')],
    };

    const { byType } = computeCompleteness(graph);
    const shipyard = byType.find((r) => r.type === 'shipyard');

    expect(shipyard.count).toBe(1);
    expect(shipyard.attrPct).toBeCloseTo((6 / 7) * 100, 2);
    expect(shipyard.edgePct).toBe(100);
    expect(shipyard.score).toBeCloseTo((0.7 * (6 / 7) + 0.3 * 1) * 10, 2);
  });

  it('marina: the city-OR-located_in-edge requirement is satisfied by the edge alone (marinaMapper never stores a bare "city" attr)', () => {
    const graph = {
      nodes: [
        {
          id: 'marina:a',
          type: 'marina',
          name: 'A',
          attrs: { berths: 100, max_loa: { meters: 90, raw: '90m' }, website: 'https://a.example' },
        },
      ],
      edges: [edge('marina:a', 'located_in', 'region:x')],
    };

    const { byType } = computeCompleteness(graph);
    const marina = byType.find((r) => r.type === 'marina');

    // All 4 required items satisfied (berths, max_loa, the anyOf via the
    // edge, website) despite no literal `city` attr on the node.
    expect(marina.attrPct).toBe(100);
  });

  it('region: "edge-connectivity only" — attr fraction is always 1 (nothing required); score rides entirely on edge presence', () => {
    const graph = {
      nodes: [
        { id: 'region:connected', type: 'region', name: 'Connected', attrs: {} },
        { id: 'region:isolated', type: 'region', name: 'Isolated', attrs: {} },
      ],
      edges: [edge('marina:a', 'located_in', 'region:connected')],
    };

    const { byType } = computeCompleteness(graph);
    const region = byType.find((r) => r.type === 'region');

    expect(region.attrPct).toBe(100); // no required attrs -> trivially "complete"
    expect(region.edgePct).toBe(50); // 1 of 2 region nodes has a connecting edge
    expect(region.score).toBeCloseTo((0.7 * 1 + 0.3 * 0.5) * 10, 4);
  });

  it('a type with zero nodes scores 0 rather than throwing or reporting NaN', () => {
    const { byType } = computeCompleteness({ nodes: [], edges: [] });
    const shipyard = byType.find((r) => r.type === 'shipyard');

    expect(shipyard.count).toBe(0);
    expect(shipyard.attrPct).toBe(0);
    expect(shipyard.edgePct).toBe(0);
    expect(shipyard.score).toBe(0);
  });
});

describe('computeCompleteness — overall weighted average', () => {
  it('weights each type\'s score by TYPE_WEIGHTS and normalizes by the total weight actually applied', () => {
    // Only yacht (score 6.75, weight 20) and region (score 8.5, weight 10)
    // have any nodes; every other type is zero-count (score 0) but still
    // contributes its full weight to the denominator (see module header:
    // an empty type drags the overall average down, by design).
    const graph = {
      nodes: [
        {
          id: 'yacht:a',
          type: 'yacht',
          name: 'A',
          attrs: { loa: 50, year: 2020, guests: 10, cabins: 5, crew: 8, value: 1000000 },
        },
        { id: 'yacht:b', type: 'yacht', name: 'B', attrs: { loa: 40, year: 2019, guests: 8 } },
        { id: 'region:connected', type: 'region', name: 'Connected', attrs: {} },
        { id: 'region:isolated', type: 'region', name: 'Isolated', attrs: {} },
      ],
      edges: [edge('yacht:a', 'built_by', 'builder:x'), edge('marina:a', 'located_in', 'region:connected')],
    };

    const { overall } = computeCompleteness(graph);
    const totalWeight = Object.values(TYPE_WEIGHTS).reduce((a, b) => a + b, 0);
    const expected = (6.75 * TYPE_WEIGHTS.yacht + 8.5 * TYPE_WEIGHTS.region) / totalWeight;

    expect(overall).toBeCloseTo(expected, 2);
  });

  it('scores every known type present in TYPE_WEIGHTS, in a stable order', () => {
    const { byType } = computeCompleteness({ nodes: [], edges: [] });
    expect(byType.map((r) => r.type)).toEqual(Object.keys(TYPE_WEIGHTS));
  });
});

describe('REQUIRED_ATTRS config', () => {
  it('defines a required-attrs entry for every scored type except region (edge-connectivity only)', () => {
    for (const type of Object.keys(TYPE_WEIGHTS)) {
      expect(REQUIRED_ATTRS).toHaveProperty(type);
    }
    expect(REQUIRED_ATTRS.region).toEqual([]);
    expect(REQUIRED_ATTRS.yacht.length).toBe(6);
  });
});

describe('module importability', () => {
  it('exposes computeCompleteness and runCompletenessScore as named exports', async () => {
    const mod = await import('../src/reporters/completenessScore.js');
    expect(typeof mod.computeCompleteness).toBe('function');
    expect(typeof mod.runCompletenessScore).toBe('function');
  });
});
