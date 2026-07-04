// ingest/src/reports/skippedProseReport.js
//
// TASK-005: writes the "skipped prose" diagnostic report — every prose
// data-sheet cluster that proseMapper.js could not confidently classify or
// map into a node (see proseMapper.js's `skipped` array), so unparseable
// or low-confidence blocks are visible for follow-up rather than silently
// dropped or guessed at (per the ticket's quality bar: wrong data is worse
// than absence, so ambiguous prose is reported, never guessed).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default report path lives at ingest/reports/skipped-prose.md.
// Configurable via SKIPPED_PROSE_REPORT_PATH so tests can point at a
// temporary file instead of the real one (mirrors db.js's GRAPH_DB_PATH /
// resolveDbPath convention).
export const DEFAULT_SKIPPED_PROSE_REPORT_PATH = path.resolve(__dirname, '..', '..', 'reports', 'skipped-prose.md');

export function resolveSkippedProseReportPath() {
  return process.env.SKIPPED_PROSE_REPORT_PATH
    ? path.resolve(process.env.SKIPPED_PROSE_REPORT_PATH)
    : DEFAULT_SKIPPED_PROSE_REPORT_PATH;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

/**
 * Renders `entries` (an array of { sourceFile, startLine, heading, reason }
 * — proseMapper.mapProseSheets()'s `skipped` output, accumulated across
 * every processed file) as a markdown report and writes it to `outPath`
 * (defaults to resolveSkippedProseReportPath()), creating the parent
 * directory if needed. Always writes a valid (if empty) report, even when
 * `entries` is empty — never skips writing the file, so the report's mere
 * presence/absence is never itself the signal.
 */
export function writeSkippedProseReport(entries, outPath = resolveSkippedProseReportPath()) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const lines = [
    '# Skipped Prose Sheets',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total skipped: ${entries.length}`,
    '',
  ];

  if (entries.length > 0) {
    lines.push('| Source File | Line | Heading | Reason |');
    lines.push('|---|---|---|---|');
    for (const entry of entries) {
      lines.push(
        `| ${escapeCell(entry.sourceFile)} | ${escapeCell(entry.startLine)} | ${escapeCell(entry.heading)} | ${escapeCell(entry.reason)} |`
      );
    }
    lines.push('');
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}
