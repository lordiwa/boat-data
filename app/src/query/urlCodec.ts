// app/src/query/urlCodec.ts
//
// TASK-011: encodes/decodes a Query (src/query/model.ts) to/from a compact,
// human-readable URLSearchParams so a query built in the UI can be bookmarked
// or pasted to someone else and reproduce the same results. Format:
//
//   ?type=yacht&f=loa.gte.80&f=builder.contains.feadship
//
// decodeQuery NEVER throws: an unknown type makes the whole query invalid
// (returns null — the caller falls back to an empty/default state). An
// individual malformed or unknown-field `f` entry is simply dropped rather
// than invalidating the rest of a shared URL.
//
// Relation filters only round-trip in their name (`contains`) form — the
// query builder UI has no control surface for an exact target id, so this
// codec deliberately never encodes RelFilter.targetId and treats a
// hand-crafted `f=<field>.id.<id>` token as an unrecognized op (dropped,
// same as any other malformed token) rather than silently reinterpreting it
// as a name search against the literal id string.
import { findField, findRelField, type AttrOp, type Filter, type Query } from './model';
import { isKnownNodeType } from '@/utils/nodeTypes';
import type { NodeType } from '@/types/graph';

const ATTR_OPS: AttrOp[] = ['eq', 'contains', 'gte', 'lte', 'between'];

function isEmptyValue(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || value === '';
}

function encodeFilter(type: NodeType, filter: Filter): string | null {
  if (filter.kind === 'rel') {
    const meta = findRelField(type, filter.rel);
    if (!meta) return null;
    if (filter.targetName && filter.targetName.trim() !== '') return `${meta.field}.contains.${filter.targetName}`;
    return null;
  }

  const meta = findField(type, filter.field);
  if (!meta || meta.kind !== 'attr') return null;

  if (filter.op === 'between') {
    if (isEmptyValue(filter.value) || filter.value2 === undefined || Number.isNaN(filter.value2)) return null;
    return `${filter.field}.between.${filter.value},${filter.value2}`;
  }
  if (isEmptyValue(filter.value)) return null;
  return `${filter.field}.${filter.op}.${filter.value}`;
}

/** Serializes `query` into URLSearchParams. Filters missing required data are silently skipped. */
export function encodeQuery(query: Query): URLSearchParams {
  const params = new URLSearchParams();
  params.set('type', query.type);
  for (const filter of query.filters) {
    const token = encodeFilter(query.type, filter);
    if (token !== null) params.append('f', token);
  }
  return params;
}

/** Splits an `f` token into [fieldSlug, op, value], where `value` may itself contain dots. */
function splitToken(raw: string): [string, string, string] | null {
  const first = raw.indexOf('.');
  if (first === -1) return null;
  const second = raw.indexOf('.', first + 1);
  if (second === -1) return null;
  const field = raw.slice(0, first);
  const op = raw.slice(first + 1, second);
  const value = raw.slice(second + 1);
  if (!field || !op) return null;
  return [field, op, value];
}

function decodeFilter(type: NodeType, raw: string): Filter | null {
  const parts = splitToken(raw);
  if (!parts) return null;
  const [fieldSlug, op, value] = parts;
  const meta = findField(type, fieldSlug);
  if (!meta) return null;

  if (meta.kind === 'rel') {
    if (op === 'contains') {
      if (!value.trim()) return null;
      return { kind: 'rel', rel: meta.rel, direction: 'out', targetName: value };
    }
    // Any other op token (including a hand-crafted `id` token — see module
    // header) is unrecognized for a relation field; drop it rather than
    // guessing at what the author meant.
    return null;
  }

  if (!(ATTR_OPS as string[]).includes(op)) return null;
  const attrOp = op as AttrOp;
  const allowed = meta.valueKind === 'number' ? ['eq', 'gte', 'lte', 'between'] : ['eq', 'contains'];
  if (!allowed.includes(attrOp)) return null;

  if (attrOp === 'between') {
    const [rawA, rawB] = value.split(',').map((s) => s.trim());
    if (!rawA || !rawB) return null;
    const a = Number(rawA);
    const b = Number(rawB);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return { kind: 'attr', field: fieldSlug, op: 'between', value: a, value2: b };
  }

  if (meta.valueKind === 'number') {
    if (!value.trim()) return null;
    const n = Number(value);
    if (Number.isNaN(n)) return null;
    return { kind: 'attr', field: fieldSlug, op: attrOp, value: n };
  }

  if (!value) return null;
  return { kind: 'attr', field: fieldSlug, op: attrOp, value };
}

/**
 * Parses `params` back into a Query, or null if `type` is missing/unknown.
 * Individual malformed/unknown-field `f` entries are dropped, not fatal —
 * a partially-garbled shared URL still reproduces whatever part is valid.
 */
export function decodeQuery(params: URLSearchParams): Query | null {
  const typeRaw = params.get('type');
  if (!typeRaw || !isKnownNodeType(typeRaw)) return null;
  const type = typeRaw as NodeType;

  const filters: Filter[] = [];
  for (const raw of params.getAll('f')) {
    const filter = decodeFilter(type, raw);
    if (filter) filters.push(filter);
  }
  return { type, filters };
}
