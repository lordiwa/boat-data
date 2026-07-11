// ingest/src/mappers/sizeClassLinker.js
//
// TASK-025 (Round 7) AC6: structural edges derived ONLY from existing
// canonical attrs — every yacht node with a canonical numeric
// `attrs.loa.meters` gains exactly one `classified_as` edge to the correct
// `size_class` node, using the stored 24/60/100m convention already
// published on the four size_class nodes themselves (sizeClassMapper.js /
// knowledge/90):
//   size_class:boat-yacht   — <24m
//   size_class:superyacht   — 24m to <60m
//   size_class:megayacht    — 60m to <100m
//   size_class:gigayacht    — >=100m
//
// Retrofit hook (same "run once, after every file's nodes exist, called
// from ingest.js" pattern as graphCleanup.js's applyGraphCleanup() /
// linkYachtRegions() — see ingest.js's own module header for the naming
// precedent). Never invents a length — a yacht with no numeric
// `loa.meters` (missing entirely, or only a non-numeric/raw-only LOA cell)
// gets no edge at all, and never invents a size_class node either (only
// links to one that already exists in `db`).

import { upsertEdge } from '../db.js';

const BOAT_YACHT_MAX = 24; // < 24m
const SUPERYACHT_MAX = 60; // 24m to < 60m
const MEGAYACHT_MAX = 100; // 60m to < 100m
// >= 100m -> gigayacht

/**
 * Pure boundary-classification function: given a numeric length in meters,
 * returns the matching size_class node id, or null for a non-numeric/
 * missing input (never guesses). Lower boundaries are inclusive (e.g.
 * exactly 24m is a superyacht, not a boat-yacht).
 */
export function sizeClassIdForLength(meters) {
  if (typeof meters !== 'number' || Number.isNaN(meters)) return null;
  if (meters < BOAT_YACHT_MAX) return 'size_class:boat-yacht';
  if (meters < SUPERYACHT_MAX) return 'size_class:superyacht';
  if (meters < MEGAYACHT_MAX) return 'size_class:megayacht';
  return 'size_class:gigayacht';
}

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function nodeExists(db, id) {
  return !!db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
}

/**
 * DB-level hook: for every yacht node with a numeric `attrs.loa.meters`,
 * upserts a `classified_as` edge to the matching size_class node — only
 * when that node already exists in `db` (never mints one). Idempotent
 * (upsertEdge's UNIQUE(src, rel, dst) constraint means a second call never
 * duplicates the edge).
 *
 * Returns { edges }: the number of classified_as edges upserted this call.
 */
export function linkYachtSizeClasses(db) {
  const rows = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'yacht'").all();
  let edges = 0;

  for (const row of rows) {
    const attrs = parseAttrsJson(row.attrs_json);
    const meters = attrs.loa && typeof attrs.loa.meters === 'number' ? attrs.loa.meters : null;
    if (meters === null) continue;

    const classId = sizeClassIdForLength(meters);
    if (!classId || !nodeExists(db, classId)) continue;

    upsertEdge(db, { src: row.id, rel: 'classified_as', dst: classId });
    edges += 1;
  }

  return { edges };
}
