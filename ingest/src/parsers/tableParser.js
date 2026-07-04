// ingest/src/parsers/tableParser.js
//
// Deterministic, pure parser for markdown pipe tables found throughout the
// /knowledge Grok-export corpus. No DB writes here — this module only turns
// markdown text into plain data structures; later tickets (mappers) decide
// what to do with the result.
//
// A "pipe table" is any header row of `| ... |` cells immediately followed
// by a separator row of dashes (optionally with `:` alignment markers,
// optionally without leading/trailing pipes), followed by zero or more
// data rows.
//
// Design notes:
//   - headers: the raw header cell text as it appears in the markdown
//     (trimmed of surrounding whitespace only).
//   - normalizedHeaders: each raw header run through normalizeHeader(),
//     de-duplicated so two columns never collide on the same row key.
//   - rows: plain objects keyed by normalizedHeaders[i]. Ragged rows (fewer
//     cells than headers) are padded with '' rather than throwing; extra
//     cells beyond the header count are ignored.
//
// Because different Grok exports in the corpus lie about their own
// contents (a file named like a yacht-data scrape can open with an
// unrelated salary table), callers must not trust a table just because it
// was found in an expected file — tableMatchesSchema() lets a mapper
// verify a table's actual headers before treating its rows as yacht data.

import fs from 'node:fs';

// Canonical alias map: lowercase raw header -> canonical snake_case key.
// Extend this as new corpus files demand new synonyms; unknown headers are
// never dropped, only slugified (see normalizeHeader below).
const ALIAS_MAP = buildAliasMap({
  name: ['Yacht Name', 'Name', 'Vessel'],
  builder: ['Builder', 'Shipyard', 'Yard'],
  loa: ['LOA', 'Length', 'Length (m)', 'Length (m/ft)', 'LOA (m)'],
  beam: ['Beam'],
  year: [
    'Year',
    'Year Built',
    'Built',
    'Delivered',
    'Year Delivered',
    // Real-world variant seen in the corpus (file 42): a combined
    // delivery/refit year column that should still normalize to "year".
    'Year (Delivery/Refit)',
  ],
  owner: ['Owner'],
  weekly_rate: [
    'Weekly Rate',
    'Rate',
    'Price/Week',
    'Weekly Charter Rate',
    // Real-world variant seen in the corpus (file 42): currency-qualified
    // weekly rate column that should still normalize to "weekly_rate".
    'Weekly Rate (EUR/USD)',
  ],
  guests: ['Guests'],
  cabins: ['Cabins'],
  crew: ['Crew'],
  designer: ['Designer'],
  region: ['Region', 'Location', 'Country'],
  source: ['Source'],
});

function buildAliasMap(canonicalToAliases) {
  const map = new Map();
  for (const [canonical, aliases] of Object.entries(canonicalToAliases)) {
    for (const alias of aliases) {
      map.set(alias.toLowerCase(), canonical);
    }
  }
  return map;
}

/**
 * Normalizes a single (possibly markdown-decorated) header cell into a
 * canonical snake_case key. Case-insensitive, trims whitespace, strips
 * markdown emphasis (**bold**, *italic*) and backticks before matching.
 * Unknown headers are preserved as a snake_case slug of the cleaned
 * original text (never dropped).
 */
export function normalizeHeader(raw) {
  const cleaned = String(raw ?? '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .trim();

  const canonical = ALIAS_MAP.get(cleaned.toLowerCase());
  if (canonical) return canonical;

  return slugify(cleaned);
}

function slugify(text) {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'column';
}

/**
 * De-duplicates an array of keys by appending _2, _3, ... to repeats, so
 * two columns that normalize to the same key never overwrite each other
 * in a row object.
 */
function dedupeKeys(keys) {
  const seen = new Map();
  return keys.map((key) => {
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    return count === 1 ? key : `${key}_${count}`;
  });
}

// Matches a single dash-separator cell, with optional `:` alignment
// markers on either side (standard markdown table separator syntax).
const SEPARATOR_CELL_RE = /^:?-+:?$/;

function isSeparatorRow(line) {
  if (line === undefined || line === null) return false;
  const trimmed = line.trim();
  if (trimmed === '' || !trimmed.includes('-')) return false;

  const cells = splitRow(trimmed);
  if (cells.length === 0) return false;
  return cells.every((cell) => SEPARATOR_CELL_RE.test(cell.trim()));
}

function isTableRowLine(line) {
  return typeof line === 'string' && line.trim() !== '' && line.includes('|');
}

// True if the '|' at the very end of `s` is escaped (preceded by an odd
// number of backslashes), meaning it's a literal pipe inside the last
// cell rather than the row's closing delimiter.
function hasEscapedTrailingPipe(s) {
  let backslashes = 0;
  let i = s.length - 2; // char just before the trailing '|'
  while (i >= 0 && s[i] === '\\') {
    backslashes++;
    i--;
  }
  return backslashes % 2 === 1;
}

/**
 * Splits one markdown table row into raw cell strings. Handles:
 *   - leading/trailing pipes present or absent
 *   - escaped pipes (\|) inside a cell (unescaped back to a literal '|')
 *   - blank cells
 */
function splitRow(line) {
  let s = line.replace(/\r$/, '').trim();

  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !hasEscapedTrailingPipe(s)) s = s.slice(0, -1);

  return s
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

/**
 * Parses every markdown pipe table found in `markdownString` and returns
 * one entry per table:
 *   { headers, normalizedHeaders, rows }
 * Returns [] if the input contains zero pipe tables. Never throws on
 * malformed/ragged input.
 */
export function parseTables(markdownString) {
  const lines = String(markdownString ?? '').split(/\r\n|\r|\n/);
  const tables = [];

  let i = 0;
  while (i < lines.length) {
    const headerLine = lines[i];
    const sepLine = lines[i + 1];

    if (isTableRowLine(headerLine) && isSeparatorRow(sepLine)) {
      const headers = splitRow(headerLine);
      const normalizedHeaders = dedupeKeys(headers.map(normalizeHeader));

      let j = i + 2;
      const rows = [];
      while (j < lines.length && isTableRowLine(lines[j])) {
        const cells = splitRow(lines[j]);
        const row = {};
        for (let k = 0; k < normalizedHeaders.length; k++) {
          row[normalizedHeaders[k]] = cells[k] !== undefined ? cells[k] : '';
        }
        rows.push(row);
        j++;
      }

      tables.push({ headers, normalizedHeaders, rows });
      i = j;
    } else {
      i++;
    }
  }

  return tables;
}

/**
 * Reads a markdown file from disk and parses its pipe tables (see
 * parseTables). Pure w.r.t. the DB — this only reads the source file.
 */
export function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseTables(content);
}

/**
 * Returns true if every key in requiredKeys is present among the table's
 * normalizedHeaders. Lets a caller verify a table's actual schema before
 * trusting its rows — guards against corpus files whose contents don't
 * match what their filename/section heading implies (e.g. a yacht-data
 * file that opens with an unrelated salary/position table).
 */
export function tableMatchesSchema(table, requiredKeys) {
  const present = new Set(table.normalizedHeaders);
  return requiredKeys.every((key) => present.has(key));
}
