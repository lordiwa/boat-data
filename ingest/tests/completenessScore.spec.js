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
    // TASK-020: yacht now requires 14 attrs (the original loa, year,
    // guests, cabins, crew, value PLUS beam, draft, gt, max_speed,
    // range_nm, flag, class_society, imo).
    // Node A: all 14 present (fraction 1) + has an edge.
    // Node B: 3 of 14 present (loa, year, guests only; fraction 3/14) + no edge.
    // avg attr fraction = (1 + 3/14) / 2 = 0.6071428571...
    // edge fraction = 0.5.
    // score = 0.7*0.6071428571 + 0.3*0.5 = 0.575 -> *10 = 5.75.
    const graph = {
      nodes: [
        {
          id: 'yacht:a',
          type: 'yacht',
          name: 'A',
          attrs: {
            loa: 50,
            year: 2020,
            guests: 10,
            cabins: 5,
            crew: 8,
            value: 1000000,
            beam: { meters: 10, raw: '10m' },
            draft: { meters: 3, raw: '3m' },
            gt: 500,
            max_speed: 20,
            range_nm: 3000,
            flag: 'Cayman Islands',
            class_society: "Lloyd's Register",
            imo: '1234567',
          },
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
    expect(yacht.attrPct).toBeCloseTo(60.71, 2);
    expect(yacht.edgePct).toBeCloseTo(50, 4);
    expect(yacht.score).toBeCloseTo(5.75, 4);
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

  it('engine_model (TASK-017): the made_by edge is one of the required items, alongside plain attrs', () => {
    const graph = {
      nodes: [
        {
          id: 'engine_model:a',
          type: 'engine_model',
          name: 'A',
          attrs: { years: '2021-', type: 'V12', power_hp: 600, segment: 'outboard' },
        },
      ],
      edges: [edge('engine_model:a', 'made_by', 'engine:mercury-marine')],
    };

    const { byType } = computeCompleteness(graph);
    const engineModel = byType.find((r) => r.type === 'engine_model');
    expect(engineModel.attrPct).toBe(100); // 4 plain attrs + made_by edge, all satisfied
  });

  it('size_class (TASK-017): no edges are created this round, so edgePct is always 0', () => {
    const graph = {
      nodes: [
        {
          id: 'size_class:superyacht',
          type: 'size_class',
          name: 'Superyacht',
          attrs: {
            length_threshold: '24m+',
            gt_range: '~500-3,000 GT',
            typical_crew: '3-16',
            definition_used_by: 'YachtBuyer',
            example_vessels: 'Amels 60',
            notes: 'Conflict noted.',
          },
        },
      ],
      edges: [],
    };

    const { byType } = computeCompleteness(graph);
    const sizeClass = byType.find((r) => r.type === 'size_class');
    expect(sizeClass.attrPct).toBe(100);
    expect(sizeClass.edgePct).toBe(0);
    expect(sizeClass.score).toBeCloseTo(0.7 * 10, 2);
  });
});

describe('computeCompleteness — overall weighted average', () => {
  it('weights each type\'s score by TYPE_WEIGHTS and normalizes by the total weight actually applied', () => {
    // Only yacht (score 5.75, weight 20 — see the 14-attr yacht test above
    // for the TASK-020 math) and region (score 8.5, weight 10) have any
    // nodes; every other type is zero-count (score 0) but still
    // contributes its full weight to the denominator (see module header:
    // an empty type drags the overall average down, by design).
    const graph = {
      nodes: [
        {
          id: 'yacht:a',
          type: 'yacht',
          name: 'A',
          attrs: {
            loa: 50,
            year: 2020,
            guests: 10,
            cabins: 5,
            crew: 8,
            value: 1000000,
            beam: { meters: 10, raw: '10m' },
            draft: { meters: 3, raw: '3m' },
            gt: 500,
            max_speed: 20,
            range_nm: 3000,
            flag: 'Cayman Islands',
            class_society: "Lloyd's Register",
            imo: '1234567',
          },
        },
        { id: 'yacht:b', type: 'yacht', name: 'B', attrs: { loa: 40, year: 2019, guests: 8 } },
        { id: 'region:connected', type: 'region', name: 'Connected', attrs: {} },
        { id: 'region:isolated', type: 'region', name: 'Isolated', attrs: {} },
      ],
      edges: [edge('yacht:a', 'built_by', 'builder:x'), edge('marina:a', 'located_in', 'region:connected')],
    };

    const { overall } = computeCompleteness(graph);
    const totalWeight = Object.values(TYPE_WEIGHTS).reduce((a, b) => a + b, 0);
    const expected = (5.75 * TYPE_WEIGHTS.yacht + 8.5 * TYPE_WEIGHTS.region) / totalWeight;

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
    // TASK-020: 6 original attrs + 8 new spec fields (beam, draft, gt,
    // max_speed, range_nm, flag, class_society, imo).
    expect(REQUIRED_ATTRS.yacht.length).toBe(14);
  });
});

describe('module importability', () => {
  it('exposes computeCompleteness and runCompletenessScore as named exports', async () => {
    const mod = await import('../src/reporters/completenessScore.js');
    expect(typeof mod.computeCompleteness).toBe('function');
    expect(typeof mod.runCompletenessScore).toBe('function');
  });
});

// TASK-023 item 4: dual scoring — yacht nodes carry
// attrs.identifiability ('identifiable' | 'fragment', set by
// identifiability.js's classifyYachtIdentifiability()). The scorer must
// report BOTH an all-nodes score (unchanged behavior, every yacht node
// counted) AND an identifiable-only score (fragment yacht nodes excluded
// from yacht's own denominator; every other type is untouched by this
// distinction). The loop's 8.5 target is measured on the identifiable
// score.
describe('computeCompleteness — dual scoring (TASK-023 item 4)', () => {
  const graph = {
    nodes: [
      {
        id: 'yacht:identifiable-full',
        type: 'yacht',
        name: 'Full',
        attrs: {
          identifiability: 'identifiable',
          loa: 50,
          year: 2020,
          guests: 10,
          cabins: 5,
          crew: 8,
          value: 1000000,
          beam: { meters: 10, raw: '10m' },
          draft: { meters: 3, raw: '3m' },
          gt: 500,
          max_speed: 20,
          range_nm: 3000,
          flag: 'Cayman Islands',
          class_society: "Lloyd's Register",
          imo: '1234567',
        },
      },
      // A fragment: no attrs at all beyond identifiability + loa, and no edge.
      { id: 'yacht:fragment-a', type: 'yacht', name: 'Fragment A', attrs: { identifiability: 'fragment', loa: 40 } },
      { id: 'yacht:fragment-b', type: 'yacht', name: 'Fragment B', attrs: { identifiability: 'fragment', loa: 35 } },
    ],
    edges: [edge('yacht:identifiable-full', 'built_by', 'builder:x')],
  };

  it('byType (all-nodes) still counts every yacht node, fragments included', () => {
    const { byType } = computeCompleteness(graph);
    const yacht = byType.find((r) => r.type === 'yacht');
    expect(yacht.count).toBe(3);
  });

  it('reports a separate identifiable-only yacht stat that excludes fragment nodes from count/attrPct/edgePct', () => {
    const { yachtIdentifiable } = computeCompleteness(graph);
    expect(yachtIdentifiable.count).toBe(1); // only the identifiable node
    expect(yachtIdentifiable.attrPct).toBe(100); // the one identifiable node has all 14 attrs
    expect(yachtIdentifiable.edgePct).toBe(100);
    expect(yachtIdentifiable.score).toBeCloseTo(10, 4);
  });

  it('reports both overall (all-nodes) and overallIdentifiable, and they differ when fragments drag the all-nodes yacht score down', () => {
    const { overall, overallIdentifiable } = computeCompleteness(graph);
    expect(overallIdentifiable).toBeGreaterThan(overall);
  });

  it('treats every yacht node as identifiable when none carry attrs.identifiability at all (back-compat: pre-item-4 graphs / non-yacht types unaffected)', () => {
    const legacyGraph = {
      nodes: [{ id: 'yacht:legacy', type: 'yacht', name: 'Legacy', attrs: { loa: 50, year: 2020 } }],
      edges: [],
    };
    const { yachtIdentifiable, byType } = computeCompleteness(legacyGraph);
    const yacht = byType.find((r) => r.type === 'yacht');
    expect(yachtIdentifiable.count).toBe(yacht.count);
  });

  it('a graph with zero yacht nodes reports yachtIdentifiable as a zero/empty stat rather than throwing', () => {
    const { yachtIdentifiable } = computeCompleteness({ nodes: [], edges: [] });
    expect(yachtIdentifiable.count).toBe(0);
    expect(yachtIdentifiable.score).toBe(0);
  });
});
