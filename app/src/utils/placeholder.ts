// app/src/utils/placeholder.ts
//
// TASK-007: the graph contains placeholder builder nodes ("Custom" — 70
// yachts, "Various" — 38 yachts) standing in for "we don't know the real
// builder". The UI should badge these visually rather than presenting them
// as if they were real, named entities.

const PLACEHOLDER_NAMES = new Set(['custom', 'various', 'unknown', 'n/a']);

/** True if `name` denotes an unspecified/placeholder entity rather than a real one. */
export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return false;
  return PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
}
