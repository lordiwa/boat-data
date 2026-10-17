// ingest/src/mappers/regionHierarchy.js
//
// TASK-027: geographic hierarchy for region nodes. A retrofit hook (same
// "run once, after every file's nodes exist, called from ingest.js" pattern
// as regionCanonicalization.js) that turns the flat 900+ region nodes into a
// country > subdivision > city tree and stamps a normalized attrs.geo onto
// every node that is located_in / based_in a resolved region.
//
//   country      region node, attrs { level:'country', iso2, macro_region }
//   subdivision  region node (US state, Canadian province, Australian state,
//                Italian region, Japanese macro-region ...), part_of country
//   city         any locality-level place (city, harbour, county, district),
//                part_of its subdivision, or part_of its country when the
//                corpus names no subdivision
//   unresolved   everything else — node left intact, no part_of, no geo
//
// NEVER-GUESS policy (AC6): a region is resolved only when (a) this file's
// hand-curated tables say so, (b) its own name carries an explicit
// ", <US state | province | country | known qualifier>" suffix, or (c) a
// prior corpus decision already exists (the FLORIDA_CITIES roll-up, the
// regionCanonicalization merge/rename map, the permanent alias table).
// Bare names that name several real places (Newport, Vancouver, Wilmington,
// Portland without a state ...) stay `unresolved` — see UNRESOLVED_REGIONS.
// Nothing is ever minted from prose: the only nodes this hook creates are
// country and subdivision nodes drawn from the tables below.
//
// Data-driven like regions.js / regionCanonicalization.js: extend the tables,
// not the logic. Idempotent: classification is a pure function of the region
// node's id/name/attrs, so a second run rewrites identical values.

import { upsertNode, upsertEdge } from '../db.js';
import { slug, stripDiacritics } from './normalize.js';
import { isFloridaCity } from './regions.js';
import { COUNTRIES, normalizeCountry, lookupCountry } from './countryAliases.js';

// --- reference data ---------------------------------------------------------

export const US_STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export const CA_PROVINCES = { ON: 'Ontario', BC: 'British Columbia', QC: 'Quebec' };

// WG27-H2: two-letter suffixes that are ALSO an Australian or Canadian code (WA = Washington
// vs Western Australia) never auto-resolve to a US state; they resolve only via an explicit
// GROUPS entry (e.g. henderson-wa), else stay unresolved.
const AU_STATE_CODES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const CA_PROVINCE_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
const AMBIGUOUS_STATE_CODES = new Set(
  Object.keys(US_STATES).filter((c) => AU_STATE_CODES.includes(c) || CA_PROVINCE_CODES.includes(c))
);

// Trailing place qualifiers ("Albufeira, Algarve", "Warkworth, Auckland").
// key (lowercase, diacritics folded) -> [iso2, subdivision | null]. A null
// subdivision still pins the country (e.g. "Lisbon area" is Portugal but is
// not one of the subdivisions this graph models).
export const QUALIFIERS = {
  // Spain
  'balearic islands': ['ES', 'Balearic Islands'], mallorca: ['ES', 'Balearic Islands'],
  menorca: ['ES', 'Balearic Islands'], ibiza: ['ES', 'Balearic Islands'],
  catalonia: ['ES', 'Catalonia'], 'costa brava': ['ES', 'Catalonia'],
  'costa blanca': ['ES', 'Valencian Community'], 'valencian community': ['ES', 'Valencian Community'],
  'costa del sol': ['ES', 'Andalusia'], 'costa tropical': ['ES', 'Andalusia'], cadiz: ['ES', 'Andalusia'],
  'canary islands': ['ES', 'Canary Islands'],
  // Portugal
  algarve: ['PT', 'Algarve'], madeira: ['PT', 'Madeira'], azores: ['PT', 'Azores'],
  'lisbon area': ['PT', null], setubal: ['PT', null], centro: ['PT', null], norte: ['PT', null],
  alentejo: ['PT', null], porto: ['PT', null],
  // Malta
  malta: ['MT', null],
  // New Zealand
  auckland: ['NZ', 'Auckland'], northland: ['NZ', 'Northland'], canterbury: ['NZ', 'Canterbury'],
  marlborough: ['NZ', 'Marlborough'], tasman: ['NZ', 'Tasman'], otago: ['NZ', 'Otago'],
  waikato: ['NZ', 'Waikato'], wellington: ['NZ', 'Wellington'], "hawke's bay": ['NZ', "Hawke's Bay"],
  'bay of plenty': ['NZ', 'Bay of Plenty'], coromandel: ['NZ', null], taupo: ['NZ', null],
  fiordland: ['NZ', null], lanzarote: ['ES', 'Canary Islands'],
  // Australia
  qld: ['AU', 'Queensland'], queensland: ['AU', 'Queensland'], nsw: ['AU', 'New South Wales'],
  // (bare "Victoria" / "SA" are deliberately absent: Victoria is also BC, SA also South Africa/Saudi)
};

// Existing region nodes that ARE themselves a subdivision (their own id is
// kept; the hook only adds attrs + the part_of edge to the country).
// slug -> [iso2, display name].
export const SUBDIVISION_LEVEL_REGIONS = {
  florida: ['US', 'Florida'],
  kanto: ['JP', 'Kanto'], kinki: ['JP', 'Kinki'], kansai: ['JP', 'Kansai'], kyushu: ['JP', 'Kyushu'],
  chubu: ['JP', 'Chubu'], chugoku: ['JP', 'Chugoku'], hokkaido: ['JP', 'Hokkaido'],
  hokuriku: ['JP', 'Hokuriku'], shikoku: ['JP', 'Shikoku'], tohoku: ['JP', 'Tohoku'],
  okinawa: ['JP', 'Okinawa'],
  'french-riviera': ['FR', 'French Riviera'],
  'northeast-taiwan': ['TW', 'Northeast Taiwan'],
  'west-sumatra': ['ID', 'West Sumatra'],
};

// Bare names that name several real places and have NO prior corpus
// decision. Listed explicitly (with the reason) so the never-guess calls are
// auditable and testable; anything not in any table is also left unresolved.
export const UNRESOLVED_REGIONS = {
  newport: 'Newport RI / OR / KY / Wales — the corpus decided only the explicit "Newport, RI" spelling',
  portland: 'Portland OR / ME — resolved only via the corpus-scoped merge onto "Portland, OR" (regionCanonicalization.js)',
  vancouver: 'Vancouver BC vs WA — regionCanonicalization.js decided only the explicit ", WA" spelling',
  wilmington: 'Wilmington CA / NC / DE',
  melbourne: 'Melbourne AU vs FL',
  plymouth: 'Plymouth UK vs MA',
  richmond: 'Richmond CA / VA / BC',
  portsmouth: 'Portsmouth UK / VA / NH',
  'st-petersburg':
    'PRE-EXISTING CONFLATION: the Florida roll-up (FLORIDA_CITIES) pulls in Russian clubs too — 7 of the 8 linked ' +
    'nodes are file 33 (Russia). Left unresolved (existing part_of edge untouched); needs a Naples-style split.',
  'location-not-specified': 'Placeholder, not a place',
  jamestown: 'Jamestown RI / PA / VA', scarborough: 'Scarborough ON / QLD / UK', toledo: 'Toledo OH / OR / ES',
  belfast: 'Belfast UK / ME', henderson: 'Henderson WA / NV', tuzla: 'Tuzla TR / BA', kingston: 'Kingston JM / ON / NY',
  charleston: 'Charleston SC / WV', victoria: 'Victoria BC / AU / SC', newcastle: 'Newcastle UK / NSW',
  alexandria: 'Alexandria EG / VA', cartagena: 'Cartagena ES / CO',
};

// Hand-curated city tables. An entry is a region slug (city name derived from
// the node name) or [slug, 'City Name'] when the derivation would be wrong.
// `subdivision` null = the corpus names none worth modelling.
const GROUPS = [
  // ---- United States ----
  { iso2: 'US', subdivision: 'California', cities: ['san-diego', 'marina-del-rey', 'newport-beach', 'long-beach',
    'oxnard', 'ventura', 'sausalito', 'alameda', 'dana-point', 'redondo-beach', 'chula-vista', 'huntington-beach',
    'san-pedro', 'san-mateo', 'coronado', 'oceanside', 'redwood-city', 'morro-bay', 'monterey', 'napa', 'berkeley',
    'tiburon', 'santa-barbara', 'santa-ana', 'seal-beach', 'national-city', 'rio-vista', 'isleton', 'bethel-island',
    'moss-landing', 'san-francisco', 'catalina-island', 'point-richmond', ['terminal-island-los-angeles', 'Terminal Island'],
    ['cabrillo-marina-san-pedro', 'San Pedro']] },
  { iso2: 'US', subdivision: 'Washington', cities: ['hoquiam-wa', 'vancouver-wa', 'seattle', 'olympia', 'port-townsend', 'tacoma', 'anacortes',
    'gig-harbor', 'bellingham', 'bainbridge-island', 'bremerton', 'edmonds', 'kirkland', 'everett', 'shelton',
    'steilacoom', 'sequim', 'port-angeles', 'port-ludlow', 'oak-harbor', 'la-conner', 'blaine', 'deer-harbor',
    'grapeview', 'orcas-island', 'blakely-island', 'ilwaco'] },
  { iso2: 'US', subdivision: 'Oregon', cities: ['tillamook', 'bandon', 'brookings', 'garibaldi', 'waldport',
    'winchester-bay', 'the-dalles'] },
  { iso2: 'US', subdivision: 'Florida', cities: ['new-river', 'marco-island', 'stock-island', 'clearwater',
    'clearwater-beach', 'captiva', 'captiva-island', 'daytona-beach', 'deland', 'fernandina-beach',
    'fort-walton-beach', 'indian-harbour-beach', 'new-smyrna-beach', 'palm-city', 'port-charlotte', 'punta-gorda',
    'st-pete-beach', 'vero-beach', ['coconut-grove-miami', 'Coconut Grove'], ['watson-island-miami-fl', 'Watson Island'],
    'palm-beach-gardens', 'miami-river'] },
  { iso2: 'US', subdivision: 'Rhode Island', cities: ['point-judith', 'block-island'] },
  { iso2: 'US', subdivision: 'Massachusetts', cities: ['hyannis', ['sesuit-harbor-east-dennis', 'Sesuit Harbor']] },
  { iso2: 'US', subdivision: 'Connecticut', cities: ['noank'] },
  { iso2: 'US', subdivision: 'New Jersey', cities: ['atlantic-city', 'somers-point'] },
  // ---- Canada ----
  { iso2: 'CA', subdivision: 'British Columbia', cities: ['north-vancouver', 'west-vancouver', 'campbell-river',
    'nanaimo', 'duncan', 'parksville', 'port-alberni', 'port-coquitlam', 'port-moody', 'pitt-meadows', 'kelowna',
    'nanoose-bay', 'mill-bay', 'salt-spring-island', 'thetis-island', 'pender-island'] },
  // ---- Mexico ----
  { iso2: 'MX', subdivision: null, cities: ['cozumel', ['cabo-san-lucas-bcs', 'Cabo San Lucas']] },
  // ---- Italy ----
  { iso2: 'IT', subdivision: 'Tuscany', cities: ['viareggio', 'massa', 'pisa', 'livorno', 'florence'] },
  { iso2: 'IT', subdivision: 'Liguria', cities: ['la-spezia', 'genoa', 'savona', 'varazze', 'portofino',
    ['ameglia-la-spezia', 'Ameglia']] },
  { iso2: 'IT', subdivision: 'Marche', cities: ['ancona', 'fano', 'mondolfo'] },
  { iso2: 'IT', subdivision: 'Emilia-Romagna', cities: ['forli', 'ravenna', 'cattolica'] },
  { iso2: 'IT', subdivision: 'Veneto', cities: ['venice', 'dorsoduro', 'giudecca', 'castello', 'central-venice',
    ['castello-district-ne-venice', 'Castello'], 'certosa-island', ['giudecca-211-f', 'Giudecca']] },
  { iso2: 'IT', subdivision: 'Friuli-Venezia Giulia', cities: ['trieste'] },
  { iso2: 'IT', subdivision: 'Lombardy', cities: ['sarnico'] },
  { iso2: 'IT', subdivision: 'Piedmont', cities: ['avigliana'] },
  { iso2: 'IT', subdivision: 'Campania', cities: ['naples-italy', 'capri'] },
  { iso2: 'IT', subdivision: 'Sicily', cities: ['messina', 'palermo'] },
  { iso2: 'IT', subdivision: 'Sardinia', cities: [['porto-cervo-sardinia-costa-smeralda', 'Porto Cervo']] },
  // ---- France ----
  { iso2: 'FR', subdivision: "Provence-Alpes-Côte d'Azur", cities: ['marseille', 'toulon', 'cannes', 'nice',
    'antibes', 'la-ciotat', 'la-seyne-sur-mer', 'saint-tropez', 'golfe-juan', 'beaulieu-sur-mer',
    ['marseille-fos', 'Marseille']] },
  { iso2: 'FR', subdivision: null, cities: ['brest', 'saint-nazaire', 'cherbourg-en-cotentin',
    'saint-gilles-croix-de-vie'] },
  // ---- Spain ----
  { iso2: 'ES', subdivision: 'Catalonia', cities: ['barcelona', ['vilanova-i-la-geltru-nr-barcelona', 'Vilanova i la Geltrú'],
    ['near-barcelona-catalonia', 'Barcelona area']] },
  { iso2: 'ES', subdivision: 'Balearic Islands', cities: [['calvia-mallorca', 'Calvià'], 'palma-de-mallorca',
    ['palma-balearic-islands', 'Palma']] },
  { iso2: 'ES', subdivision: 'Andalusia', cities: ['marbella', 'cadiz'] },
  { iso2: 'ES', subdivision: 'Valencian Community', cities: ['valencia', ['near-valencia-valencian-community', 'Valencia area']] },
  { iso2: 'ES', subdivision: 'Galicia', cities: ['ferrol', 'vigo'] },
  { iso2: 'ES', subdivision: 'Cantabria', cities: ['santander'] },
  // ---- Portugal ----
  { iso2: 'PT', subdivision: null, cities: ['lisbon', 'setubal'] },
  // ---- Greece ----
  { iso2: 'GR', subdivision: null, cities: ['athens', 'piraeus', ['perama-piraeus', 'Perama'], ['athens-mikrolimano', 'Mikrolimano'],
    ['skaramangas-athens', 'Skaramangas'], 'elefsina', 'kallithea', 'voula', 'vouliagmeni', 'vari', 'rafina',
    'chalkida', 'galaxidi', 'hydra', 'spetses', 'mykonos', 'rhodes', ['ermoupoli-syros', 'Ermoupoli'],
    ['syros-ermoupolis', 'Ermoupoli'], 'thessaloniki'] },
  // ---- Balkans / Black Sea / Eastern Med ----
  { iso2: 'HR', subdivision: null, cities: ['dubrovnik', 'split', 'rijeka', 'pula', 'sibenik'] },
  { iso2: 'ME', subdivision: null, cities: ['tivat'] },
  { iso2: 'CY', subdivision: null, cities: ['limassol'] },
  { iso2: 'TR', subdivision: null, cities: ['tuzla-istanbul', 'istanbul', ['istanbul-pendik', 'Pendik'], 'bodrum',
    'antalya', ['antalya-free-zone', 'Antalya'], ['gocek-fethiye', 'Göcek'], 'yalova', 'kocaeli', 'bursa'] },
  { iso2: 'EG', subdivision: null, cities: ['suez'] },
  { iso2: 'BG', subdivision: null, cities: ['varna'] },
  { iso2: 'AT', subdivision: null, cities: ['vienna'] },
  // ---- Northern Europe ----
  { iso2: 'GB', subdivision: null, cities: ['poole', 'birkenhead', 'barrow-in-furness', 'crawley', 'kettering'] },
  { iso2: 'NL', subdivision: null, cities: ['amsterdam', 'vlissingen', ['rotterdam-botlek', 'Rotterdam'], 'alblasserdam',
    'harlingen', 'oss', 'urk', 'breda', 'makkum', 'vollenhove', 'zwartsluis', 'kaag', 'aalsmeer', 'gorinchem',
    'den-helder', "s-hertogenbosch", 'bruinisse', 'naarden', 'hellevoetsluis'] },
  { iso2: 'DE', subdivision: null, cities: ['hamburg', 'bremerhaven', 'rendsburg', 'kiel', 'wolgast', 'bremen', 'lemwerder'] },
  { iso2: 'SE', subdivision: null, cities: ['karlskrona'] },
  { iso2: 'FI', subdivision: null, cities: ['turku'] },
  { iso2: 'NO', subdivision: null, cities: ['ulsteinvik'] },
  { iso2: 'RU', subdivision: null, cities: ['kaliningrad', 'kaliningrad-bay', 'kaliningrad-marina', 'vyborg', 'murmansk',
    'severodvinsk', ['portovaya-20a-kaliningrad', 'Kaliningrad'], ['kronstadt-area', 'Kronstadt'], 'nevsky-flot'] },
  // ---- Middle East ----
  { iso2: 'AE', subdivision: null, cities: ['dubai', ['dubai-palm-jumeirah-bluewaters', 'Dubai'], 'ajman',
    ['abu-dhabi-yas-island', 'Abu Dhabi'], 'umm-al-quwain'] },
  { iso2: 'BH', subdivision: null, cities: ['al-hidd'] },
  { iso2: 'OM', subdivision: null, cities: ['duqm'] },
  { iso2: 'SA', subdivision: null, cities: ['ras-al-khair'] },
  { iso2: 'QA', subdivision: null, cities: ['ras-laffan'] },
  // ---- Asia ----
  { iso2: 'JP', subdivision: 'Kinki', cities: ['kobe'] },
  { iso2: 'JP', subdivision: 'Kanto', cities: ['yokohama', 'yokosuka'] },
  { iso2: 'JP', subdivision: 'Shikoku', cities: ['imabari'] },
  { iso2: 'TW', subdivision: null, cities: ['kaohsiung', 'tainan', ['anping-marina-tainan', 'Anping, Tainan'],
    ['near-keelung', 'Keelung'], 'penghu-pier', ['pingtung-kenting', 'Kenting']] },
  { iso2: 'CN', subdivision: null, cities: ['shanghai', ['shanghai-lujiazui', 'Shanghai'], 'beijing', 'dalian',
    'zhoushan', ['qingdao-west-coast', 'Qingdao'], ['sanya-hainan', 'Sanya'], ['shenzhen-dapeng-peninsula', 'Shenzhen'],
    'dianshan-lake'] },
  { iso2: 'HK', subdivision: null, cities: ['sai-kung'] },
  { iso2: 'KR', subdivision: null, cities: ['busan', 'ulsan', 'geoje', 'hwaseong', 'incheon', 'seoul', 'yeosu'] },
  { iso2: 'VN', subdivision: null, cities: ['ho-chi-minh-city', ['ninh-hoa-khanh-hoa', 'Ninh Hoa'], 'quang-ngai'] },
  { iso2: 'TH', subdivision: null, cities: ['phuket', 'phuket-town'] },
  { iso2: 'SG', subdivision: null, cities: ['sentosa-cove', 'tuas'] },
  { iso2: 'ID', subdivision: null, cities: ['batam', ['benoa-bali', 'Benoa'], 'bali', 'lombok', ['labuan-bajo-flores', 'Labuan Bajo'],
    'lembongan-island', 'nusa-penida', 'raja-ampat', 'jakarta'] },
  { iso2: 'IN', subdivision: null, cities: ['chennai', 'mumbai', 'visakhapatnam'] },
  { iso2: 'PH', subdivision: null, cities: [['subic-bay-zambales', 'Subic Bay']] },
  // ---- Oceania ----
  { iso2: 'NZ', subdivision: 'Auckland', cities: ['auckland', ['auckland-wynyard-quarter', 'Wynyard Quarter'],
    ['beachlands-auckland', 'Beachlands']] },
  { iso2: 'NZ', subdivision: 'Northland', cities: ['whangarei'] },
  { iso2: 'NZ', subdivision: 'Bay of Plenty', cities: ['tauranga'] },
  { iso2: 'NZ', subdivision: null, cities: ['gisborne', 'wellington', 'taupo'] },
  { iso2: 'AU', subdivision: 'New South Wales', cities: ['sydney', 'darling-harbour', 'castlecrag', 'clontarf', 'corlette',
    'soldiers-point', 'shellharbour', 'broken-bay', 'ballina', ['old-pacific-highway-brunswick-heads', 'Brunswick Heads']] },
  { iso2: 'AU', subdivision: 'Queensland', cities: ['gold-coast', 'coomera', 'brisbane', 'airlie-beach', 'bowen', 'cairns',
    'hope-island', 'hamilton-island', ['hayman-island-whitsunday-islands', 'Hayman Island'], 'innisfail', 'jacobs-well',
    'mackay-harbour', 'main-beach', 'midge-point', 'noosaville', 'runaway-bay', 'bribie-island', 'urangan', 'shorncliffe',
    ['the-strand-townsville-city', 'Townsville'], ['spinnaker-close-port-douglas', 'Port Douglas'], 'coomera-waters',
    ['murarrie-brisbane-qld', 'Murarrie'], ['rivergate-place-murarrie', 'Murarrie'],
    ['brisbane-river-botanic-gardens-cbd', 'Brisbane']] },
  { iso2: 'AU', subdivision: 'Victoria', cities: ['geelong', 'mornington', 'metung', 'paynesville', 'safety-beach', 'st-kilda',
    ['sand-island-swan-bay-queenscliff', 'Queenscliff'], 'eildon', 'east-gippsland', 'swan-hill', 'steiglitz'] },
  { iso2: 'AU', subdivision: 'South Australia', cities: ['adelaide', 'goolwa', 'goolwa-south', 'hindmarsh-island', 'port-lincoln',
    'murray-bridge', ['jane-eliza-landing-renmark', 'Renmark'], ['boatview-place-cape-jaffa', 'Cape Jaffa'], 'clayton-bay',
    'holdfast-shores', ['patawalonga-frontage-glenelg-north', 'Glenelg North'], ['garden-island-port-adelaide', 'Port Adelaide'],
    'penneshaw', 'robe', 'whyalla', 'wirrina-cove', 'port-vincent', 'solomontown', 'wallaroo', ['osborne-sa', 'Osborne']] },
  { iso2: 'AU', subdivision: 'Western Australia', cities: ['fremantle', 'henderson-wa', 'east-fremantle', 'mindarie', 'dalkeith',
    'esperance', 'exmouth', 'geraldton', 'jurien-bay', 'carnarvon', 'bandy-creek', ['fathom-turn-mandurah', 'Mandurah'],
    'bunbury', 'kalgan'] },
  { iso2: 'AU', subdivision: 'Tasmania', cities: ['hobart', ['sullivans-cove-hobart', 'Hobart'], 'launceston', 'east-devonport'] },
  { iso2: 'AU', subdivision: 'Northern Territory', cities: ['darwin', 'fannie-bay', 'stuart-park', ['melville-bay-nhulunbuy', 'Nhulunbuy']] },
  { iso2: 'FJ', subdivision: null, cities: ['vuda-point', 'suva', 'denarau-island', 'malolo-lailai-island', 'pacific-harbour',
    'yasawa-islands', 'savusavu'] },
  { iso2: 'VU', subdivision: null, cities: ['port-vila', 'efate-island'] },
  { iso2: 'NC', subdivision: null, cities: ['noumea', ['noumea-area', 'Noumea'], 'bouloupari', 'lifou-island', 'isle-of-pines'] },
  { iso2: 'TO', subdivision: null, cities: ['neiafu', "vava-u-island-group"] },
  { iso2: 'WS', subdivision: null, cities: ['apia', 'asau'] },
  { iso2: 'AS', subdivision: null, cities: [['pago-pago-american-samoa', 'Pago Pago']] },
  { iso2: 'CK', subdivision: null, cities: [['avarua-rarotonga', 'Avarua'], 'aitutaki', 'suwarrow-atoll', 'palmerston-island'] },
  { iso2: 'PG', subdivision: null, cities: ['lae', 'madang', 'alotau', 'kavieng', 'port-moresby',
    ['motukea-island-port-moresby', 'Motukea Island'], 'oro-bay'] },
  { iso2: 'SB', subdivision: null, cities: ['honiara', 'noro', 'vella-lavella', 'vella-lavella-island'] },
  { iso2: 'TL', subdivision: null, cities: ['dili', 'baucau', ['lautem', 'Lautém']] },
  // ---- Caribbean / Americas ----
  { iso2: 'BS', subdivision: null, cities: [['nassau-new-providence', 'Nassau'], ['paradise-island-nassau', 'Paradise Island'],
    'freeport', ['west-end-grand-bahama', 'West End'], ['george-town-great-exuma', 'George Town']] },
  { iso2: 'BB', subdivision: null, cities: ['bridgetown'] },
  { iso2: 'CW', subdivision: null, cities: ['willemstad'] },
  { iso2: 'BQ', subdivision: null, cities: [['kralendijk-area', 'Kralendijk']] },
  { iso2: 'VI', subdivision: null, cities: [['charlotte-amalie-st-thomas', 'Charlotte Amalie'], ['st-thomas-vessup-bay', 'Vessup Bay']] },
  { iso2: 'VG', subdivision: null, cities: ['tortola'] },
  { iso2: 'TC', subdivision: null, cities: ['providenciales'] },
  { iso2: 'LC', subdivision: null, cities: [['rodney-bay-castries', 'Rodney Bay']] },
  { iso2: 'SX', subdivision: null, cities: ['simpson-bay'] },
  { iso2: 'BL', subdivision: null, cities: ['gustavia'] },
  { iso2: 'CL', subdivision: null, cities: ['talcahuano'] },
  { iso2: 'BR', subdivision: null, cities: ['itajai', 'itaguai', ['aracruz-es', 'Aracruz'], ['maragojipe-ba', 'Maragojipe']] },
  // ---- Africa ----
  { iso2: 'ZA', subdivision: null, cities: ['cape-town', 'durban'] },
  { iso2: 'NA', subdivision: null, cities: ['walvis-bay'] },
];

// --- derived lookups -----------------------------------------------------------

function countryNodeId(iso2) {
  return `region:${slug(COUNTRIES[iso2].name)}`;
}

function subdivisionNodeId(iso2, name) {
  for (const [s, [iso, display]] of Object.entries(SUBDIVISION_LEVEL_REGIONS)) {
    if (iso === iso2 && display === name) return `region:${s}`;
  }
  return `region:${iso2.toLowerCase()}-${slug(name)}`;
}

const COUNTRY_IDS = new Map(Object.keys(COUNTRIES).map((iso2) => [countryNodeId(iso2), iso2]));

const EXPLICIT = new Map();
for (const g of GROUPS) {
  if (!COUNTRIES[g.iso2]) throw new Error(`regionHierarchy: unknown iso2 ${g.iso2}`);
  for (const entry of g.cities) {
    const [s, city] = Array.isArray(entry) ? entry : [entry, null];
    if (EXPLICIT.has(s)) throw new Error(`regionHierarchy: duplicate GROUPS entry ${s}`);
    EXPLICIT.set(s, { iso2: g.iso2, subdivision: g.subdivision, city });
  }
}

// Every subdivision node id this module can mint or recognise, so a second
// run classifies its own minted nodes the same way as the first.
const SUBDIVISION_IDS = new Map();
function registerSubdivision(iso2, name) {
  SUBDIVISION_IDS.set(subdivisionNodeId(iso2, name), { iso2, name });
}
for (const [iso2, name] of Object.values(SUBDIVISION_LEVEL_REGIONS)) registerSubdivision(iso2, name);
for (const g of GROUPS) if (g.subdivision) registerSubdivision(g.iso2, g.subdivision);
for (const name of Object.values(US_STATES)) registerSubdivision('US', name);
for (const name of Object.values(CA_PROVINCES)) registerSubdivision('CA', name);
for (const [iso2, name] of Object.values(QUALIFIERS)) if (name) registerSubdivision(iso2, name);

// --- classification --------------------------------------------------------------

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json) || {};
  } catch {
    return {};
  }
}

function foldKey(s) {
  return stripDiacritics(String(s)).toLowerCase().replace(/\s+/g, ' ').trim();
}

function cleanCity(part) {
  return part.replace(/^near\s+/i, '').trim();
}

/**
 * Parses an explicit ", <suffix>" out of a region NAME. Returns
 * { iso2, subdivision, city } or null. Compound names ("A / B", "A & B",
 * "A + B") are never parsed — they name several places.
 */
function classifyBySuffix(name) {
  const cleaned = String(name)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (/[\/&+;]|\s(and|or)\s/i.test(cleaned)) return null;
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parseSuffixParts(parts);
}

function parseSuffixParts(parts) {
  const city = cleanCity(parts[0]);
  const last = parts[parts.length - 1];

  if (/^[A-Za-z]{2}$/.test(last)) {
    const code = last.toUpperCase();
    if (AMBIGUOUS_STATE_CODES.has(code)) return null;
    if (US_STATES[code]) return { iso2: 'US', subdivision: US_STATES[code], city };
    if (CA_PROVINCES[code]) return { iso2: 'CA', subdivision: CA_PROVINCES[code], city };
  }
  const country = lookupCountry(last);
  if (country) {
    // WG27-M2: "Fort Lauderdale, FL, USA" - parse what precedes the country token and
    // keep it only if it agrees with that country; a conflict is never guessed.
    if (parts.length >= 3) {
      const inner = parseSuffixParts(parts.slice(0, -1));
      if (inner) return inner.iso2 === country.iso2 ? inner : null;
    }
    return { iso2: country.iso2, subdivision: null, city };
  }

  let pinned = null;
  for (const part of parts.slice(1)) {
    const hit = QUALIFIERS[foldKey(part)];
    if (!hit) continue;
    if (hit[1]) return { iso2: hit[0], subdivision: hit[1], city };
    pinned = pinned || { iso2: hit[0], subdivision: null, city };
  }
  return pinned;
}

function deriveCity(name) {
  return cleanCity(
    String(name)
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+-\s+.*$/, '')
      .split(',')[0]
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Pure classification of one region node. Returns
 *   { level: 'country', iso2 } | { level: 'subdivision', iso2, subdivision }
 *   | { level: 'city', iso2, subdivision|null, city } | { level: 'unresolved' }
 */
export function classifyRegion({ id, name, attrs }) {
  const s = id.replace(/^region:/, '');
  if (attrs && attrs.artifact === true) return { level: 'unresolved' };
  if (Object.prototype.hasOwnProperty.call(UNRESOLVED_REGIONS, s)) return { level: 'unresolved' };

  if (COUNTRY_IDS.has(id)) return { level: 'country', iso2: COUNTRY_IDS.get(id) };
  if (SUBDIVISION_IDS.has(id)) {
    const sub = SUBDIVISION_IDS.get(id);
    return { level: 'subdivision', iso2: sub.iso2, subdivision: sub.name };
  }

  const explicit = EXPLICIT.get(s);
  if (explicit) {
    return { level: 'city', iso2: explicit.iso2, subdivision: explicit.subdivision, city: explicit.city || deriveCity(name) };
  }

  // Prior corpus decision: the Florida roll-up table in regions.js.
  if (isFloridaCity(name)) return { level: 'city', iso2: 'US', subdivision: 'Florida', city: deriveCity(name) };

  const bySuffix = classifyBySuffix(name);
  if (bySuffix) return { level: 'city', ...bySuffix };
  return { level: 'unresolved' };
}

// --- db helpers -------------------------------------------------------------------

function getNode(db, id) {
  return db.prepare('SELECT id, type, name, attrs_json FROM nodes WHERE id = ?').get(id);
}

/** Merges `patch` into a node's attrs; writes only when something changed. */
function patchAttrs(db, row, patch) {
  const attrs = parseAttrsJson(row.attrs_json);
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      if (k in attrs) { delete attrs[k]; changed = true; }
    } else if (JSON.stringify(attrs[k]) !== JSON.stringify(v)) {
      attrs[k] = v;
      changed = true;
    }
  }
  if (changed) {
    db.prepare('UPDATE nodes SET attrs_json = ? WHERE id = ?').run(JSON.stringify(attrs), row.id);
  }
  return changed;
}

function ensureRegion(db, id, name) {
  let row = getNode(db, id);
  if (!row) {
    upsertNode(db, { id, type: 'region', name, attrs: {} });
    row = getNode(db, id);
    return { row, minted: true };
  }
  return { row, minted: false };
}

function setSingleParent(db, src, parentId) {
  db.prepare("DELETE FROM edges WHERE src = ? AND rel = 'part_of' AND dst != ?").run(src, parentId);
  upsertEdge(db, { src, rel: 'part_of', dst: parentId });
}

const SPECIFICITY = { city: 3, subdivision: 2, country: 1 };

// --- the hook ----------------------------------------------------------------------

/**
 * Builds the country > subdivision > city part_of tree over region nodes and
 * stamps attrs.geo on every node located_in / based_in a resolved region (or,
 * failing that, carrying a recognizable attrs.country). Idempotent.
 *
 * Returns stats for logging/tests:
 *   { levels, countriesMinted, subdivisionsMinted, geoStamped,
 *     countriesNormalized, disagreements: [{ id, region_country, attr_country }] }
 */
/**
 * WG27-M5: a region NODE whose name is itself a country spelling ("UK", "USA",
 * "Holland", "Italia") but whose id is not the canonical country node is merged
 * onto that canonical node (edges re-pointed, node deleted) so two nodes never
 * share one iso2. Table-listed and artifact regions are left alone.
 */
function mergeCountryNamedRegions(db) {
  let merged = 0;
  const rows = db.prepare("SELECT id, name, attrs_json FROM nodes WHERE type = 'region' ORDER BY id").all();
  for (const r of rows) {
    const s = r.id.replace(/^region:/, '');
    if (COUNTRY_IDS.has(r.id) || SUBDIVISION_IDS.has(r.id) || EXPLICIT.has(s)) continue;
    if (Object.prototype.hasOwnProperty.call(UNRESOLVED_REGIONS, s)) continue;
    if (parseAttrsJson(r.attrs_json).artifact === true) continue;
    const hit = lookupCountry(r.name);
    if (!hit) continue;
    const target = countryNodeId(hit.iso2);
    if (target === r.id) continue;
    ensureRegion(db, target, hit.name);
    for (const e of db.prepare('SELECT rel, dst, attrs_json FROM edges WHERE src = ?').all(r.id)) {
      if (e.dst !== target) upsertEdge(db, { src: target, rel: e.rel, dst: e.dst, attrs: e.attrs_json ? JSON.parse(e.attrs_json) : null });
    }
    for (const e of db.prepare('SELECT src, rel, attrs_json FROM edges WHERE dst = ?').all(r.id)) {
      if (e.src !== target) upsertEdge(db, { src: e.src, rel: e.rel, dst: target, attrs: e.attrs_json ? JSON.parse(e.attrs_json) : null });
    }
    db.prepare('DELETE FROM edges WHERE src = ? OR dst = ?').run(r.id, r.id);
    db.prepare('DELETE FROM nodes WHERE id = ?').run(r.id);
    merged += 1;
  }
  return merged;
}

export function applyRegionHierarchy(db) {
  const countryNamedMerged = mergeCountryNamedRegions(db);
  const regionRows = db.prepare("SELECT id, name, attrs_json FROM nodes WHERE type = 'region' ORDER BY id").all();

  const cls = new Map();
  for (const r of regionRows) cls.set(r.id, classifyRegion({ id: r.id, name: r.name, attrs: parseAttrsJson(r.attrs_json) }));

  let countriesMinted = 0;
  let subdivisionsMinted = 0;

  // 1. Country nodes (every iso2 any resolved region, subdivision or node-level country refers to).
  const countryIsos = new Set();
  for (const c of cls.values()) if (c.iso2) countryIsos.add(c.iso2);
  const nodeCountries = new Map(); // node id -> { iso2 } from a normalizable attrs.country
  const countryNodeRows = db
    .prepare("SELECT id, type, attrs_json FROM nodes WHERE type != 'region' AND attrs_json LIKE '%\"country\"%'")
    .all();
  const countriesNormalized = [];
  for (const row of countryNodeRows) {
    const attrs = parseAttrsJson(row.attrs_json);
    if (typeof attrs.country !== 'string') continue;
    const hit = normalizeCountry(attrs.country);
    if (!hit) continue;
    nodeCountries.set(row.id, hit);
    countryIsos.add(hit.iso2);
    if (attrs.country !== hit.name) {
      const patch = { country: hit.name };
      if (attrs.country_raw === undefined || attrs.country_raw === null) patch.country_raw = attrs.country;
      patchAttrs(db, row, patch);
      countriesNormalized.push(row.id);
    }
  }

  const countryRows = new Map();
  for (const iso2 of [...countryIsos].sort()) {
    const id = countryNodeId(iso2);
    const { row, minted } = ensureRegion(db, id, COUNTRIES[iso2].name);
    if (minted) countriesMinted += 1;
    patchAttrs(db, row, { level: 'country', iso2, macro_region: COUNTRIES[iso2].macro_region });
    db.prepare("DELETE FROM edges WHERE src = ? AND rel = 'part_of'").run(id);
    countryRows.set(iso2, id);
    cls.set(id, { level: 'country', iso2 });
  }

  // 2. Subdivision nodes (referenced by a city, or an existing subdivision-level region).
  const subKeys = new Map(); // `${iso2}:${name}` -> id
  const wantSub = (iso2, name) => subKeys.set(`${iso2}:${name}`, subdivisionNodeId(iso2, name));
  for (const c of cls.values()) {
    if (c.level === 'subdivision') wantSub(c.iso2, c.subdivision);
    if (c.level === 'city' && c.subdivision) wantSub(c.iso2, c.subdivision);
  }
  for (const [key, id] of subKeys) {
    const [iso2, ...rest] = key.split(':');
    const name = rest.join(':');
    const { row, minted } = ensureRegion(db, id, name);
    if (minted) subdivisionsMinted += 1;
    patchAttrs(db, row, { level: 'subdivision', iso2 });
    setSingleParent(db, id, countryNodeId(iso2));
    cls.set(id, { level: 'subdivision', iso2, subdivision: name });
  }

  // 3. City levels + part_of; level attr on every region.
  const regionGeo = new Map(); // region id -> { level, geo }
  const levels = { country: 0, subdivision: 0, city: 0, unresolved: 0 };
  const allRegions = db.prepare("SELECT id, name, attrs_json FROM nodes WHERE type = 'region' ORDER BY id").all();
  for (const r of allRegions) {
    const c = cls.get(r.id) || { level: 'unresolved' };
    levels[c.level] += 1;
    if (c.level === 'unresolved') {
      patchAttrs(db, r, { level: 'unresolved' });
      continue;
    }
    const country = COUNTRIES[c.iso2];
    const base = { country_code: c.iso2, country: country.name };
    if (c.level === 'country') {
      regionGeo.set(r.id, { level: 'country', geo: { ...base, subdivision: null, city: null } });
      continue;
    }
    if (c.level === 'subdivision') {
      patchAttrs(db, r, { level: 'subdivision', iso2: c.iso2 });
      setSingleParent(db, r.id, countryNodeId(c.iso2));
      regionGeo.set(r.id, { level: 'subdivision', geo: { ...base, subdivision: c.subdivision, city: null } });
      continue;
    }
    patchAttrs(db, r, { level: 'city' });
    setSingleParent(db, r.id, c.subdivision ? subdivisionNodeId(c.iso2, c.subdivision) : countryNodeId(c.iso2));
    regionGeo.set(r.id, { level: 'city', geo: { ...base, subdivision: c.subdivision || null, city: c.city } });
  }

  // 4. Node-level geo.
  const edgeRows = db
    .prepare(
      "SELECT e.src, e.rel, e.dst FROM edges e JOIN nodes n ON n.id = e.src " +
        "WHERE e.rel IN ('located_in','based_in') AND n.type != 'region' ORDER BY e.src, e.rel, e.dst"
    )
    .all();
  const best = new Map(); // node id -> { rank, geo }
  const countriesSeen = new Map(); // node id -> Set of country codes across its location edges
  for (const e of edgeRows) {
    const rg = regionGeo.get(e.dst);
    if (!rg) continue;
    if (!countriesSeen.has(e.src)) countriesSeen.set(e.src, new Set());
    countriesSeen.get(e.src).add(rg.geo.country_code);
    const rank = SPECIFICITY[rg.level] * 10 + (e.rel === 'located_in' ? 1 : 0);
    const cur = best.get(e.src);
    if (!cur || rank > cur.rank) best.set(e.src, { rank, geo: rg.geo });
  }

  const disagreements = [];
  let geoStamped = 0;
  let geoConflicts = 0;
  const nodeRows = db.prepare("SELECT id, type, name, attrs_json FROM nodes WHERE type != 'region' ORDER BY id").all();
  for (const row of nodeRows) {
    const fromRegion = best.get(row.id);
    const fromCountry = nodeCountries.get(row.id);
    let geo;
    let basis;
    if (fromRegion) {
      geo = fromRegion.geo;
      if (fromCountry && fromCountry.iso2 !== geo.country_code) {
        disagreements.push({ id: row.id, region_country: geo.country_code, attr_country: fromCountry.iso2 });
      }
    } else if (fromCountry) {
      geo = { country_code: fromCountry.iso2, country: fromCountry.name, subdivision: null, city: null };
      basis = 'country_attr';
    }
    const attrs = parseAttrsJson(row.attrs_json);
    if (!geo && attrs.geo === undefined && attrs.geo_basis === undefined && attrs.geo_conflict === undefined) continue;
    // WG27-M4: location edges in DIFFERENT countries keep the deterministic pick but are flagged.
    const conflict = !!fromRegion && countriesSeen.get(row.id).size > 1;
    if (conflict) geoConflicts += 1;
    patchAttrs(db, row, { geo: geo || undefined, geo_basis: basis, geo_conflict: conflict ? true : undefined });
    if (geo) geoStamped += 1;
  }

  // 5. Mint-time sanity: no country has an out-edge (enforced above) and
  //    every part_of has a region parent.
  return { levels, countriesMinted, subdivisionsMinted, geoStamped, geoConflicts, countryNamedMerged, countriesNormalized: countriesNormalized.length, disagreements };
}
