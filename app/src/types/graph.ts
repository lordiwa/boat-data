// app/src/types/graph.ts
//
// TASK-007: types mirroring the ingest/data/graph.json contract (see
// ingest/src/exporters/graphExporter.js for the authoritative shape).

/** The entity kinds present in the graph, per meta.types. */
export type NodeType =
  | 'yacht'
  | 'marina'
  | 'region'
  | 'company'
  | 'club'
  | 'builder'
  | 'person'
  | 'engine'
  | 'designer'
  // TASK-016: shipyard/dry-dock facilities (ingest/src/mappers/shipyardMapper.js).
  | 'shipyard';

/** The relation kinds present in the graph, per meta.edge_types. */
export type EdgeRel =
  | 'built_by'
  | 'owned_by'
  | 'located_in'
  | 'based_in'
  | 'designed_by'
  | 'powered_by'
  | 'part_of'
  // TASK-016: shipyard -> builder/company (ingest/src/mappers/shipyardMapper.js).
  | 'operated_by';

export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  attrs: Record<string, unknown>;
}

export interface GraphEdge {
  src: string;
  rel: EdgeRel;
  dst: string;
  attrs: Record<string, unknown>;
}

export interface GraphMeta {
  generated_at: string;
  node_count: number;
  edge_count: number;
  types: Record<string, number>;
  edge_types: Record<string, number>;
}

export interface GraphIndexes {
  by_type: Record<string, string[]>;
  /** Values are arrays: real name collisions exist (e.g. two "Infinity" yachts). */
  name_to_id: Record<string, string[]>;
}

/** The raw shape of ingest/data/graph.json, as fetched over the wire. */
export interface GraphExport {
  meta: GraphMeta;
  nodes: GraphNode[];
  edges: GraphEdge[];
  indexes: GraphIndexes;
}
