// ingest/tests/graphCleanup.spec.js
//
// TASK-019: the "graph cleanup" retrofit hook (mirrors ingest.js's
// linkYachtRegions/linkEngineOemSupplies pattern — runs once, after every
// file's builder/designer/company nodes have been created). Three kinds of
// documented, data-driven action, all grounded in
// research/round2/builder-enrichment.md's "Suspect nodes" and "Likely
// duplicate-entity pairs" sections (see graphCleanup.js's own MERGE_MAP /
// SUSPECT_NODE_ACTIONS for the full per-node rationale):
//
//   1. Duplicate builder pairs (BUILDER_MERGE_MAP): re-point every edge
//      (as src AND dst) from the duplicate node onto the canonical node,
//      then delete the duplicate. Never loses a built_by edge; never
//      leaves an orphan edge (one whose src/dst no longer exists).
//   2. Suspect nodes (SUSPECT_NODE_ACTIONS): retype (Y.CO -> company, Hoek
//      Design -> designer), remove-and-drop-edges (Philip Zepter, Sportiva
//      55, Cies - Oassive, Kolotura, Viareggio bare, Bali Catamarans), or
//      keep-with-flag (Custom/Various/Mixed/Custom (rebuild)/Motorsailer
//      placeholders — dropping their edges would silently un-attribute
//      110 yachts' builder field, a worse outcome than an honestly-flagged
//      placeholder node).
//   3. Two special one-off fixes requiring cross-type edges rather than a
//      generic merge: Winch Design/Vard (re-point Somnio's built_by edge
//      to the real shipyard Vard, add a designed_by edge to the Winch
//      Design designer node created by designerMapper.js) and the
//      "(Naval-inspired)" designer artifact (drop Valor's designed_by edge
//      to it — Valor already has a grounded designed_by edge to Bannenberg
//      & Rowell from the same source row's Ext/Int pair).
//
// Plus the Weichai company merge (coordinator addendum: "Weichai Group" is
// grounded as the informal name of "Weichai Holding Group Co., Ltd.").

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, initSchema, upsertNode, upsertEdge } from '../src/db.js';
import { applyGraphCleanup } from '../src/mappers/graphCleanup.js';

let tmpDbPath;
let db;

beforeEach(() => {
  tmpDbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'graph-cleanup-test-')), 'graph.db');
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

function countEdges() {
  return db.prepare('SELECT COUNT(*) AS count FROM edges').get().count;
}

function countBuiltByEdges() {
  return db.prepare("SELECT COUNT(*) AS count FROM edges WHERE rel = 'built_by'").get().count;
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

describe('applyGraphCleanup — duplicate builder pair merges', () => {
  it('re-points all built_by edges from the duplicate onto the canonical node and deletes the duplicate', () => {
    upsertNode(db, { id: 'builder:crn', type: 'builder', name: 'CRN' });
    upsertNode(db, { id: 'builder:crn-yachts', type: 'builder', name: 'CRN Yachts' });
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A' });
    upsertNode(db, { id: 'yacht:b', type: 'yacht', name: 'B' });
    upsertEdge(db, { src: 'yacht:a', rel: 'built_by', dst: 'builder:crn' });
    upsertEdge(db, { src: 'yacht:b', rel: 'built_by', dst: 'builder:crn-yachts' });

    const beforeBuiltBy = countBuiltByEdges();

    applyGraphCleanup(db);

    expect(nodeExists('builder:crn')).toBe(false);
    expect(nodeExists('builder:crn-yachts')).toBe(true);
    expect(edgeExists('yacht:a', 'built_by', 'builder:crn-yachts')).toBe(true);
    expect(edgeExists('yacht:b', 'built_by', 'builder:crn-yachts')).toBe(true);
    expect(countBuiltByEdges()).toBe(beforeBuiltBy); // no lost built_by edges
    expect(orphanEdgeCount()).toBe(0);
  });

  it('merges a duplicate node that is the SRC of an edge (e.g. a located_in edge) without creating a UNIQUE-constraint error', () => {
    upsertNode(db, { id: 'builder:admiral', type: 'builder', name: 'Admiral' });
    upsertNode(db, { id: 'builder:admiral-yachts', type: 'builder', name: 'Admiral Yachts' });
    upsertNode(db, { id: 'region:viareggio', type: 'region', name: 'Viareggio' });
    upsertEdge(db, { src: 'builder:admiral', rel: 'located_in', dst: 'region:viareggio' });
    upsertEdge(db, { src: 'builder:admiral-yachts', rel: 'located_in', dst: 'region:viareggio' }); // both already point at the same region

    expect(() => applyGraphCleanup(db)).not.toThrow();
    expect(nodeExists('builder:admiral')).toBe(false);
    expect(edgeExists('builder:admiral-yachts', 'located_in', 'region:viareggio')).toBe(true);
    expect(orphanEdgeCount()).toBe(0);
  });

  it('handles a three-way merge (Olympic + Olympic Yacht -> Olympic Yacht Services)', () => {
    upsertNode(db, { id: 'builder:olympic', type: 'builder', name: 'Olympic' });
    upsertNode(db, { id: 'builder:olympic-yacht', type: 'builder', name: 'Olympic Yacht' });
    upsertNode(db, { id: 'builder:olympic-yacht-services', type: 'builder', name: 'Olympic Yacht Services' });
    upsertNode(db, { id: 'yacht:c', type: 'yacht', name: 'C' });
    upsertNode(db, { id: 'yacht:d', type: 'yacht', name: 'D' });
    upsertEdge(db, { src: 'yacht:c', rel: 'built_by', dst: 'builder:olympic' });
    upsertEdge(db, { src: 'yacht:d', rel: 'built_by', dst: 'builder:olympic-yacht' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:olympic')).toBe(false);
    expect(nodeExists('builder:olympic-yacht')).toBe(false);
    expect(nodeExists('builder:olympic-yacht-services')).toBe(true);
    expect(edgeExists('yacht:c', 'built_by', 'builder:olympic-yacht-services')).toBe(true);
    expect(edgeExists('yacht:d', 'built_by', 'builder:olympic-yacht-services')).toBe(true);
  });

  it('merges the diacritic-slug duplicates (Brodograđevna Industrija Split -> Brodosplit, Helsingør -> Helsingor Vaerft)', () => {
    upsertNode(db, { id: 'builder:brodogra-evna-industrija-split', type: 'builder', name: 'Brodograđevna Industrija Split' });
    upsertNode(db, { id: 'builder:brodosplit', type: 'builder', name: 'Brodosplit' });
    upsertNode(db, { id: 'builder:helsing-r', type: 'builder', name: 'Helsingør' });
    upsertNode(db, { id: 'builder:helsingor-vaerft', type: 'builder', name: 'Helsingor Vaerft' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:brodogra-evna-industrija-split')).toBe(false);
    expect(nodeExists('builder:brodosplit')).toBe(true);
    expect(nodeExists('builder:helsing-r')).toBe(false);
    expect(nodeExists('builder:helsingor-vaerft')).toBe(true);
  });

  it('is a no-op (does not throw) when a merge pair is absent from a smaller/synthetic graph', () => {
    expect(() => applyGraphCleanup(db)).not.toThrow();
  });
});

describe('applyGraphCleanup — suspect node reclassification', () => {
  it('retypes Y.CO from builder to a company node (kind: brokerage/management) and drops its built_by edges', () => {
    upsertNode(db, { id: 'builder:y-co', type: 'builder', name: 'Y.CO' });
    upsertNode(db, { id: 'yacht:e', type: 'yacht', name: 'E' });
    upsertEdge(db, { src: 'yacht:e', rel: 'built_by', dst: 'builder:y-co' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:y-co')).toBe(false);
    const company = getNode('company:y-co');
    expect(company).not.toBeNull();
    expect(company.type).toBe('company');
    expect(company.attrs.kind).toBe('brokerage/management');
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM edges WHERE dst = 'builder:y-co' OR dst = 'company:y-co'").get().count
    ).toBe(0);
    expect(orphanEdgeCount()).toBe(0);
  });

  it('retypes Hoek Design from builder to a designer node and drops its built_by edge', () => {
    upsertNode(db, { id: 'builder:hoek-design', type: 'builder', name: 'Hoek Design' });
    upsertNode(db, { id: 'yacht:f', type: 'yacht', name: 'F' });
    upsertEdge(db, { src: 'yacht:f', rel: 'built_by', dst: 'builder:hoek-design' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:hoek-design')).toBe(false);
    const designer = getNode('designer:hoek-design');
    expect(designer).not.toBeNull();
    expect(designer.type).toBe('designer');
    expect(orphanEdgeCount()).toBe(0);
  });

  it('removes a fully-ungrounded suspect node (Philip Zepter) and drops its edges without a replacement node', () => {
    upsertNode(db, { id: 'builder:philip-zepter', type: 'builder', name: 'Philip Zepter' });
    upsertNode(db, { id: 'yacht:g', type: 'yacht', name: 'G' });
    upsertEdge(db, { src: 'yacht:g', rel: 'built_by', dst: 'builder:philip-zepter' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:philip-zepter')).toBe(false);
    expect(orphanEdgeCount()).toBe(0);
  });

  it('removes Sportiva 55, Cies - Oassive, Kolotura, Viareggio (bare), and Bali Catamarans, dropping their edges', () => {
    const removedIds = [
      'builder:sportiva-55',
      'builder:cies-oassive',
      'builder:kolotura',
      'builder:viareggio',
      'builder:bali-catamarans',
    ];
    removedIds.forEach((id, i) => {
      upsertNode(db, { id, type: 'builder', name: `Removed ${i}` });
      upsertNode(db, { id: `yacht:removed-${i}`, type: 'yacht', name: `Removed yacht ${i}` });
      upsertEdge(db, { src: `yacht:removed-${i}`, rel: 'built_by', dst: id });
    });

    applyGraphCleanup(db);

    for (const id of removedIds) {
      expect(nodeExists(id)).toBe(false);
    }
    expect(orphanEdgeCount()).toBe(0);
  });

  it('keeps the real "Viareggio SuperYachts" node untouched (distinct from the bare "Viareggio" suspect node)', () => {
    upsertNode(db, { id: 'builder:viareggio', type: 'builder', name: 'Viareggio' });
    upsertNode(db, { id: 'builder:viareggio-superyachts', type: 'builder', name: 'Viareggio SuperYachts' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:viareggio')).toBe(false);
    expect(nodeExists('builder:viareggio-superyachts')).toBe(true);
  });

  it('keeps the five placeholder nodes (Custom/Various/Mixed/Custom (rebuild)/Motorsailer) WITH a flag attr, preserving their edges', () => {
    const placeholderIds = ['builder:custom', 'builder:various', 'builder:mixed', 'builder:custom-rebuild', 'builder:motorsailer'];
    placeholderIds.forEach((id, i) => {
      upsertNode(db, { id, type: 'builder', name: `Placeholder ${i}` });
      upsertNode(db, { id: `yacht:ph-${i}`, type: 'yacht', name: `Placeholder yacht ${i}` });
      upsertEdge(db, { src: `yacht:ph-${i}`, rel: 'built_by', dst: id });
    });

    applyGraphCleanup(db);

    for (let i = 0; i < placeholderIds.length; i++) {
      const id = placeholderIds[i];
      expect(nodeExists(id)).toBe(true);
      const node = getNode(id);
      expect(node.attrs.placeholder).toBe(true);
      expect(edgeExists(`yacht:ph-${i}`, 'built_by', id)).toBe(true);
    }
  });

  it('merges Arcadia Sherpa into the existing Arcadia node (model-line-captured-as-builder)', () => {
    upsertNode(db, { id: 'builder:arcadia', type: 'builder', name: 'Arcadia' });
    upsertNode(db, { id: 'builder:arcadia-sherpa', type: 'builder', name: 'Arcadia Sherpa' });
    upsertNode(db, { id: 'yacht:h', type: 'yacht', name: 'H' });
    upsertEdge(db, { src: 'yacht:h', rel: 'built_by', dst: 'builder:arcadia-sherpa' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:arcadia-sherpa')).toBe(false);
    expect(edgeExists('yacht:h', 'built_by', 'builder:arcadia')).toBe(true);
  });
});

describe('applyGraphCleanup — Winch Design/Vard conflated node', () => {
  it("re-points Somnio's built_by edge to the real shipyard Vard and adds a designed_by edge to the Winch Design designer node", () => {
    upsertNode(db, { id: 'builder:vard', type: 'builder', name: 'Vard' });
    upsertNode(db, { id: 'builder:winch-design-vard', type: 'builder', name: 'Winch Design/Vard' });
    upsertNode(db, { id: 'designer:winch-design', type: 'designer', name: 'Winch Design' });
    upsertNode(db, { id: 'yacht:somnio', type: 'yacht', name: 'Somnio' });
    upsertEdge(db, { src: 'yacht:somnio', rel: 'built_by', dst: 'builder:winch-design-vard' });

    applyGraphCleanup(db);

    expect(nodeExists('builder:winch-design-vard')).toBe(false);
    expect(edgeExists('yacht:somnio', 'built_by', 'builder:vard')).toBe(true);
    expect(edgeExists('yacht:somnio', 'designed_by', 'designer:winch-design')).toBe(true);
  });
});

describe('applyGraphCleanup — "(Naval-inspired)" designer artifact', () => {
  it("drops Valor's designed_by edge to the artifact node and removes the node, keeping its grounded Bannenberg & Rowell credit", () => {
    upsertNode(db, { id: 'designer:naval-inspired', type: 'designer', name: '(Naval-inspired)' });
    upsertNode(db, { id: 'designer:bannenberg-rowell', type: 'designer', name: 'Bannenberg & Rowell' });
    upsertNode(db, { id: 'yacht:valor', type: 'yacht', name: 'Valor' });
    upsertEdge(db, { src: 'yacht:valor', rel: 'designed_by', dst: 'designer:naval-inspired' });
    upsertEdge(db, { src: 'yacht:valor', rel: 'designed_by', dst: 'designer:bannenberg-rowell' });

    applyGraphCleanup(db);

    expect(nodeExists('designer:naval-inspired')).toBe(false);
    expect(edgeExists('yacht:valor', 'designed_by', 'designer:bannenberg-rowell')).toBe(true);
    expect(
      db.prepare("SELECT COUNT(*) AS count FROM edges WHERE src = 'yacht:valor' AND rel = 'designed_by'").get().count
    ).toBe(1);
  });
});

describe('applyGraphCleanup — Weichai company merge (coordinator addendum)', () => {
  it('merges company:weichai-group into company:weichai-holding-group, renaming it to the full legal name and re-pointing owned_by edges', () => {
    upsertNode(db, { id: 'company:weichai-group', type: 'company', name: 'Weichai Group', attrs: { kind: 'engine parent company' } });
    upsertNode(db, {
      id: 'company:weichai-holding-group',
      type: 'company',
      name: 'Weichai Holding Group',
      attrs: { kind: 'engine parent company' },
    });
    upsertNode(db, { id: 'engine:baudouin', type: 'engine', name: 'Baudouin' });
    upsertNode(db, { id: 'engine:weichai-marine', type: 'engine', name: 'Weichai Marine' });
    upsertEdge(db, { src: 'engine:baudouin', rel: 'owned_by', dst: 'company:weichai-group' });
    upsertEdge(db, { src: 'engine:weichai-marine', rel: 'owned_by', dst: 'company:weichai-holding-group' });

    applyGraphCleanup(db);

    expect(nodeExists('company:weichai-group')).toBe(false);
    const canonical = getNode('company:weichai-holding-group');
    expect(canonical.name).toBe('Weichai Holding Group Co., Ltd.');
    expect(canonical.attrs.notes || '').toMatch(/Weichai Group/);
    expect(edgeExists('engine:baudouin', 'owned_by', 'company:weichai-holding-group')).toBe(true);
    expect(edgeExists('engine:weichai-marine', 'owned_by', 'company:weichai-holding-group')).toBe(true);
  });
});

describe('applyGraphCleanup — idempotency', () => {
  it('running twice yields identical node/edge counts (safe to call after every ingest run)', () => {
    upsertNode(db, { id: 'builder:crn', type: 'builder', name: 'CRN' });
    upsertNode(db, { id: 'builder:crn-yachts', type: 'builder', name: 'CRN Yachts' });
    upsertNode(db, { id: 'builder:y-co', type: 'builder', name: 'Y.CO' });
    upsertNode(db, { id: 'yacht:a', type: 'yacht', name: 'A' });
    upsertEdge(db, { src: 'yacht:a', rel: 'built_by', dst: 'builder:crn' });

    applyGraphCleanup(db);
    const nodesAfterFirst = db.prepare('SELECT COUNT(*) AS count FROM nodes').get().count;
    const edgesAfterFirst = countEdges();

    applyGraphCleanup(db);
    expect(db.prepare('SELECT COUNT(*) AS count FROM nodes').get().count).toBe(nodesAfterFirst);
    expect(countEdges()).toBe(edgesAfterFirst);
  });
});

// --- TASK-020 additions ----------------------------------------------

describe('applyGraphCleanup — yacht rename/duplicate merges (TASK-020)', () => {
  it('merges Jubilee (old name) into Kaos (current name), preserving edges', () => {
    upsertNode(db, { id: 'yacht:jubilee', type: 'yacht', name: 'Jubilee' });
    upsertNode(db, { id: 'yacht:kaos', type: 'yacht', name: 'Kaos', attrs: { former_names: ['Jubilee', 'Secret III'] } });
    upsertNode(db, { id: 'builder:oceanco', type: 'builder', name: 'Oceanco' });
    upsertEdge(db, { src: 'yacht:jubilee', rel: 'built_by', dst: 'builder:oceanco' });

    applyGraphCleanup(db);

    expect(nodeExists('yacht:jubilee')).toBe(false);
    expect(edgeExists('yacht:kaos', 'built_by', 'builder:oceanco')).toBe(true);
    expect(getNode('yacht:kaos').attrs.former_names).toEqual(['Jubilee', 'Secret III']);
  });

  it('merges the Kaos/Kaos-custom id-collision duplicate into the canonical Kaos node', () => {
    upsertNode(db, { id: 'yacht:kaos', type: 'yacht', name: 'Kaos' });
    upsertNode(db, { id: 'yacht:kaos-custom', type: 'yacht', name: 'Kaos' });

    applyGraphCleanup(db);

    expect(nodeExists('yacht:kaos-custom')).toBe(false);
    expect(nodeExists('yacht:kaos')).toBe(true);
  });

  it('merges Lana into Mar, CC-Summer into Madsummer, and Kismet(95m)/kismet-lurssen into Whisper', () => {
    upsertNode(db, { id: 'yacht:lana', type: 'yacht', name: 'Lana' });
    upsertNode(db, { id: 'yacht:mar', type: 'yacht', name: 'Mar' });
    upsertNode(db, { id: 'yacht:cc-summer', type: 'yacht', name: 'CC-Summer' });
    upsertNode(db, { id: 'yacht:madsummer', type: 'yacht', name: 'Madsummer' });
    upsertNode(db, { id: 'yacht:kismet-lurssen', type: 'yacht', name: 'Kismet' });
    upsertNode(db, { id: 'yacht:whisper', type: 'yacht', name: 'Whisper' });
    upsertNode(db, { id: 'yacht:kismet', type: 'yacht', name: 'Kismet' }); // the OTHER, current, unrelated 122m Kismet

    applyGraphCleanup(db);

    expect(nodeExists('yacht:lana')).toBe(false);
    expect(nodeExists('yacht:mar')).toBe(true);
    expect(nodeExists('yacht:cc-summer')).toBe(false);
    expect(nodeExists('yacht:madsummer')).toBe(true);
    expect(nodeExists('yacht:kismet-lurssen')).toBe(false);
    expect(nodeExists('yacht:whisper')).toBe(true);
    // The CURRENT, unrelated 122m "Kismet" must be left completely untouched.
    expect(nodeExists('yacht:kismet')).toBe(true);
  });

  it('merges the Prince Abdulaziz duplicate pair', () => {
    upsertNode(db, { id: 'yacht:prince-abdulaziz', type: 'yacht', name: 'Prince Abdulaziz' });
    upsertNode(db, { id: 'yacht:prince-abdulaziz-helsingor-vaerft', type: 'yacht', name: 'Prince Abdulaziz' });

    applyGraphCleanup(db);

    expect(nodeExists('yacht:prince-abdulaziz-helsingor-vaerft')).toBe(false);
    expect(nodeExists('yacht:prince-abdulaziz')).toBe(true);
  });
});

describe('applyGraphCleanup — Rybovich marina merge (TASK-020)', () => {
  it('merges marina:rybovich-superyacht-marina into marina:safe-harbor-rybovich with provenance', () => {
    upsertNode(db, {
      id: 'marina:rybovich-superyacht-marina',
      type: 'marina',
      name: 'Rybovich Superyacht Marina',
      attrs: { address: '4200 N Flagler Dr, West Palm Beach', provenance: ['71_file.md'] },
    });
    upsertNode(db, {
      id: 'marina:safe-harbor-rybovich',
      type: 'marina',
      name: 'Safe Harbor Rybovich',
      attrs: { phone: '+1 561-840-8190', provenance: ['16_file.md'] },
    });

    applyGraphCleanup(db);

    expect(nodeExists('marina:rybovich-superyacht-marina')).toBe(false);
    const canonical = getNode('marina:safe-harbor-rybovich');
    expect(canonical.attrs.address).toBe('4200 N Flagler Dr, West Palm Beach');
    expect(canonical.attrs.phone).toBe('+1 561-840-8190');
    // Provenance UNION (TASK-019 LOW carry-forward), not first-non-empty-wins.
    expect(canonical.attrs.provenance).toEqual(expect.arrayContaining(['71_file.md', '16_file.md']));
  });
});

describe('applyGraphCleanup — data quality flags (RIO, MOSAIQUE)', () => {
  it('flags yacht:rio and yacht:mosaique with a data_quality attr, without deleting either node', () => {
    upsertNode(db, { id: 'yacht:rio', type: 'yacht', name: 'RIO', attrs: { loa: { meters: 203, raw: '203m' } } });
    upsertNode(db, { id: 'yacht:mosaique', type: 'yacht', name: 'MOSAIQUE', attrs: { loa: { meters: 164, raw: '164m' } } });

    applyGraphCleanup(db);

    expect(nodeExists('yacht:rio')).toBe(true);
    expect(nodeExists('yacht:mosaique')).toBe(true);
    expect(getNode('yacht:rio').attrs.data_quality).toMatch(/unverified/i);
    expect(getNode('yacht:mosaique').attrs.data_quality).toMatch(/unverified/i);
    // The pre-existing loa attr must survive untouched.
    expect(getNode('yacht:rio').attrs.loa.meters).toBe(203);
  });

  it('is a no-op (does not throw) when RIO/MOSAIQUE are absent from a smaller/synthetic graph', () => {
    expect(() => applyGraphCleanup(db)).not.toThrow();
  });
});

describe('mergeNode — provenance handling (TASK-019 LOW carry-forwards)', () => {
  it('unions provenance arrays from both sides rather than first-non-empty-wins clobbering the duplicate\'s trail', () => {
    upsertNode(db, {
      id: 'builder:crn',
      type: 'builder',
      name: 'CRN',
      attrs: { provenance: ['91_builder_enrichment.md'] },
    });
    upsertNode(db, {
      id: 'builder:crn-yachts',
      type: 'builder',
      name: 'CRN Yachts',
      attrs: { provenance: ['some_other_file.md'] },
    });

    applyGraphCleanup(db);

    const canonical = getNode('builder:crn-yachts');
    expect(canonical.attrs.provenance).toEqual(expect.arrayContaining(['91_builder_enrichment.md', 'some_other_file.md']));
  });

  it('stamps provenance [\'graph-cleanup-merge\'] on a canonical node that ends a merge with no provenance trace at all', () => {
    upsertNode(db, { id: 'builder:crn', type: 'builder', name: 'CRN' }); // no attrs at all
    upsertNode(db, { id: 'builder:crn-yachts', type: 'builder', name: 'CRN Yachts' }); // no attrs at all

    applyGraphCleanup(db);

    const canonical = getNode('builder:crn-yachts');
    expect(canonical.attrs.provenance).toEqual(['graph-cleanup-merge']);
  });
});

describe('module importability', () => {
  it('exposes applyGraphCleanup as a named export', async () => {
    const mod = await import('../src/mappers/graphCleanup.js');
    expect(typeof mod.applyGraphCleanup).toBe('function');
  });
});
