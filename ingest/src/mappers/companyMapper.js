// ingest/src/mappers/companyMapper.js
//
// TASK-004: maps parsed broker/charter/management/platform directory
// tables into Company nodes (id 'company:<slug(name)>') + BASED_IN edges
// to a canonical Region node (see regions.js), when an address is
// available. Three real header shapes are grounded in the corpus:
//   - file 41 (Monaco Charter Guide) broker directory:
//     Company Name | Address (if available) | Phone/Email/Website (if
//     available) | Brief Description/Notes
//     -> normalizedHeaders: company_name, address_if_available,
//        phone_email_website_if_available, brief_description_notes.
//     Many cells literally read "Not available" — NOT one of the strings
//     isEmptyValue() (normalize.js) already treats as empty, so this
//     module adds its own isEmptyOrNA() check rather than editing that
//     shared, already-tested helper.
//   - file 21 (Online Brokerage Competitors) platform comparison table:
//     Platform | Description | Key Features | Focus Areas
//     -> normalizedHeaders: platform, description, key_features,
//        focus_areas.
//   - file 21, two further "site directory" tables with NO name column at
//     all — the website IS the identifier:
//     Website | Description | Global Reach
//     -> normalizedHeaders: website, description, global_reach.

import { upsertNode, upsertEdge } from '../db.js';
import {
  isEmptyValue,
  slug,
  normalizeName,
  appendProvenance,
  mergeFirstNonEmptyWins,
  isPlausibleEntityName,
} from './normalize.js';
import { upsertRegion } from './regions.js';

const NAME_KEYS = ['name', 'company_name', 'platform'];
const IDENTIFIER_FALLBACK_KEY = 'website';
const ADDRESS_KEYS = ['address', 'address_if_available'];
const CONTACT_KEYS = ['phone_email_website_if_available'];
const WEBSITE_KEYS = ['website'];
const DESCRIPTION_KEYS = ['brief_description_notes', 'description'];
const LOCATIONS_KEYS = ['global_reach', 'focus_areas'];

const SECONDARY_ANY_OF = [
  ...ADDRESS_KEYS,
  ...CONTACT_KEYS,
  ...DESCRIPTION_KEYS,
  ...LOCATIONS_KEYS,
  'key_features',
];

const MERGE_FIELDS = ['kind', 'address', 'phone', 'website', 'locations', 'notes'];

// "Not available" recurs throughout file 41's broker directory but is NOT
// one of the strings isEmptyValue() (normalize.js) treats as empty — that
// shared helper is used elsewhere with tested behavior we must not change,
// so this is a small, local addition instead.
function isEmptyOrNA(raw) {
  if (isEmptyValue(raw)) return true;
  return /^not available$/i.test(String(raw).trim());
}

function pickFirstPresent(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && !isEmptyOrNA(row[key])) return row[key];
  }
  return undefined;
}

function isCompanyTable(table) {
  const present = new Set(table.normalizedHeaders);
  const hasIdentifier = NAME_KEYS.some((key) => present.has(key)) || present.has(IDENTIFIER_FALLBACK_KEY);
  if (!hasIdentifier) return false;
  return SECONDARY_ANY_OF.some((key) => present.has(key));
}

// Review fix (MEDIUM 2): "fraseryachts.com (duplicate)" (real fixture:
// file 21) is the SAME entity re-listed under a later category heading —
// strip the annotation so it resolves to the same company id and merges
// (first-non-empty-wins) rather than minting a second, near-empty node.
const DUPLICATE_SUFFIX_RE = /\s*\(duplicate[^)]*\)\s*$/i;

function stripDuplicateSuffix(name) {
  return String(name).replace(DUPLICATE_SUFFIX_RE, '').trim();
}

// Review fix (MEDIUM 2): file 21 sometimes abuses the "Website" column for
// a full prose sentence instead of an identifier (real fixture: "No
// significant non-.com charters found in Europe-specific search, but
// cross-referenced from brokers: breezeyachtingswiss.swiss (includes
// charters)."). isPlausibleEntityName() (normalize.js) rejects anything
// implausibly long or sentence-shaped rather than mint a junk node from it.

function parseAttrsJson(json) {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

const PHONE_RE = /\+?\d[\d\s().-]{5,}\d/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

function extractPhone(raw) {
  if (isEmptyOrNA(raw)) return null;
  const m = String(raw).match(PHONE_RE);
  return m ? m[0].trim() : null;
}

function extractEmail(raw) {
  if (isEmptyOrNA(raw)) return null;
  const m = String(raw).match(EMAIL_RE);
  return m ? m[0].trim() : null;
}

// Best-effort kind classification (broker | charter | management |
// platform) from table context: a dedicated "platform"/"website" identifier
// column means this is a listing site, not a brokerage firm; otherwise
// scan the description text for the strongest signal, in priority order
// (a firm offering "management" services is more specifically described
// than a generic "charters" mention).
function classifyKind(row, hasPlatformColumn) {
  const text = String(pickFirstPresent(row, DESCRIPTION_KEYS) ?? '').toLowerCase();
  if (text.includes('management')) return 'management';
  if (text.includes('broker')) return 'broker';
  if (text.includes('charter')) return 'charter';
  if (hasPlatformColumn) return 'platform';
  return null;
}

// Derives a BASED_IN region from a street-address-style string by taking
// the text after the last comma (e.g. "7 rue du Gabian, Monaco" ->
// "Monaco"). Returns null when there's no comma to split on (nothing
// confidently region-shaped to extract).
function lastCommaSegment(address) {
  if (isEmptyOrNA(address)) return null;
  const parts = String(address).split(',');
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].trim();
  return isEmptyOrNA(last) ? null : last;
}

/**
 * Maps every company-shaped table found in `tables` into Company nodes +
 * BASED_IN edges (when an address is parseable) to a canonical Region node
 * in `db`, tagging every node with `sourceFile` as provenance. Tables that
 * don't look like company data are skipped and reported in
 * `skippedTables`.
 *
 * Returns { companies, regions, edges, skippedTables }.
 */
export function mapCompanyTables(db, tables, sourceFile) {
  const skippedTables = [];
  let companies = 0;
  let regions = 0;
  let edges = 0;

  tables.forEach((table, index) => {
    if (!isCompanyTable(table)) {
      skippedTables.push({ index, headers: table.headers });
      return;
    }

    const present = new Set(table.normalizedHeaders);
    const hasPlatformColumn = present.has('platform');
    // Review fix (HIGH 2b): only fall back to the website column as the
    // identifier when the table genuinely has NO name-like column at all
    // (file 21's "Website | Description | Global Reach" directories) —
    // never let a raw URL become a node NAME when a real name column
    // exists (that's marinaMapper's job now that it recognizes
    // 'marina_name'; see HIGH 2a).
    const hasNameColumn = NAME_KEYS.some((key) => present.has(key));

    for (const row of table.rows) {
      let nameRaw = pickFirstPresent(row, NAME_KEYS);
      if (nameRaw === undefined && !hasNameColumn) {
        nameRaw = pickFirstPresent(row, [IDENTIFIER_FALLBACK_KEY]);
      }
      if (nameRaw === undefined || isEmptyOrNA(nameRaw)) continue;

      const cleanedName = stripDuplicateSuffix(nameRaw);
      if (!isPlausibleEntityName(cleanedName)) continue;

      const companyId = `company:${slug(normalizeName(cleanedName))}`;
      const existingRow = db.prepare('SELECT name, attrs_json FROM nodes WHERE id = ?').get(companyId);
      const existingAttrs = existingRow ? parseAttrsJson(existingRow.attrs_json) : {};
      const existingName = existingRow ? existingRow.name : null;

      const addressRaw = pickFirstPresent(row, ADDRESS_KEYS);
      const contactRaw = pickFirstPresent(row, CONTACT_KEYS);
      const websiteRaw = pickFirstPresent(row, WEBSITE_KEYS);

      const incoming = {
        kind: classifyKind(row, hasPlatformColumn),
        address: addressRaw ?? null,
        phone: extractPhone(contactRaw),
        website: websiteRaw ?? extractEmail(contactRaw),
        locations: pickFirstPresent(row, LOCATIONS_KEYS) ?? null,
        notes: pickFirstPresent(row, DESCRIPTION_KEYS) ?? null,
      };

      const merged = mergeFirstNonEmptyWins(existingAttrs, incoming, MERGE_FIELDS);
      merged.provenance = appendProvenance(existingAttrs.provenance, sourceFile);

      const finalName = !isEmptyValue(existingName) ? existingName : cleanedName;
      upsertNode(db, { id: companyId, type: 'company', name: finalName, attrs: merged });
      companies += 1;

      const regionRaw = lastCommaSegment(addressRaw);
      if (regionRaw) {
        const regionId = upsertRegion(db, regionRaw);
        if (regionId) {
          upsertEdge(db, { src: companyId, rel: 'based_in', dst: regionId });
          regions += 1;
          edges += 1;
        }
      }
    }
  });

  return { companies, regions, edges, skippedTables };
}

export { isCompanyTable };
