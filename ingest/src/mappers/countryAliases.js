// ingest/src/mappers/countryAliases.js
//
// TASK-027: canonical country registry + raw-spelling resolver used by the
// region-hierarchy hook (regionHierarchy.js). The corpus spells the same
// country many ways ("USA" / "United States" / "UK" / "UAE") and sometimes
// packs several into one cell ("USA / Netherlands", "Monaco (built at
// Ferretti/Ancona)", "originally USA (San Diego), now Vietnam (...)").
//
// Design: COUNTRIES and COUNTRY_ALIASES are plain data tables (add a row, no
// logic change). normalizeCountry() NEVER guesses: an unrecognized string
// returns null and the caller keeps the raw text untouched.
//
// Compound rule (AC5, documented decision): when a cell names more than one
// country, the FIRST NAMED recognized country wins, after parenthetical
// notes are dropped and leading qualifiers ("originally", "now", ...) are
// stripped. So "USA / Netherlands" -> United States, "Norway / UK" ->
// Norway, and "originally USA (San Diego), now Vietnam (...)" -> United
// States (first named, even though the CURRENT country is Vietnam — the raw
// text is preserved in attrs.country_raw so nothing is lost).

import { stripDiacritics } from './normalize.js';

// iso2 -> { name (canonical English), macro_region }.
// Macro regions: North America, Caribbean, Mediterranean, Northern Europe,
// Middle East, Asia-Pacific, South America, Other.
export const COUNTRIES = {
  // North America
  US: { name: 'United States', macro_region: 'North America' },
  CA: { name: 'Canada', macro_region: 'North America' },
  MX: { name: 'Mexico', macro_region: 'North America' },
  // Mediterranean
  IT: { name: 'Italy', macro_region: 'Mediterranean' },
  FR: { name: 'France', macro_region: 'Mediterranean' },
  ES: { name: 'Spain', macro_region: 'Mediterranean' },
  MC: { name: 'Monaco', macro_region: 'Mediterranean' },
  GR: { name: 'Greece', macro_region: 'Mediterranean' },
  HR: { name: 'Croatia', macro_region: 'Mediterranean' },
  MT: { name: 'Malta', macro_region: 'Mediterranean' },
  TR: { name: 'Turkey', macro_region: 'Mediterranean' },
  EG: { name: 'Egypt', macro_region: 'Mediterranean' },
  CY: { name: 'Cyprus', macro_region: 'Mediterranean' },
  ME: { name: 'Montenegro', macro_region: 'Mediterranean' },
  GI: { name: 'Gibraltar', macro_region: 'Mediterranean' },
  // Northern Europe
  GB: { name: 'United Kingdom', macro_region: 'Northern Europe' },
  IE: { name: 'Ireland', macro_region: 'Northern Europe' },
  NL: { name: 'Netherlands', macro_region: 'Northern Europe' },
  BE: { name: 'Belgium', macro_region: 'Northern Europe' },
  DE: { name: 'Germany', macro_region: 'Northern Europe' },
  DK: { name: 'Denmark', macro_region: 'Northern Europe' },
  NO: { name: 'Norway', macro_region: 'Northern Europe' },
  SE: { name: 'Sweden', macro_region: 'Northern Europe' },
  FI: { name: 'Finland', macro_region: 'Northern Europe' },
  PL: { name: 'Poland', macro_region: 'Northern Europe' },
  // Middle East
  AE: { name: 'United Arab Emirates', macro_region: 'Middle East' },
  BH: { name: 'Bahrain', macro_region: 'Middle East' },
  OM: { name: 'Oman', macro_region: 'Middle East' },
  SA: { name: 'Saudi Arabia', macro_region: 'Middle East' },
  QA: { name: 'Qatar', macro_region: 'Middle East' },
  // Asia-Pacific
  JP: { name: 'Japan', macro_region: 'Asia-Pacific' },
  CN: { name: 'China', macro_region: 'Asia-Pacific' },
  HK: { name: 'Hong Kong', macro_region: 'Asia-Pacific' },
  TW: { name: 'Taiwan', macro_region: 'Asia-Pacific' },
  KR: { name: 'South Korea', macro_region: 'Asia-Pacific' },
  SG: { name: 'Singapore', macro_region: 'Asia-Pacific' },
  TH: { name: 'Thailand', macro_region: 'Asia-Pacific' },
  VN: { name: 'Vietnam', macro_region: 'Asia-Pacific' },
  ID: { name: 'Indonesia', macro_region: 'Asia-Pacific' },
  PH: { name: 'Philippines', macro_region: 'Asia-Pacific' },
  IN: { name: 'India', macro_region: 'Asia-Pacific' },
  MV: { name: 'Maldives', macro_region: 'Asia-Pacific' },
  AU: { name: 'Australia', macro_region: 'Asia-Pacific' },
  NZ: { name: 'New Zealand', macro_region: 'Asia-Pacific' },
  FJ: { name: 'Fiji', macro_region: 'Asia-Pacific' },
  PG: { name: 'Papua New Guinea', macro_region: 'Asia-Pacific' },
  VU: { name: 'Vanuatu', macro_region: 'Asia-Pacific' },
  SB: { name: 'Solomon Islands', macro_region: 'Asia-Pacific' },
  TO: { name: 'Tonga', macro_region: 'Asia-Pacific' },
  WS: { name: 'Samoa', macro_region: 'Asia-Pacific' },
  AS: { name: 'American Samoa', macro_region: 'Asia-Pacific' },
  CK: { name: 'Cook Islands', macro_region: 'Asia-Pacific' },
  NC: { name: 'New Caledonia', macro_region: 'Asia-Pacific' },
  TL: { name: 'Timor-Leste', macro_region: 'Asia-Pacific' },
  // South America
  AR: { name: 'Argentina', macro_region: 'South America' },
  BR: { name: 'Brazil', macro_region: 'South America' },
  CL: { name: 'Chile', macro_region: 'South America' },
  EC: { name: 'Ecuador', macro_region: 'South America' },
  PE: { name: 'Peru', macro_region: 'South America' },
  UY: { name: 'Uruguay', macro_region: 'South America' },
  CO: { name: 'Colombia', macro_region: 'South America' },
  // Caribbean
  BS: { name: 'Bahamas', macro_region: 'Caribbean' },
  BB: { name: 'Barbados', macro_region: 'Caribbean' },
  GD: { name: 'Grenada', macro_region: 'Caribbean' },
  AW: { name: 'Aruba', macro_region: 'Caribbean' },
  CW: { name: 'Curaçao', macro_region: 'Caribbean' },
  BQ: { name: 'Bonaire', macro_region: 'Caribbean' },
  SX: { name: 'Sint Maarten', macro_region: 'Caribbean' },
  BL: { name: 'Saint Barthélemy', macro_region: 'Caribbean' },
  LC: { name: 'Saint Lucia', macro_region: 'Caribbean' },
  VG: { name: 'British Virgin Islands', macro_region: 'Caribbean' },
  VI: { name: 'U.S. Virgin Islands', macro_region: 'Caribbean' },
  TC: { name: 'Turks and Caicos Islands', macro_region: 'Caribbean' },
  PA: { name: 'Panama', macro_region: 'Caribbean' },
  // Other
  PT: { name: 'Portugal', macro_region: 'Other' },
  AT: { name: 'Austria', macro_region: 'Other' },
  CH: { name: 'Switzerland', macro_region: 'Other' },
  BG: { name: 'Bulgaria', macro_region: 'Other' },
  RU: { name: 'Russia', macro_region: 'Other' },
  ZA: { name: 'South Africa', macro_region: 'Other' },
  NA: { name: 'Namibia', macro_region: 'Other' },
};

// Raw spelling -> iso2, for every spelling that is NOT just the canonical
// name (canonical names are indexed automatically). Keys are matched after
// countryKey() folding, so case/diacritics/dots are irrelevant here.
export const COUNTRY_ALIASES = {
  usa: 'US',
  'u.s.': 'US',
  us: 'US',
  'u.s.a.': 'US',
  'united states of america': 'US',
  america: 'US',
  uk: 'GB',
  'u.k.': 'GB',
  'great britain': 'GB',
  britain: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  uae: 'AE',
  'u.a.e.': 'AE',
  holland: 'NL',
  'the netherlands': 'NL',
  turkiye: 'TR',
  korea: 'KR',
  'republic of korea': 'KR',
  prc: 'CN',
  "people's republic of china": 'CN',
  'viet nam': 'VN',
  curacao: 'CW',
  'the bahamas': 'BS',
  'st lucia': 'LC',
  'st barthelemy': 'BL',
  'st barts': 'BL',
  'st maarten': 'SX',
  'bvi': 'VG',
  'usvi': 'VI',
  'east timor': 'TL',
  'russian federation': 'RU',
  'kingdom of saudi arabia': 'SA',
};

function countryKey(str) {
  return stripDiacritics(String(str))
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOOKUP = new Map();
for (const [iso2, { name }] of Object.entries(COUNTRIES)) LOOKUP.set(countryKey(name), iso2);
for (const [alias, iso2] of Object.entries(COUNTRY_ALIASES)) LOOKUP.set(countryKey(alias), iso2);

// "originally USA", "now Vietnam", "founded in Italy" -> the bare country.
const LEADING_QUALIFIER_RE = /^(originally|formerly|founded in|based in|built in|now|ex|hq)\s+/;

function fromKey(key) {
  const k = key.replace(LEADING_QUALIFIER_RE, '');
  const iso2 = LOOKUP.get(k);
  return iso2 ? { iso2, name: COUNTRIES[iso2].name } : null;
}

/**
 * Strict lookup: `raw` must be exactly one country spelling (no compounds,
 * no parentheticals). Used for "City, Country" region-name suffixes where a
 * looser parse could mis-read a place qualifier as a country.
 */
export function lookupCountry(raw) {
  if (raw === null || raw === undefined) return null;
  const k = countryKey(raw);
  if (!k) return null;
  const iso2 = LOOKUP.get(k);
  return iso2 ? { iso2, name: COUNTRIES[iso2].name } : null;
}

/**
 * Resolves a raw country cell to { iso2, name }, or null if no country is
 * recognized (never guesses). Compound cells resolve to the first named
 * recognized country — see the module header for the documented rule.
 */
export function normalizeCountry(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const whole = fromKey(countryKey(text));
  if (whole) return whole;

  const withoutNotes = text.replace(/\([^)]*\)/g, ' ');
  for (const segment of withoutNotes.split(/[\/,;&+]|\band\b/i)) {
    const hit = fromKey(countryKey(segment));
    if (hit) return hit;
  }
  return null;
}
