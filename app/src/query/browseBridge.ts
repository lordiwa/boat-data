// app/src/query/browseBridge.ts
//
// TASK-031: converts between a facet/geo-only Query (query builder) and the TASK-030 /browse/:type selection
// URL. Both directions go through utils/facets.ts (resolveSelection / selectionToQuery), so the two views can
// never disagree about encoding. Pure: the caller passes the per-type FacetIndex.
//
// Country: the query model stores the country NAME (attrs.geo.country); the browse URL stores the ISO code.
// Key order is preserved across the hop (filter order <-> URL key order) so a browse URL survives
// browse -> query -> browse byte for byte.
import {
  resolveSelection,
  selectionKeys,
  selectionToQuery,
  type FacetIndex,
  type FacetSelection,
} from '@/utils/facets';
import type { FacetFilter, Query } from './model';
import type { NodeType } from '@/types/graph';

export interface BrowseTarget {
  path: string;
  query: Record<string, string>;
}

function codeForCountry(index: FacetIndex, name: string): string | undefined {
  const lower = name.toLowerCase();
  return [...index.countryNames].find(([, n]) => n.toLowerCase() === lower)?.[0];
}

/**
 * The /browse/:type target equivalent to `query`, or null when browse cannot express it: no conditions,
 * any non-facet/geo condition, any 'is not', the same field twice, or a value outside the type's vocabulary
 * (browse would silently drop it, so the pages would show different rows).
 */
export function queryToBrowse(query: Query, index: FacetIndex | null): BrowseTarget | null {
  if (!index || index.type !== query.type || !query.filters.length) return null;
  const known = new Set(selectionKeys(index));
  const selection: FacetSelection = {};
  const order: string[] = [];
  for (const f of query.filters) {
    if (f.kind !== 'facet' || f.op !== 'in' || !f.values.length) return null;
    // A facet-group filter on a geo key (types without attrs.geo) is the same browse key; a geo-group filter needs hasGeo.
    if (f.group === 'geo' && !index.hasGeo) return null;
    if (!known.has(f.key) || f.key in selection) return null;
    const byValue = index.facets.get(f.key);
    const values: string[] = [];
    for (const v of f.values) {
      const stored = f.group === 'geo' && f.key === 'country' ? codeForCountry(index, v) : v;
      if (!stored || !byValue?.has(stored)) return null;
      values.push(stored);
    }
    selection[f.key] = values;
    order.push(f.key);
  }
  const built = selectionToQuery(selection, index);
  const ordered: Record<string, string> = {};
  for (const k of order) if (k in built) ordered[k] = built[k];
  for (const k of Object.keys(built)) if (!(k in ordered)) ordered[k] = built[k];
  return { path: `/browse/${query.type}`, query: ordered };
}

/** The Query equivalent to a browse route query (the reverse hop). Applies the same yacht default browse shows. */
export function browseToQuery(type: NodeType, routeQuery: Record<string, unknown>, index: FacetIndex): Query {
  const { selection } = resolveSelection(routeQuery, index);
  const keys = selectionKeys(index);
  const urlOrder = Object.keys(routeQuery).filter((k) => keys.includes(k));
  const ordered = [...urlOrder, ...keys.filter((k) => !urlOrder.includes(k))];
  const filters: FacetFilter[] = [];
  for (const key of ordered) {
    const vals = selection[key];
    if (!vals?.length) continue;
    const geo = index.hasGeo && (key === 'country' || key === 'subdivision' || key === 'city');
    const values = geo && key === 'country' ? vals.map((c) => index.countryNames.get(c) ?? c) : vals;
    filters.push({ kind: 'facet', group: geo ? 'geo' : 'facet', key, op: 'in', values });
  }
  return { type, filters };
}
