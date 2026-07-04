// app/src/reports/__tests__/definitions.spec.ts
//
// TASK-013: unit tests for the pure report-aggregation functions. Synthetic
// fixtures exercise each acceptance criterion in isolation (placeholder-
// builder exclusion, sale-price exclusion + outlier note, bucket edges, tie
// handling); a second describe block loads the REAL ingest/data/graph.json
// so a real data-drift (e.g. a new #1 builder, or the sale-exclusion no
// longer matching reality) fails loudly rather than silently.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildGraphIndex,
  reportCharterRateDistribution,
  reportEntitiesByRegion,
  reportLargestYachts,
  reportMarinasByCapacity,
  reportOwnersByFleetSize,
  reportTopBuilders,
  reportYachtsByDecade,
  getAllReports,
} from '../definitions';
import type { GraphEdge, GraphExport, GraphNode } from '@/types/graph';

let idCounter = 0;
function node(type: GraphNode['type'], name: string, attrs: Record<string, unknown> = {}, id?: string): GraphNode {
  return { id: id ?? `${type}:${name.toLowerCase().replace(/\s+/g, '-')}-${idCounter++}`, type, name, attrs };
}

function edge(src: string, rel: GraphEdge['rel'], dst: string): GraphEdge {
  return { src, rel, dst, attrs: {} };
}

describe('reportTopBuilders', () => {
  it('ranks builders by # yachts built, descending', () => {
    const lurssen = node('builder', 'Lurssen');
    const feadship = node('builder', 'Feadship');
    const y1 = node('yacht', 'A');
    const y2 = node('yacht', 'B');
    const y3 = node('yacht', 'C');
    const graph = buildGraphIndex(
      [lurssen, feadship, y1, y2, y3],
      [edge(y1.id, 'built_by', lurssen.id), edge(y2.id, 'built_by', lurssen.id), edge(y3.id, 'built_by', feadship.id)],
    );
    const result = reportTopBuilders(graph);
    expect(result.chart.kind).toBe('bar-h');
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).toEqual(['Lurssen', 'Feadship']);
    expect(result.chart.items[0].value).toBe(2);
  });

  it('excludes placeholder builder names (Custom/Various/Unknown/N-A)', () => {
    const custom = node('builder', 'Custom');
    const various = node('builder', 'Various');
    const unknown = node('builder', 'Unknown');
    const real = node('builder', 'Heesen');
    const yachts = Array.from({ length: 5 }, () => node('yacht', 'Y'));
    const graph = buildGraphIndex(
      [custom, various, unknown, real, ...yachts],
      [
        edge(yachts[0].id, 'built_by', custom.id),
        edge(yachts[1].id, 'built_by', custom.id),
        edge(yachts[2].id, 'built_by', various.id),
        edge(yachts[3].id, 'built_by', unknown.id),
        edge(yachts[4].id, 'built_by', real.id),
      ],
    );
    const result = reportTopBuilders(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).toEqual(['Heesen']);
    expect(result.description).toMatch(/placeholder/i);
  });

  it('drill-down links to the builder entity page (not a /query contains filter)', () => {
    // Fast-follow regression: a /query?f=builder.contains.<name> link
    // over-matches whenever one builder's name is a substring of another's
    // (e.g. "CRN" also matching "CRN Yachts"), so the count on the drill-down
    // page would silently disagree with the bar's own count. The entity
    // page link is exact by id and can never over-match.
    const lurssen = node('builder', 'Lurssen', {}, 'builder:lurssen');
    const y1 = node('yacht', 'A');
    const graph = buildGraphIndex([lurssen, y1], [edge(y1.id, 'built_by', lurssen.id)]);
    const result = reportTopBuilders(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    const link = result.chart.items[0].link;
    expect(link).toEqual({ name: 'entity', params: { id: 'builder:lurssen' } });
  });

  it('does not over-match a builder whose name is a substring of another builder (e.g. CRN vs CRN Yachts)', () => {
    const crn = node('builder', 'CRN', {}, 'builder:crn');
    const crnYachts = node('builder', 'CRN Yachts', {}, 'builder:crn-yachts');
    const yachtsA = Array.from({ length: 4 }, () => node('yacht', 'Y'));
    const yachtsB = Array.from({ length: 4 }, () => node('yacht', 'Y'));
    const graph = buildGraphIndex(
      [crn, crnYachts, ...yachtsA, ...yachtsB],
      [
        ...yachtsA.map((y) => edge(y.id, 'built_by', crn.id)),
        ...yachtsB.map((y) => edge(y.id, 'built_by', crnYachts.id)),
      ],
    );
    const result = reportTopBuilders(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    const crnItem = result.chart.items.find((i) => i.label === 'CRN');
    expect(crnItem?.value).toBe(4);
    expect(crnItem?.link).toEqual({ name: 'entity', params: { id: 'builder:crn' } });
  });

  it('caps at the top 15', () => {
    const builders = Array.from({ length: 20 }, (_, i) => node('builder', `Builder ${i}`));
    const nodes: GraphNode[] = [...builders];
    const edges: GraphEdge[] = [];
    builders.forEach((b, i) => {
      // Descending distinct counts: builder 0 has 20 yachts, builder 19 has 1.
      const count = 20 - i;
      for (let k = 0; k < count; k++) {
        const y = node('yacht', `Y${i}-${k}`);
        nodes.push(y);
        edges.push(edge(y.id, 'built_by', b.id));
      }
    });
    const graph = buildGraphIndex(nodes, edges);
    const result = reportTopBuilders(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items).toHaveLength(15);
    expect(result.table.rows).toHaveLength(15);
  });

  it('breaks ties alphabetically by name', () => {
    const b1 = node('builder', 'Zulu Yachts');
    const b2 = node('builder', 'Alpha Yachts');
    const y1 = node('yacht', 'Y1');
    const y2 = node('yacht', 'Y2');
    const graph = buildGraphIndex([b1, b2, y1, y2], [edge(y1.id, 'built_by', b1.id), edge(y2.id, 'built_by', b2.id)]);
    const result = reportTopBuilders(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).toEqual(['Alpha Yachts', 'Zulu Yachts']);
  });
});

describe('reportEntitiesByRegion', () => {
  it('counts entities of any type linked via located_in or based_in', () => {
    const monaco = node('region', 'Monaco');
    const yacht = node('yacht', 'Y');
    const marina = node('marina', 'M');
    const company = node('company', 'C');
    const graph = buildGraphIndex(
      [monaco, yacht, marina, company],
      [edge(yacht.id, 'located_in', monaco.id), edge(marina.id, 'located_in', monaco.id), edge(company.id, 'based_in', monaco.id)],
    );
    const result = reportEntitiesByRegion(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items).toEqual([expect.objectContaining({ label: 'Monaco', value: 3 })]);
  });

  it('excludes the "Location not specified" placeholder region', () => {
    const unspecified = node('region', 'Location not specified');
    const real = node('region', 'Monaco');
    const y1 = node('yacht', 'Y1');
    const y2 = node('yacht', 'Y2');
    const graph = buildGraphIndex(
      [unspecified, real, y1, y2],
      [edge(y1.id, 'located_in', unspecified.id), edge(y2.id, 'located_in', real.id)],
    );
    const result = reportEntitiesByRegion(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).toEqual(['Monaco']);
  });
});

describe('reportCharterRateDistribution', () => {
  function yachtWithRate(amount: number | null, raw: string): GraphNode {
    return node('yacht', raw, { weekly_rate: { amount, currency: 'EUR', raw } });
  }

  it('excludes entries whose raw text contains "sale" (case-insensitive)', () => {
    const nodes = [
      yachtWithRate(88_500_000, '€88.5M (sale)'),
      yachtWithRate(50_000_000, '€50M (SALE)'),
      yachtWithRate(600_000, '€600,000'),
    ];
    const graph = buildGraphIndex(nodes, []);
    const result = reportCharterRateDistribution(graph);
    expect(result.note).toMatch(/excluded 2 outliers/i);
    if (result.chart.kind !== 'bar-v') throw new Error('unreachable');
    const total = result.chart.buckets.reduce((sum, b) => sum + b.value, 0);
    expect(total).toBe(1);
  });

  it('excludes entries whose amount exceeds €5,000,000/week even without the word "sale"', () => {
    const nodes = [yachtWithRate(6_000_000, '€6,000,000/week'), yachtWithRate(400_000, '€400,000')];
    const graph = buildGraphIndex(nodes, []);
    const result = reportCharterRateDistribution(graph);
    expect(result.note).toMatch(/excluded 1 outlier\b/i);
    if (result.chart.kind !== 'bar-v') throw new Error('unreachable');
    const total = result.chart.buckets.reduce((sum, b) => sum + b.value, 0);
    expect(total).toBe(1);
  });

  it('an exact bucket boundary (25,000) lands in the 25k-50k bucket, not <25k', () => {
    const nodes = [yachtWithRate(25_000, '€25,000')];
    const graph = buildGraphIndex(nodes, []);
    const result = reportCharterRateDistribution(graph);
    if (result.chart.kind !== 'bar-v') throw new Error('unreachable');
    expect(result.chart.buckets.find((b) => b.label === '< €25k')?.value).toBe(0);
    expect(result.chart.buckets.find((b) => b.label === '€25k–50k')?.value).toBe(1);
  });

  it('has no exclusion note when nothing is excluded', () => {
    const nodes = [yachtWithRate(400_000, '€400,000')];
    const graph = buildGraphIndex(nodes, []);
    const result = reportCharterRateDistribution(graph);
    expect(result.note).toBeUndefined();
  });

  it('describes coverage dynamically as "kept of total yachts"', () => {
    const nodes = [
      yachtWithRate(400_000, '€400,000'), // kept
      yachtWithRate(88_500_000, '€88.5M (sale)'), // excluded (sale)
      node('yacht', 'No rate data at all'), // no weekly_rate attr — not counted as kept or excluded
    ];
    const graph = buildGraphIndex(nodes, []);
    const result = reportCharterRateDistribution(graph);
    expect(result.description).toContain('Only 1 of 3 yachts have a usable charter rate.');
  });

  it('ignores entries with no numeric amount at all (e.g. "N/A (sold)")', () => {
    const nodes = [yachtWithRate(null, 'N/A (sold)'), yachtWithRate(400_000, '€400,000')];
    const graph = buildGraphIndex(nodes, []);
    const result = reportCharterRateDistribution(graph);
    // Not counted as an excluded outlier either — it's simply missing data.
    expect(result.note).toBeUndefined();
    if (result.chart.kind !== 'bar-v') throw new Error('unreachable');
    const total = result.chart.buckets.reduce((sum, b) => sum + b.value, 0);
    expect(total).toBe(1);
  });
});

describe('reportYachtsByDecade', () => {
  it('buckets build years into their decade', () => {
    const nodes = [
      node('yacht', 'A', { year: { value: 2015 } }),
      node('yacht', 'B', { year: { value: 2019 } }),
      node('yacht', 'C', { year: { value: 2020 } }),
      node('yacht', 'D', { year: { value: 1999 } }),
    ];
    const graph = buildGraphIndex(nodes, []);
    const result = reportYachtsByDecade(graph);
    if (result.chart.kind !== 'bar-v') throw new Error('unreachable');
    expect(result.chart.buckets.find((b) => b.label === '2010s')?.value).toBe(2);
    expect(result.chart.buckets.find((b) => b.label === '2020s')?.value).toBe(1);
    expect(result.chart.buckets.find((b) => b.label === '1990s')?.value).toBe(1);
  });

  it('omits yachts with no recorded year rather than bucketing them as unknown', () => {
    const nodes = [node('yacht', 'A', { year: { value: 2020 } }), node('yacht', 'B', {})];
    const graph = buildGraphIndex(nodes, []);
    const result = reportYachtsByDecade(graph);
    if (result.chart.kind !== 'bar-v') throw new Error('unreachable');
    const total = result.chart.buckets.reduce((sum, b) => sum + b.value, 0);
    expect(total).toBe(1);
    expect(result.description).toMatch(/1 of 2/);
  });
});

describe('reportOwnersByFleetSize', () => {
  it('ranks persons by owned_by in-degree', () => {
    const owner1 = node('person', 'Owner One');
    const owner2 = node('person', 'Owner Two');
    const yachts = Array.from({ length: 3 }, () => node('yacht', 'Y'));
    const graph = buildGraphIndex(
      [owner1, owner2, ...yachts],
      [edge(yachts[0].id, 'owned_by', owner1.id), edge(yachts[1].id, 'owned_by', owner1.id), edge(yachts[2].id, 'owned_by', owner2.id)],
    );
    const result = reportOwnersByFleetSize(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).toEqual(['Owner One', 'Owner Two']);
    expect(result.chart.items[0].value).toBe(2);
  });

  it('drill-down links go to the person entity page, not a query', () => {
    const owner = node('person', 'Owner One', {}, 'person:owner-one');
    const y = node('yacht', 'Y');
    const graph = buildGraphIndex([owner, y], [edge(y.id, 'owned_by', owner.id)]);
    const result = reportOwnersByFleetSize(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    const link = result.chart.items[0].link;
    expect(link).toEqual({ name: 'entity', params: { id: 'person:owner-one' } });
  });
});

describe('reportMarinasByCapacity', () => {
  it('ranks marinas by max_loa meters, descending, formatted with a unit', () => {
    const nodes = [
      node('marina', 'Big Port', { max_loa: { meters: 190 } }),
      node('marina', 'Small Port', { max_loa: { meters: 60 } }),
      node('marina', 'No Data Port', {}),
    ];
    const graph = buildGraphIndex(nodes, []);
    const result = reportMarinasByCapacity(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).toEqual(['Big Port', 'Small Port']);
    expect(result.chart.items[0].displayValue).toContain('190');
    expect(result.chart.items[0].displayValue).toContain('m');
  });
});

describe('reportLargestYachts', () => {
  it('ranks yachts by LOA meters, descending', () => {
    const nodes = [
      node('yacht', 'Somnio', { loa: { meters: 222 } }),
      node('yacht', 'Small', { loa: { meters: 40 } }),
    ];
    const graph = buildGraphIndex(nodes, []);
    const result = reportLargestYachts(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).toEqual(['Somnio', 'Small']);
  });
});

describe('getAllReports', () => {
  it('returns at least 5 reports, each with a title, description, chart and table', () => {
    const graph = buildGraphIndex([], []);
    const reports = getAllReports(graph);
    expect(reports.length).toBeGreaterThanOrEqual(5);
    for (const r of reports) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
      expect(['bar-h', 'bar-v']).toContain(r.chart.kind);
      expect(r.table.rows).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Real-data regression test: loads the actual ingested graph export and
// asserts known counts, so upstream data drift (a re-scrape, a schema
// change, the sale-exclusion regex no longer matching reality) fails this
// suite loudly instead of silently shipping a wrong "top" report.
// ---------------------------------------------------------------------------
const graphJsonPath = path.resolve(fileURLToPath(import.meta.url), '../../../../../ingest/data/graph.json');

describe('real graph.json regression checks', () => {
  const raw: GraphExport = JSON.parse(readFileSync(graphJsonPath, 'utf8'));
  const graph = buildGraphIndex(raw.nodes, raw.edges);

  it('R1: top builder after placeholder exclusion is Lurssen with 45 yachts', () => {
    const result = reportTopBuilders(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items[0]).toMatchObject({ label: 'Lurssen', value: 45 });
  });

  it('R1: excludes Custom and Various entirely', () => {
    const result = reportTopBuilders(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    const labels = result.chart.items.map((i) => i.label);
    expect(labels).not.toContain('Custom');
    expect(labels).not.toContain('Various');
  });

  it('R3: excludes exactly the 9 sale-mislabeled weekly-rate entries', () => {
    const result = reportCharterRateDistribution(graph);
    expect(result.note).toMatch(/excluded 9 outliers/i);
    if (result.chart.kind !== 'bar-v') throw new Error('unreachable');
    const total = result.chart.buckets.reduce((sum, b) => sum + b.value, 0);
    expect(total).toBe(12);
  });

  it('R3: description states real coverage — 12 of 605 yachts have a usable charter rate', () => {
    const result = reportCharterRateDistribution(graph);
    expect(result.description).toContain('Only 12 of 605 yachts have a usable charter rate.');
  });

  it('R5: top owner by fleet size is Saudi Royal with 3 yachts', () => {
    const result = reportOwnersByFleetSize(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items[0]).toMatchObject({ label: 'Saudi Royal', value: 3 });
  });

  it('R2: "Location not specified" never appears in the region ranking', () => {
    const result = reportEntitiesByRegion(graph);
    if (result.chart.kind !== 'bar-h') throw new Error('unreachable');
    expect(result.chart.items.map((i) => i.label)).not.toContain('Location not specified');
  });

  it('getAllReports produces a non-empty, sane report set against the real graph', () => {
    const reports = getAllReports(graph);
    expect(reports.length).toBeGreaterThanOrEqual(5);
    for (const r of reports) {
      const rowCount = r.chart.kind === 'bar-h' ? r.chart.items.length : r.chart.buckets.length;
      expect(rowCount).toBeGreaterThan(0);
    }
  });
});
