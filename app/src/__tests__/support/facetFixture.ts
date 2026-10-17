// TASK-030: small fixture graph for the facet specs (6 marinas, 3 yachts).
import type { GraphExport, GraphNode } from '@/types/graph';

function marina(id: string, facets: Record<string, unknown>, geo?: Record<string, unknown>): GraphNode {
  return { id, type: 'marina', name: id.toUpperCase(), attrs: { facets, ...(geo ? { geo } : {}) } };
}
function yacht(id: string, loa_band: string, complete: boolean): GraphNode {
  return { id, type: 'yacht', name: id.toUpperCase(), attrs: { facets: { loa_band, complete } } };
}
const US = { country_code: 'US', country: 'United States' };

export const fixtureNodes: GraphNode[] = [
  marina('m1', { facility_category: 'dry stack', berths_band: '150-400', services: ['fuel', 'repair'] }, { ...US, subdivision: 'Florida', city: 'Fort Lauderdale' }),
  marina('m2', { facility_category: 'boatyard', berths_band: '150-400', services: ['fuel'] }, { ...US, subdivision: 'Florida', city: 'Miami' }),
  marina('m3', { facility_category: 'dry stack', berths_band: '50-150' }, { ...US, subdivision: 'California', city: 'San Diego' }),
  marina('m4', { facility_category: 'boatyard', berths_band: '<50' }, { country_code: 'NZ', country: 'New Zealand', subdivision: null, city: 'Auckland' }),
  marina('m5', { facility_category: 'fuel dock', berths_band: '50-150' }),
  marina('m6', { facility_category: 'boatyard', berths_band: '400+' }, { country_code: 'TW', country: 'Taiwan', subdivision: null, city: 'Anping, Tainan' }),
  yacht('y1', '60-90', true),
  yacht('y2', '60-90', false),
  yacht('y3', '24-40', false),
];

type MetaFacets = Record<string, Record<string, { value: string | number | boolean; count: number }[]>>;

/** meta.facets as ingest writes it: type -> key -> [{value,count}] (geo levels included for marinas). */
function metaFacets(nodes: GraphNode[]): MetaFacets {
  const out: Record<string, Record<string, Map<string | number | boolean, number>>> = {};
  const bump = (type: string, key: string, v: string | number | boolean) => {
    const m = ((out[type] ??= {})[key] ??= new Map());
    m.set(v, (m.get(v) ?? 0) + 1);
  };
  for (const n of nodes) {
    const f = n.attrs.facets as Record<string, string | number | boolean | (string | number | boolean)[]>;
    for (const [k, v] of Object.entries(f)) for (const x of Array.isArray(v) ? v : [v]) bump(n.type, k, x);
    const g = n.attrs.geo as { country: string; subdivision?: string | null; city?: string | null } | undefined;
    if (g) {
      bump(n.type, 'country', g.country);
      if (g.subdivision) bump(n.type, 'subdivision', g.subdivision);
      if (g.city) bump(n.type, 'city', g.city);
    }
  }
  const res: MetaFacets = {};
  for (const [t, keys] of Object.entries(out)) {
    res[t] = {};
    for (const [k, m] of Object.entries(keys)) res[t][k] = [...m].map(([value, count]) => ({ value, count }));
  }
  return res;
}

export function fixtureGraph(): GraphExport {
  const nodes = [...fixtureNodes];
  const by_type: Record<string, string[]> = {};
  for (const n of nodes) (by_type[n.type] ??= []).push(n.id);
  const types = Object.fromEntries(Object.entries(by_type).map(([t, ids]) => [t, ids.length]));
  return {
    meta: { generated_at: 'fixture', node_count: nodes.length, edge_count: 0, types, edge_types: {}, facets: metaFacets(nodes) },
    nodes,
    edges: [],
    indexes: { by_type, name_to_id: {} },
  };
}
