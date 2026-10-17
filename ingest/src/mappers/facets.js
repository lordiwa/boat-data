// ingest/src/mappers/facets.js
//
// TASK-029: per-type controlled-vocabulary facets. A retrofit hook (same "run once, after every
// node and edge exists" pattern as regionHierarchy.js) that writes attrs.facets onto every node
// of the 11 faceted types, computed from the node's existing attrs and edges using the closed
// vocabularies / band tables in facetVocabulary.js.
//
// Policy
//   - ADDITIVE: only attrs.facets is written; every original attr stays byte-identical.
//   - NEVER-GUESS: a raw free-text value that matches no vocabulary entry gets no facet and is
//     collected into the unmapped report (type, facet, value, count) instead. A numeric facet
//     with no number gets no band. propulsion_type is 'unknown' without textual evidence.
//   - Geography comes ONLY from attrs.geo (TASK-027), never from the raw attrs.country cell.
//   - IDEMPOTENT: attrs.facets is recomputed from scratch and replaced on every run, so nothing
//     accumulates and a second run writes nothing.
//
// Must run LAST before export: it reads attrs.identifiability and the classified_as edges
// (size-class linking), both produced late in the pipeline.

import path from 'node:path';
import fs from 'node:fs';
import { resolveSkippedProseReportPath } from '../reports/skippedProseReport.js';
import { normalizeCountry } from './countryAliases.js';
import { isEmptyValue } from './normalize.js';
import {
  norm, bandOf, toNum, BANDS, FACETS, FACETED_TYPES, FLAG_NAMES, FLAG_ALIASES, NATIONALITY_TABLE,
  SIZE_CLASS_BY_NODE, PROPULSION_TABLE, MARINA_CATEGORY_RULES, MARINA_WET_FALLBACK_RE,
  MARINA_SERVICE_RULES, MARINA_STORAGE_RULES, SHIPYARD_FACILITY_TABLE, SHIPYARD_SERVICE_TABLE,
  SHIPYARD_LIFT_TABLE, BUILDER_SEGMENT_TABLE, BUILDER_STATUS_TABLE, DESIGNER_DISCIPLINE_TABLE,
  DESIGNER_STATUS_TABLE, COMPANY_KIND_TABLE, COMPANY_NAME_KIND_TABLE, COMPANY_SERVICE_AREA_TABLE,
  PERSON_ROLE_TABLE, CLASSIC_NOUN_RE, CLASSIC_WORD_RE, CLASSIC_BEFORE_YEAR, PERSON_SECTOR_TABLE, PERSON_STATUS_TABLE, ENGINE_TYPE_TABLE,
  ENGINE_SEGMENT_TABLE, CLUB_FACILITY_TABLE, PART_CATEGORIES, PART_APPLIES_TO,
} from './facetVocabulary.js';

// --- small helpers ----------------------------------------------------------

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json) || {};
  } catch {
    return {};
  }
}

const isText = (v) => typeof v === 'string' && !isEmptyValue(v);

const parenDepth = (s) => [...s].reduce((d, ch) => d + (ch === '(' ? 1 : ch === ')' ? -1 : 0), 0);

/**
 * Raw cell -> list of non-empty string values (arrays are element-wise, strings are one).
 * The parsers split list cells on every comma, so a parenthetical that contains a comma
 * ("built megayachts (e.g. KOGO, Turama)") arrives as two broken array elements; they are
 * re-joined here so each raw value is judged as the author wrote it.
 */
function rawList(v) {
  if (!Array.isArray(v)) return isText(v) ? [String(v)] : [];
  const items = v.filter(isText).map(String);
  const out = [];
  for (let i = 0; i < items.length; i++) {
    let buf = items[i];
    while (i + 1 < items.length && parenDepth(buf) > 0) buf += `, ${items[++i]}`;
    out.push(buf);
  }
  return out;
}

const matchAll = (text, table) => table.filter(([, re]) => re.test(text)).map(([v]) => v);
const matchFirst = (text, table) => {
  const hit = table.find(([, re]) => re.test(text));
  return hit ? hit[0] : null;
};
/** The vocabulary value whose pattern matches EARLIEST in `text` (ties: table order). */
function matchEarliest(text, table) {
  let best = null;
  let bestIdx = Infinity;
  for (const [value, re] of table) {
    const m = re.exec(text);
    if (m && m.index < bestIdx) {
      best = value;
      bestIdx = m.index;
    }
  }
  return best;
}

const hasValue = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return !isEmptyValue(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v).some(hasValue);
  return true;
};

// attrs that are bookkeeping, not data about the entity (data_level counts the rest)
const NON_CONTENT_ATTRS = new Set(['provenance', 'geo', 'geo_basis', 'geo_conflict', 'conflicts', 'facets', 'placeholder', 'artifact', 'country_raw']);

// --- the hook ---------------------------------------------------------------

export function applyFacets(db) {
  const placeholders = FACETED_TYPES.map(() => '?').join(',');
  const rows = db.prepare(`SELECT id, type, name, attrs_json FROM nodes WHERE type IN (${placeholders})`).all(...FACETED_TYPES);
  const attrsById = new Map(rows.map((r) => [r.id, parseAttrsJson(r.attrs_json)]));

  // edge-derived context
  const sizeClassOf = new Map();
  const buildersOf = new Map(); // yacht id -> [builder ids] in dst order
  const builderYachtCount = new Map();
  const designerYachtCount = new Map();
  const ownersOfYacht = new Map();
  const personYachtCount = new Map();
  const engineOfModel = new Map();
  for (const e of db.prepare("SELECT src, rel, dst FROM edges WHERE rel IN ('classified_as','built_by','designed_by','owned_by','made_by') ORDER BY src, rel, dst").all()) {
    if (e.rel === 'classified_as') sizeClassOf.set(e.src, e.dst);
    else if (e.rel === 'built_by' && e.src.startsWith('yacht:')) {
      if (!buildersOf.has(e.src)) buildersOf.set(e.src, []);
      buildersOf.get(e.src).push(e.dst);
      builderYachtCount.set(e.dst, (builderYachtCount.get(e.dst) || 0) + 1);
    } else if (e.rel === 'designed_by' && e.src.startsWith('yacht:')) {
      designerYachtCount.set(e.dst, (designerYachtCount.get(e.dst) || 0) + 1);
    } else if (e.rel === 'owned_by' && e.src.startsWith('yacht:')) {
      ownersOfYacht.set(e.src, true);
      if (e.dst.startsWith('person:')) personYachtCount.set(e.dst, (personYachtCount.get(e.dst) || 0) + 1);
    } else if (e.rel === 'made_by' && e.src.startsWith('engine_model:')) engineOfModel.set(e.src, e.dst);
  }

  // coverage + unmapped bookkeeping
  // Two units are counted: total/mapped per raw VALUE (one list element, or one string) and
  // cells/cellsMapped per source CELL (a node's whole attribute, mapped when at least one of its
  // values mapped). Builder specialty lists carry bare size ranges ("24-75m") that are not
  // segments, so the two units differ there; both are reported.
  let builderCountryConflicts = 0;
  const coverage = new Map(); // `${type}.${facet}` -> { type, facet, total, mapped, cells, cellsMapped }
  const unmapped = new Map(); // `${type}\0${facet}\0${value}` -> count
  const cellSeen = new Map(); // `${nodeId}|${type}.${facet}` -> any value mapped?
  let currentId = null;
  const track = (type, facet, raw, mapped) => {
    const k = `${type}.${facet}`;
    const c = coverage.get(k) || { type, facet, total: 0, mapped: 0, cells: 0, cellsMapped: 0 };
    c.total += 1;
    if (mapped) c.mapped += 1;
    const ck = `${currentId}|${k}`;
    if (!cellSeen.has(ck)) c.cells += 1;
    if (mapped && !cellSeen.get(ck)) c.cellsMapped += 1;
    cellSeen.set(ck, Boolean(cellSeen.get(ck)) || mapped);
    coverage.set(k, c);
    if (!mapped) {
      const uk = `${type}\0${facet}\0${raw}`;
      unmapped.set(uk, (unmapped.get(uk) || 0) + 1);
    }
  };

  /** Fragment-wise table mapping for a multi facet: returns the union, tracks every fragment. */
  const mapFragments = (type, facet, raw, table) => {
    const out = new Set();
    for (const frag of rawList(raw)) {
      const hits = matchAll(norm(frag), table);
      hits.forEach((h) => out.add(h));
      track(type, facet, frag, hits.length > 0);
    }
    return [...out];
  };
  /** Whole-string table mapping for a simple facet using `pick(text, table)`. */
  const mapString = (type, facet, raw, table, pick = matchFirst) => {
    if (!isText(raw)) return null;
    const hit = pick(norm(raw), table);
    track(type, facet, String(raw), hit !== null);
    return hit;
  };

  const geoOf = (attrs) => (attrs.geo && typeof attrs.geo === 'object' ? attrs.geo : null);
  const geoFacets = (f, attrs, full) => {
    const geo = geoOf(attrs);
    if (!geo) return;
    if (geo.country) f.country = geo.country;
    if (full && geo.subdivision) f.subdivision = geo.subdivision;
    if (full && geo.city) f.city = geo.city;
  };

  const normalizeFlag = (raw) => {
    if (!isText(raw)) return null;
    const t = norm(raw).replace(/\([^)]*\)/g, '').trim();
    const alias = FLAG_ALIASES.find(([re]) => re.test(t));
    let name = alias ? alias[1] : null;
    if (!name) {
      const hit = normalizeCountry(t);
      name = hit ? hit.name : null;
    }
    if (name && !FLAG_NAMES.includes(name)) name = null;
    track('yacht', 'flag', String(raw), name !== null);
    return name;
  };

  // Known limit: only string features/notes are read. As of 2026-10-16 no yacht in the corpus has an
  // array-typed features or notes cell (0 of 581), so nothing is lost; join arrays here if one appears.
  const propulsionOf = (attrs, builderAttrs) => {
    const own = norm([attrs.features, attrs.notes].filter(isText).join(' ; '));
    if (CLASSIC_NOUN_RE.test(own)) return 'classic';
    const ownHit = own ? matchFirst(own, PROPULSION_TABLE) : null;
    const year = attrs.year && toNum(attrs.year.value);
    // year-backed 'classic' ranks above 'motor' only (a pre-1970 "classic" motor yacht is classic)
    if (CLASSIC_WORD_RE.test(own) && year !== null && year < CLASSIC_BEFORE_YEAR && (!ownHit || ownHit === 'motor')) return 'classic';
    if (ownHit) return ownHit;
    // The builder's specialty is weaker evidence: used only when it points one way. A builder
    // that names both hull types (sail AND motor) says nothing about THIS yacht.
    const spec = builderAttrs ? norm(rawList(builderAttrs.specialty).join(' ; ')) : '';
    if (spec) {
      // Hull evidence is read loosely ("sailing & motor superyachts" must count as BOTH) and a hull is
      // inherited only when the specialty names exactly one: sail, multihull, or motor family.
      // Each TYPE word family counts once; two or more families ("sailboats & motorboats",
      // "expedition & displacement") mean the builder spans types, so nothing is inherited.
      const PT = Object.fromEntries(PROPULSION_TABLE);
      const tags = [];
      if (/\bsail/.test(spec)) tags.push('sailing');
      if (PT.catamaran.test(spec)) tags.push('catamaran');
      if (PT.explorer.test(spec)) tags.push('explorer');
      if (PT['sport-fish'].test(spec)) tags.push('sport-fish');
      if (/\bmotor\b|\bpower\b|motoryacht|motor ?boats?|power ?boats?|displacement|planing/.test(spec) || PT.motor.test(spec)) tags.push('motor');
      if (tags.length === 1) return tags[0];
    }
    return 'unknown';
  };

  const marinaCategory = (name, notes, attrs) => {
    const geo = geoOf(attrs);
    for (const r of MARINA_CATEGORY_RULES) {
      if (r.onlyUS && !(geo && geo.country_code === 'US')) continue;
      if (r.name && r.name.test(name)) return r.value;
    }
    if (notes) {
      for (const r of MARINA_CATEGORY_RULES) {
        if (!r.notes || (r.notesNeedNoMarinaInName && MARINA_WET_FALLBACK_RE.test(name))) continue;
        if (r.notes.test(notes)) return r.value;
      }
    }
    return MARINA_WET_FALLBACK_RE.test(name) ? 'wet-slip marina' : 'unclassified';
  };

  const ruleHits = (rules, name, notes) =>
    Object.entries(rules).filter(([, r]) => (r.notes && notes && r.notes.test(notes)) || (r.name && r.name.test(name))).map(([k]) => k);

  const put = (f, key, value) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value) && value.length === 0) return;
    f[key] = value;
  };

  const compute = {
    yacht(node, attrs) {
      const f = {};
      put(f, 'size_class', SIZE_CLASS_BY_NODE[sizeClassOf.get(node.id)]);
      put(f, 'loa_band', bandOf(attrs.loa && attrs.loa.meters, BANDS.yacht_loa));
      const decade = bandOf(attrs.year && attrs.year.value, BANDS.yacht_decade);
      put(f, 'decade', decade);
      // a year that exists but falls outside every band (0, negative, 3-digit) is reported, never banded
      if (decade === null && attrs.year && hasValue(attrs.year.value)) track('yacht', 'decade', String(attrs.year.value), false);
      const builders = (buildersOf.get(node.id) || []).filter((b) => attrsById.has(b) && attrsById.get(b).placeholder !== true);
      f.propulsion_type = propulsionOf(attrs, builders.length === 1 ? attrsById.get(builders[0]) : null);
      put(f, 'flag', normalizeFlag(attrs.flag));
      // real builders only; two builders in different countries -> no builder_country (never pick one)
      const countries = new Set(builders.map((b) => geoOf(attrsById.get(b)) && geoOf(attrsById.get(b)).country).filter(Boolean));
      if (countries.size > 1) builderCountryConflicts += 1;
      else put(f, 'builder_country', [...countries][0]);
      f.charter_available = Boolean(attrs.weekly_rate) && toNum(attrs.weekly_rate.amount) > 0;
      f.complete = attrs.identifiability === 'identifiable';
      put(f, 'guests_band', bandOf(attrs.guests, BANDS.yacht_guests));
      f.has_known_owner = ownersOfYacht.has(node.id);
      return f;
    },
    marina(node, attrs) {
      const f = {};
      const name = norm(node.name || '');
      const notes = isText(attrs.notes) ? norm(attrs.notes) : '';
      f.facility_category = marinaCategory(name, notes, attrs);
      put(f, 'max_loa_band', bandOf(attrs.max_loa && attrs.max_loa.meters, BANDS.marina_max_loa));
      put(f, 'berths_band', bandOf(attrs.berths, BANDS.marina_berths));
      const services = new Set(ruleHits(MARINA_SERVICE_RULES, name, notes));
      if (attrs.fuel_dock === true) services.add('fuel');
      if (attrs.travelift_tonnage && toNum(attrs.travelift_tonnage.tons) > 0) services.add('travelift');
      put(f, 'services', Object.keys(MARINA_SERVICE_RULES).filter((s) => services.has(s)));
      const storage = new Set(ruleHits(MARINA_STORAGE_RULES, name, notes));
      if (toNum(attrs.berths) > 0) storage.add('wet'); // a berth count is dock (wet) capacity
      if (f.facility_category === 'dry stack') storage.add('dry-stack');
      put(f, 'storage_type', Object.keys(MARINA_STORAGE_RULES).filter((s) => storage.has(s)));
      const content = Object.entries(attrs).filter(([k, v]) => !NON_CONTENT_ATTRS.has(k) && hasValue(v)).length;
      f.data_level = content >= 3 ? 'complete' : 'basic';
      geoFacets(f, attrs, true);
      return f;
    },
    shipyard(node, attrs) {
      const f = {};
      put(f, 'facility_type', mapString('shipyard', 'facility_type', attrs.facility_type, SHIPYARD_FACILITY_TABLE));
      put(f, 'services', mapFragments('shipyard', 'services', attrs.services, SHIPYARD_SERVICE_TABLE));
      put(f, 'lift_type', mapFragments('shipyard', 'lift_type', attrs.lift_type, SHIPYARD_LIFT_TABLE));
      put(f, 'max_loa_band', bandOf(attrs.max_loa, BANDS.shipyard_max_loa));
      put(f, 'max_tonnage_band', bandOf(attrs.max_tonnage, BANDS.shipyard_max_tonnage));
      geoFacets(f, attrs, false);
      return f;
    },
    builder(node, attrs) {
      const f = {};
      geoFacets(f, attrs, false);
      put(f, 'segment', mapFragments('builder', 'segment', attrs.specialty, BUILDER_SEGMENT_TABLE));
      put(f, 'status', mapString('builder', 'status', attrs.status, BUILDER_STATUS_TABLE));
      f.yacht_count_band = bandOf(builderYachtCount.get(node.id) || 0, BANDS.yacht_count);
      put(f, 'founded_era', foundedEra('builder', attrs.founded));
      return f;
    },
    company(node, attrs) {
      const f = {};
      const kinds = new Set(mapFragments('company', 'kind', attrs.kind, COMPANY_KIND_TABLE));
      matchAll(norm(node.name || ''), COMPANY_NAME_KIND_TABLE).forEach((k) => kinds.add(k));
      put(f, 'kind', [...kinds]);
      put(f, 'service_area', mapFragments('company', 'service_area', attrs.locations, COMPANY_SERVICE_AREA_TABLE));
      geoFacets(f, attrs, true);
      return f;
    },
    person(node, attrs) {
      const f = {};
      put(f, 'role', mapString('person', 'role', attrs.role, PERSON_ROLE_TABLE));
      put(f, 'sector', mapString('person', 'sector', attrs.industry, PERSON_SECTOR_TABLE, matchEarliest));
      if (isText(attrs.nationality)) {
        // "German-born, US citizen": the "-born" demonym names a birthplace, not a nationality.
        const text = norm(attrs.nationality).replace(/\b[a-z ]+-born\b/g, ' ');
        const hits = [...new Set(matchAll(text, NATIONALITY_TABLE))];
        track('person', 'nationality', String(attrs.nationality), hits.length > 0);
        put(f, 'nationality', hits);
      }
      put(f, 'status', mapStatusMulti('person', attrs.status, PERSON_STATUS_TABLE));
      put(f, 'yachts_owned_band', bandOf(personYachtCount.get(node.id) || 0, BANDS.yachts_owned));
      return f;
    },
    engine(node, attrs) {
      const f = {};
      put(f, 'engine_type', mapFragments('engine', 'engine_type', attrs.engine_types, ENGINE_TYPE_TABLE));
      put(f, 'segment', mapFragments('engine', 'segment', attrs.segment, ENGINE_SEGMENT_TABLE));
      geoFacets(f, attrs, false);
      return f;
    },
    engine_model(node, attrs) {
      const f = {};
      // the model's type/segment cells carry the drive words ("racing outboard", "sterndrive (I/O)")
      const text = norm([attrs.segment, attrs.type].filter(isText).join(' ; '));
      const types = text ? matchAll(text, ENGINE_TYPE_TABLE) : [];
      if (text) track('engine_model', 'engine_type', [attrs.segment, attrs.type].filter(isText).join(' ; '), types.length > 0);
      put(f, 'engine_type', types);
      put(f, 'segment', mapFragments('engine_model', 'segment', attrs.segment, ENGINE_SEGMENT_TABLE));
      put(f, 'power_band', bandOf(attrs.power_hp, BANDS.power_hp));
      const engineGeo = geoOf(attrsById.get(engineOfModel.get(node.id)) || {});
      put(f, 'country', engineGeo && engineGeo.country);
      return f;
    },
    club(node, attrs) {
      const f = {};
      put(f, 'founded_decade', bandOf(attrs.founded && attrs.founded.value, BANDS.club_decade));
      put(f, 'facilities', mapFragments('club', 'facilities', attrs.facilities, CLUB_FACILITY_TABLE));
      geoFacets(f, attrs, true);
      return f;
    },
    part(node, attrs) {
      const f = {};
      const cat = isText(attrs.category) ? String(attrs.category) : null;
      if (cat) track('part', 'category', cat, PART_CATEGORIES.includes(cat));
      put(f, 'category', cat && PART_CATEGORIES.includes(cat) ? cat : null);
      const applies = rawList(attrs.applies_to);
      applies.forEach((a) => track('part', 'applies_to', a, PART_APPLIES_TO.includes(a)));
      put(f, 'applies_to', applies.filter((a) => PART_APPLIES_TO.includes(a)));
      return f;
    },
    designer(node, attrs) {
      const f = {};
      geoFacets(f, attrs, false);
      put(f, 'discipline', mapFragments('designer', 'discipline', attrs.discipline, DESIGNER_DISCIPLINE_TABLE));
      put(f, 'status', mapString('designer', 'status', attrs.status, DESIGNER_STATUS_TABLE));
      f.yacht_count_band = bandOf(designerYachtCount.get(node.id) || 0, BANDS.yacht_count);
      return f;
    },
  };

  /** Multi-valued status ("Living (US sanctioned)" -> active + sanctioned). */
  function mapStatusMulti(type, raw, table) {
    if (!isText(raw)) return null;
    const hits = matchAll(norm(raw), table);
    track(type, 'status', String(raw), hits.length > 0);
    return hits;
  }

  /** Founding year only when the cell is a bare year (number or "1985"); prose ranges are unmapped. */
  function foundedEra(type, raw) {
    if (!hasValue(raw)) return null;
    const n = typeof raw === 'number' ? raw : /^\d{4}$/.test(String(raw).trim()) ? parseInt(String(raw).trim(), 10) : null;
    const label = n === null ? null : bandOf(n, BANDS.founded_era);
    track(type, 'founded_era', String(raw), label !== null);
    return label;
  }

  // --- write -----------------------------------------------------------------
  const update = db.prepare('UPDATE nodes SET attrs_json = ? WHERE id = ?');
  const summary = {};
  const write = db.transaction(() => {
    for (const row of rows) {
      const attrs = attrsById.get(row.id);
      currentId = row.id;
      const facets = compute[row.type](row, attrs);
      const next = { ...attrs, facets }; // `facets` keeps its key position on re-runs
      const json = JSON.stringify(next);
      if (json !== row.attrs_json) update.run(json, row.id);
      const s = (summary[row.type] ||= { nodes: 0, assigned: 0 });
      s.nodes += 1;
      s.assigned += Object.keys(facets).length;
    }
  });
  write();

  const unmappedList = [...unmapped.entries()]
    .map(([k, count]) => {
      const [type, facet, value] = k.split('\0');
      return { type, facet, value, count };
    })
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type) || a.facet.localeCompare(b.facet) || a.value.localeCompare(b.value));

  return { byType: summary, builderCountryConflicts, coverage: [...coverage.values()], unmapped: unmappedList };
}

// --- unmapped report --------------------------------------------------------

// Default: ingest/reports/facets-unmapped.json, i.e. next to skipped-prose.md, so tests that
// redirect SKIPPED_PROSE_REPORT_PATH to a temp dir redirect this report with it.
export function resolveFacetsUnmappedReportPath() {
  return process.env.FACETS_UNMAPPED_REPORT_PATH
    ? path.resolve(process.env.FACETS_UNMAPPED_REPORT_PATH)
    : path.join(path.dirname(resolveSkippedProseReportPath()), 'facets-unmapped.json');
}

export function writeFacetsUnmappedReport(unmapped, outPath = resolveFacetsUnmappedReportPath()) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(unmapped, null, 2) + '\n', 'utf8');
  return outPath;
}

export { FACETS };
