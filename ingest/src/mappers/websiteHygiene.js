// ingest/src/mappers/websiteHygiene.js
//
// TASK-026 (Round 8), lane C hygiene (research/round8/
// 05_company_edges_and_hygiene.md, Findings 2 + 3): a retrofit hook — same
// "run once, after every file's nodes exist, called from ingest.js" pattern
// as graphCleanup.js's applyGraphCleanup()/regionCanonicalization.js's
// applyRegionCanonicalization() — that sweeps EVERY node's `attrs.website`
// to a bare domain (or clears it when it can't be reduced to one: an email,
// a markdown-link wrapper, a URL path, an http(s):// scheme, or "not found"
// prose — see normalize.js's normalizeWebsite) and clears three yacht-only
// absence-sentinel fields (class_society, imo, flag) that were stored as a
// "we looked and found nothing" STRING instead of being left absent (see
// normalize.js's isAbsenceSentinel).
//
// Deliberately its OWN commit, separate from Round 8's builder enrichment
// (per the ticket) — this changes already-ingested Round 1-7 data (a
// re-baseline, not new enrichment), so its score effect must stay
// separable from the enrichment diff's.
//
// NEVER invents a value: every change here is either "reduce an already-
// present string to its canonical bare-domain form" or "delete a value
// that was never real data in the first place" — never a guess at what a
// missing website/class_society/imo/flag actually is.

import { upsertNode } from '../db.js';
import { normalizeWebsite, isAbsenceSentinel } from './normalize.js';

// Finding 3's three yacht-only sentinel fields — website (also listed in
// Finding 3, for club/marina/builder nodes) is handled uniformly for every
// node type by the normalizeWebsite() sweep below, so it isn't repeated
// here.
const YACHT_SENTINEL_FIELDS = ['class_society', 'imo', 'flag'];

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * Runs the website-normalization + absence-sentinel-clearing pass over
 * every node currently in `db`. Idempotent — re-running on an already-clean
 * graph is a no-op (a node is only re-written when a value actually
 * changes).
 *
 * Returns { websitesNormalized, websitesCleared, sentinelsCleared }.
 */
export function applyWebsiteHygiene(db) {
  const rows = db.prepare('SELECT id, type, name, attrs_json FROM nodes').all();

  let websitesNormalized = 0;
  let websitesCleared = 0;
  let sentinelsCleared = 0;

  for (const row of rows) {
    const attrs = parseAttrsJson(row.attrs_json);
    let changed = false;

    if (Object.prototype.hasOwnProperty.call(attrs, 'website')) {
      const normalized = normalizeWebsite(attrs.website);
      if (normalized === null) {
        delete attrs.website;
        changed = true;
        websitesCleared += 1;
      } else if (normalized !== attrs.website) {
        attrs.website = normalized;
        changed = true;
        websitesNormalized += 1;
      }
    }

    if (row.type === 'yacht') {
      for (const field of YACHT_SENTINEL_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(attrs, field) && isAbsenceSentinel(attrs[field])) {
          delete attrs[field];
          changed = true;
          sentinelsCleared += 1;
        }
      }
    }

    if (changed) {
      upsertNode(db, { id: row.id, type: row.type, name: row.name, attrs });
    }
  }

  return { websitesNormalized, websitesCleared, sentinelsCleared };
}
