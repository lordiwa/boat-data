// ingest/tests/regionCanonicalization.spec.js
//
// TASK-022: region canonicalization Tier 2 — the one-time, corpus-scoped
// judgment merges/renames/quarantines that regions.js's permanent
// REGION_ALIAS_GROUPS hardening (see regions.spec.js) deliberately does NOT
// handle, because they are either:
//   1. genuinely ambiguous city names that happen to be unambiguous FOR
//      THIS corpus only (Portland OR/ME, Henderson WA/NV, Tuzla Turkey/
//      Bosnia) — safe to merge THIS corpus's existing nodes once, but not
//      safe to bake in as a universal alias that could misfire on a future
//      round's genuinely different Portland/Henderson/Tuzla data; or
//   2. one-off prose-name artifacts (a whole sentence/clause landed in a
//      corpus table's Region/Location cell) that need per-node judgment:
//      renamed to a clean name when unambiguous, or quarantined with
//      attrs.artifact = true when not (never guessed).
//
// Same discipline as graphCleanup.js: data-driven maps/lists with a
// per-entry rationale, idempotent, no orphan edges, no lost edges.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import {
  REGION_MERGE_MAP,
  REGION_RENAME_MAP,
  REGION_ARTIFACT_FLAGS,
  applyRegionCanonicalization,
} from '../src/mappers/regionCanonicalization.js';

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'region-canon-test-')), 'graph.db');
  db = openDb(tmpDbPath);
  initSchema(db);
});

afterEach(() => {
  db.close();
  fs.rmSync(path.dirname(tmpDbPath), { recursive: true, force: true });
});

function getNode(id) {
  const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, attrs: row.attrs_json ? JSON.parse(row.attrs_json) : null };
}

function nodeExists(id) {
  return !!db.prepare('SELECT 1 FROM nodes WHERE id = ?').get(id);
}

function edgeExists(src, rel, dst) {
  return !!db.prepare('SELECT 1 FROM edges WHERE src = ? AND rel = ? AND dst = ?').get(src, rel, dst);
}

function orphanEdgeCount() {
  return db
    .prepare(
      `SELECT COUNT(*) AS count FROM edges e
       WHERE NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = e.src)
          OR NOT EXISTS (SELECT 1 FROM nodes n WHERE n.id = e.dst)`
    )
    .get().count;
}

function countNodes() {
  return db.prepare('SELECT COUNT(*) AS count FROM nodes').get().count;
}

function countEdges() {
  return db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;
}

describe('REGION_MERGE_MAP — documented one-time judgment merges', () => {
  it('includes the Portland OR/ME judgment call: bare Portland -> Portland, OR (corpus-confirmed unambiguous)', () => {
    expect(REGION_MERGE_MAP.some((e) => e.from === 'region:portland' && e.to === 'region:portland-or')).toBe(true);
  });

  it('includes the Henderson WA/NV judgment call: bare Henderson AND Henderson, Perth both fold onto Henderson, WA', () => {
    expect(REGION_MERGE_MAP.some((e) => e.from === 'region:henderson' && e.to === 'region:henderson-wa')).toBe(true);
    expect(REGION_MERGE_MAP.some((e) => e.from === 'region:henderson-perth' && e.to === 'region:henderson-wa')).toBe(
      true
    );
  });

  it('includes the Tuzla Turkey/Bosnia judgment call: bare Tuzla -> Tuzla, Istanbul', () => {
    expect(REGION_MERGE_MAP.some((e) => e.from === 'region:tuzla' && e.to === 'region:tuzla-istanbul')).toBe(true);
  });

  it('every entry carries a non-empty rationale (documented judgment, not a bare id pair)', () => {
    for (const entry of REGION_MERGE_MAP) {
      expect(typeof entry.notes).toBe('string');
      expect(entry.notes.length).toBeGreaterThan(10);
    }
  });

  it('merges bare Portland into the disambiguated Portland, OR node, carrying its edges', () => {
    upsertNode(db, { id: 'region:portland', type: 'region', name: 'Portland' });
    upsertNode(db, { id: 'region:portland-or', type: 'region', name: 'Portland, OR' });
    upsertNode(db, { id: 'club:willamette-sailing-club', type: 'club', name: 'Willamette Sailing Club' });
    upsertEdge(db, { src: 'club:willamette-sailing-club', rel: 'located_in', dst: 'region:portland' });

    applyRegionCanonicalization(db);

    expect(nodeExists('region:portland')).toBe(false);
    expect(nodeExists('region:portland-or')).toBe(true);
    expect(edgeExists('club:willamette-sailing-club', 'located_in', 'region:portland-or')).toBe(true);
    expect(orphanEdgeCount()).toBe(0);
  });

  it('folds prose-artifact nodes whose unambiguous primary place already has an existing canonical node (New River, Nassau, Sanya, Shanghai)', () => {
    upsertNode(db, { id: 'region:new-river', type: 'region', name: 'New River' });
    upsertNode(db, {
      id: 'region:new-river-includes-integrated-roscioli-yachting-center',
      type: 'region',
      name: 'New River; includes integrated Roscioli Yachting Center',
    });
    upsertNode(db, { id: 'marina:x', type: 'marina', name: 'X' });
    upsertEdge(db, {
      src: 'marina:x',
      rel: 'located_in',
      dst: 'region:new-river-includes-integrated-roscioli-yachting-center',
    });

    applyRegionCanonicalization(db);

    expect(nodeExists('region:new-river-includes-integrated-roscioli-yachting-center')).toBe(false);
    expect(edgeExists('marina:x', 'located_in', 'region:new-river')).toBe(true);
  });

  it('is a no-op (does not throw) when a merge pair is absent from a smaller/synthetic graph', () => {
    expect(() => applyRegionCanonicalization(db)).not.toThrow();
  });
});

describe('REGION_RENAME_MAP — prose artifacts renamed to a clean, unambiguous name', () => {
  it('includes the Palm Beach and Panama City rename entries with a clean toName', () => {
    const palmBeach = REGION_RENAME_MAP.find(
      (e) => e.from === 'region:palm-beach-often-grouped-with-fort-lauderdale-due-to-proximity-and-shared-ecosystem'
    );
    expect(palmBeach).toBeTruthy();
    expect(palmBeach.toName).toBe('Palm Beach');

    const panamaCity = REGION_RENAME_MAP.find(
      (e) => e.from === 'region:panama-city-operated-by-j-a-jones-construction-co'
    );
    expect(panamaCity).toBeTruthy();
    expect(panamaCity.toName).toBe('Panama City');
  });

  it('renames the "Palm Beach; often grouped with..." artifact to a clean "Palm Beach" node, carrying its edges (marina:safe-harbor-rybovich scenario)', () => {
    upsertNode(db, {
      id: 'region:palm-beach-often-grouped-with-fort-lauderdale-due-to-proximity-and-shared-ecosystem',
      type: 'region',
      name: 'Palm Beach; often grouped with Fort Lauderdale due to proximity and shared ecosystem',
    });
    upsertNode(db, { id: 'region:west-palm-beach', type: 'region', name: 'West Palm Beach' });
    upsertNode(db, { id: 'marina:safe-harbor-rybovich', type: 'marina', name: 'Safe Harbor Rybovich' });
    upsertEdge(db, {
      src: 'marina:safe-harbor-rybovich',
      rel: 'located_in',
      dst: 'region:palm-beach-often-grouped-with-fort-lauderdale-due-to-proximity-and-shared-ecosystem',
    });
    upsertEdge(db, { src: 'marina:safe-harbor-rybovich', rel: 'located_in', dst: 'region:west-palm-beach' });

    applyRegionCanonicalization(db);

    expect(
      nodeExists('region:palm-beach-often-grouped-with-fort-lauderdale-due-to-proximity-and-shared-ecosystem')
    ).toBe(false);
    const clean = getNode('region:palm-beach');
    expect(clean).not.toBeNull();
    expect(clean.name).toBe('Palm Beach');
    expect(clean.name).not.toContain(';');

    // marina:safe-harbor-rybovich now has exactly TWO distinct, legitimate
    // located_in edges (West Palm Beach and Palm Beach are different real
    // towns) — down from the ticket's documented 3, with no duplicate.
    const edges = db
      .prepare("SELECT dst FROM edges WHERE src = 'marina:safe-harbor-rybovich' AND rel = 'located_in'")
      .all()
      .map((r) => r.dst);
    expect(edges.sort()).toEqual(['region:palm-beach', 'region:west-palm-beach']);
    expect(orphanEdgeCount()).toBe(0);
  });

  it('renames the "Panama City, operated by J.A. Jones Construction Co." artifact to a clean "Panama City" node', () => {
    upsertNode(db, {
      id: 'region:panama-city-operated-by-j-a-jones-construction-co',
      type: 'region',
      name: 'Panama City, operated by J.A. Jones Construction Co.',
    });
    upsertNode(db, { id: 'shipyard:y', type: 'shipyard', name: 'Y' });
    upsertEdge(db, {
      src: 'shipyard:y',
      rel: 'located_in',
      dst: 'region:panama-city-operated-by-j-a-jones-construction-co',
    });

    applyRegionCanonicalization(db);

    expect(nodeExists('region:panama-city-operated-by-j-a-jones-construction-co')).toBe(false);
    expect(nodeExists('region:panama-city')).toBe(true);
    expect(getNode('region:panama-city').name).toBe('Panama City');
    expect(edgeExists('shipyard:y', 'located_in', 'region:panama-city')).toBe(true);
  });

  it('rolls a renamed Florida city up to region:florida via a PART_OF edge (Panama City is in FLORIDA_CITIES)', () => {
    upsertNode(db, {
      id: 'region:panama-city-operated-by-j-a-jones-construction-co',
      type: 'region',
      name: 'Panama City, operated by J.A. Jones Construction Co.',
    });

    applyRegionCanonicalization(db);

    expect(edgeExists('region:panama-city', 'part_of', 'region:florida')).toBe(true);
  });
});

describe('REGION_ARTIFACT_FLAGS — genuinely ambiguous prose artifacts are quarantined, never guessed', () => {
  it('includes the Sturgeon Bay relocation-history artifact and the Vancouver/Tellico Lake relocation artifact', () => {
    expect(REGION_ARTIFACT_FLAGS.some((e) => e.id.includes('sturgeon-bay'))).toBe(true);
    expect(REGION_ARTIFACT_FLAGS.some((e) => e.id === 'region:vancouver-wa-relocated-to-tellico-lake-tn')).toBe(true);
  });

  it('flags the Sturgeon Bay/Monaco/Netherlands relocation-history node with artifact:true rather than guessing a single location', () => {
    const id = 'region:originally-sturgeon-bay-wi-closed-2015-2017-hq-now-monaco-yard-in-netherlands';
    upsertNode(db, {
      id,
      type: 'region',
      name: 'originally Sturgeon Bay, WI (closed 2015–2017); HQ now Monaco, yard in Netherlands',
    });
    upsertNode(db, { id: 'builder:z', type: 'builder', name: 'Z' });
    upsertEdge(db, { src: 'builder:z', rel: 'located_in', dst: id });

    applyRegionCanonicalization(db);

    // Quarantined, not deleted or renamed — the underlying real location is
    // genuinely ambiguous (3 different real places across time).
    expect(nodeExists(id)).toBe(true);
    expect(getNode(id).attrs.artifact).toBe(true);
    expect(typeof getNode(id).attrs.artifact_reason).toBe('string');
    // Its edges are untouched (still a valid, if imprecise, location fact).
    expect(edgeExists('builder:z', 'located_in', id)).toBe(true);
  });

  it('flags the Vancouver, WA (relocated to Tellico Lake, TN) artifact without merging it into either Vancouver node', () => {
    upsertNode(db, { id: 'region:vancouver-wa', type: 'region', name: 'Vancouver, WA' });
    upsertNode(db, {
      id: 'region:vancouver-wa-relocated-to-tellico-lake-tn',
      type: 'region',
      name: 'Vancouver, WA (relocated to Tellico Lake, TN)',
    });

    applyRegionCanonicalization(db);

    expect(nodeExists('region:vancouver-wa-relocated-to-tellico-lake-tn')).toBe(true);
    expect(getNode('region:vancouver-wa-relocated-to-tellico-lake-tn').attrs.artifact).toBe(true);
    expect(nodeExists('region:vancouver-wa')).toBe(true);
  });
});

describe('applyRegionCanonicalization — generic ";"-in-name safety net', () => {
  it('auto-flags ANY remaining region node whose name contains ";" even if not explicitly listed in REGION_ARTIFACT_FLAGS', () => {
    const surpriseId = 'region:a-totally-new-artifact-not-in-any-hand-curated-list';
    upsertNode(db, {
      id: surpriseId,
      type: 'region',
      name: 'Some new corpus round; garbled prose nobody has seen before',
    });

    applyRegionCanonicalization(db);

    expect(nodeExists(surpriseId)).toBe(true);
    expect(getNode(surpriseId).attrs.artifact).toBe(true);
  });

  it('does not flag ordinary region names that merely contain a comma or parentheses', () => {
    upsertNode(db, { id: 'region:vuda-point-lautoka', type: 'region', name: 'Vuda Point, Lautoka' });
    applyRegionCanonicalization(db);
    const node = getNode('region:vuda-point') || getNode('region:vuda-point-lautoka');
    expect(node.attrs?.artifact).toBeFalsy();
  });
});

// TASK-023 item 5 (TASK-022 MEDIUM carry-forward): region:naples conflated
// two genuinely different real places — Palumbo's Italian shipyards
// (Naples, Italy) and three Florida yacht clubs (Naples, FL) — under one
// bare "Naples" node, which also wrongly carried a part_of->florida edge
// that applied to the Italian entities too. Split into region:naples-italy
// (Palumbo builder + 2 shipyards) and region:naples-fl (the 3 FL clubs,
// part_of florida).
describe('applyRegionCanonicalization — Naples split (TASK-023 item 5)', () => {
  function seedNaplesCluster() {
    upsertNode(db, { id: 'region:naples', type: 'region', name: 'Naples' });
    upsertNode(db, { id: 'region:florida', type: 'region', name: 'Florida' });
    upsertEdge(db, { src: 'region:naples', rel: 'part_of', dst: 'region:florida' });

    upsertNode(db, { id: 'builder:palumbo', type: 'builder', name: 'Palumbo' });
    upsertNode(db, { id: 'shipyard:palumbo-naples', type: 'shipyard', name: 'Palumbo Naples' });
    upsertNode(db, { id: 'shipyard:palumbo-superyachts-naples', type: 'shipyard', name: 'Palumbo Superyachts Naples' });
    upsertEdge(db, { src: 'builder:palumbo', rel: 'located_in', dst: 'region:naples' });
    upsertEdge(db, { src: 'shipyard:palumbo-naples', rel: 'located_in', dst: 'region:naples' });
    upsertEdge(db, { src: 'shipyard:palumbo-superyachts-naples', rel: 'located_in', dst: 'region:naples' });

    upsertNode(db, { id: 'club:naples-yacht-club', type: 'club', name: 'Naples Yacht Club' });
    upsertNode(db, { id: 'club:naples-sailing-yacht-club', type: 'club', name: 'Naples Sailing & Yacht Club' });
    upsertNode(db, { id: 'club:pelican-isle-yacht-club', type: 'club', name: 'Pelican Isle Yacht Club' });
    upsertEdge(db, { src: 'club:naples-yacht-club', rel: 'located_in', dst: 'region:naples' });
    upsertEdge(db, { src: 'club:naples-sailing-yacht-club', rel: 'located_in', dst: 'region:naples' });
    upsertEdge(db, { src: 'club:pelican-isle-yacht-club', rel: 'located_in', dst: 'region:naples' });
  }

  it('re-points the Palumbo entities onto region:naples-italy and the FL clubs onto region:naples-fl', () => {
    seedNaplesCluster();

    applyRegionCanonicalization(db);

    expect(edgeExists('builder:palumbo', 'located_in', 'region:naples-italy')).toBe(true);
    expect(edgeExists('shipyard:palumbo-naples', 'located_in', 'region:naples-italy')).toBe(true);
    expect(edgeExists('shipyard:palumbo-superyachts-naples', 'located_in', 'region:naples-italy')).toBe(true);

    expect(edgeExists('club:naples-yacht-club', 'located_in', 'region:naples-fl')).toBe(true);
    expect(edgeExists('club:naples-sailing-yacht-club', 'located_in', 'region:naples-fl')).toBe(true);
    expect(edgeExists('club:pelican-isle-yacht-club', 'located_in', 'region:naples-fl')).toBe(true);
  });

  it('removes the original region:naples node entirely (fully consolidated into the two split nodes)', () => {
    seedNaplesCluster();

    applyRegionCanonicalization(db);

    expect(nodeExists('region:naples')).toBe(false);
  });

  it('gives region:naples-fl a part_of edge to florida, and region:naples-italy NO part_of florida edge', () => {
    seedNaplesCluster();

    applyRegionCanonicalization(db);

    expect(edgeExists('region:naples-fl', 'part_of', 'region:florida')).toBe(true);
    expect(edgeExists('region:naples-italy', 'part_of', 'region:florida')).toBe(false);
  });

  it('adds a part_of edge from region:naples-italy to region:italy when an Italy region already exists', () => {
    seedNaplesCluster();
    upsertNode(db, { id: 'region:italy', type: 'region', name: 'Italy' });

    applyRegionCanonicalization(db);

    expect(edgeExists('region:naples-italy', 'part_of', 'region:italy')).toBe(true);
  });

  it('does not error or mint a region:italy node when no Italy region exists yet', () => {
    seedNaplesCluster();

    applyRegionCanonicalization(db);

    expect(nodeExists('region:italy')).toBe(false);
    expect(nodeExists('region:naples-italy')).toBe(true);
  });

  it('is idempotent: running twice yields identical node/edge counts and no orphan edges', () => {
    seedNaplesCluster();

    applyRegionCanonicalization(db);
    const nodesAfterFirst = countNodes();
    const edgesAfterFirst = countEdges();

    applyRegionCanonicalization(db);

    expect(countNodes()).toBe(nodesAfterFirst);
    expect(countEdges()).toBe(edgesAfterFirst);
    expect(orphanEdgeCount()).toBe(0);
  });

  it('is a no-op when region:naples never existed in the first place (nothing to split)', () => {
    applyRegionCanonicalization(db);

    expect(nodeExists('region:naples-italy')).toBe(false);
    expect(nodeExists('region:naples-fl')).toBe(false);
  });
});

describe('applyRegionCanonicalization — idempotency and hygiene', () => {
  it('running twice yields identical node/edge counts (safe to call after every ingest run)', () => {
    upsertNode(db, { id: 'region:portland', type: 'region', name: 'Portland' });
    upsertNode(db, { id: 'region:portland-or', type: 'region', name: 'Portland, OR' });
    upsertNode(db, {
      id: 'region:panama-city-operated-by-j-a-jones-construction-co',
      type: 'region',
      name: 'Panama City, operated by J.A. Jones Construction Co.',
    });

    applyRegionCanonicalization(db);
    const nodesAfterFirst = countNodes();
    const edgesAfterFirst = countEdges();

    applyRegionCanonicalization(db);
    expect(countNodes()).toBe(nodesAfterFirst);
    expect(countEdges()).toBe(edgesAfterFirst);
  });

  it('never leaves an orphan edge across merges, renames, and flags run together', () => {
    upsertNode(db, { id: 'region:henderson', type: 'region', name: 'Henderson' });
    upsertNode(db, { id: 'region:henderson-perth', type: 'region', name: 'Henderson, Perth' });
    upsertNode(db, { id: 'region:henderson-wa', type: 'region', name: 'Henderson, WA' });
    upsertNode(db, { id: 'shipyard:a', type: 'shipyard', name: 'A' });
    upsertNode(db, { id: 'shipyard:b', type: 'shipyard', name: 'B' });
    upsertEdge(db, { src: 'shipyard:a', rel: 'located_in', dst: 'region:henderson' });
    upsertEdge(db, { src: 'shipyard:b', rel: 'located_in', dst: 'region:henderson-perth' });

    applyRegionCanonicalization(db);

    expect(orphanEdgeCount()).toBe(0);
    expect(edgeExists('shipyard:a', 'located_in', 'region:henderson-wa')).toBe(true);
    expect(edgeExists('shipyard:b', 'located_in', 'region:henderson-wa')).toBe(true);
  });
});
