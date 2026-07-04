// app/src/query/describe.ts
//
// TASK-011: renders a Query as a single plain-English sentence — the
// "restatement" shown above the results table so a non-technical user can
// confirm the query builder understood them correctly without reading any
// field/op/value jargon. Pulls human labels straight from QUERYABLE_FIELDS
// (src/query/model.ts); never renders a raw field slug or operator code.
import { findField, findRelField, type AttrFilter, type Filter, type Query, type RelFilter } from './model';
import { labelForType } from '@/utils/labels';

function lowerFirst(text: string): string {
  return text.length ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function describeAttrFilter(type: Query['type'], filter: AttrFilter): string | null {
  const meta = findField(type, filter.field);
  if (!meta || meta.kind !== 'attr') return null;
  const unit = meta.unit ? ` ${meta.unit}` : '';

  switch (filter.op) {
    case 'eq':
      return meta.valueKind === 'number'
        ? `${meta.label} = ${filter.value}${unit}`
        : `${meta.label} is "${filter.value}"`;
    case 'contains':
      return `${meta.label} contains "${filter.value}"`;
    case 'gte':
      return `${meta.label} ≥ ${filter.value}${unit}`;
    case 'lte':
      return `${meta.label} ≤ ${filter.value}${unit}`;
    case 'between':
      return `${meta.label} between ${filter.value} and ${filter.value2}${unit}`;
    default:
      return null;
  }
}

function describeRelFilter(type: Query['type'], filter: RelFilter): string | null {
  const meta = findRelField(type, filter.rel);
  if (!meta) return null;
  const phrase = lowerFirst(meta.label);
  if (filter.targetId) return `${phrase} (id "${filter.targetId}")`;
  if (filter.targetName && filter.targetName.trim() !== '') return `${phrase} "${filter.targetName}"`;
  return null;
}

function describeFilter(type: Query['type'], filter: Filter): string | null {
  return filter.kind === 'attr' ? describeAttrFilter(type, filter) : describeRelFilter(type, filter);
}

/** Renders `query` as a single human-readable sentence, e.g. 'Showing yachts where Length (m) ≥ 80 m, built by "Feadship".' */
export function describeQuery(query: Query): string {
  const label = labelForType(query.type).toLowerCase();
  const clauses = query.filters.map((f) => describeFilter(query.type, f)).filter((c): c is string => Boolean(c));

  if (!clauses.length) return `Showing all ${label}.`;
  return `Showing ${label} where ${clauses.join(', ')}.`;
}
