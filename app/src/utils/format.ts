// app/src/utils/format.ts
//
// TASK-009: small, null-safe formatting helpers shared by the DataTable
// column presets in utils/columns.ts. Most graph attrs are optional and
// stored as nested `{ value, raw }` / `{ amount, currency, raw }` objects
// (see ingest/src/exporters/graphExporter.js), so every helper here takes
// already-unwrapped primitives and falls back to an em dash or the raw
// string when the structured value is missing.

const EMPTY = '—';

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY;
  return n.toLocaleString();
}

/** Renders "<meters> m", falling back to the free-text `raw` field, then an em dash. */
export function formatMeters(meters: number | null | undefined, raw?: string | null): string {
  if (meters !== null && meters !== undefined && !Number.isNaN(meters)) return `${formatNumber(meters)} m`;
  return raw ? raw : EMPTY;
}

export function formatYear(year: number | null | undefined): string {
  return year !== null && year !== undefined && !Number.isNaN(year) ? String(year) : EMPTY;
}

/** Renders "<currency> <amount>", falling back to the free-text `raw` field, then an em dash. */
export function formatMoney(amount: number | null | undefined, currency?: string | null, raw?: string | null): string {
  if (amount !== null && amount !== undefined && !Number.isNaN(amount)) {
    const prefix = currency ? `${currency} ` : '';
    return `${prefix}${formatNumber(amount)}`;
  }
  return raw ? raw : EMPTY;
}

export interface HostLink {
  /** Short, display-friendly host (no protocol, no leading "www."). */
  label: string;
  /** Fully-qualified URL suitable for an anchor's href. */
  href: string;
}

/**
 * Extracts a short hostname + full URL from a website field, which in this
 * graph is sometimes a bare domain ("example.com"), sometimes a full URL,
 * and sometimes a markdown-style link ("[example.com](https://example.com)").
 * Returns null when the input isn't present or can't be parsed as a URL.
 */
export function shortHost(input: string | null | undefined): HostLink | null {
  if (!input || !input.trim()) return null;
  const markdown = /\[([^\]]*)\]\(([^)]+)\)/.exec(input);
  const raw = (markdown ? markdown[2] : input).trim();
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return { label: url.hostname.replace(/^www\./, ''), href: url.toString() };
  } catch {
    return null;
  }
}
