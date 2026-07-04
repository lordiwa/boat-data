// app/src/stores/graph.ts
//
// TASK-007: Pinia store that fetches ingest/data/graph.json (synced to
// public/data/graph.json by scripts/sync-graph.mjs at build/dev time) and
// exposes typed, O(1) accessors over the in-memory graph.
//
// Adjacency is built CLIENT-SIDE at load, per the Phase-1 review's
// contract note: rather than the delimiter-joined string keys used by
// ingest/src/exporters/verifyExport.js's buildAdjacency (`${src} ${rel}`),
// we use a nested Map (id -> rel -> edges) here. Node ids and rel names
// never contain spaces in this export, so either scheme is currently safe,
// but nesting sidesteps the delimiter question entirely and reads clearly
// as "edges from this node, by relation".
import { defineStore } from 'pinia';
import { shallowRef, computed } from 'vue';
import type { GraphEdge, GraphExport, GraphMeta, GraphNode, EdgeRel, NodeType } from '@/types/graph';

/** node id -> rel -> edges whose src (out) or dst (in) is that node id */
type Adjacency = Map<string, Map<string, GraphEdge[]>>;

/**
 * TASK-008: one precomputed, lowercase-friendly entry per node, used by
 * GlobalSearch so it never has to lowercase 3k+ names on every keystroke.
 * `extra` carries cheap, high-value secondary text to search — currently
 * just a yacht's builder name (via the `built_by` edge), since the ticket
 * asks for "name matching is the core" and nothing fancier.
 */
export interface SearchEntry {
  id: string;
  type: string;
  name: string;
  nameLower: string;
  extra: string;
}

function buildSearchIndex(nodeMap: Map<string, GraphNode>, out: Adjacency): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const node of nodeMap.values()) {
    let extra = '';
    if (node.type === 'yacht') {
      const builtBy = out.get(node.id)?.get('built_by');
      if (builtBy && builtBy.length) {
        const builder = nodeMap.get(builtBy[0].dst);
        if (builder) extra = builder.name.toLowerCase();
      }
    }
    entries.push({ id: node.id, type: node.type, name: node.name, nameLower: node.name.toLowerCase(), extra });
  }
  return entries;
}

function addToAdjacency(adjacency: Adjacency, nodeId: string, rel: string, edge: GraphEdge) {
  let byRel = adjacency.get(nodeId);
  if (!byRel) {
    byRel = new Map();
    adjacency.set(nodeId, byRel);
  }
  let list = byRel.get(rel);
  if (!list) {
    list = [];
    byRel.set(rel, list);
  }
  list.push(edge);
}

function buildAdjacency(edges: GraphEdge[]): { out: Adjacency; inn: Adjacency } {
  const out: Adjacency = new Map();
  const inn: Adjacency = new Map();
  for (const edge of edges) {
    addToAdjacency(out, edge.src, edge.rel, edge);
    addToAdjacency(inn, edge.dst, edge.rel, edge);
  }
  return { out, inn };
}

function lookupEdges(adjacency: Adjacency, id: string, rel?: EdgeRel): GraphEdge[] {
  const byRel = adjacency.get(id);
  if (!byRel) return [];
  if (rel) return (byRel.get(rel) || []).slice();
  const all: GraphEdge[] = [];
  for (const list of byRel.values()) all.push(...list);
  return all;
}

export const useGraphStore = defineStore('graph', () => {
  const loaded = shallowRef(false);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  const meta = shallowRef<GraphMeta | null>(null);
  const nodes = shallowRef<Map<string, GraphNode>>(new Map());
  const byType = shallowRef<Map<string, string[]>>(new Map());
  const nameToId = shallowRef<Map<string, string[]>>(new Map());
  const adjacencyOut = shallowRef<Adjacency>(new Map());
  const adjacencyIn = shallowRef<Adjacency>(new Map());
  const searchIndex = shallowRef<SearchEntry[]>([]);

  const nodeCount = computed(() => meta.value?.node_count ?? 0);
  const edgeCount = computed(() => meta.value?.edge_count ?? 0);
  const typeCounts = computed<Record<string, number>>(() => meta.value?.types ?? {});

  /** All nodes of a given type, in the export's original order. */
  function nodesByType(type: NodeType | string): GraphNode[] {
    const ids = byType.value.get(type) || [];
    const map = nodes.value;
    const result: GraphNode[] = [];
    for (const id of ids) {
      const node = map.get(id);
      if (node) result.push(node);
    }
    return result;
  }

  /** O(1) node lookup by id. Returns undefined if the id isn't in the graph. */
  function nodeById(id: string): GraphNode | undefined {
    return nodes.value.get(id);
  }

  /** Edges where `id` is the source, optionally filtered to a single relation. */
  function edgesFrom(id: string, rel?: EdgeRel): GraphEdge[] {
    return lookupEdges(adjacencyOut.value, id, rel);
  }

  /** Edges where `id` is the destination, optionally filtered to a single relation. */
  function edgesTo(id: string, rel?: EdgeRel): GraphEdge[] {
    return lookupEdges(adjacencyIn.value, id, rel);
  }

  /**
   * Neighbor nodes reachable from `id` in either direction, optionally
   * filtered to a single relation. Deduped by id; does not include `id` itself.
   */
  function neighbors(id: string, rel?: EdgeRel): GraphNode[] {
    const seen = new Set<string>();
    const result: GraphNode[] = [];
    const collect = (edges: GraphEdge[], otherId: (e: GraphEdge) => string) => {
      for (const edge of edges) {
        const otherNodeId = otherId(edge);
        if (otherNodeId === id || seen.has(otherNodeId)) continue;
        const node = nodes.value.get(otherNodeId);
        if (!node) continue;
        seen.add(otherNodeId);
        result.push(node);
      }
    };
    collect(edgesFrom(id, rel), (e) => e.dst);
    collect(edgesTo(id, rel), (e) => e.src);
    return result;
  }

  /**
   * Simple case-insensitive substring search over node names. Real
   * fuzzy/multi-field search lands in TASK-008; this is a placeholder
   * good enough to power the store's own tests and any early UI.
   */
  function searchByName(q: string): GraphNode[] {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const result: GraphNode[] = [];
    for (const node of nodes.value.values()) {
      if (node.name.toLowerCase().includes(query)) result.push(node);
    }
    return result;
  }

  /** Exact-name lookup via the export's name_to_id index (values are arrays — real name collisions exist). */
  function nodesByExactName(name: string): GraphNode[] {
    const ids = nameToId.value.get(name.trim().toLowerCase()) || [];
    return ids.map((id) => nodes.value.get(id)).filter((n): n is GraphNode => Boolean(n));
  }

  async function load(url = '/data/graph.json'): Promise<void> {
    if (loaded.value || loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as GraphExport;

      const nodeMap = new Map<string, GraphNode>();
      for (const node of data.nodes) nodeMap.set(node.id, node);

      const byTypeMap = new Map<string, string[]>();
      for (const [type, ids] of Object.entries(data.indexes.by_type)) byTypeMap.set(type, ids);

      const nameToIdMap = new Map<string, string[]>();
      for (const [name, ids] of Object.entries(data.indexes.name_to_id)) nameToIdMap.set(name, ids);

      const { out, inn } = buildAdjacency(data.edges);

      meta.value = data.meta;
      nodes.value = nodeMap;
      byType.value = byTypeMap;
      nameToId.value = nameToIdMap;
      adjacencyOut.value = out;
      adjacencyIn.value = inn;
      searchIndex.value = buildSearchIndex(nodeMap, out);
      loaded.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loaded,
    loading,
    error,
    meta,
    nodeCount,
    edgeCount,
    typeCounts,
    searchIndex,
    load,
    nodesByType,
    nodeById,
    edgesFrom,
    edgesTo,
    neighbors,
    searchByName,
    nodesByExactName,
  };
});
