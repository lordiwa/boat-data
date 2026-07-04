// app/src/reports/definitions.ts
//
// TASK-013: pure, unit-testable aggregation functions that build the
// dashboard's pre-built reports from the graph. Deliberately decoupled from
// Pinia/Vue — every function takes a `GraphLike` (the small subset of the
// graph store's read API that reports need: nodesByType/nodeById/edgesFrom/
// edgesTo) so the real store satisfies it structurally (see stores/graph.ts)
// AND a plain in-memory index built straight from ingest/data/graph.json
// satisfies it too, in tests, with zero Pinia/DOM setup.
import type { RouteLocationRaw } from 'vue-router';
import type { EdgeRel, GraphEdge, GraphNode, NodeType } from '@/types/graph';
import { isPlaceholderName } from '@/utils/placeholder';
import { formatNumber } from '@/utils/format';

/** The read-only slice of the graph store's API that report aggregation needs. */
export interface GraphLike {
  nodesByType(type: NodeType | string): GraphNode[];
  nodeById(id: string): GraphNode | undefined;
  edgesFrom(id: string, rel?: EdgeRel): GraphEdge[];
  edgesTo(id: string, rel?: EdgeRel): GraphEdge[];
}

/** Builds a GraphLike over plain nodes/edges arrays — no Pinia, no adjacency-building tricks. */
export function buildGraphIndex(nodes: GraphNode[], edges: GraphEdge[]): GraphLike {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const byType = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = byType.get(n.type);
    if (list) list.push(n);
    else byType.set(n.type, [n]);
  }
  const out = new Map<string, GraphEdge[]>();
  const inn = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const oList = out.get(e.src);
    if (oList) oList.push(e);
    else out.set(e.src, [e]);
    const iList = inn.get(e.dst);
    if (iList) iList.push(e);
    else inn.set(e.dst, [e]);
  }
  return {
    nodesByType: (type) => byType.get(type) || [],
    nodeById: (id) => nodeMap.get(id),
    edgesFrom: (id, rel) => {
      const list = out.get(id) || [];
      return rel ? list.filter((e) => e.rel === rel) : list.slice();
    },
    edgesTo: (id, rel) => {
      const list = inn.get(id) || [];
      return rel ? list.filter((e) => e.rel === rel) : list.slice();
    },
  };
}

/** One ranked bar-chart item (also usable as a compact table row). */
export interface RankedItem {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  link?: RouteLocationRaw;
}

/**
 * One histogram bucket. `link` is optional: R4 (decade built) can drill down
 * precisely via a year range, but R3 (charter rate) deliberately omits it —
 * its buckets already exclude sale-price outliers, and a bucket link built
 * from the raw `weekly_rate` field wouldn't apply that same exclusion,
 * so a bucket count and its "drill-down" count could silently diverge.
 */
export interface HistogramBucket {
  label: string;
  value: number;
  link?: RouteLocationRaw;
}

export type ReportChart =
  | { kind: 'bar-h'; unit?: string; items: RankedItem[] }
  | { kind: 'bar-v'; unit?: string; buckets: HistogramBucket[] };

export interface ReportResult {
  id: string;
  title: string;
  description: string;
  /** Data-quality caveat surfaced in the UI, e.g. an outlier-exclusion count. */
  note?: string;
  chart: ReportChart;
  /** Compact top-N table, generally the same rows/buckets as the chart. */
  table: {
    valueLabel: string;
    rows: { label: string; displayValue: string; link?: RouteLocationRaw }[];
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function yachtBetweenLink(field: string, lo: number, hi: number): RouteLocationRaw {
  return { name: 'query', query: { type: 'yacht', f: `${field}.between.${lo},${hi}` } };
}

function entityLink(id: string): RouteLocationRaw {
  return { name: 'entity', params: { id } };
}

function toRankedItems(
  counts: Map<string, { name: string; count: number }>,
  opts: { excludeName?: (name: string) => boolean; limit: number; link?: (id: string, name: string) => RouteLocationRaw },
): RankedItem[] {
  let entries = [...counts.entries()];
  if (opts.excludeName) entries = entries.filter(([, v]) => !opts.excludeName!(v.name));
  entries.sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name));
  return entries.slice(0, opts.limit).map(([id, v]) => ({
    id,
    label: v.name,
    value: v.count,
    displayValue: formatNumber(v.count),
    link: opts.link ? opts.link(id, v.name) : undefined,
  }));
}

function chartAndTableFromItems(items: RankedItem[], unit: string, valueLabel: string): Pick<ReportResult, 'chart' | 'table'> {
  return {
    chart: { kind: 'bar-h', unit, items },
    table: {
      valueLabel,
      rows: items.map((it) => ({ label: it.label, displayValue: it.displayValue, link: it.link })),
    },
  };
}

const TOP_N = 15;

/**
 * R1 — Top builders by number of yachts built (top 15), excluding placeholder
 * "builders" (Custom/Various/Unknown/N-A — see utils/placeholder.ts) that
 * stand in for "we don't know the real builder" rather than a real yard.
 */
export function reportTopBuilders(graph: GraphLike): ReportResult {
  const counts = new Map<string, { name: string; count: number }>();
  for (const builder of graph.nodesByType('builder')) {
    const count = graph.edgesTo(builder.id, 'built_by').length;
    if (count > 0) counts.set(builder.id, { name: builder.name, count });
  }
  const items = toRankedItems(counts, {
    excludeName: isPlaceholderName,
    limit: TOP_N,
    // Fast-follow (post-review): a /query?f=builder.contains.<name> link
    // over-matches whenever one builder's name is a substring of another's
    // (e.g. "CRN" also matching "CRN Yachts") — the drill-down count would
    // silently disagree with the bar's own count. Link to the builder's own
    // entity page instead, same as R5/R6/R7 do, which is exact by id.
    link: (id) => entityLink(id),
  });
  return {
    id: 'top-builders',
    title: 'Top builders by number of yachts',
    description:
      'The 15 builders with the most yachts in the graph. Placeholder "builders" (Custom, Various, Unknown, N/A) ' +
      'are excluded since they mean "builder not identified", not a real yard.',
    ...chartAndTableFromItems(items, 'yachts', '# Yachts'),
  };
}

/**
 * R2 — Entities by region. The graph has zero `yacht --located_in--> region`
 * edges (verified against the real export), so a yacht-only region report
 * would be empty. Instead this counts every entity of any type (yachts,
 * marinas, builders, clubs, companies...) linked to a region via
 * `located_in` or `based_in`, which is what the data actually supports.
 * "Location not specified" is excluded as a placeholder region name.
 */
export function reportEntitiesByRegion(graph: GraphLike): ReportResult {
  const counts = new Map<string, { name: string; count: number }>();
  for (const region of graph.nodesByType('region')) {
    const count = graph.edgesTo(region.id, 'located_in').length + graph.edgesTo(region.id, 'based_in').length;
    if (count > 0) counts.set(region.id, { name: region.name, count });
  }
  const items = toRankedItems(counts, {
    excludeName: (name) => isPlaceholderName(name) || name.trim().toLowerCase() === 'location not specified',
    limit: TOP_N,
    link: (id) => entityLink(id),
  });
  return {
    id: 'entities-by-region',
    title: 'Entities by region',
    description:
      'The 15 regions with the most linked entities (yachts, marinas, builders, clubs, companies) via "located in" ' +
      'or "based in" edges. Yachts in this graph have no direct region edges of their own, so this counts across ' +
      'every entity type rather than yachts alone.',
    ...chartAndTableFromItems(items, 'entities', '# Linked entities'),
  };
}

const SALE_RE = /sale/i;
const MAX_PLAUSIBLE_WEEKLY_RATE = 5_000_000;

const RATE_BUCKETS: { label: string; lo: number; hi: number }[] = [
  { label: '< €25k', lo: 0, hi: 25_000 },
  { label: '€25k–50k', lo: 25_000, hi: 50_000 },
  { label: '€50k–100k', lo: 50_000, hi: 100_000 },
  { label: '€100k–200k', lo: 100_000, hi: 200_000 },
  { label: '€200k–500k', lo: 200_000, hi: 500_000 },
  { label: '€500k–1M', lo: 500_000, hi: 1_000_000 },
  { label: '> €1M', lo: 1_000_000, hi: Infinity },
];

/**
 * R3 — Charter weekly-rate distribution (histogram).
 *
 * DATA-QUALITY CONSTRAINT (TASK-009 UAT): some yachts' weekly_rate is
 * actually a SALE price, not a charter rate (e.g. Alfa Nero, "€88.5M
 * (sale)"). We exclude any entry whose `weekly_rate.raw` contains "sale"
 * (case-insensitive) OR whose amount exceeds €5,000,000/week — no real
 * charter yacht rents for more than that per week, so a value that high is
 * almost certainly a mislabeled sale/asking price. The excluded count is
 * surfaced via `note` so the report is honest about what it dropped.
 */
export function reportCharterRateDistribution(graph: GraphLike): ReportResult {
  const yachts = graph.nodesByType('yacht');
  let excluded = 0;
  let kept = 0;
  const buckets = RATE_BUCKETS.map((b) => ({ label: b.label, value: 0 }));
  for (const yacht of yachts) {
    const wr = asRecord(yacht.attrs.weekly_rate);
    if (!wr) continue;
    const raw = typeof wr.raw === 'string' ? wr.raw : '';
    const amount = num(wr.amount);
    if (amount === null) continue; // no numeric amount at all (e.g. "N/A (sold)") — nothing to bucket
    if (SALE_RE.test(raw) || amount > MAX_PLAUSIBLE_WEEKLY_RATE) {
      excluded++;
      continue;
    }
    const idx = RATE_BUCKETS.findIndex((b) => amount >= b.lo && amount < b.hi);
    if (idx !== -1) {
      buckets[idx].value++;
      kept++;
    }
  }
  return {
    id: 'charter-rate-distribution',
    title: 'Charter weekly rate distribution',
    description:
      'How many yachts fall into each weekly charter-rate band. Entries whose rate is actually a sale/asking price ' +
      '(raw text containing "sale", or an amount over €5,000,000/week — no charter yacht rents for that much) are ' +
      `excluded rather than skewing the top bucket. Only ${kept} of ${yachts.length} yachts have a usable charter rate.`,
    note: excluded > 0 ? `Excluded ${excluded} outlier${excluded === 1 ? '' : 's'} (sale prices mislabeled as charter rates).` : undefined,
    chart: { kind: 'bar-v', unit: 'yachts', buckets },
    table: {
      valueLabel: '# Yachts',
      rows: buckets.map((b) => ({ label: b.label, displayValue: formatNumber(b.value) })),
    },
  };
}

/** R4 — Yachts by decade built (histogram over the `year` attr). */
export function reportYachtsByDecade(graph: GraphLike): ReportResult {
  const yachts = graph.nodesByType('yacht');
  const counts = new Map<number, number>();
  let withYear = 0;
  for (const yacht of yachts) {
    const year = num(asRecord(yacht.attrs.year)?.value);
    if (year === null) continue;
    withYear++;
    const decade = Math.floor(year / 10) * 10;
    counts.set(decade, (counts.get(decade) || 0) + 1);
  }
  const decades = [...counts.keys()].sort((a, b) => a - b);
  const buckets = decades.map((d) => ({
    label: `${d}s`,
    value: counts.get(d) || 0,
    link: yachtBetweenLink('year', d, d + 9),
  }));
  return {
    id: 'yachts-by-decade',
    title: 'Yachts by decade built',
    description: `Build-year distribution across all decades present in the graph. Only ${withYear} of ${yachts.length} yachts have a recorded build year — the rest are omitted rather than bucketed as "unknown".`,
    chart: { kind: 'bar-v', unit: 'yachts', buckets },
    table: {
      valueLabel: '# Yachts',
      rows: buckets.map((b) => ({ label: b.label, displayValue: formatNumber(b.value), link: b.link })),
    },
  };
}

/** R5 — Owners by fleet size (top 15 persons by `owned_by` in-degree). */
export function reportOwnersByFleetSize(graph: GraphLike): ReportResult {
  const counts = new Map<string, { name: string; count: number }>();
  for (const person of graph.nodesByType('person')) {
    const count = graph.edgesTo(person.id, 'owned_by').length;
    if (count > 0) counts.set(person.id, { name: person.name, count });
  }
  const items = toRankedItems(counts, {
    limit: TOP_N,
    link: (id) => entityLink(id),
  });
  return {
    id: 'owners-by-fleet-size',
    title: 'Owners by fleet size',
    description:
      'The 15 people who own the most yachts in the graph, by number of "owned by" edges. (person.net_worth is ' +
      'entirely null in this dataset, so a net-worth report isn’t possible — fleet size is used instead.)',
    ...chartAndTableFromItems(items, 'yachts', '# Yachts owned'),
  };
}

/** R6 — Marinas by max LOA capacity (top 15, meters). */
export function reportMarinasByCapacity(graph: GraphLike): ReportResult {
  const marinas = graph.nodesByType('marina');
  let withCapacity = 0;
  const counts = new Map<string, { name: string; count: number }>();
  for (const marina of marinas) {
    const meters = num(asRecord(marina.attrs.max_loa)?.meters);
    if (meters === null) continue;
    withCapacity++;
    counts.set(marina.id, { name: marina.name, count: meters });
  }
  const items = toRankedItems(counts, { limit: TOP_N, link: (id) => entityLink(id) }).map((it) => ({
    ...it,
    displayValue: `${formatNumber(it.value)} m`,
  }));
  return {
    id: 'marinas-by-capacity',
    title: 'Marinas by max LOA capacity',
    description: `The 15 marinas that can berth the longest yachts, by max LOA in meters. Only ${withCapacity} of ${marinas.length} marinas have a recorded max LOA.`,
    ...chartAndTableFromItems(items, 'm', 'Max LOA (m)'),
  };
}

/** R7 — Largest yachts by LOA (top 15). Substituted for a builder-country breakdown, since builders have zero `located_in` edges in this graph. */
export function reportLargestYachts(graph: GraphLike): ReportResult {
  const yachts = graph.nodesByType('yacht');
  let withLoa = 0;
  const counts = new Map<string, { name: string; count: number }>();
  for (const yacht of yachts) {
    const meters = num(asRecord(yacht.attrs.loa)?.meters);
    if (meters === null) continue;
    withLoa++;
    counts.set(yacht.id, { name: yacht.name, count: meters });
  }
  const items = toRankedItems(counts, { limit: TOP_N, link: (id) => entityLink(id) }).map((it) => ({
    ...it,
    displayValue: `${formatNumber(it.value)} m`,
  }));
  return {
    id: 'largest-yachts',
    title: 'Largest yachts by length',
    description: `The 15 longest yachts in the graph by LOA. (A builder-country breakdown isn’t possible — builders have no "located in" edges in this dataset — so this substitutes the largest-yachts ranking.) ${withLoa} of ${yachts.length} yachts have a recorded LOA.`,
    ...chartAndTableFromItems(items, 'm', 'LOA (m)'),
  };
}

/** All pre-built reports, in display order. */
export function getAllReports(graph: GraphLike): ReportResult[] {
  return [
    reportTopBuilders(graph),
    reportEntitiesByRegion(graph),
    reportCharterRateDistribution(graph),
    reportYachtsByDecade(graph),
    reportOwnersByFleetSize(graph),
    reportMarinasByCapacity(graph),
    reportLargestYachts(graph),
  ];
}
