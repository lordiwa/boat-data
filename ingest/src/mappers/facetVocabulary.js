// ingest/src/mappers/facetVocabulary.js
//
// TASK-029: controlled vocabularies, band tables and raw-text -> vocabulary
// pattern tables for the facets hook (facets.js). Data only: extend a table,
// not the logic. Values are English keys (UI labels are a later ticket).
//
// Conventions
//   - Bands are half-open [lo, hi): a value on a boundary falls in the UPPER
//     band (loa 24.0 -> '24-40', year 1980 -> '1980s', power_hp 500 -> '500-2000').
//     The one exception is guests, an integer count whose proposal labels are
//     inclusive ('<=8', '9-12', '13-20', '20+'): guests 8 -> '<=8', 9 -> '9-12',
//     20 -> '13-20', 21 -> '20+'. The label '20+' therefore means "more than 20".
//   - Pattern tables run against NORMALIZED text (norm(): diacritics stripped,
//     lower-cased, unicode hyphens folded to '-'). A raw value that matches no
//     entry gets NO facet and is reported in facets-unmapped.json (never guessed).
//   - Table entries are [value, RegExp]; a comment says why when it is not obvious.
//
// Source of the vocabularies: research/category-taxonomy-proposal.md section 4
// (human decisions 2026-10-16: English UI, bands exactly as in the proposal).

import { COUNTRIES } from './countryAliases.js';

export function norm(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- bands ------------------------------------------------------------------

const INF = Infinity;
const band = (label, lo, hi) => ({ label, lo, hi });

const decadeBands = (firstLabel, firstHi) => {
  const out = [band(firstLabel, -INF, firstHi)];
  for (let y = firstHi; y < 2030; y += 10) out.push(band(`${y}s`, y, y + 10));
  return out;
};

export const BANDS = {
  yacht_loa: [band('15-24', 15, 24), band('24-40', 24, 40), band('40-60', 40, 60), band('60-90', 60, 90), band('90-120', 90, 120), band('120+', 120, INF)],
  // Yachts under 15 m are outside the proposal's bands and get no loa_band.
  // floor 1800: a year of 0, negative or 3 digits is a parse artifact, not a pre-1980 build
  yacht_decade: [band('pre-1980', 1800, 1980), band('1980s', 1980, 1990), band('1990s', 1990, 2000), band('2000s', 2000, 2010), band('2010s', 2010, 2020), band('2020s', 2020, 2030)],
  yacht_guests: [band('<=8', -INF, 9), band('9-12', 9, 13), band('13-20', 13, 21), band('20+', 21, INF)],
  marina_max_loa: [band('<20', -INF, 20), band('20-40', 20, 40), band('40-60', 40, 60), band('60-100', 60, 100), band('100+', 100, INF)],
  marina_berths: [band('<50', -INF, 50), band('50-150', 50, 150), band('150-400', 150, 400), band('400+', 400, INF)],
  shipyard_max_loa: [band('<50', -INF, 50), band('50-100', 50, 100), band('100-200', 100, 200), band('200+', 200, INF)],
  shipyard_max_tonnage: [band('<500', -INF, 500), band('500-3000', 500, 3000), band('3000+', 3000, INF)],
  yacht_count: [band('0', 0, 1), band('1-4', 1, 5), band('5-14', 5, 15), band('15+', 15, INF)],
  founded_era: [band('pre-1900', -INF, 1900), band('1900-1949', 1900, 1950), band('1950-1979', 1950, 1980), band('1980-1999', 1980, 2000), band('2000+', 2000, INF)],
  yachts_owned: [band('1', 1, 2), band('2-3', 2, 4), band('4+', 4, INF)],
  // Club founding decade: pre-1900, then 1900s ... 2020s.
  club_decade: decadeBands('pre-1900', 1900),
  power_hp: [band('<100', -INF, 100), band('100-500', 100, 500), band('500-2000', 500, 2000), band('2000+', 2000, INF)],
};

/** Band label for a number, or null when `value` is not a finite number / outside every band. */
export function bandOf(value, bands) {
  const n = toNum(value);
  if (n === null) return null;
  const hit = bands.find((b) => n >= b.lo && n < b.hi);
  return hit ? hit.label : null;
}

export function toNum(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim())) return parseFloat(v);
  return null;
}

const labels = (bands) => bands.map((b) => b.label);

// --- country / flag vocabularies --------------------------------------------

export const COUNTRY_NAMES = Object.values(COUNTRIES).map((c) => c.name);

// Flag states that are not in the country registry (registries / dependencies the
// corpus uses as a yacht flag).
const FLAG_EXTRA = ['Cayman Islands', 'Marshall Islands', 'Isle of Man', 'Bermuda', 'Sierra Leone', 'Saint Vincent and the Grenadines'];
export const FLAG_NAMES = [...new Set([...COUNTRY_NAMES, ...FLAG_EXTRA])];

// Checked BEFORE normalizeCountry(): spellings it does not know or would mis-read.
export const FLAG_ALIASES = [
  [/^cayman/, 'Cayman Islands'],
  [/^marshall islands/, 'Marshall Islands'],
  [/^isle of man/, 'Isle of Man'],
  [/^bermuda/, 'Bermuda'],
  [/^sierra leone/, 'Sierra Leone'],
  // "St Vincent & Grenadines" would otherwise be split on '&' and read as two places.
  [/^(st|saint) vincent/, 'Saint Vincent and the Grenadines'],
  // Nassau is the Bahamian port of registry, not a country; it names the Bahamas flag.
  [/^nassau/, 'Bahamas'],
];

// --- nationality (person) ---------------------------------------------------

// Demonym -> country. "X-born" is stripped first so "German-born, US citizen" yields only the US.
export const NATIONALITY_TABLE = [
  ['United States', /\bamerican\b|\bus\b|\busa\b/],
  ['Russia', /\brussian\b/],
  ['United Arab Emirates', /\bemirati\b|\buae\b/],
  ['Canada', /\bcanadian\b/],
  ['New Zealand', /\bnew zealander\b/],
  ['China', /\bchinese\b/],
  ['Australia', /\baustralian\b/],
  ['United Kingdom', /\bbritish\b/],
  ['Saudi Arabia', /\bsaudi\b/],
  ['Greece', /\bgreek\b/],
  ['Qatar', /\bqatari\b/],
  ['Ukraine', /\bukrainian\b/],
  ['Uzbekistan', /\buzbek\b/],
  ['Azerbaijan', /\bazerbaijani\b/],
  ['France', /\bfrench\b/],
  ['Pakistan', /\bpakistani\b/],
  ['Brazil', /\bbrazilian\b/],
  ['Kuwait', /\bkuwaiti\b/],
  ['Germany', /\bgerman\b/],
  ['Cyprus', /\bcypriot\b/],
  ['Norway', /\bnorwegian\b/],
  ['India', /\bindian\b/],
  ['Jamaica', /\bjamaican\b/],
  ['Sweden', /\bswedish\b/],
  ['Hong Kong', /\bhong kong\b/],
  ['Poland', /\bpolish\b/],
  ['Oman', /\bomani\b/],
];

// --- yacht ------------------------------------------------------------------

export const SIZE_CLASS_BY_NODE = {
  'size_class:boat-yacht': 'yacht',
  'size_class:superyacht': 'superyacht',
  'size_class:megayacht': 'megayacht',
  'size_class:gigayacht': 'gigayacht',
};

// Ordered by priority: a yacht whose text hits several takes the FIRST (a "classic explorer" is
// an explorer; a "sailing catamaran" is a catamaran).
export const PROPULSION_TABLE = [
  ['catamaran', /catamaran|trimaran|multihull/], // trimaran/multihull: the vocabulary has one multihull value
  ['sailing', /\bsail(ing|boat|s)?\b|sail-assisted|\bmasted\b|schooner|\bketch\b|\bsloop\b|phinisi/],
  // explorer outranks sport-fish: "Expedition, tenders, fishing" is an expedition yacht that carries fishing gear
  ['explorer', /explorer|expedition|passage-?maker|ice-class/],
  ['sport-fish', /sport-?fish|fishing/],
  // no "diesel-electric": it names a drive system that sailing yachts also use (Sailing Yacht A)
  ['motor', /motor ?(super|mega)?-?yacht|motoryacht|\bm\/y\b|power ?boat/],
];

// 'classic' is a TYPE (era), not a style adjective. It is assigned only on type evidence: the noun
// use ("classic yacht", "classic motor yacht") or the word together with a build year before
// CLASSIC_BEFORE_YEAR. "classic interior / luxury / lines / design" is style and never counts.
// The noun use outranks the other types; the year form ranks above 'motor' only.
export const CLASSIC_NOUN_RE = /\b(classic|vintage|historic) (motor |sailing |power |steam )?(yacht|motoryacht|sailboat|schooner|ketch|sloop|cruiser|launch)\b/;
export const CLASSIC_WORD_RE = /\b(classic|vintage|historic|heritage)\b/;
export const CLASSIC_BEFORE_YEAR = 1970;

// --- marina -----------------------------------------------------------------

export const MARINA_CATEGORIES = [
  'wet-slip marina', 'dry stack', 'boatyard', 'superyacht marina', 'yacht basin',
  'municipal marina', 'club marina', 'mooring field', 'fuel dock', 'storage campus',
];

// Evaluated in order; first rule whose NAME pattern matches wins. If none matches by name, the
// same order is tried on NOTES (rules flagged notesNeedNoMarinaInName skip names containing
// "marina", so a "... Marina" whose notes list repairs stays a marina). Last resort: "marina" in the name -> 'wet-slip marina' (a marina
// is a wet-slip facility by definition, knowledge/106 "Wet-slip marina"). Nothing else -> 'unclassified'.
// knowledge/106 taxonomy: dry-stack, dry-storage yard, yacht basin, superyacht marina,
// boatyard/shipyard, municipal, private club marina, fuel dock, wet-slip marina.
export const MARINA_CATEGORY_RULES = [
  { value: 'dry stack', name: /dry[- ]?stack|drystack|aquastack|rack storage/, notes: /dry[- ]?stack|drystack|forklift/ },
  { value: 'mooring field', name: /mooring fields?\b/, notes: /mooring field/ },
  { value: 'fuel dock', name: /fuel (dock|pier|station)|gas dock/, notes: /^fuel dock/ },
  // Boatyard before superyacht/club/municipal: a named yard/repair facility is a yard even when
  // the operator is a port authority or the name says "superyacht" ("Dania Cut Superyacht Repair").
  {
    value: 'boatyard',
    name: /boat ?yards?\b|boat ?works|shipyards?\b|ship yard|dockyard|slipway|yacht yard|boat shop|boat shed|haul-?outs?\b|\b(repair|refit)s?\b|shipbuilding|ship construction|marine railway/,
    notes: /^(basic |full |ship |superyacht )?(repairs?|refits?|haul-?outs?|haulout|boatbuilding|shipbuilding|boatyard|shipyard|maintenance|dry-?dock|engineering|construction|travel ?lift|slipway|defense shipbuilding)\b|boatyard\/haul-?out|^shipyard/,
    notesNeedNoMarinaInName: true,
  },
  { value: 'superyacht marina', name: /super-?yacht|mega-?yacht/, notes: /superyacht (marina|berths|harbou?r)|mega-?yacht marina/ },
  {
    value: 'club marina',
    name: /\b(yacht|boat|sailing|cruising|rowing|motor ?boat|marina|country|harbou?r|anglers?|racquet) club\b|\bclub (marina|nautico|de mar|de regatas)\b|\bsquadron\b|\bclub\b.*\bmarina\b|\bmarina\b.*\bclub\b/,
    notes: /private club|club marina|club-integrated|members only/,
  },
  {
    value: 'municipal marina',
    name: /\bmunicipal|\b(city|town|county|village) of\b|\b(city|county|town) (small boat )?marina|^(city|county|town|village) |\bcity marina\b|public (marina|dock)/,
    notes: /municipal|municipality|city[- ]owned|county[- ]owned|publicly owned|port authority/,
  },
  // US "Port of X" entries are public port districts (Pacific Coast guide); gated on geo.country_code US.
  { value: 'municipal marina', name: /^port of /, onlyUS: true },
  { value: 'yacht basin', name: /yacht basin|yacht harbou?r|yacht haven|yacht cent(er|re)|yachting cent(er|re)|yacht port/ },
  { value: 'storage campus', name: /\bstorage\b|boat park/, notes: /^(indoor|dry|boat|winter) storage/, notesNeedNoMarinaInName: true },
];
export const MARINA_WET_FALLBACK_RE = /\bmarinas?\b|\bmarin\b/;

export const MARINA_SERVICE_RULES = {
  fuel: { notes: /\bfuel(ing)?\b|refuel/ },
  travelift: { notes: /travel ?lift|travelift/ },
  'haul-out': { notes: /haul-?outs?|haulout|haul\/launch|\bhauls?\b/, name: /haul-?out/ },
  'dry storage': { notes: /dry[- ]?(stack|storage)|indoor storage|boat storage/, name: /dry[- ]?stack|drystack|aquastack|\bstorage\b/ },
  'hurricane-rated': { notes: /hurricane[- ]?(rated|proof|resistant|safe|hole|protected|shelter|certified)|rated for hurricane/ },
  customs: { notes: /customs|port of entry|clearance|immigration/ },
  liveaboard: { notes: /live-?aboard/ },
};

export const MARINA_STORAGE_RULES = {
  wet: { notes: /wet[- ]?slips?|\bslips\b|moorings?|finger piers?|floating docks?/ },
  'dry-stack': { notes: /dry[- ]?stack|drystack|forklift/, name: /dry[- ]?stack|drystack|aquastack/ },
  hardstand: { notes: /hardstand|hard stand|on the hard|land yard/ },
  indoor: { notes: /indoor|covered storage|warehouse/ },
};

// --- shipyard ---------------------------------------------------------------

export const SHIPYARD_FACILITY_TABLE = [
  ['commercial dry dock', /^commercial dry dock$/],
  ['refit yard', /^refit yard$|^commercial \+ yacht refit$/], // "commercial + yacht refit": a commercial dock that refits yachts -> refit yard
  ['builder yard', /^builder yard$/],
  ['builder+refit', /^builder \+ refit yard$/],
  ['submarine/submersible', /^submarine dry dock$|^submersible (service|builder)$/],
  ['haul-out yard', /^haul-?out yard$/],
];

export const SHIPYARD_SERVICE_TABLE = [
  ['newbuild', /^newbuild/], // includes "newbuild (historical)"
  ['refit', /^refit$/],
  // maintenance and the generic "service" are repair work for a yard
  ['repair', /^(repair|maintenance|service)$/],
  ['conversion', /^conversion$/],
  ['engineering', /^(engineering|certification)$/], // certification (class/survey) is an engineering service
  ['paint', /^paint$/],
  ['storage', /^storage$/],
  ['offshore', /^(offshore|research support)$/], // research support: offshore/oceanographic vessel support
];

export const SHIPYARD_LIFT_TABLE = [
  // covered dry dock = a graving dock under a roof: BOTH values (a multi facet)
  ['graving dock', /graving|covered dry dock/],
  ['floating dock', /floating (dry )?dock/],
  ['travelift', /travel ?lift|travelift/],
  ['shiplift/syncrolift', /syncrolift|ship ?lift/],
  ['slipway', /slipway/],
  ['covered hall', /covered|construction hall|assembly hall|building hall/],
];

// --- builder ----------------------------------------------------------------

// Applied to each specialty fragment. "custom"/"bespoke"/superyacht/megayacht builders are the
// one-off segment; the 'custom superyacht' label is the vocabulary's name for it.
export const BUILDER_SEGMENT_TABLE = [
  ['custom superyacht', /\bcustom\b|bespoke|super-?yacht|mega-?yacht/],
  ['semi-custom/production motoryacht', /semi-custom|production|series|flybridge|sport ?cruiser|fiberglass|\bgrp\b|motor ?yachts?\b|motorboats|sportfish|sport-?fish|sport &/],
  ['sailing yacht', /\bsail(ing|boats?)?\b|phinisi/],
  ['explorer', /explorer|expedition|passage-?maker/],
  ['catamaran', /catamaran|trimaran|multihull/], // multihull builders share the vocabulary's single multihull value
  ['naval/commercial', /naval|\bnavy\b|minehunters?|commercial|merchant|military|warship|ferr(y|ies)|\btugs?\b|tugboats?|barges?|landing (craft|ship)|\blsts\b|cargo|cruise ships|patrol|research|submarines?|offshore vessels|towboats|shipbuilding|passenger|frigates|dredging|general shipbuilding|\bships\b/],
  ['refit', /refit|repair|conversion/],
  ['aluminium specialist', /alumin(i)?um|aluminum|alloy/],
];

export const BUILDER_STATUS_TABLE = [
  // Leading keyword decides: "defunct as standalone brand (absorbed into ...)" is defunct, not acquired.
  ['defunct', /^defunct/],
  ['active', /^active(?!\/uncertain)/],
  ['acquired', /^(acquired|subsidiary|part of|renamed\/absorbed)|absorbed into/],
];

// --- designer ---------------------------------------------------------------

export const DESIGNER_DISCIPLINE_TABLE = [
  ['naval architecture', /naval architect/],
  ['exterior design', /exterior design/],
  ['interior design', /interior design/],
  ['sailing yacht design', /sailing yacht design/],
];

export const DESIGNER_STATUS_TABLE = [
  ['active', /^active/],
  ['deceased', /^deceased/],
  ['defunct', /dissolved|liquidated/],
];

// --- company ----------------------------------------------------------------

export const COMPANY_KIND_TABLE = [
  ['broker', /^broker(age)?$|^brokerage\/management$/],
  ['charter operator', /^charter$/],
  ['yacht management', /^management$|^brokerage\/management$/],
  ['shipyard operator', /^shipyard operator$/],
  ['parent company', /parent company$/],
  ['services', /^yacht services$/],
  ['platform/marketplace', /^platform$/],
  ['institution', /state institution/],
];
// Kinds the corpus never states in the `kind` cell but the company NAME makes explicit
// (knowledge/100 salvage operators carry kind=null). Additive to the kind cell.
export const COMPANY_NAME_KIND_TABLE = [
  ['salvage & towing', /salvage|towing|\btow\b|sea ?tow/],
  ['insurance', /insurance|underwriter/],
];

export const COMPANY_SERVICE_AREA_TABLE = [
  ['global', /global|worldwide|multi-region|locations worldwide/],
  ['usa', /\busa\b|united states/],
  ['europe', /europe/],
  ['mediterranean', /mediterranean|palma|mallorca|barcelona|la ciotat/],
  ['south florida', /south florida|fort lauderdale|palm beach|broward|dade/],
  ['florida', /(?<!south )florida/],
  ['caribbean', /caribbean|bahamas|saint martin/],
  ['asia-pacific', /asia|pacific|australia/],
];

// --- person -----------------------------------------------------------------

// First matching entry wins (priority order).
export const PERSON_ROLE_TABLE = [
  ['placeholder', /placeholder|unconfirmed|aggregate/],
  ['royalty', /crown prince|\bemir\b|sultan|sheikh|ruler of|\bking\b/],
  // government context only: a bare "President, <company>" is a corporate title and falls through to
  // founder/executive ("Founder/President, Emerson Collective" is a founder)
  ['politician', /president,? (of )?(the )?(united|republic|state|kingdom|emirates)|prime minister|\bpm\b|minister|senator|politician|advis[eo]r|representative|governor|mayor|\bmp\b|deputy/],
  ['heir', /\bheir/],
  ['founder', /founder/],
  // "media mogul": an operating proprietor, i.e. an executive; a plain "President" is a corporate title
  ['executive', /\bceo\b|chairman|executive|president|\bcto\b|director|chief|mogul/],
  ['celebrity', /athlete|author|actor|musician|celebrity|golfer/],
  ['investor', /investor|owner|businessman|businesswoman|entrepreneur|tycoon|billionaire|property/],
];

// The sector named EARLIEST in the text wins (ties: table order).
export const PERSON_SECTOR_TABLE = [
  ['government', /politic|head of (state|government)|government|diplomat|minister/],
  ['tech', /\btech\b|e-commerce|software|social media|internet|telecom|google|alphabet|microsoft|oracle/],
  ['energy/oil', /\boil\b|petroleum|\bgas\b|energy|coal|fuel/],
  ['metals/mining', /steel|metal|mining|\biron\b|\bgold\b|alumin/],
  ['retail', /retail|luxury goods|jewell?er|coffee/], // coffee roaster: consumer goods retail
  ['finance', /financ|invest|banking|\bbank\b|loans|insurance|equity/],
  ['real estate', /real estate|property|construction/],
  ['media/entertainment', /media|entertain|gaming|casino|literature|publish|broadcast|music|film/],
  ['industrial', /manufactur|auto parts|packaging|engineering|defen[cs]e|aerospace|aviation|shipping|maritime|logistics|fishing|waste|fertili[sz]er|chemical|industrial|airport|\barms\b/],
  ['sports', /sport|golf|football|\bnfl\b/],
];

export const PERSON_STATUS_TABLE = [
  ['deceased', /deceased|\bdied\b/],
  ['sanctioned', /sanction/],
  ['active', /^living/],
];

// --- engine / engine_model --------------------------------------------------

export const ENGINE_TYPE_TABLE = [
  ['2-stroke ship', /2-stroke ship/],
  ['inboard diesel', /inboard diesel/],
  ['inboard gas', /inboard gas/],
  ['outboard', /outboard/],
  ['sterndrive', /sterndrive|stern drive|outdrive/],
  ['pod drive', /pod drive|\bpod system/],
  ['waterjet', /water ?jet/],
  ['electric', /electric/],
  ['hybrid', /hybrid/],
];

export const ENGINE_SEGMENT_TABLE = [
  ['recreational', /recreational|consumer/],
  ['yacht', /(?<!super)(?<!mega)yacht\b/],
  // megayacht: one size step above superyacht; the engine segment vocabulary has one large-yacht value
  ['superyacht', /super-?yacht|mega-?yacht/],
  ['commercial', /commercial/],
  ['ship', /\bship\b/],
  ['military', /military/],
  ['racing', /racing/],
];

// --- club / part ------------------------------------------------------------

export const CLUB_FACILITY_TABLE = [
  ['marina', /marina|berth|slips\b|harbou?r|\bdocks?\b/],
  ['mooring', /mooring|moorage/],
  ['clubhouse', /clubhouse|club house|social/],
  ['dining', /restaurant|dining|\bbar\b|bbq|cafe|kitchen/],
  ['pool', /\bpool\b|swimming/],
  ['sailing school', /sailing (school|courses?|lessons?)|junior|youth|training|lessons|yacht school/],
  ['racing', /\brace|regatta|racing/],
  ['storage', /storage|parking|dry stack|hoist|crane|trailer/],
  ['repairs', /repair|maintenance/],
  ['slipway', /slipway|\bramp\b|launch/],
  ['fuel', /fuel|refuel/],
];

export const PART_CATEGORIES = ['hull & structure', 'deck & exterior', 'propulsion & systems', 'interior', 'rig & sail', 'navigation & safety'];
export const PART_APPLIES_TO = ['all', 'superyacht+', 'sailing yacht', 'powerboat'];

// --- the closed vocabulary registry -----------------------------------------
//
// FACETS[type][facet] = { kind: 'simple' | 'multi' | 'boolean', values: [...] | null }.
// `values: null` marks a facet copied from attrs.geo (subdivision, city): the closed list is
// the geo hierarchy itself, so tests check those against the node's own attrs.geo instead.

const simple = (values) => ({ kind: 'simple', values });
const multi = (values) => ({ kind: 'multi', values });
const bool = () => ({ kind: 'boolean', values: [true, false] });
const countryFacet = () => simple(COUNTRY_NAMES);
const geoFacets = () => ({ country: countryFacet(), subdivision: simple(null), city: simple(null) });
const tableValues = (table) => table.map(([v]) => v);

export const FACETS = {
  yacht: {
    size_class: simple(['yacht', 'superyacht', 'megayacht', 'gigayacht']),
    loa_band: simple(labels(BANDS.yacht_loa)),
    decade: simple(labels(BANDS.yacht_decade)),
    propulsion_type: simple([...tableValues(PROPULSION_TABLE), 'classic', 'unknown']),
    flag: simple(FLAG_NAMES),
    builder_country: countryFacet(),
    charter_available: bool(),
    complete: bool(),
    guests_band: simple(labels(BANDS.yacht_guests)),
    has_known_owner: bool(),
  },
  marina: {
    facility_category: simple([...MARINA_CATEGORIES, 'unclassified']),
    max_loa_band: simple(labels(BANDS.marina_max_loa)),
    berths_band: simple(labels(BANDS.marina_berths)),
    services: multi(Object.keys(MARINA_SERVICE_RULES)),
    storage_type: multi(Object.keys(MARINA_STORAGE_RULES)),
    data_level: simple(['complete', 'basic']),
    ...geoFacets(),
  },
  shipyard: {
    facility_type: simple(tableValues(SHIPYARD_FACILITY_TABLE)),
    services: multi(tableValues(SHIPYARD_SERVICE_TABLE)),
    lift_type: multi(tableValues(SHIPYARD_LIFT_TABLE)),
    max_loa_band: simple(labels(BANDS.shipyard_max_loa)),
    max_tonnage_band: simple(labels(BANDS.shipyard_max_tonnage)),
    country: countryFacet(),
  },
  builder: {
    country: countryFacet(),
    segment: multi(tableValues(BUILDER_SEGMENT_TABLE)),
    status: simple(tableValues(BUILDER_STATUS_TABLE)),
    yacht_count_band: simple(labels(BANDS.yacht_count)),
    founded_era: simple(labels(BANDS.founded_era)),
  },
  company: {
    kind: multi([...tableValues(COMPANY_KIND_TABLE), ...tableValues(COMPANY_NAME_KIND_TABLE)]),
    service_area: multi(tableValues(COMPANY_SERVICE_AREA_TABLE)),
    ...geoFacets(),
  },
  person: {
    role: simple([...new Set(tableValues(PERSON_ROLE_TABLE))]),
    sector: simple(tableValues(PERSON_SECTOR_TABLE)),
    nationality: multi(tableValues(NATIONALITY_TABLE)),
    status: multi(tableValues(PERSON_STATUS_TABLE)),
    yachts_owned_band: simple(labels(BANDS.yachts_owned)),
  },
  engine: {
    engine_type: multi(tableValues(ENGINE_TYPE_TABLE)),
    segment: multi(tableValues(ENGINE_SEGMENT_TABLE)),
    country: countryFacet(),
  },
  engine_model: {
    engine_type: multi(tableValues(ENGINE_TYPE_TABLE)),
    segment: multi(tableValues(ENGINE_SEGMENT_TABLE)),
    power_band: simple(labels(BANDS.power_hp)),
    country: countryFacet(),
  },
  club: {
    founded_decade: simple(labels(BANDS.club_decade)),
    facilities: multi(tableValues(CLUB_FACILITY_TABLE)),
    ...geoFacets(),
  },
  part: {
    category: simple(PART_CATEGORIES),
    applies_to: multi(PART_APPLIES_TO),
  },
  designer: {
    country: countryFacet(),
    discipline: multi(tableValues(DESIGNER_DISCIPLINE_TABLE)),
    status: simple(tableValues(DESIGNER_STATUS_TABLE)),
    yacht_count_band: simple(labels(BANDS.yacht_count)),
  },
};

export const FACETED_TYPES = Object.keys(FACETS);

/**
 * The six free-text sources AC4 measures (>= 90% of non-empty raw values must map).
 * type.facet keys into the coverage stats facets.js returns.
 */
export const COVERAGE_SOURCES = [
  { type: 'builder', facet: 'segment', source: 'specialty' },
  { type: 'shipyard', facet: 'lift_type', source: 'lift_type' },
  { type: 'shipyard', facet: 'facility_type', source: 'facility_type' },
  { type: 'engine', facet: 'engine_type', source: 'engine_types' },
  { type: 'person', facet: 'role', source: 'role' },
  { type: 'person', facet: 'sector', source: 'industry' },
];
