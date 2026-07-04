// app/src/utils/attrs.ts
//
// TASK-010: type-aware attribute formatting for AttrPanel.vue and
// EntityView.vue's header. Every graph node's attrs bag mixes plain
// scalars with nested `{ value, raw }` / `{ amount, currency, raw }` shapes
// (see ingest/src/exporters/graphExporter.js). This module turns that raw
// bag into a flat, ordered list of already-formatted, null-safe entries —
// nested objects are formatted here so the panel never has to fall back to
// JSON.stringify.
import { formatMeters, formatMoney, formatNumber, formatYear, shortHost } from '@/utils/format';

/** Keys handled elsewhere on the entity page (resolution metadata, provenance list, conflict flags) — never shown in the attr grid. */
const HIDDEN_KEYS = new Set(['_resolution', 'provenance', 'conflicts']);

const METERS_KEYS = new Set(['loa', 'max_loa']);
const YEAR_KEYS = new Set(['year', 'founded', 'established']);
const MONEY_KEYS = new Set(['value', 'net_worth', 'weekly_rate']);
const COUNT_KEYS = new Set(['guests', 'cabins', 'crew', 'berths']);

const LABEL_OVERRIDES: Record<string, string> = {
  loa: 'LOA',
  max_loa: 'Max LOA',
  weekly_rate: 'Weekly rate',
  net_worth: 'Net worth',
  travelift_tonnage: 'Travelift tonnage',
  power_range: 'Power range',
  parent_brand: 'Parent brand',
};

/** Humanizes an attr key ("power_range" -> "Power range"), preferring a known override. */
export function labelForAttrKey(key: string): string {
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  const words = key.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export type AttrEntryKind = 'text' | 'chips' | 'link';

export interface AttrEntry {
  key: string;
  label: string;
  kind: AttrEntryKind;
  text?: string;
  chips?: string[];
  href?: string;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/** True when every field of a nested object (e.g. `{ value, raw }`) is empty. */
function recordIsBlank(record: Record<string, unknown>): boolean {
  return Object.values(record).every(isBlank);
}

function formatYearLike(record: Record<string, unknown>): string {
  const value = num(record.value);
  if (value !== null) return formatYear(value);
  return str(record.raw) ?? '—';
}

function formatMoneyLike(value: unknown): string {
  const record = asRecord(value);
  if (record) return formatMoney(num(record.amount), str(record.currency), str(record.raw));
  return formatMoney(num(value));
}

function formatTonnage(record: Record<string, unknown>): string {
  const tons = num(record.tons);
  if (tons !== null) return `${formatNumber(tons)} t`;
  return str(record.raw) ?? '—';
}

/** Splits a short, human-written "features" sentence into displayable chips. */
function splitFeatures(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Renders an unrecognized nested object as "Key: value" pairs — never raw JSON. */
function formatUnknownRecord(record: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (isBlank(value) || typeof value === 'object') continue;
    parts.push(`${labelForAttrKey(key)}: ${value}`);
  }
  return parts.length ? parts.join(', ') : '—';
}

/**
 * Builds the ordered, formatted attribute entries for a node's attrs bag, in
 * the export's original key order. Hidden/internal keys and blank values are
 * omitted entirely (never rendered as an empty row or an em dash).
 */
export function buildAttrEntries(attrs: Record<string, unknown>): AttrEntry[] {
  const entries: AttrEntry[] = [];

  for (const [key, rawValue] of Object.entries(attrs)) {
    if (HIDDEN_KEYS.has(key) || isBlank(rawValue)) continue;

    const label = labelForAttrKey(key);

    if (key === 'features' && typeof rawValue === 'string') {
      const chips = splitFeatures(rawValue);
      if (chips.length) entries.push({ key, label, kind: 'chips', chips });
      continue;
    }

    if (key === 'website' && typeof rawValue === 'string') {
      const link = shortHost(rawValue);
      if (link) entries.push({ key, label, kind: 'link', text: link.label, href: link.href });
      else entries.push({ key, label, kind: 'text', text: rawValue });
      continue;
    }

    if (METERS_KEYS.has(key)) {
      const record = asRecord(rawValue);
      if (!record || recordIsBlank(record)) continue;
      entries.push({ key, label, kind: 'text', text: formatMeters(num(record.meters), str(record.raw)) });
      continue;
    }

    if (YEAR_KEYS.has(key)) {
      const record = asRecord(rawValue);
      if (!record || recordIsBlank(record)) continue;
      entries.push({ key, label, kind: 'text', text: formatYearLike(record) });
      continue;
    }

    if (MONEY_KEYS.has(key)) {
      const record = asRecord(rawValue);
      if (record && recordIsBlank(record)) continue;
      entries.push({ key, label, kind: 'text', text: formatMoneyLike(rawValue) });
      continue;
    }

    if (key === 'travelift_tonnage') {
      const record = asRecord(rawValue);
      if (!record || recordIsBlank(record)) continue;
      entries.push({ key, label, kind: 'text', text: formatTonnage(record) });
      continue;
    }

    if (COUNT_KEYS.has(key)) {
      entries.push({ key, label, kind: 'text', text: formatNumber(num(rawValue)) });
      continue;
    }

    if (Array.isArray(rawValue)) {
      const chips = rawValue.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
      if (chips.length) entries.push({ key, label, kind: 'chips', chips });
      continue;
    }

    const record = asRecord(rawValue);
    if (record) {
      if (!recordIsBlank(record)) entries.push({ key, label, kind: 'text', text: formatUnknownRecord(record) });
      continue;
    }

    if (typeof rawValue === 'boolean') {
      entries.push({ key, label, kind: 'text', text: rawValue ? 'Yes' : 'No' });
      continue;
    }

    if (typeof rawValue === 'number') {
      entries.push({ key, label, kind: 'text', text: formatNumber(rawValue) });
      continue;
    }

    entries.push({ key, label, kind: 'text', text: String(rawValue) });
  }

  return entries;
}

export interface ConflictEntry {
  label: string;
  values: string[];
}

/** Flattens `attrs.conflicts` (a dict of field -> alternate raw values seen across sources) for the header's expandable indicator. */
export function buildConflictEntries(conflicts: unknown): ConflictEntry[] {
  const record = asRecord(conflicts);
  if (!record) return [];
  const entries: ConflictEntry[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (isBlank(value)) continue;
    const values = Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      : [String(value)];
    if (values.length) entries.push({ label: labelForAttrKey(key), values });
  }
  return entries;
}

/** Plain source file names from `attrs.provenance`, in export order. */
export function provenanceFiles(attrs: Record<string, unknown>): string[] {
  const value = attrs.provenance;
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
}
