// app/src/utils/__tests__/quickActions.spec.ts
//
// TASK-012: unit tests for the pure buildQuickActions builder. Exercises
// each entity type's action set, confirms actions are omitted when their
// target data doesn't exist, and round-trips every /query-targeting action
// through the real urlCodec so a chip can never point at a URL QueryView
// itself would fail to decode.
import { describe, expect, it } from 'vitest';
import { buildQuickActions, type QuickAction } from '../quickActions';
import { buildGraphIndex } from '@/reports/definitions';
import { decodeQuery } from '@/query/urlCodec';
import type { GraphEdge, GraphNode } from '@/types/graph';

let idCounter = 0;
function node(type: GraphNode['type'], name: string, attrs: Record<string, unknown> = {}): GraphNode {
  return { id: `${type}:${name.toLowerCase().replace(/\s+/g, '-')}-${idCounter++}`, type, name, attrs };
}

function edge(src: string, rel: GraphEdge['rel'], dst: string): GraphEdge {
  return { src, rel, dst, attrs: {} };
}

/** Finds a built action by (a substring of) its label, or throws — every assertion below is deliberate about which chip it checks. */
function findAction(actions: QuickAction[], labelSubstring: string): QuickAction {
  const found = actions.find((a) => a.label.includes(labelSubstring));
  if (!found) throw new Error(`no action with label containing "${labelSubstring}" (got: ${actions.map((a) => a.label).join(', ')})`);
  return found;
}

/** Round-trips a query-targeting action's `to` through the real URL codec, proving QueryView would decode it back. */
function decodeLinkAction(action: QuickAction) {
  if (action.kind !== 'link' || !action.to || typeof action.to !== 'object' || !('query' in action.to)) {
    throw new Error('expected a link action with a query');
  }
  const query = action.to.query as Record<string, string>;
  const params = new URLSearchParams(query);
  return decodeQuery(params);
}

describe('buildQuickActions — yacht', () => {
  it('links to the builder and owner entity pages when both exist', () => {
    const builder = node('builder', 'Oceanco');
    const owner = node('person', 'Anders Holch Povlsen');
    const yacht = node('yacht', 'Koru', { loa: { meters: 121 }, year: { value: 2023 } });
    const graph = buildGraphIndex(
      [builder, owner, yacht],
      [edge(yacht.id, 'built_by', builder.id), edge(yacht.id, 'owned_by', owner.id)],
    );
    const actions = buildQuickActions(yacht, graph);

    const builderAction = findAction(actions, 'More by Oceanco');
    expect(builderAction.kind).toBe('link');
    expect(builderAction.to).toEqual({ name: 'entity', params: { id: builder.id } });

    const ownerAction = findAction(actions, 'More owned by Anders Holch Povlsen');
    expect(ownerAction.to).toEqual({ name: 'entity', params: { id: owner.id } });
  });

  it('omits the builder/owner chips when those relations do not exist', () => {
    const yacht = node('yacht', 'Solo', { loa: { meters: 40 } });
    const graph = buildGraphIndex([yacht], []);
    const actions = buildQuickActions(yacht, graph);
    expect(actions.some((a) => a.label.startsWith('More by'))).toBe(false);
    expect(actions.some((a) => a.label.startsWith('More owned by'))).toBe(false);
  });

  it('builds a ±10m similar-size query that decodes back to the same LOA band', () => {
    const yacht = node('yacht', 'Koru', { loa: { meters: 121 } });
    const graph = buildGraphIndex([yacht], []);
    const action = findAction(buildQuickActions(yacht, graph), 'Similar size');
    const decoded = decodeLinkAction(action);
    expect(decoded).toEqual({
      type: 'yacht',
      filters: [{ kind: 'attr', field: 'loa', op: 'between', value: 111, value2: 131 }],
    });
  });

  it('never lets the similar-size lower bound go negative for a very small yacht', () => {
    const yacht = node('yacht', 'Tiny', { loa: { meters: 5 } });
    const graph = buildGraphIndex([yacht], []);
    const action = findAction(buildQuickActions(yacht, graph), 'Similar size');
    const decoded = decodeLinkAction(action);
    if (!decoded) throw new Error('expected a decodable query');
    const filter = decoded.filters[0];
    expect(filter.kind).toBe('attr');
    if (filter.kind === 'attr') expect(filter.value).toBe(0);
  });

  it('omits the similar-size chip when LOA is unknown', () => {
    const yacht = node('yacht', 'NoLoa');
    const graph = buildGraphIndex([yacht], []);
    expect(buildQuickActions(yacht, graph).some((a) => a.label.includes('Similar size'))).toBe(false);
  });

  it('builds a decade query from the build year that decodes back correctly', () => {
    const yacht = node('yacht', 'Koru', { year: { value: 2023 } });
    const graph = buildGraphIndex([yacht], []);
    const action = findAction(buildQuickActions(yacht, graph), 'Yachts from the 2020s');
    const decoded = decodeLinkAction(action);
    expect(decoded).toEqual({
      type: 'yacht',
      filters: [{ kind: 'attr', field: 'year', op: 'between', value: 2020, value2: 2029 }],
    });
  });

  it('omits the decade chip when build year is unknown', () => {
    const yacht = node('yacht', 'NoYear');
    const graph = buildGraphIndex([yacht], []);
    expect(buildQuickActions(yacht, graph).some((a) => a.label.startsWith('Yachts from'))).toBe(false);
  });
});

describe('buildQuickActions — builder', () => {
  it('offers an anchor to its own yacht table, a reports link, and a contains-query link when it has yachts', () => {
    const builder = node('builder', 'Oceanco');
    const yachts = Array.from({ length: 21 }, () => node('yacht', 'Y'));
    const graph = buildGraphIndex(
      [builder, ...yachts],
      yachts.map((y) => edge(y.id, 'built_by', builder.id)),
    );
    const actions = buildQuickActions(builder, graph);

    const browse = findAction(actions, 'Browse all yachts');
    expect(browse.kind).toBe('anchor');
    expect(browse.href).toBe('#rel-built_by-yacht');

    const compare = findAction(actions, 'Compare');
    expect(compare.to).toEqual({ name: 'reports' });

    const query = findAction(actions, 'Query yachts by this builder');
    const decoded = decodeLinkAction(query);
    expect(decoded).toEqual({
      type: 'yacht',
      filters: [{ kind: 'rel', rel: 'built_by', direction: 'out', targetName: 'Oceanco' }],
    });
  });

  it('omits the anchor and contains-query chips when the builder has no yachts, but keeps the reports link', () => {
    const builder = node('builder', 'Empty Yard');
    const graph = buildGraphIndex([builder], []);
    const actions = buildQuickActions(builder, graph);
    expect(actions.some((a) => a.label.includes('Browse all yachts'))).toBe(false);
    expect(actions.some((a) => a.label.includes('Query yachts'))).toBe(false);
    expect(actions.some((a) => a.label.includes('Compare'))).toBe(true);
  });
});

describe('buildQuickActions — person', () => {
  it('offers an anchor to yachts owned, plus a reports link, when the person owns yachts', () => {
    const owner = node('person', 'Anders Holch Povlsen');
    const yacht = node('yacht', 'Koru');
    const graph = buildGraphIndex([owner, yacht], [edge(yacht.id, 'owned_by', owner.id)]);
    const actions = buildQuickActions(owner, graph);
    const anchor = findAction(actions, 'All yachts owned');
    expect(anchor.kind).toBe('anchor');
    expect(anchor.href).toBe('#rel-owned_by-yacht');
    expect(actions.some((a) => a.label.includes('Other owners ranked'))).toBe(true);
  });

  it('omits the yachts-owned anchor for a person who owns nothing', () => {
    const owner = node('person', 'Nobody');
    const graph = buildGraphIndex([owner], []);
    const actions = buildQuickActions(owner, graph);
    expect(actions.some((a) => a.label.includes('All yachts owned'))).toBe(false);
    expect(actions.some((a) => a.label.includes('Other owners ranked'))).toBe(true);
  });
});

describe('buildQuickActions — region', () => {
  it('offers per-type anchors only for the relations that actually have data', () => {
    const region = node('region', 'Monaco');
    const club = node('club', 'Yacht Club de Monaco');
    const graph = buildGraphIndex([region, club], [edge(club.id, 'located_in', region.id)]);
    const actions = buildQuickActions(region, graph);
    expect(findAction(actions, 'All clubs here').href).toBe('#rel-located_in-club');
    expect(actions.some((a) => a.label.includes('All marinas here'))).toBe(false);
    expect(actions.some((a) => a.label.includes('All companies here'))).toBe(false);
  });

  it('omits "Query yachts available here" when this region has no yacht located_in edges (the real-data case)', () => {
    const region = node('region', 'Monaco');
    const graph = buildGraphIndex([region], []);
    expect(buildQuickActions(region, graph).some((a) => a.label.includes('Query yachts available here'))).toBe(false);
  });

  it('includes "Query yachts available here" (as a contains query) when a yacht IS located_in this region', () => {
    const region = node('region', 'Monaco');
    const yacht = node('yacht', 'Koru');
    const graph = buildGraphIndex([region, yacht], [edge(yacht.id, 'located_in', region.id)]);
    const action = findAction(buildQuickActions(region, graph), 'Query yachts available here');
    const decoded = decodeLinkAction(action);
    expect(decoded).toEqual({
      type: 'yacht',
      filters: [{ kind: 'rel', rel: 'located_in', direction: 'out', targetName: 'Monaco' }],
    });
  });
});

describe('buildQuickActions — marina/club/company (located/based in a region)', () => {
  it('marina: links to its region and to /browse/marina', () => {
    const region = node('region', 'French Riviera');
    const marina = node('marina', 'Port Hercule');
    const graph = buildGraphIndex([region, marina], [edge(marina.id, 'located_in', region.id)]);
    const actions = buildQuickActions(marina, graph);
    expect(findAction(actions, 'Everything in French Riviera').to).toEqual({ name: 'entity', params: { id: region.id } });
    expect(findAction(actions, 'All marinas ranked').to).toEqual({ name: 'browse', params: { type: 'marina' } });
  });

  it('marina: omits the region chip when located_in is unknown, keeps the ranked-list chip', () => {
    const marina = node('marina', 'No Region Marina');
    const graph = buildGraphIndex([marina], []);
    const actions = buildQuickActions(marina, graph);
    expect(actions.some((a) => a.label.startsWith('Everything in'))).toBe(false);
    expect(actions.some((a) => a.label.includes('All marinas ranked'))).toBe(true);
  });

  it('company: uses based_in (not located_in) to find its region', () => {
    const region = node('region', 'Fort Lauderdale');
    const company = node('company', 'Yachtzoo');
    const graph = buildGraphIndex([region, company], [edge(company.id, 'based_in', region.id)]);
    const actions = buildQuickActions(company, graph);
    expect(findAction(actions, 'Everything in Fort Lauderdale').to).toEqual({ name: 'entity', params: { id: region.id } });
    expect(findAction(actions, 'All companies ranked').to).toEqual({ name: 'browse', params: { type: 'company' } });
  });
});

describe('buildQuickActions — engine/designer', () => {
  it('engine: anchors to the yachts-powered table only when it powers at least one yacht', () => {
    const engine = node('engine', 'MTU 4000');
    const yacht = node('yacht', 'Koru');
    const graph = buildGraphIndex([engine, yacht], [edge(yacht.id, 'powered_by', engine.id)]);
    const actions = buildQuickActions(engine, graph);
    expect(findAction(actions, 'All yachts powered').href).toBe('#rel-powered_by-yacht');
    expect(findAction(actions, 'Browse all engines').to).toEqual({ name: 'browse', params: { type: 'engine' } });
  });

  it('engine: omits the anchor when it powers no yachts', () => {
    const engine = node('engine', 'Unused Engine');
    const graph = buildGraphIndex([engine], []);
    const actions = buildQuickActions(engine, graph);
    expect(actions.some((a) => a.label.includes('All yachts powered'))).toBe(false);
    expect(actions.some((a) => a.label.includes('Browse all engines'))).toBe(true);
  });

  it('designer: anchors to the yachts-designed table', () => {
    const designer = node('designer', 'Espen Oeino');
    const yacht = node('yacht', 'Koru');
    const graph = buildGraphIndex([designer, yacht], [edge(yacht.id, 'designed_by', designer.id)]);
    const actions = buildQuickActions(designer, graph);
    expect(findAction(actions, 'All yachts designed').href).toBe('#rel-designed_by-yacht');
    expect(findAction(actions, 'Browse all designers').to).toEqual({ name: 'browse', params: { type: 'designer' } });
  });
});
