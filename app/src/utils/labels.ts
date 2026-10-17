// app/src/utils/labels.ts
//
// Human-friendly plural labels for each node type, used on the home page's
// stat-card grid. Falls back to a capitalized + "s" guess for any type not
// listed here, so new node types added upstream don't break rendering.

const TYPE_LABELS: Record<string, string> = {
  yacht: 'Yachts',
  marina: 'Marinas',
  region: 'Regions',
  company: 'Companies',
  club: 'Yacht Clubs',
  builder: 'Builders',
  person: 'People',
  engine: 'Engines',
  designer: 'Designers',
  shipyard: 'Shipyards',
  engine_model: 'Engine Models',
  part: 'Parts',
  size_class: 'Size Classes',
};

// TASK-011 fast-follow: naive `s$` stripping of the plural label mangles
// irregular plurals ("People" -> "Peopl", "Companies" -> "Companie"). An
// explicit singular map for the 9 known types sidesteps that entirely.
const TYPE_SINGULAR_LABELS: Record<string, string> = {
  yacht: 'Yacht',
  marina: 'Marina',
  region: 'Region',
  company: 'Company',
  club: 'Yacht Club',
  builder: 'Builder',
  person: 'Person',
  engine: 'Engine',
  designer: 'Designer',
  shipyard: 'Shipyard',
  engine_model: 'Engine Model',
  part: 'Part',
  size_class: 'Size Class',
};

const TYPE_ICONS: Record<string, string> = {
  yacht: '⛵', // sailboat
  marina: '⚓', // anchor
  region: '\u{1F5FA}\u{FE0F}', // map
  company: '\u{1F3E2}', // office building
  club: '\u{1F3C6}', // trophy
  builder: '\u{1F528}', // hammer
  person: '\u{1F464}', // person
  engine: '⚙️', // gear
  designer: '✏️', // pencil
  shipyard: '\u{1F6E0}\u{FE0F}', // hammer and wrench
  engine_model: '\u{1F6E9}\u{FE0F}', // engine/motor
  part: '\u{1F529}', // nut and bolt
  size_class: '\u{1F4CF}', // ruler
};

export function labelForType(type: string): string {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
  return `${capitalized}s`;
}

/** Singular form of labelForType, e.g. 'company' -> 'Company', 'person' -> 'Person'. */
export function singularLabelForType(type: string): string {
  if (TYPE_SINGULAR_LABELS[type]) return TYPE_SINGULAR_LABELS[type];
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function iconForType(type: string): string {
  return TYPE_ICONS[type] || '\u{1F4C4}';
}

// TASK-030: human-readable English labels for facet keys (meta.facets[type]
// keys, plus the geography levels). Unknown keys fall back to a humanised key.
const FACET_KEY_LABELS: Record<string, string> = {
  loa_band: 'Length (m)',
  decade: 'Decade',
  propulsion_type: 'Type',
  size_class: 'Size class',
  facility_category: 'Facility type',
  berths_band: 'Berths',
  max_loa_band: 'Max LOA (m)',
  services: 'Services',
  storage_type: 'Storage',
  data_level: 'Data level',
  complete: 'Complete profile',
  charter_available: 'Charter',
  has_known_owner: 'Known owner',
  guests_band: 'Guests',
  builder_country: 'Builder country',
  flag: 'Flag',
  segment: 'Segment',
  founded_era: 'Founded',
  founded_decade: 'Founded',
  yacht_count_band: 'Yachts in graph',
  yachts_owned_band: 'Yachts owned',
  power_band: 'Power (hp)',
  engine_type: 'Engine type',
  max_tonnage_band: 'Max tonnage (t)',
  facility_type: 'Facility type',
  lift_type: 'Lift type',
  service_area: 'Service area',
  applies_to: 'Applies to',
  country: 'Country',
  subdivision: 'State / region',
  city: 'City',
};

export function labelForFacetKey(key: string): string {
  if (FACET_KEY_LABELS[key]) return FACET_KEY_LABELS[key];
  const words = key.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Display text for a facet value: first letter upper-cased ('dry stack' -> 'Dry stack'); booleans Yes/No. */
export function labelForFacetValue(_key: string, value: string): string {
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
