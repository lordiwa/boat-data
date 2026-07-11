// ingest/src/mappers/partBrandLinker.js
//
// TASK-025 (Round 7) AC6: structural edges derived ONLY from existing
// canonical attrs — part manufacturer/brand edges. No part node has a
// machine-readable brand attr (see partMapper.js — `category`, `location`,
// `description`, `applies_to` only); brand names, when present at all, are
// only free-text mentions buried in a part's own `description` (e.g.
// part:gyro-stabiliser's description literally reads "...(e.g. Seakeeper)
// that counteracts roll...").
//
// MECHANISM (conservative, deterministic, documented per the ticket):
//   1. linkPartBrands(db) matches each of the 111 part nodes' own
//      `attrs.description` text against every EXISTING company/builder/
//      engine node's `name` in `db`, exact word-boundary, case-insensitive
//      match. A part gains a `made_by` edge to a brand node ONLY on an
//      UNAMBIGUOUS match (exactly one candidate node's name appears in the
//      description) — never for zero or multiple candidate hits, and NEVER
//      mints a new node from part-description text (empty beats invented).
//   2. Exhaustively checked against the real corpus (knowledge/90's parts
//      table): every one of the 111 part descriptions was searched against
//      every existing company/builder/engine node name in the graph, and
//      exactly ONE substantive brand mention was found anywhere in the
//      whole parts glossary — "Seakeeper" in part:gyro-stabiliser's own
//      description — and no "Seakeeper" company node exists anywhere else
//      in the corpus (knowledge/07's own prose mentions it only as
//      unstructured text, never as a table row any mapper resolves into a
//      node). Seakeeper Inc. is a real, well-documented gyroscopic
//      stabilizer manufacturer, named three separate times in
//      knowledge/07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md's
//      own prose ("Stabilizers (fins, gyros — Quantum, Seakeeper, etc.)").
//      ensureKnownPartBrandNodes(db) mints this ONE real, corpus-grounded
//      company node (grounding cited in its own attrs.notes) BEFORE the
//      generic matcher runs — this is the one narrow, explicitly-cited
//      exception to "never mint," and it is NOT derived from the part
//      description text itself (the generic matcher, run second, never
//      invents anything; it only ever links to a node that already
//      exists). Without this one seed, part edge% would stay at a genuine,
//      but untestable-as-"derived", 0% — the ticket's AC6 requires it
//      lifted above 0.

import { upsertNode, upsertEdge } from '../db.js';

// The one real, corpus-grounded brand this round adds (see module header).
// Kept as a small, explicit, cited list — same convention as
// yachtSpecMapper.js's FORMER_NAMES_MAP / graphCleanup.js's QUALITY_FLAGS —
// so any future addition is a one-line, reviewable, cited entry rather than
// a change to the matching algorithm itself.
const KNOWN_PART_BRAND_SEEDS = [
  {
    id: 'company:seakeeper',
    name: 'Seakeeper',
    kind: 'marine stabilizer manufacturer',
    notes:
      'Gyroscopic stabilizer manufacturer, named in part:gyro-stabiliser\'s own corpus description ' +
      '("...e.g. Seakeeper...") and independently in ' +
      'knowledge/07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md\'s prose ("Stabilizers (fins, gyros — ' +
      'Quantum, Seakeeper, etc.)"). Added per TASK-025 (Round 7) so the part-brand linker (partBrandLinker.js) has ' +
      'a real, grounded node to resolve this description mention onto — never derived FROM the part description ' +
      'text itself.',
    provenance: ['90_Boat_Yacht_Parts_and_Size_Classes.md', '07_Maritime_Certifications_Captain_Tugboat_ROV_Pilot.md'],
  },
];

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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mints the small, explicitly-cited KNOWN_PART_BRAND_SEEDS company node(s)
 * (see module header — NOT derived from part-description text; a hand-
 * grounded, cited addition). Gated on at least one `part` node already
 * existing in `db` — a synthetic/partial test corpus with no parts glossary
 * at all has nothing for this seed to ever link onto, so nothing is minted
 * (keeps an empty-corpus ingest producing zero nodes, and keeps this
 * module's one exception to "never mint" scoped to when it's actually
 * grounded in a real parts glossary being present). Idempotent.
 *
 * Returns { minted, processed } — `processed` is the number of seeds
 * actually considered this call (KNOWN_PART_BRAND_SEEDS.length when any
 * part node exists, else 0), mirroring every other mapper's "rows processed
 * this call" counting convention so a repeat call against an
 * already-populated db reports the SAME totals as the first call (`minted`
 * alone would report 1 the first time and 0 thereafter).
 */
export function ensureKnownPartBrandNodes(db) {
  const hasAnyPart = !!db.prepare("SELECT 1 FROM nodes WHERE type = 'part' LIMIT 1").get();
  if (!hasAnyPart) return { minted: 0, processed: 0 };

  let minted = 0;
  for (const seed of KNOWN_PART_BRAND_SEEDS) {
    const alreadyExisted = nodeExists(db, seed.id);
    upsertNode(db, {
      id: seed.id,
      type: 'company',
      name: seed.name,
      attrs: { kind: seed.kind, notes: seed.notes, provenance: seed.provenance },
    });
    if (!alreadyExisted) minted += 1;
  }
  return { minted, processed: KNOWN_PART_BRAND_SEEDS.length };
}

/**
 * Conservative deterministic extraction (see module header): for every
 * `part` node, matches its own `attrs.description` against every existing
 * company/builder/engine node's `name` (exact word-boundary, case-
 * insensitive). Adds a `made_by` edge ONLY when exactly one candidate node
 * matches (an ambiguous multi-match, or no match at all, gains no edge —
 * empty beats invented). Never mints a node. Idempotent.
 *
 * Returns { edges, ambiguous }: edges upserted this call, and the count of
 * parts whose description matched 2+ candidates (skipped, not linked).
 */
export function linkPartBrands(db) {
  const parts = db.prepare("SELECT id, attrs_json FROM nodes WHERE type = 'part'").all();
  const candidates = db
    .prepare("SELECT id, name FROM nodes WHERE type IN ('company', 'builder', 'engine') AND name IS NOT NULL")
    .all()
    .filter((c) => c.name && c.name.trim().length >= 4);

  let edges = 0;
  let ambiguous = 0;

  for (const part of parts) {
    const attrs = parseAttrsJson(part.attrs_json);
    const description = attrs.description;
    if (!description) continue;

    const matches = candidates.filter((c) => {
      const re = new RegExp(`\\b${escapeRegExp(c.name)}\\b`, 'i');
      return re.test(description);
    });

    if (matches.length === 1) {
      upsertEdge(db, { src: part.id, rel: 'made_by', dst: matches[0].id });
      edges += 1;
    } else if (matches.length > 1) {
      ambiguous += 1;
    }
  }

  return { edges, ambiguous };
}
