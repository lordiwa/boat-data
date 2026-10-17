// app/src/utils/search.ts
//
// TASK-032: pure engine behind the global search box. The index is built ONCE per graph load
// (stores/graph.ts); a search is then plain substring tests on precomputed lowercase strings, with
// no regex and no allocation per node, so a 3-token query over ~4.8k nodes stays far under 20 ms.
//
// Query grammar (tokens are space separated, case-insensitive):
//   type:marina | marina:          narrow to one node type (the bare type name is a shorthand)
//   country: / city: / subdivision: geography from attrs.geo only (never attrs.country)
//   in:<place>                     matches any geo level
//   <facetKey>:<value>             e.g. facility_category:dry stack, loa_band:60-90
//   marinas miami | marinas: | marinas in miami   a plural type word first (or before a colon) is the type shorthand; "in" after it is in:
//   a space after any recognised prefix colon is allowed ("type: marina", "city: miami").
//   anything else (incl. unknown "foo:bar") is plain text matched against name, builder, geo and facet labels.
//   Text is diacritic-folded ("malaga" finds Málaga); tokens split on any whitespace; plain terms are de-duplicated and capped.
import type { GraphNode } from '@/types/graph';
import { EXPLICIT_EMPTY_KEY, selectionToQuery, type FacetIndex, type FacetSelection } from '@/utils/facets';

const GEO_PREFIXES = ['country', 'subdivision', 'city', 'in'] as const;
const GEO_KEYS_SET = new Set<string>(['country', 'subdivision', 'city']);

export interface SearchEntry {
  id: string;
  type: string;
  name: string;
  nameLower: string;
  /** Lowercase builder name (yachts only); kept for ranking. */
  extra: string;
  /** "city, country" (falls back to subdivision) when attrs.geo exists, else ''. */
  subtitle: string;
  /** Lowercase name + builder + geo, for ranking. */
  core: string;
  /** Lowercase core + facet labels, the text every plain term is tested against. */
  hay: string;
  /** Lowercase geo levels; null when the node has no attrs.geo. */
  geo: { country: string; code: string; subdivision: string; city: string } | null;
  /** Lowercase facet values by facet key (geo levels excluded: they come from attrs.geo). */
  facets: Record<string, string[]>;
}

export interface SearchVocab {
  types: Set<string>;
  /** prefix name (country, subdivision, city, in, and every facet key) -> known lowercase values. */
  values: Map<string, Set<string>>;
}

export type Clause =
  | { kind: 'type'; value: string }
  | { kind: 'geo'; key: (typeof GEO_PREFIXES)[number]; value: string; exact: boolean }
  | { kind: 'facet'; key: string; value: string; exact: boolean };

export interface ParsedQuery {
  clauses: Clause[];
  terms: string[];
}

export interface ScoredEntry extends SearchEntry {
  /** 0 name starts with the text, 1 name contains it, 2 builder/geo match, 3 facet label only (lower ranks first). */
  score: number;
}

/** Diacritic-insensitive lowercase ("Málaga" -> "malaga"): NFD, strip combining marks, lowercase. Applied at index build and to the query. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Plain terms kept per query (after de-duplication): a pasted wall of words must not cost O(words x nodes). */
const MAX_TERMS = 16;

const lc = (v: unknown): string => (typeof v === 'string' ? fold(v.trim()) : '');

function addVocab(vocab: SearchVocab, key: string, value: string): void {
  if (!value) return;
  let set = vocab.values.get(key);
  if (!set) vocab.values.set(key, (set = new Set()));
  set.add(value);
}

/** One pass over the nodes: entries plus the prefix vocabulary. `builderOf` returns a yacht's builder name. */
export function buildSearchIndex(
  nodes: Iterable<GraphNode>,
  builderOf: (node: GraphNode) => string,
): { entries: SearchEntry[]; vocab: SearchVocab } {
  const vocab: SearchVocab = { types: new Set(), values: new Map() };
  const entries: SearchEntry[] = [];
  for (const node of nodes) {
    vocab.types.add(node.type);
    const nameLower = fold(node.name);
    const extra = fold(builderOf(node));
    const g = node.attrs.geo as { country_code?: unknown; country?: unknown; subdivision?: unknown; city?: unknown } | undefined;
    const hasGeo = !!g && typeof g === 'object' && typeof g.country === 'string' && typeof g.country_code === 'string';
    const geo = hasGeo
      ? { country: lc(g!.country), code: lc(g!.country_code), subdivision: lc(g!.subdivision), city: lc(g!.city) }
      : null;
    let subtitle = '';
    if (hasGeo) {
      const place = typeof g!.city === 'string' && g!.city ? g!.city : typeof g!.subdivision === 'string' ? g!.subdivision : '';
      subtitle = [place, g!.country as string].filter(Boolean).join(', ');
      for (const v of [geo!.country, geo!.code, geo!.subdivision, geo!.city]) addVocab(vocab, 'in', v);
      addVocab(vocab, 'country', geo!.country);
      addVocab(vocab, 'country', geo!.code);
      addVocab(vocab, 'subdivision', geo!.subdivision);
      addVocab(vocab, 'city', geo!.city);
    }
    const facets: Record<string, string[]> = {};
    const labels: string[] = [];
    const f = node.attrs.facets as Record<string, unknown> | undefined;
    if (f && typeof f === 'object') {
      for (const [key, raw] of Object.entries(f)) {
        if (GEO_KEYS_SET.has(key)) continue;
        const out: string[] = [];
        for (const item of Array.isArray(raw) ? raw : [raw]) {
          if (item === true) out.push('true');
          else if (item === false) out.push('false');
          else if (typeof item === 'string' || typeof item === 'number') {
            const s = fold(String(item).trim());
            if (s) out.push(s);
          }
        }
        if (!out.length) continue;
        facets[key] = out;
        for (const v of out) {
          addVocab(vocab, key, v);
          // booleans have no value text: a true flag is found by its key ("charter available")
          labels.push(v === 'true' ? key.replace(/_/g, ' ') : v === 'false' ? '' : v);
        }
      }
    }
    const core = [nameLower, extra, geo ? `${geo.city} ${geo.subdivision} ${geo.country}` : ''].join(' ');
    entries.push({
      id: node.id,
      type: node.type,
      name: node.name,
      nameLower,
      extra,
      subtitle,
      core,
      hay: `${core} ${labels.join(' ')}`,
      geo,
      facets,
    });
  }
  return { entries, vocab };
}

function isPrefixName(name: string, vocab: SearchVocab): boolean {
  return name === 'type' || vocab.types.has(name) || (GEO_PREFIXES as readonly string[]).includes(name) || vocab.values.has(name);
}

/** "marinas" -> "marina" when that is a known type. */
function singularType(v: string, vocab: SearchVocab): string {
  return !vocab.types.has(v) && v.endsWith('s') && vocab.types.has(v.slice(0, -1)) ? v.slice(0, -1) : v;
}

/** The prefix a "name:" token stands for (plural type words resolve to the type), or null. */
function prefixName(name: string, vocab: SearchVocab): string | null {
  if (isPrefixName(name, vocab)) return name;
  const s = singularType(name, vocab);
  return s !== name ? s : null;
}

/** Splits a query into prefix clauses and plain terms. Unknown prefixes stay plain text. */
export function parseQuery(raw: string, vocab: SearchVocab): ParsedQuery {
  const tokens = fold(raw).split(/\s+/).filter(Boolean);
  const clauses: Clause[] = [];
  const seenClauses = new Set<string>();
  const terms: string[] = [];
  const seenTerms = new Set<string>();
  const addTerm = (t: string): void => {
    if (terms.length < MAX_TERMS && !seenTerms.has(t)) {
      seenTerms.add(t);
      terms.push(t);
    }
  };
  const addClause = (c: Clause): void => {
    const k = `${c.kind}:${'key' in c ? c.key : ''}:${c.value}`;
    if (!seenClauses.has(k)) {
      seenClauses.add(k);
      clauses.push(c);
    }
  };
  const isPrefixTok = (tok: string): boolean => {
    const c = tok.indexOf(':');
    return c > 0 && prefixName(tok.slice(0, c), vocab) !== null;
  };
  let afterType = false; // the previous token was a type word, so a bare "in" is the in: prefix
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const colon = tok.indexOf(':');
    let name = colon > 0 ? prefixName(tok.slice(0, colon), vocab) : null;
    let first = name ? tok.slice(colon + 1) : '';
    if (!name) {
      if (colon < 0 && tok === 'in' && afterType && i + 1 < tokens.length) name = 'in';
      else if (colon < 0 && i === 0 && singularType(tok, vocab) !== tok) {
        addClause({ kind: 'type', value: singularType(tok, vocab) }); // "marinas miami"
        afterType = true;
        continue;
      } else {
        addTerm(tok);
        afterType = false;
        continue;
      }
    }
    if (name === 'type') {
      if (!first && i + 1 < tokens.length && !isPrefixTok(tokens[i + 1])) first = tokens[++i]; // "type: marina"
      if (first) addClause({ kind: 'type', value: singularType(first, vocab) });
      afterType = !!first;
      continue;
    }
    if (vocab.types.has(name) && !(GEO_PREFIXES as readonly string[]).includes(name) && !vocab.values.has(name)) {
      addClause({ kind: 'type', value: name });
      if (first) addTerm(first);
      afterType = true;
      continue;
    }
    afterType = false;
    // geo / facet prefix: the value may span several words ("dry stack") and may start after a space
    // ("city: miami"), so absorb following plain words while they still lead to a known value of this key.
    const known = vocab.values.get(name);
    let value = first;
    while (known && i + 1 < tokens.length) {
      const next = tokens[i + 1];
      if (isPrefixTok(next)) break;
      const cand = value ? `${value} ${next}` : next;
      let leads = false;
      for (const k of known) {
        if (k.startsWith(cand)) {
          leads = true;
          break;
        }
      }
      if (!leads) break;
      value = cand;
      i++;
    }
    if (!value) continue;
    const exact = !!known?.has(value);
    addClause((GEO_PREFIXES as readonly string[]).includes(name) ? { kind: 'geo', key: name as 'in', value, exact } : { kind: 'facet', key: name, value, exact });
  }
  return { clauses, terms };
}

const eqOrStarts = (field: string, value: string, exact: boolean): boolean => (exact ? field === value : field.startsWith(value));

function clauseMatches(e: SearchEntry, c: Clause): boolean {
  if (c.kind === 'type') return e.type === c.value;
  if (c.kind === 'facet') return !!e.facets[c.key]?.some((v) => eqOrStarts(v, c.value, c.exact));
  const g = e.geo;
  if (!g) return false;
  switch (c.key) {
    case 'country':
      return eqOrStarts(g.country, c.value, c.exact) || g.code === c.value;
    case 'subdivision':
      return eqOrStarts(g.subdivision, c.value, c.exact);
    case 'city':
      return eqOrStarts(g.city, c.value, c.exact);
    default:
      return (
        eqOrStarts(g.country, c.value, c.exact) ||
        g.code === c.value ||
        eqOrStarts(g.subdivision, c.value, c.exact) ||
        eqOrStarts(g.city, c.value, c.exact)
      );
  }
}

/** Clauses with the same prefix key are OR-ed (as in the facet list); different keys are AND-ed. */
function clauseGroups(clauses: Clause[]): Clause[][] {
  const by = new Map<string, Clause[]>();
  for (const c of clauses) {
    const k = c.kind === 'type' ? 'type' : `${c.kind}:${c.key}`;
    const list = by.get(k);
    if (list) list.push(c);
    else by.set(k, [c]);
  }
  return [...by.values()];
}

/** Runs a parsed query over the index. Returns [] for an empty query. */
export function searchEntries(entries: SearchEntry[], parsed: ParsedQuery): ScoredEntry[] {
  const { clauses, terms } = parsed;
  if (!clauses.length && !terms.length) return [];
  const groups = clauseGroups(clauses);
  const text = terms.join(' ');
  const out: ScoredEntry[] = [];
  for (const e of entries) {
    let ok = true;
    for (const grp of groups) {
      let any = false;
      for (const c of grp) {
        if (clauseMatches(e, c)) {
          any = true;
          break;
        }
      }
      if (!any) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let score = 0;
    if (terms.length) {
      for (const t of terms) {
        if (!e.hay.includes(t)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      if (e.nameLower.startsWith(text)) score = 0;
      else if (terms.every((t) => e.nameLower.includes(t))) score = 1;
      else if (terms.every((t) => e.core.includes(t))) score = 2;
      else score = 3;
    }
    out.push({ ...e, score });
  }
  return out;
}

/**
 * "Open as filtered list": only for a query made of prefixes alone (no plain text) with exactly one
 * type clause, every other clause resolving to a real value of that type's facet/geo vocabulary.
 * Returns the /browse URL (same query codec as TASK-030) or null.
 */
export function browseHref(parsed: ParsedQuery, facetIndexFor: (type: string) => FacetIndex): string | null {
  if (parsed.terms.length) return null;
  const types = parsed.clauses.filter((c) => c.kind === 'type');
  const rest = parsed.clauses.filter((c): c is Exclude<Clause, { kind: 'type' }> => c.kind !== 'type');
  if (types.length !== 1 || !rest.length) return null;
  const type = types[0].value;
  const index = facetIndexFor(type);
  if (!index.all.size) return null;
  const order: string[] = [];
  const selection: FacetSelection = {};
  const find = (key: string, value: string): string | null => {
    const byValue = index.facets.get(key);
    if (!byValue) return null;
    if (key === 'country') {
      for (const [code, name] of index.countryNames) if (fold(code) === value || fold(name) === value) return code;
      return null;
    }
    for (const v of byValue.keys()) if (fold(v) === value) return v;
    return null;
  };
  for (const c of rest) {
    let key = c.key;
    let canonical: string | null;
    if (c.key === 'in') {
      const hits = (['country', 'subdivision', 'city'] as const).map((k) => [k, find(k, c.value)] as const).filter(([, v]) => v !== null);
      if (hits.length !== 1) return null;
      [key, canonical] = hits[0] as [string, string];
    } else canonical = find(c.key, c.value);
    if (canonical === null) return null;
    // 'complete' doubles as the explicit-empty marker (complete=all): only a real boolean value may use it
    if (key === EXPLICIT_EMPTY_KEY && !(index.booleanKeys.has(key) && (canonical === 'true' || canonical === 'false'))) return null;
    (selection[key] ??= []).includes(canonical) || selection[key].push(canonical);
    if (!order.includes(key)) order.push(key);
  }
  const query = selectionToQuery(selection, index);
  const parts = order.filter((k) => k in query).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`);
  return `/browse/${encodeURIComponent(type)}${parts.length ? `?${parts.join('&')}` : ''}`;
}
