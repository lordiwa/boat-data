// app/src/utils/facets.ts
//
// TASK-030: pure faceted-navigation engine behind FacetPanel / EntityListView.
//
// Data model: ingest (TASK-029) writes a controlled-vocabulary block to
// node.attrs.facets, and (TASK-027) a geo block to node.attrs.geo. This module
// builds, once per node type, an inverted index (facet key -> value -> node
// ids). Geography is not special-cased by the engine: country (ISO code),
// subdivision and city are simply three more facets that are AND-ed like any
// other. Semantics are the standard faceted-navigation ones:
//   - OR within a facet, AND across facets;
//   - the counts shown for a facet are computed against the selection WITH
//     THAT FACET REMOVED, so its own OR group stays usable.
// No Vue imports: everything here is a plain function over plain data.
import type { GraphNode } from '@/types/graph';
import { labelForFacetKey, labelForFacetValue } from '@/utils/labels';

/** facet key -> selected values (string-normalised; booleans are 'true'/'false'). */
export type FacetSelection = Record<string, string[]>;

export const GEO_KEYS = ['country', 'subdivision', 'city'] as const;
export type GeoKey = (typeof GEO_KEYS)[number];

/** Explicit "no facet selected" marker; keeps the yacht default (complete=true) from re-applying. */
export const EXPLICIT_EMPTY_KEY = 'complete';
export const EXPLICIT_EMPTY_VALUE = 'all';

export interface FacetIndex {
  type: string;
  /** Every node id of the type (shared; callers must not mutate). */
  all: Set<string>;
  /** facet key -> value -> ids. Includes country/subdivision/city when `hasGeo`. */
  facets: Map<string, Map<string, Set<string>>>;
  /** True when the type has nodes with attrs.geo: country/subdivision/city then form the Geography block. */
  hasGeo: boolean;
  /** ISO country code -> display name (only populated when `hasGeo`). */
  countryNames: Map<string, string>;
  /** Non-geo facet keys to render as generic facets, in meta.facets order. */
  facetKeys: string[];
  /** Facet keys whose meta values are all booleans. */
  booleanKeys: Set<string>;
  /** facet/geo key -> most commas inside any known value (bounds the URL re-join window in splitList). */
  maxCommas: Map<string, number>;
}

type MetaFacets = Record<string, { value: string | number | boolean; count: number }[]> | undefined;

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() === '' ? null : v;
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  return null;
}

function addTo(map: Map<string, Map<string, Set<string>>>, key: string, value: string, id: string): void {
  let byValue = map.get(key);
  if (!byValue) {
    byValue = new Map();
    map.set(key, byValue);
  }
  let ids = byValue.get(value);
  if (!ids) {
    ids = new Set();
    byValue.set(value, ids);
  }
  ids.add(id);
}

/** Builds the inverted facet + geo index for one node type. O(nodes x facets). */
export function buildFacetIndex(type: string, nodes: GraphNode[], metaFacets: MetaFacets): FacetIndex {
  const metaKeys = Object.keys(metaFacets ?? {});
  const hasGeo = nodes.some((n) => isGeo(n.attrs.geo));
  const geoKeySet = new Set<string>(GEO_KEYS);
  const facetKeys = hasGeo ? metaKeys.filter((k) => !geoKeySet.has(k)) : metaKeys;
  const booleanKeys = new Set(
    metaKeys.filter((k) => {
      const vals = metaFacets![k];
      return vals.length > 0 && vals.every((v) => typeof v.value === 'boolean');
    }),
  );
  const facets = new Map<string, Map<string, Set<string>>>();
  const countryNames = new Map<string, string>();
  const all = new Set<string>();
  const wanted = new Set(facetKeys);

  for (const node of nodes) {
    all.add(node.id);
    const f = node.attrs.facets as Record<string, unknown> | undefined;
    if (f && typeof f === 'object') {
      for (const key of wanted) {
        const raw = f[key];
        if (raw === undefined || raw === null) continue;
        const list = Array.isArray(raw) ? raw : [raw];
        for (const item of list) {
          const s = asString(item);
          if (s !== null) addTo(facets, key, s, node.id);
        }
      }
    }
    if (hasGeo && isGeo(node.attrs.geo)) {
      const g = node.attrs.geo;
      countryNames.set(g.country_code, g.country);
      addTo(facets, 'country', g.country_code, node.id);
      if (g.subdivision) addTo(facets, 'subdivision', g.subdivision, node.id);
      if (g.city) addTo(facets, 'city', g.city, node.id);
    }
  }
  const maxCommas = new Map<string, number>();
  for (const [key, byValue] of facets) {
    let max = 0;
    for (const value of byValue.keys()) max = Math.max(max, value.split(',').length - 1);
    maxCommas.set(key, max);
  }
  return { type, all, facets, hasGeo, countryNames, facetKeys, booleanKeys, maxCommas };
}

interface Geo {
  country_code: string;
  country: string;
  subdivision?: string | null;
  city?: string | null;
}
function isGeo(v: unknown): v is Geo {
  const g = v as Geo | undefined;
  return !!g && typeof g === 'object' && typeof g.country_code === 'string' && typeof g.country === 'string';
}

// --- filtering --------------------------------------------------------------

function activeUnions(sel: FacetSelection, index: FacetIndex, skipKey?: string): Set<string>[] {
  const unions: Set<string>[] = [];
  for (const [key, values] of Object.entries(sel)) {
    if (key === skipKey || !values || values.length === 0) continue;
    const byValue = index.facets.get(key);
    const union = new Set<string>();
    if (byValue) for (const v of values) byValue.get(v)?.forEach((id) => union.add(id));
    unions.push(union);
  }
  return unions;
}

function intersectAll(unions: Set<string>[], all: Set<string>): Set<string> {
  if (unions.length === 0) return all;
  const sorted = [...unions].sort((a, b) => a.size - b.size);
  const out = new Set<string>();
  outer: for (const id of sorted[0]) {
    for (let i = 1; i < sorted.length; i++) if (!sorted[i].has(id)) continue outer;
    out.add(id);
  }
  return out;
}

/** OR within a facet, AND across facets. An empty selection returns every node (shared set; do not mutate). */
export function applyFacetSelection(sel: FacetSelection, index: FacetIndex): Set<string> {
  return intersectAll(activeUnions(sel, index), index.all);
}

/** For every facet: value -> count, each computed against the selection with that facet removed. */
export function computeCounts(sel: FacetSelection, index: FacetIndex): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  for (const [key, byValue] of index.facets) {
    const ctx = intersectAll(activeUnions(sel, index, key), index.all);
    const counts = new Map<string, number>();
    for (const [value, ids] of byValue) {
      let n = 0;
      const [small, big] = ids.size <= ctx.size ? [ids, ctx] : [ctx, ids];
      for (const id of small) if (big.has(id)) n++;
      counts.set(value, n);
    }
    result.set(key, counts);
  }
  return result;
}

// --- ordering ---------------------------------------------------------------

/** Band facets render as button groups, ordered by numeric lower bound. */
export function isBandKey(key: string): boolean {
  return /_band$|^decade$|_era$|_decade$/.test(key);
}

/** Numeric sort rank of a band value: 'pre-X' and '<X'/'<=X' first, then by lower bound, unparseable last. */
export function bandRank(value: string): number {
  const num = value.match(/\d+(\.\d+)?/);
  if (!num) return Number.POSITIVE_INFINITY;
  const n = Number(num[0]);
  if (/^pre-/i.test(value)) return -2e9 + n;
  if (value.startsWith('<')) return -1e9 + n;
  return n;
}

export function compareBands(a: string, b: string): number {
  return bandRank(a) - bandRank(b) || a.localeCompare(b);
}

// --- panel view model -------------------------------------------------------

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  selected: boolean;
  /** Zero-count and not selected: rendered disabled, never hidden. */
  disabled: boolean;
}

export interface FacetView {
  key: string;
  label: string;
  kind: 'list' | 'band' | 'boolean' | 'geo';
  options: FacetOption[];
}

function displayLabel(index: FacetIndex, key: string, value: string): string {
  if (key === 'country' && index.hasGeo) return index.countryNames.get(value) ?? value;
  return labelForFacetValue(key, value);
}

function baselineCompare(byValue: Map<string, Set<string>>, a: string, b: string): number {
  return byValue.get(b)!.size - byValue.get(a)!.size || a.localeCompare(b);
}

/** Values of a geo level reachable from the selected upper levels (all values when none selected). */
function geoScope(index: FacetIndex, sel: FacetSelection, key: GeoKey): Set<string> | null {
  const upper = GEO_KEYS.slice(0, GEO_KEYS.indexOf(key));
  const unions = activeUnions(Object.fromEntries(upper.map((k) => [k, sel[k] ?? []])), index);
  return unions.length === 0 ? null : intersectAll(unions, index.all);
}

function buildOptions(
  index: FacetIndex,
  sel: FacetSelection,
  key: string,
  counts: Map<string, number>,
  scope: Set<string> | null,
): FacetOption[] {
  const byValue = index.facets.get(key);
  if (!byValue) return [];
  const chosen = new Set(sel[key] ?? []);
  let values = [...byValue.keys()];
  if (scope) {
    values = values.filter((v) => {
      if (chosen.has(v)) return true;
      for (const id of byValue.get(v)!) if (scope.has(id)) return true;
      return false;
    });
  }
  values.sort(isBandKey(key) ? compareBands : (a, b) => baselineCompare(byValue, a, b));
  return values.map((value) => {
    const count = counts.get(value) ?? 0;
    const selected = chosen.has(value);
    return { value, label: displayLabel(index, key, value), count, selected, disabled: count === 0 && !selected };
  });
}

/** Everything the panel needs: ordered facets with options, counts recomputed on the current selection. */
export function computeFacetViews(sel: FacetSelection, index: FacetIndex): { facets: FacetView[]; geo: FacetView[] } {
  const counts = computeCounts(sel, index);
  const facets: FacetView[] = index.facetKeys
    .filter((key) => index.facets.has(key))
    .map((key) => ({
      key,
      label: labelForFacetKey(key),
      kind: index.booleanKeys.has(key) ? 'boolean' : isBandKey(key) ? 'band' : 'list',
      options: buildOptions(index, sel, key, counts.get(key)!, null),
    }));
  const geo: FacetView[] = index.hasGeo
    ? GEO_KEYS.filter((key) => index.facets.has(key)).map((key) => ({
        key,
        label: labelForFacetKey(key),
        kind: 'geo' as const,
        options: buildOptions(index, sel, key, counts.get(key)!, geoScope(index, sel, key)),
      }))
    : [];
  return { facets, geo };
}

// --- URL codec --------------------------------------------------------------

/** Every query key this type's selection can occupy. */
export function selectionKeys(index: FacetIndex): string[] {
  return [...index.facetKeys, ...(index.hasGeo ? GEO_KEYS : [])];
}

const unescapeComma = (s: string): string => s.replace(/%2C/gi, ',');

/**
 * Splits a comma-separated query value. Values that themselves contain a comma ("Anping, Tainan")
 * arrive in three natural encodings: escaped (%2C text), raw, or inside a repeated key. So adjacent
 * pieces are re-joined whenever the joined text is a known vocabulary value. Longest match wins: at each
 * position the widest known join is taken, so with both "A, B" and "A" known, "A, B" resolves to the
 * former. The join window is bounded by `maxCommas` (the most commas in any known value of the key), so
 * the work is O(pieces x maxCommas) even on a hostile URL; with maxCommas 0 this is a plain split.
 */
function splitList(raw: string, known: Map<string, unknown> | undefined, maxCommas: number): string[] {
  const parts = raw.split(',');
  const out: string[] = [];
  for (let i = 0; i < parts.length; ) {
    let taken = 1;
    for (let j = Math.min(parts.length, i + 1 + maxCommas); j > i + 1; j--) {
      if (known?.has(unescapeComma(parts.slice(i, j).join(',')))) {
        taken = j - i;
        break;
      }
    }
    out.push(unescapeComma(parts.slice(i, i + taken).join(',')));
    i += taken;
  }
  return out;
}
const joinList = (values: string[]): string => values.map((v) => v.replace(/,/g, '%2C')).join(',');

export interface ParsedSelection {
  selection: FacetSelection;
  /** True when the URL carried at least one key of this type's facet/geo vocabulary (valid or not). */
  explicit: boolean;
}

/**
 * Query -> selection. Unknown keys are ignored; unknown values are dropped silently, the rest of the
 * selection still applies. A country may be given as ISO code ("US") or exact name ("United States").
 */
export function parseSelection(query: Record<string, unknown>, index: FacetIndex): ParsedSelection {
  const selection: FacetSelection = {};
  let explicit = false;
  for (const key of selectionKeys(index)) {
    const raw = query[key];
    if (raw === undefined) continue;
    explicit = true;
    const text = Array.isArray(raw) ? raw.filter((r) => typeof r === 'string').join(',') : typeof raw === 'string' ? raw : '';
    const byValue = index.facets.get(key);
    if (!byValue || text === '') continue;
    const kept: string[] = [];
    for (let v of splitList(text, byValue, index.maxCommas.get(key) ?? 0)) {
      if (key === 'country' && !byValue.has(v)) {
        if (byValue.has(v.toUpperCase())) v = v.toUpperCase();
        else {
          const code = [...index.countryNames].find(([, name]) => name.toLowerCase() === v.toLowerCase())?.[0];
          if (code) v = code;
        }
      }
      if (byValue.has(v) && !kept.includes(v)) kept.push(v);
    }
    if (kept.length) selection[key] = kept;
  }
  return { selection, explicit };
}

/**
 * Selection -> query object (omit-empty). `yachtDefault` types (yacht) need an explicit marker when the
 * selection is empty, otherwise the default would re-apply on reload.
 */
export function selectionToQuery(sel: FacetSelection, index: FacetIndex): Record<string, string> {
  const query: Record<string, string> = {};
  for (const key of selectionKeys(index)) {
    const values = sel[key];
    if (values && values.length) query[key] = joinList(values);
  }
  if (Object.keys(query).length === 0 && hasDefaultComplete(index)) query[EXPLICIT_EMPTY_KEY] = EXPLICIT_EMPTY_VALUE;
  return query;
}

/** Only yachts default a facet on: the 'complete' flag hides the unidentifiable fragments (proposal 5.5). */
export function hasDefaultComplete(index: FacetIndex): boolean {
  return index.type === 'yacht' && index.booleanKeys.has('complete') && index.facets.get('complete')?.has('true') === true;
}

/**
 * Parses the route query and applies the yacht default (complete=true) ONLY when the URL carries no
 * facet/geo key at all. "Facet/geo key" means a key of THIS type's vocabulary: /browse/yacht?country=US
 * still gets the default, because country is not a yacht facet key (yachts carry no attrs.geo).
 */
export function resolveSelection(query: Record<string, unknown>, index: FacetIndex): { selection: FacetSelection } {
  const parsed = parseSelection(query, index);
  if (!parsed.explicit && hasDefaultComplete(index)) return { selection: { complete: ['true'] } };
  return { selection: parsed.selection };
}

/** True when resolveSelection applied the yacht default (the URL carried no facet key), as opposed to an explicit ?complete=true. */
export function isImplicitDefault(query: Record<string, unknown>, index: FacetIndex): boolean {
  return !parseSelection(query, index).explicit && hasDefaultComplete(index);
}

export function selectedCount(sel: FacetSelection): number {
  return Object.values(sel).reduce((n, v) => n + (v?.length ?? 0), 0);
}

export interface FilterChip {
  key: string;
  value: string;
  /** Visible text. */
  text: string;
  /** Accessible name for the remove button target, e.g. "Facility type: Dry stack". */
  full: string;
  /** Optional tooltip explaining non-obvious behaviour of this chip. */
  title?: string;
}

/**
 * Chips for every selected value, in facet order (generic facets, then geography). `implicitDefault`: the
 * selection came from the yacht default, not from the URL (only then does the "Shown by default" tooltip apply).
 */
export function selectionChips(sel: FacetSelection, index: FacetIndex, implicitDefault = false): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const key of selectionKeys(index)) {
    const label = labelForFacetKey(key);
    for (const value of sel[key] ?? []) {
      const valueLabel = displayLabel(index, key, value);
      const isBool = index.booleanKeys.has(key);
      const text = isBool ? (value === 'true' ? label : `Not ${label.toLowerCase()}`) : isBandKey(key) ? `${label}: ${valueLabel}` : valueLabel;
      const title =
        key === EXPLICIT_EMPTY_KEY && value === 'true' && hasDefaultComplete(index) && implicitDefault
          ? 'Shown by default. Removing it keeps ?complete=all in the URL so the default stays off after a reload.'
          : undefined;
      chips.push({ key, value, text, full: isBool ? text : `${label}: ${valueLabel}`, title });
    }
  }
  return chips;
}

/** Selected geography as breadcrumb levels, e.g. [['United States'], ['Florida']]. */
export function geoCrumbs(sel: FacetSelection, index: FacetIndex): string[] {
  const crumbs: string[] = [];
  for (const key of GEO_KEYS) {
    const values = sel[key];
    if (values && values.length) crumbs.push(values.map((v) => displayLabel(index, key, v)).join(', '));
  }
  return crumbs;
}
