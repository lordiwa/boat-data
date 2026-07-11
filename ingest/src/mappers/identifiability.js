// ingest/src/mappers/identifiability.js
//
// TASK-023 item 4: yacht identifiability classification — a programmatic
// (NOT hand-curated) retrofit hook, same "run once, after every file's
// nodes/edges exist, called from ingest.js" pattern as graphCleanup.js's
// applyGraphCleanup() / regionCanonicalization.js's applyRegionCanonicalization().
// Tags every yacht node with `attrs.identifiability: 'identifiable' |
// 'fragment'`, RE-DERIVED FROM SCRATCH on every ingest run (never a stored
// judgment call that could drift from the graph's actual state — there is
// no hand-curated map here, unlike YACHT_MERGE_MAP/YACHT_QUALITY_CORRECTIONS).
//
// RULE (per the ticket): a yacht is a FRAGMENT only when ALL three of the
// following hold:
//   1. no `attrs.year` (no build/delivery year known at all)
//   2. no `built_by` edge (no builder/shipyard attribution at all)
//   3. not "covered/flagged by any research pass" — defined here as: no
//      `attrs.provenance` entry from either yacht-spec-completion doc
//      (knowledge/93_Yacht_Spec_Completion.md,
//      knowledge/97_Yacht_Spec_Completion_Round6.md), no
//      `attrs.data_quality` flag (graphCleanup.js's QUALITY_FLAGS/
//      YACHT_QUALITY_CORRECTIONS convention), and no `attrs.former_names`
//      (a confirmed rename history).
// Otherwise the yacht is IDENTIFIABLE. This is deliberately generous — ANY
// ONE of year / builder edge / research coverage / quality flag / rename
// history is enough — so the fragment bucket captures only genuinely bare
// charter-listing rows (a name + an LOA + nothing else), never a yacht
// with at least one substantive real-world anchor. Flags only; NEVER
// deletes a node.
//
// completenessScore.js's dual-scoring (item 4's other half) reads this
// same attrs.identifiability to compute the identifiable-only yacht score.

import { upsertNode } from '../db.js';

// The two yacht-spec-completion research docs whose provenance alone
// counts as "covered by a research pass" — see this module's own rule
// above. Kept as a small, explicit list (not a generic "any provenance
// counts" rule) because EVERY yacht node already carries at least one
// provenance entry from whichever raw corpus file first mentioned it
// (yachtMapper.js stamps that on every row) — provenance alone is not a
// meaningful "was this yacht specifically researched" signal; only these
// two dedicated enrichment docs are.
const RESEARCH_COVERAGE_PROVENANCE = new Set([
  '93_Yacht_Spec_Completion.md',
  '97_Yacht_Spec_Completion_Round6.md',
]);

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function hasYear(attrs) {
  return Boolean(attrs.year);
}

function isResearchCovered(attrs) {
  const provenance = Array.isArray(attrs.provenance) ? attrs.provenance : [];
  if (provenance.some((file) => RESEARCH_COVERAGE_PROVENANCE.has(file))) return true;
  if (attrs.data_quality) return true;
  if (Array.isArray(attrs.former_names) && attrs.former_names.length > 0) return true;
  return false;
}

/**
 * Runs the identifiability classification pass (see module header):
 * tags every yacht node's `attrs.identifiability` as 'identifiable' or
 * 'fragment'. Idempotent AND non-accumulating — every call re-derives the
 * classification from the node's CURRENT attrs/edges from scratch (a
 * fragment that later gains a year, builder edge, or research-doc
 * provenance is correctly reclassified as identifiable on the next call,
 * never stuck with a stale tag).
 *
 * Returns { identifiable, fragment } counts.
 */
export function classifyYachtIdentifiability(db) {
  const rows = db.prepare("SELECT id, type, name, attrs_json FROM nodes WHERE type = 'yacht'").all();
  const builtByYachtIds = new Set(
    db
      .prepare("SELECT DISTINCT src FROM edges WHERE rel = 'built_by'")
      .all()
      .map((r) => r.src)
  );

  let identifiable = 0;
  let fragment = 0;

  for (const row of rows) {
    const attrs = parseAttrsJson(row.attrs_json);
    const isFragment = !hasYear(attrs) && !builtByYachtIds.has(row.id) && !isResearchCovered(attrs);

    attrs.identifiability = isFragment ? 'fragment' : 'identifiable';
    if (isFragment) fragment += 1;
    else identifiable += 1;

    upsertNode(db, { id: row.id, type: row.type, name: row.name, attrs });
  }

  return { identifiable, fragment };
}
