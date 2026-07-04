// ingest/tests/skippedProseReport.spec.js
//
// TASK-005: the skipped-prose diagnostic report writer. Mirrors db.js's
// GRAPH_DB_PATH / resolveDbPath convention for a tmp-dir-overridable path.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeSkippedProseReport } from '../src/reports/skippedProseReport.js';

let tmpDir;
let tmpReportPath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skipped-prose-report-test-'));
  tmpReportPath = path.join(tmpDir, 'nested', 'skipped-prose.md');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('writeSkippedProseReport', () => {
  it('creates the parent directory and writes a valid report for a non-empty entry list', () => {
    const entries = [
      { sourceFile: '16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md', startLine: 109, heading: 'Key Differentiating Equipment & Haul-Out Capabilities', reason: 'no recognized fields' },
      { sourceFile: '67_First_Yacht_Club_in_Florida_History_and_Impact.md', startLine: 205, heading: 'Naples Yacht Club', reason: 'ambiguous entity type' },
    ];

    const outPath = writeSkippedProseReport(entries, tmpReportPath);

    expect(outPath).toBe(tmpReportPath);
    expect(fs.existsSync(tmpReportPath)).toBe(true);

    const content = fs.readFileSync(tmpReportPath, 'utf8');
    expect(content).toContain('Total skipped: 2');
    expect(content).toContain('16_USA_Superyacht_Haul_Out_Yards_Florida_Focus.md');
    expect(content).toContain('Key Differentiating Equipment & Haul-Out Capabilities');
    expect(content).toContain('no recognized fields');
  });

  it('still writes a valid (empty) report when there is nothing to skip', () => {
    const outPath = writeSkippedProseReport([], tmpReportPath);

    const content = fs.readFileSync(outPath, 'utf8');
    expect(content).toContain('Total skipped: 0');
    expect(content).not.toContain('|---|');
  });
});
