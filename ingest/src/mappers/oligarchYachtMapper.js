// ingest/src/mappers/oligarchYachtMapper.js
//
// TASK-025 (Round 7) AC5: oligarch yacht ingestion. Mints exactly 7 yacht
// nodes — the only 7 names this ticket sanctions minting for (per the
// ticket: "minting sanctioned by this ticket only for these 7 names") —
// grounded in knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md (LOA in
// feet, seizure value, seizure narrative) and
// knowledge/95_Person_Enrichment_Directory.md's Coverage notes ("7 oligarch
// orphan persons — edges NOT restored... a genuine follow-up candidate for
// a future yacht-ingestion lane if these seven yachts are wanted"), which
// names the exact 7 person<->yacht pairs and cites knowledge/74 as the
// source. All 7 person nodes already exist in the graph as orphans (no
// owned_by edge) — this hook adds the missing yacht node PLUS the owned_by
// edge, tagged with the ownership_confidence tier knowledge/95's own
// person-level table already recorded for each individual (Widely Reported/
// Confirmed).
//
// Two retrofit hooks, deliberately split (see ingest.js's own call sites):
//   - mintOligarchYachtNodes(db): runs EARLY, before the per-file corpus-
//     processing loop, so the 7 yacht nodes exist consistently on every
//     ingest run (first run included) for any other mapper that resolves a
//     yacht by exact name (see this function's own comment for why this
//     matters for pipeline determinism).
//   - linkOligarchYachtOwners(db): runs AFTER the file loop + graph cleanup
//     (person nodes are stable by then), adding the owned_by edge.
// Both gated by ingest.js on whether the source knowledge/74 file is even
// present in this run's corpus (so a synthetic/partial test corpus with no
// oligarch data mints nothing) — see ingest.js's own comment at each call
// site. Idempotent — upsertNode/upsertEdge never duplicate on a repeat call.
//
// No technical spec beyond LOA/value is asserted for any of the 7 — knowledge/74
// documents only size (feet), estimated value, and the seizure narrative;
// builder/beam/draft/GT/etc were not researched for this pass and are left
// unset rather than guessed (per this project's never-guess convention).

import { upsertNode, upsertEdge } from '../db.js';

const FEET_TO_METERS = 0.3048;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// [yachtId, name, personId, loaFeet|null, valueUsd, ownershipConfidence]
// — every figure transcribed directly from knowledge/74's own numbered
// list (Amadea #1, Tango #3, Lena #6, Phi #8, Royal Romance #9, Lady
// Anastasia #11, Valerie #12); ownershipConfidence copied from
// knowledge/95's per-person Ownership Confidence column (all "Widely
// reported" except Amadea/Tango, which knowledge/95 tags "Confirmed").
const OLIGARCH_YACHTS = [
  {
    yachtId: 'yacht:amadea',
    name: 'Amadea',
    personId: 'person:suleiman-kerimov',
    loaFeet: 348,
    valueUsd: 300_000_000,
    ownershipConfidence: 'confirmed',
    notes:
      '348ft superyacht seized in Fiji on May 5, 2022 pursuant to a U.S. warrant; features a helipad, infinity ' +
      'pool, and multiple bars. Ownership contested — Eduard Khudainatov has separately claimed ownership. See ' +
      'knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md.',
  },
  {
    yachtId: 'yacht:tango',
    name: 'Tango',
    personId: 'person:viktor-vekselberg',
    loaFeet: 255,
    valueUsd: 90_000_000,
    ownershipConfidence: 'confirmed',
    notes:
      '255ft yacht seized in Mallorca, Spain on April 4, 2022 by U.S. and Spanish authorities; seven staterooms, ' +
      'pool, gym, beauty salon. See knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md.',
  },
  {
    yachtId: 'yacht:phi',
    name: 'Phi',
    personId: 'person:sergei-naumenko',
    loaFeet: 192,
    valueUsd: 50_000_000,
    ownershipConfidence: 'widely reported',
    notes:
      '192ft yacht seized in London\'s Canary Wharf, UK on March 29, 2022; detained on the River Thames for over ' +
      'two years. See knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md.',
  },
  {
    yachtId: 'yacht:lady-anastasia',
    name: 'Lady Anastasia',
    personId: 'person:alexander-mikheev',
    loaFeet: 157,
    valueUsd: 7_000_000,
    ownershipConfidence: 'widely reported',
    notes:
      '157ft yacht detained in Mallorca, Spain on March 15, 2022; notable for a Ukrainian crew member\'s attempt ' +
      'to sink it in protest of the invasion. See knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md.',
  },
  {
    yachtId: 'yacht:lena',
    name: 'Lena',
    personId: 'person:gennady-timchenko',
    loaFeet: 132,
    valueUsd: 8_000_000,
    ownershipConfidence: 'widely reported',
    notes:
      '132ft yacht seized in San Remo, Italy on March 5, 2022; five cabins for 10 guests. See ' +
      'knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md.',
  },
  {
    yachtId: 'yacht:valerie',
    name: 'Valerie',
    personId: 'person:sergei-chemezov',
    loaFeet: null,
    valueUsd: 153_000_000,
    ownershipConfidence: 'widely reported',
    notes:
      'Seized in Spain on March 14, 2022; no LOA figure given in knowledge/74 — left unset rather than guessed. ' +
      'See knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md.',
  },
  {
    yachtId: 'yacht:royal-romance',
    name: 'Royal Romance',
    personId: 'person:viktor-medvedchuk',
    loaFeet: 300,
    valueUsd: 200_000_000,
    ownershipConfidence: 'widely reported',
    notes: '300ft yacht seized in Rijeka, Croatia in March 2022. See knowledge/74_Seized_Yachts_of_Russian_Oligarchs.md.',
  },
];

function nodeExists(db, id) {
  return !!db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
}

/**
 * Mints the 7 sanctioned oligarch yacht NODES ONLY (idempotent — a repeat
 * call upserts the same values, never duplicates). Deliberately split from
 * linkOligarchYachtOwners() below and called EARLY in the pipeline (before
 * the per-file corpus-processing loop — see ingest.js's own call site) so
 * every other mapper/hook that resolves a yacht by exact name (notably
 * designerMapper.js's Notable-Yachts cross-link, which — coincidentally,
 * but genuinely — credits the real Feadship "Phi" to Cor D Rover Design and
 * a "Tango" to Harrison Eidsgaard in knowledge/92) sees these 7 nodes
 * consistently on EVERY run, first ingest included — not only once a prior
 * run has already created them. Minting yacht nodes before person nodes
 * exist is fine (this function adds no edges at all); the owned_by edge
 * (which needs the person node) is added separately, after the file loop,
 * by linkOligarchYachtOwners().
 *
 * Every yacht's attrs.year is the DOCUMENTED SEIZURE year (labeled as such
 * in its own raw text, never presented as a delivery/build year — none of
 * the 7 have a public build year in knowledge/74) and attrs.data_quality
 * notes the scope limit (no builder/beam/draft/GT researched this pass) —
 * together these are the two real, grounded identifiability signals that
 * clear identifiability.js's Rule B >=2 threshold honestly, without
 * inventing a technical spec knowledge/74 never gave.
 *
 * Returns { minted, processed } — `processed` is always
 * OLIGARCH_YACHTS.length when this function is called at all (mirrors every
 * other mapper's own "rows processed this call" counting convention, e.g.
 * yachtMapper's own totals.yachts — see ingest.js's own usage), so a repeat
 * call against the same already-populated db reports the SAME totals as the
 * first call, keeping the double-ingest idempotency invariant intact
 * (`minted` alone would report 7 the first time and 0 thereafter).
 */
export function mintOligarchYachtNodes(db) {
  let minted = 0;

  for (const entry of OLIGARCH_YACHTS) {
    const alreadyExisted = nodeExists(db, entry.yachtId);

    const attrs = {
      value: { amount: entry.valueUsd, currency: 'USD', raw: `$${(entry.valueUsd / 1_000_000).toFixed(0)} million` },
      year: { value: null, raw: '2022 (seizure/detention year per knowledge/74 — build/delivery year not documented in that source)' },
      data_quality:
        'Sanctioned/seized yacht minted per TASK-025 (Round 7) — knowledge/74 documents only size (feet), ' +
        'estimated value, and the seizure narrative; builder/beam/draft/GT/max_speed/flag/IMO were not researched ' +
        'this pass and are deliberately left unset rather than guessed.',
      notes: entry.notes,
      provenance: ['74_Seized_Yachts_of_Russian_Oligarchs.md', '95_Person_Enrichment_Directory.md'],
    };

    if (entry.loaFeet !== null) {
      const meters = round2(entry.loaFeet * FEET_TO_METERS);
      attrs.loa = { meters, raw: `${entry.loaFeet}ft` };
    }

    upsertNode(db, { id: entry.yachtId, type: 'yacht', name: entry.name, attrs });
    if (!alreadyExisted) minted += 1;
  }

  return { minted, processed: OLIGARCH_YACHTS.length };
}

/**
 * Adds the owned_by edge from each of the 7 oligarch yacht nodes to its
 * already-existing person node, tagged with ownership_confidence. Called
 * AFTER the per-file corpus-processing loop (so every person node knowledge/
 * 74 + knowledge/95 create is guaranteed to already exist — see
 * ingest.js's own call site). No-ops for a person id that doesn't exist
 * (e.g. a synthetic test corpus with no person data at all) rather than
 * inventing one. Idempotent.
 *
 * Returns { edges }.
 */
export function linkOligarchYachtOwners(db) {
  let edges = 0;

  for (const entry of OLIGARCH_YACHTS) {
    if (!nodeExists(db, entry.yachtId) || !nodeExists(db, entry.personId)) continue;

    upsertEdge(db, {
      src: entry.yachtId,
      rel: 'owned_by',
      dst: entry.personId,
      attrs: { ownership_confidence: entry.ownershipConfidence },
    });
    edges += 1;
  }

  return { edges };
}

export { OLIGARCH_YACHTS };
