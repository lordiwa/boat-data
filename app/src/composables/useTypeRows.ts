// app/src/composables/useTypeRows.ts
//
// TASK-009: builds one enriched row per node of a given type, precomputing
// edge-resolved names (builder, owner, location...) and cheap in-degree
// counts ONCE per type — as a computed, re-run only when the graph loads or
// `type` changes — rather than re-deriving them per DataTable render or,
// worse, per sort comparison. EntityListView.vue passes the result straight
// through to DataTable via the presets in utils/columns.ts.
import { computed, type ComputedRef } from 'vue';
import { useGraphStore } from '@/stores/graph';
import type { EdgeRel, GraphNode, NodeType } from '@/types/graph';

/** One resolved out-neighbor (id + name) reached via a single relation hop. */
export interface RelTarget {
  id: string;
  name: string;
}

/**
 * A node plus whatever precomputed, type-specific fields its column preset
 * needs, PLUS (TASK-011) a generic `rels` bag of one-hop out-neighbors keyed
 * by relation — the substrate the no-SQL query engine (src/query/engine.ts)
 * filters on, so it never has to touch the graph store directly and stays a
 * pure, unit-testable function over plain data.
 */
export interface EnrichedRow {
  node: GraphNode;
  rels: Partial<Record<EdgeRel, RelTarget[]>>;
  [extra: string]: unknown;
}

type Graph = ReturnType<typeof useGraphStore>;

/** The name of the single neighbor reached via `rel` from/to `id`, or null if there isn't one. */
function firstNeighborName(graph: Graph, id: string, rel: EdgeRel, direction: 'out' | 'in'): string | null {
  const edges = direction === 'out' ? graph.edgesFrom(id, rel) : graph.edgesTo(id, rel);
  if (!edges.length) return null;
  const otherId = direction === 'out' ? edges[0].dst : edges[0].src;
  return graph.nodeById(otherId)?.name ?? null;
}

/** Every out-neighbor reached from `id` via `rel`, resolved to {id, name} pairs. */
function neighborsOut(graph: Graph, id: string, rel: EdgeRel): RelTarget[] {
  const result: RelTarget[] = [];
  for (const edge of graph.edgesFrom(id, rel)) {
    const node = graph.nodeById(edge.dst);
    if (node) result.push({ id: node.id, name: node.name });
  }
  return result;
}

/** Builds the `rels` bag for a node, restricted to the rels meaningful for its type. */
function buildRels(graph: Graph, id: string, rels: EdgeRel[]): Partial<Record<EdgeRel, RelTarget[]>> {
  const bag: Partial<Record<EdgeRel, RelTarget[]>> = {};
  for (const rel of rels) bag[rel] = neighborsOut(graph, id, rel);
  return bag;
}

/** Precomputes the enriched rows for one node type. Split out of the computed for readability. */
function buildRows(graph: Graph, type: NodeType): EnrichedRow[] {
  const nodes = graph.nodesByType(type);

  switch (type) {
    case 'yacht':
      return nodes.map((node) => ({
        node,
        builderName: firstNeighborName(graph, node.id, 'built_by', 'out'),
        ownerName: firstNeighborName(graph, node.id, 'owned_by', 'out'),
        rels: buildRels(graph, node.id, ['built_by', 'owned_by', 'designed_by', 'powered_by', 'located_in']),
      }));
    case 'builder':
      return nodes.map((node) => ({
        node,
        region: firstNeighborName(graph, node.id, 'located_in', 'out'),
        yachtCount: graph.edgesTo(node.id, 'built_by').length,
        rels: buildRels(graph, node.id, ['located_in']),
      }));
    case 'club':
      return nodes.map((node) => ({
        node,
        location: firstNeighborName(graph, node.id, 'located_in', 'out'),
        rels: buildRels(graph, node.id, ['located_in']),
      }));
    case 'marina':
      return nodes.map((node) => ({
        node,
        location: firstNeighborName(graph, node.id, 'located_in', 'out'),
        rels: buildRels(graph, node.id, ['located_in']),
      }));
    case 'person':
      return nodes.map((node) => ({
        node,
        yachtCount: graph.edgesTo(node.id, 'owned_by').length,
        rels: {},
      }));
    case 'company':
      return nodes.map((node) => ({
        node,
        base: firstNeighborName(graph, node.id, 'based_in', 'out'),
        rels: buildRels(graph, node.id, ['based_in']),
      }));
    case 'region':
      return nodes.map((node) => ({
        node,
        linkedCount: graph.edgesTo(node.id, 'located_in').length + graph.edgesTo(node.id, 'based_in').length,
        rels: {},
      }));
    case 'designer':
      return nodes.map((node) => ({
        node,
        yachtCount: graph.edgesTo(node.id, 'designed_by').length,
        rels: {},
      }));
    case 'shipyard':
      return nodes.map((node) => ({
        node,
        location: firstNeighborName(graph, node.id, 'located_in', 'out'),
        operatorName: firstNeighborName(graph, node.id, 'operated_by', 'out'),
        rels: buildRels(graph, node.id, ['located_in', 'operated_by']),
      }));
    case 'engine_model':
      return nodes.map((node) => ({
        node,
        brandName: firstNeighborName(graph, node.id, 'made_by', 'out'),
        rels: buildRels(graph, node.id, ['made_by']),
      }));
    case 'engine':
    case 'part':
    case 'size_class':
    default:
      return nodes.map((node) => ({ node, rels: {} }));
  }
}

/** Enriched, type-specific rows for `type`, recomputed only when the graph loads or `type` changes. */
export function useTypeRows(type: ComputedRef<NodeType>): ComputedRef<EnrichedRow[]> {
  const graph = useGraphStore();
  return computed<EnrichedRow[]>(() => (graph.loaded ? buildRows(graph, type.value) : []));
}
