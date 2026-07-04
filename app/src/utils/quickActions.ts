// app/src/utils/quickActions.ts
//
// TASK-012: pure, unit-testable builder for an entity page's "one-click
// relationship query" chips (rendered by components/QuickActions.vue below
// the entity header). Each action is either:
//   - kind 'link': a real cross-page navigation (another entity's page, a
//     /query prefill, or a /browse list) — carried as a RouteLocationRaw so
//     the caller renders a <router-link>.
//   - kind 'anchor': a jump to a relationship section already rendered
//     further down THIS SAME entity page (see utils/relAnchors.ts) — carried
//     as a plain `#id` href so the caller renders a plain <a> and gets free,
//     native, keyboard-accessible in-page scrolling with no router involved.
//
// Every action is omitted outright when its target data doesn't exist (no
// owner -> no "More owned by" chip) rather than rendered disabled/greyed
// out — see the ticket's CAUTION note: a chip that always 404s or always
// returns zero rows is worse than no chip.
//
// CAUTION (learned in TASK-013 review): a /query?f=<rel>.contains.<name>
// link over-matches whenever one entity's name is a substring of another's
// (e.g. "CRN" matching "CRN Yachts"). Only the Builder->"Query yachts by
// this builder" action uses `contains`, per the ticket's explicit exception
// — and QueryView always shows the plain-English sentence above the results
// so an over-match is visible, not silent. Every other cross-entity pivot
// (yacht -> builder, yacht -> owner, marina/club/company -> region) links
// straight to the target's own entity page instead, which is exact by id.
import type { RouteLocationRaw } from 'vue-router';
import type { EdgeRel, GraphEdge, GraphNode, NodeType } from '@/types/graph';
import { findRelField } from '@/query/model';
import { labelForType } from '@/utils/labels';
import { inverseGroupAnchor } from '@/utils/relAnchors';

/** The read-only slice of the graph store's API buildQuickActions needs — satisfied structurally by
 *  useGraphStore() and, in tests, by a plain in-memory fixture (see __tests__/quickActions.spec.ts). */
export interface QuickActionGraph {
  edgesFrom(id: string, rel?: EdgeRel): GraphEdge[];
  edgesTo(id: string, rel?: EdgeRel): GraphEdge[];
  nodeById(id: string): GraphNode | undefined;
}

export interface QuickAction {
  /** Chip button text. */
  label: string;
  /** 'link' renders a <router-link :to>, 'anchor' renders a plain <a :href> (see module header). */
  kind: 'link' | 'anchor';
  to?: RouteLocationRaw;
  href?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function entityLink(id: string): RouteLocationRaw {
  return { name: 'entity', params: { id } };
}

function browseLink(type: NodeType): RouteLocationRaw {
  return { name: 'browse', params: { type } };
}

function queryLink(type: NodeType, f: string): RouteLocationRaw {
  return { name: 'query', query: { type, f } };
}

function anchorAction(label: string, rel: EdgeRel, srcType: NodeType): QuickAction {
  return { label, kind: 'anchor', href: `#${inverseGroupAnchor(rel, srcType)}` };
}

/** The first out-neighbor reached from `id` via `rel`, or undefined if there isn't one. */
function firstNeighbor(graph: QuickActionGraph, id: string, rel: EdgeRel): GraphNode | undefined {
  const edge = graph.edgesFrom(id, rel)[0];
  return edge ? graph.nodeById(edge.dst) : undefined;
}

/** Whether `id` has at least one incoming `rel` edge from a node of type `srcType`. */
function hasInverseEdge(graph: QuickActionGraph, id: string, rel: EdgeRel, srcType: NodeType): boolean {
  return graph.edgesTo(id, rel).some((e) => graph.nodeById(e.src)?.type === srcType);
}

function yachtActions(node: GraphNode, graph: QuickActionGraph): QuickAction[] {
  const actions: QuickAction[] = [];

  const builder = firstNeighbor(graph, node.id, 'built_by');
  if (builder) actions.push({ label: `More by ${builder.name}`, kind: 'link', to: entityLink(builder.id) });

  const owner = firstNeighbor(graph, node.id, 'owned_by');
  if (owner) actions.push({ label: `More owned by ${owner.name}`, kind: 'link', to: entityLink(owner.id) });

  const loa = num(asRecord(node.attrs.loa)?.meters);
  if (loa !== null) {
    const lo = Math.max(0, Math.round(loa - 10));
    const hi = Math.round(loa + 10);
    actions.push({
      label: 'Similar size yachts (±10m)',
      kind: 'link',
      to: queryLink('yacht', `loa.between.${lo},${hi}`),
    });
  }

  const year = num(asRecord(node.attrs.year)?.value);
  if (year !== null) {
    const decade = Math.floor(year / 10) * 10;
    actions.push({
      label: `Yachts from the ${decade}s`,
      kind: 'link',
      to: queryLink('yacht', `year.between.${decade},${decade + 9}`),
    });
  }

  return actions;
}

function builderActions(node: GraphNode, graph: QuickActionGraph): QuickAction[] {
  const actions: QuickAction[] = [];
  if (hasInverseEdge(graph, node.id, 'built_by', 'yacht')) {
    actions.push(anchorAction('Browse all yachts by this builder', 'built_by', 'yacht'));
  }
  actions.push({ label: 'Compare: all builders ranked', kind: 'link', to: { name: 'reports' } });
  if (hasInverseEdge(graph, node.id, 'built_by', 'yacht')) {
    // Exception to the "no contains" rule (see module header): acceptable here because
    // QueryView always renders the plain-English sentence, so an over-match is visible.
    actions.push({
      label: 'Query yachts by this builder',
      kind: 'link',
      to: queryLink('yacht', `builder.contains.${node.name}`),
    });
  }
  return actions;
}

function personActions(node: GraphNode, graph: QuickActionGraph): QuickAction[] {
  const actions: QuickAction[] = [];
  if (hasInverseEdge(graph, node.id, 'owned_by', 'yacht')) {
    actions.push(anchorAction('All yachts owned', 'owned_by', 'yacht'));
  }
  actions.push({ label: 'Other owners ranked by fleet', kind: 'link', to: { name: 'reports' } });
  return actions;
}

function regionActions(node: GraphNode, graph: QuickActionGraph): QuickAction[] {
  const actions: QuickAction[] = [];
  if (hasInverseEdge(graph, node.id, 'located_in', 'club')) {
    actions.push(anchorAction('All clubs here', 'located_in', 'club'));
  }
  if (hasInverseEdge(graph, node.id, 'located_in', 'marina')) {
    actions.push(anchorAction('All marinas here', 'located_in', 'marina'));
  }
  if (hasInverseEdge(graph, node.id, 'based_in', 'company')) {
    actions.push(anchorAction('All companies here', 'based_in', 'company'));
  }
  // Yachts have zero `located_in` edges in the real export (see
  // reports/definitions.ts's R2 note) even though 'location' is a queryable
  // yacht field — gate on actual data for this region, not just the field's
  // existence, so we never surface a chip that's guaranteed to return zero rows.
  if (findRelField('yacht', 'located_in') && hasInverseEdge(graph, node.id, 'located_in', 'yacht')) {
    actions.push({
      label: 'Query yachts available here',
      kind: 'link',
      to: queryLink('yacht', `location.contains.${node.name}`),
    });
  }
  return actions;
}

/** Shared shape for Marina/Club (located_in -> region) and Company (based_in -> region). */
function locatedTypeActions(node: GraphNode, graph: QuickActionGraph, rel: EdgeRel, type: NodeType): QuickAction[] {
  const actions: QuickAction[] = [];
  const region = firstNeighbor(graph, node.id, rel);
  if (region) actions.push({ label: `Everything in ${region.name}`, kind: 'link', to: entityLink(region.id) });
  actions.push({ label: `All ${labelForType(type).toLowerCase()} ranked`, kind: 'link', to: browseLink(type) });
  return actions;
}

function engineActions(node: GraphNode, graph: QuickActionGraph): QuickAction[] {
  const actions: QuickAction[] = [];
  if (hasInverseEdge(graph, node.id, 'powered_by', 'yacht')) {
    actions.push(anchorAction('All yachts powered by this engine', 'powered_by', 'yacht'));
  }
  actions.push({ label: 'Browse all engines', kind: 'link', to: browseLink('engine') });
  return actions;
}

function designerActions(node: GraphNode, graph: QuickActionGraph): QuickAction[] {
  const actions: QuickAction[] = [];
  if (hasInverseEdge(graph, node.id, 'designed_by', 'yacht')) {
    actions.push(anchorAction('All yachts designed', 'designed_by', 'yacht'));
  }
  actions.push({ label: 'Browse all designers', kind: 'link', to: browseLink('designer') });
  return actions;
}

/** Builds the contextual one-click relationship-query chips for `node`'s entity page. */
export function buildQuickActions(node: GraphNode, graph: QuickActionGraph): QuickAction[] {
  switch (node.type) {
    case 'yacht':
      return yachtActions(node, graph);
    case 'builder':
      return builderActions(node, graph);
    case 'person':
      return personActions(node, graph);
    case 'region':
      return regionActions(node, graph);
    case 'marina':
      return locatedTypeActions(node, graph, 'located_in', 'marina');
    case 'club':
      return locatedTypeActions(node, graph, 'located_in', 'club');
    case 'company':
      return locatedTypeActions(node, graph, 'based_in', 'company');
    case 'engine':
      return engineActions(node, graph);
    case 'designer':
      return designerActions(node, graph);
    default:
      return [];
  }
}
