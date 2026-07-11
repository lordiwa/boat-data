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
