// app/src/query/model.ts
//
// TASK-011: the typed, serializable "no-SQL" query model. A Query is a node
// type plus a flat list of Filters, each either an attribute filter (one of
// the type's own scalar fields) or a one-hop relation filter (a neighbor
// reached via a single named edge, matched by resolved name or exact id).
// QUERYABLE_FIELDS is the single source of truth for what a user can filter
// on per type — the UI's field dropdown, the URL codec, and the plain-
// English describer all read from it rather than hard-coding field lists.
//
// Deliberately has zero Vue/store imports: it's pure data + pure lookups so
// engine.ts, urlCodec.ts and describe.ts can all be unit-tested with plain
// object fixtures (see src/query/__tests__).
import type { EnrichedRow } from '@/composables/useTypeRows';
import type { NodeType } from '@/types/graph';

export type FieldValueKind = 'text' | 'number';

export type AttrOp = 'eq' | 'contains' | 'gte' | 'lte' | 'between';

/** The relation kinds exposed to the query builder (a subset of EdgeRel — `part_of` isn't user-facing here). */
export type RelName = 'built_by' | 'owned_by' | 'located_in' | 'based_in' | 'designed_by' | 'powered_by';

export interface AttrFilter {
  kind: 'attr';
  /** Field slug — see AttrFieldMeta.field below. */
  field: string;
  op: AttrOp;
  /** Primary value. For 'between' this is the lower bound. */
  value?: string | number;
  /** Upper bound, 'between' only. */
  value2?: number;
}

export interface RelFilter {
  kind: 'rel';
  rel: RelName;
  direction: 'out';
  /** Case-insensitive substring match against the neighbor's name. */
  targetName?: string;
  /** Exact match against the neighbor's node id. Takes precedence over targetName if both are set. */
  targetId?: string;
}

export type Filter = AttrFilter | RelFilter;

export interface Query {
  type: NodeType;
  filters: Filter[];
}

export interface AttrFieldMeta {
  kind: 'attr';
  /** Unique (within a type) slug used in the URL and as the field-dropdown value. */
  field: string;
  /** Human label, e.g. "Length (m)" — never the raw attr key. */
  label: string;
  valueKind: FieldValueKind;
  /** Optional unit suffix shown in the plain-English restatement, e.g. "m", "t". */
  unit?: string;
  get: (row: EnrichedRow) => string | number | null;
}

export interface RelFieldMeta {
  kind: 'rel';
  /** Unique (within a type) slug used in the URL and as the field-dropdown value. */
  field: string;
  /** Verb-phrase label used both in the dropdown ("Built by") and mid-sentence in describeQuery. */
  label: string;
  rel: RelName;
  /** The node type of the neighbor reached via this relation — drives datalist suggestions. */
  targetType: NodeType;
}

export type FieldMeta = AttrFieldMeta | RelFieldMeta;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function nameOf(row: EnrichedRow): string {
  return row.node.name;
}

const YACHT_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'loa',
    label: 'Length (m)',
    valueKind: 'number',
    unit: 'm',
    get: (row) => num(asRecord(row.node.attrs.loa)?.meters),
  },
  {
    kind: 'attr',
    field: 'year',
    label: 'Build year',
    valueKind: 'number',
    get: (row) => num(asRecord(row.node.attrs.year)?.value),
  },
  {
    kind: 'attr',
    field: 'guests',
    label: 'Guests',
    valueKind: 'number',
    get: (row) => num(row.node.attrs.guests),
  },
  {
    kind: 'attr',
    field: 'weekly_rate',
    label: 'Weekly rate',
    valueKind: 'number',
    get: (row) => num(asRecord(row.node.attrs.weekly_rate)?.amount),
  },
  { kind: 'rel', field: 'builder', label: 'Built by', rel: 'built_by', targetType: 'builder' },
  { kind: 'rel', field: 'owner', label: 'Owned by', rel: 'owned_by', targetType: 'person' },
  { kind: 'rel', field: 'designer', label: 'Designed by', rel: 'designed_by', targetType: 'designer' },
  { kind: 'rel', field: 'engine', label: 'Powered by', rel: 'powered_by', targetType: 'engine' },
  { kind: 'rel', field: 'location', label: 'Located in', rel: 'located_in', targetType: 'region' },
];

const BUILDER_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'yacht_count',
    label: '# Yachts built',
    valueKind: 'number',
    get: (row) => num(row.yachtCount),
  },
  { kind: 'rel', field: 'location', label: 'Located in', rel: 'located_in', targetType: 'region' },
];

const CLUB_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'founded',
    label: 'Founded',
    valueKind: 'number',
    get: (row) => num(asRecord(row.node.attrs.founded)?.value),
  },
  { kind: 'rel', field: 'location', label: 'Located in', rel: 'located_in', targetType: 'region' },
];

const MARINA_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'max_loa',
    label: 'Max LOA (m)',
    valueKind: 'number',
    unit: 'm',
    get: (row) => num(asRecord(row.node.attrs.max_loa)?.meters),
  },
  {
    kind: 'attr',
    field: 'travelift_tonnage',
    label: 'Travelift (t)',
    valueKind: 'number',
    unit: 't',
    get: (row) => num(asRecord(row.node.attrs.travelift_tonnage)?.tons),
  },
  {
    kind: 'attr',
    field: 'berths',
    label: 'Berths',
    valueKind: 'number',
    get: (row) => num(row.node.attrs.berths),
  },
  { kind: 'rel', field: 'location', label: 'Located in', rel: 'located_in', targetType: 'region' },
];

const PERSON_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'net_worth',
    label: 'Net worth',
    valueKind: 'number',
    get: (row) => {
      const nw = asRecord(row.node.attrs.net_worth);
      return nw ? num(nw.amount) : num(row.node.attrs.net_worth);
    },
  },
  {
    kind: 'attr',
    field: 'yacht_count',
    label: '# Yachts owned',
    valueKind: 'number',
    get: (row) => num(row.yachtCount),
  },
];

const COMPANY_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'kind',
    label: 'Kind',
    valueKind: 'text',
    get: (row) => (typeof row.node.attrs.kind === 'string' ? (row.node.attrs.kind as string) : null),
  },
  { kind: 'rel', field: 'base', label: 'Based in', rel: 'based_in', targetType: 'region' },
];

const REGION_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'linked_count',
    label: '# Linked entities',
    valueKind: 'number',
    get: (row) => num(row.linkedCount),
  },
];

const ENGINE_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'tier',
    label: 'Tier',
    valueKind: 'text',
    get: (row) => (typeof row.node.attrs.tier === 'string' ? (row.node.attrs.tier as string) : null),
  },
];

const DESIGNER_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'yacht_count',
    label: '# Yachts designed',
    valueKind: 'number',
    get: (row) => num(row.yachtCount),
  },
];

const SHIPYARD_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'facility_type',
    label: 'Facility type',
    valueKind: 'text',
    get: (row) => (typeof row.node.attrs.facility_type === 'string' ? (row.node.attrs.facility_type as string) : null),
  },
  {
    kind: 'attr',
    field: 'max_loa',
    label: 'Max LOA (m)',
    valueKind: 'number',
    unit: 'm',
    get: (row) => num(row.node.attrs.max_loa),
  },
  { kind: 'rel', field: 'location', label: 'Located in', rel: 'located_in', targetType: 'region' },
];

const ENGINE_MODEL_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'years',
    label: 'Years',
    valueKind: 'text',
    get: (row) => (typeof row.node.attrs.years === 'string' ? (row.node.attrs.years as string) : null),
  },
  {
    kind: 'attr',
    field: 'power_hp',
    label: 'Power (hp)',
    valueKind: 'number',
    unit: 'hp',
    get: (row) => num(row.node.attrs.power_hp),
  },
];

const PART_FIELDS: FieldMeta[] = [
  { kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf },
  {
    kind: 'attr',
    field: 'category',
    label: 'Category',
    valueKind: 'text',
    get: (row) => (typeof row.node.attrs.category === 'string' ? (row.node.attrs.category as string) : null),
  },
];

const SIZE_CLASS_FIELDS: FieldMeta[] = [{ kind: 'attr', field: 'name', label: 'Name', valueKind: 'text', get: nameOf }];

export const QUERYABLE_FIELDS: Record<NodeType, FieldMeta[]> = {
  yacht: YACHT_FIELDS,
  builder: BUILDER_FIELDS,
  club: CLUB_FIELDS,
  marina: MARINA_FIELDS,
  person: PERSON_FIELDS,
  company: COMPANY_FIELDS,
  region: REGION_FIELDS,
  engine: ENGINE_FIELDS,
  designer: DESIGNER_FIELDS,
  shipyard: SHIPYARD_FIELDS,
  engine_model: ENGINE_MODEL_FIELDS,
  part: PART_FIELDS,
  size_class: SIZE_CLASS_FIELDS,
};

/** Looks up a field slug's metadata for `type`, or undefined if it doesn't exist for that type. */
export function findField(type: NodeType, field: string): FieldMeta | undefined {
  return QUERYABLE_FIELDS[type]?.find((f) => f.field === field);
}

/** Looks up the field slug that exposes `rel` as a relation filter for `type`, if any. */
export function findRelField(type: NodeType, rel: RelName): RelFieldMeta | undefined {
  return QUERYABLE_FIELDS[type]?.find((f): f is RelFieldMeta => f.kind === 'rel' && f.rel === rel);
}

/** Attribute fields valid for `op` given `valueKind` ('contains' is text-only; range ops are number-only). */
export function opsForValueKind(valueKind: FieldValueKind): AttrOp[] {
  return valueKind === 'number' ? ['eq', 'gte', 'lte', 'between'] : ['eq', 'contains'];
}

export function isOpValidForField(field: AttrFieldMeta, op: AttrOp): boolean {
  return opsForValueKind(field.valueKind).includes(op);
}

export const KNOWN_REL_NAMES: RelName[] = [
  'built_by',
  'owned_by',
  'located_in',
  'based_in',
  'designed_by',
  'powered_by',
];

export function isKnownRelName(rel: string): rel is RelName {
  return (KNOWN_REL_NAMES as string[]).includes(rel);
}
