/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure functions for mapping test files to domain, architecture, and product entities.
 * @sidecar test-entity-map.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { toPosix } from './fs-helpers.mjs';
import { parseStructuredHeaderText } from './header.mjs';
import { nodeId, SCHEMA_VERSION } from './architecture-graph.mjs';

// ---------------------------------------------------------------------------
// Suite ID inference from test file path
// ---------------------------------------------------------------------------

function inferSuiteId(testFile) {
  if (testFile.startsWith('tests/unit/')) return 'unit';
  if (testFile.startsWith('tests/integration/')) return 'integration';
  if (testFile.startsWith('tests/contract/')) return 'contract';
  if (testFile.startsWith('tests/bdd/')) return 'bdd';
  if (testFile.startsWith('tests/e2e/')) return 'e2e';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Test-to-entity mapping (entity-centric v0.2.0 shape)
// ---------------------------------------------------------------------------

/**
 * Build an entity list with test-coverage status from structured headers.
 *
 * Each source file with a header becomes an entity. Files whose Tests
 * FILEINFO field points to test files are marked "covered"; others are
 * "untested".
 *
 * @param {Array<{file: string, text: string}>} fileSources
 * @returns {object[]} — array of canonical entity objects
 */
export function buildTestToEntityMap(fileSources) {
  const entities = [];

  for (const { file, text } of fileSources) {
    const parsed = parseStructuredHeaderText(file, text);
    if (!parsed) continue;

    const fi = parsed.fileinfo || {};
    const posixFile = toPosix(file);
    const testsField = fi.Tests;

    let testStatus = 'untested';
    const suiteIds = [];
    const testIds = [];

    if (testsField && testsField !== '_none_' && testsField !== 'self') {
      const testFiles = testsField
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      if (testFiles.length > 0) {
        testStatus = 'covered';
        for (const tf of testFiles) {
          const posixTf = toPosix(tf);
          testIds.push(posixTf);
          const suite = inferSuiteId(posixTf);
          if (!suiteIds.includes(suite)) suiteIds.push(suite);
        }
      }
    }

    entities.push({
      entityRef: fi.FileId || nodeId(posixFile),
      entityType: 'file',
      path: posixFile,
      architectureNodeRef: nodeId(posixFile),
      testStatus,
      coveragePercent: null,
      suiteIds,
      testIds,
      lastRunId: null,
      timestamp: null,
    });
  }

  return entities;
}

// ---------------------------------------------------------------------------
// TAP block parsing (shared helper)
// ---------------------------------------------------------------------------

/**
 * Parse counters from a single TAP output block.
 *
 * @param {string} tapOutput — raw TAP output text
 * @returns {{ total: number, pass: number, fail: number, skip: number, durationMs: number | null }}
 */
export function parseTapBlock(tapOutput) {
  let total = 0;
  let pass = 0;
  let fail = 0;
  let skip = 0;
  let durationMs = null;

  for (const line of tapOutput.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# tests ')) {
      total = parseInt(trimmed.slice(8), 10) || 0;
    } else if (trimmed.startsWith('# pass ')) {
      pass = parseInt(trimmed.slice(7), 10) || 0;
    } else if (trimmed.startsWith('# fail ')) {
      fail = parseInt(trimmed.slice(7), 10) || 0;
    } else if (trimmed.startsWith('# skipped ')) {
      skip = parseInt(trimmed.slice(10), 10) || 0;
    } else if (trimmed.startsWith('# duration_ms ')) {
      durationMs = parseFloat(trimmed.slice(14)) || null;
    }
  }

  return { total, pass, fail, skip, durationMs };
}

// ---------------------------------------------------------------------------
// Test run summary from TAP-like output (v0.2.0 shape)
// ---------------------------------------------------------------------------

/**
 * Parse a test run summary from a single TAP output and wrap in the canonical shape.
 * Used when `--tap-file` provides a pre-captured output.
 *
 * @param {string} tapOutput — raw TAP output text
 * @param {{ runId?: string, timestamp?: string }} options
 * @returns {object} — canonical v0.2.0 summary
 */
export function buildTestRunSummary(tapOutput, options = {}) {
  const { total, pass, fail } = parseTapBlock(tapOutput);

  const ts = options.timestamp || new Date().toISOString();
  const runId = options.runId || `run-${ts}`;

  return {
    schemaVersion: SCHEMA_VERSION,
    runId,
    timestamp: ts,
    runner: 'node --test (TAP)',
    suites: [
      {
        id: 'all',
        name: 'All tests',
        command: 'pnpm test:all',
        totalTests: total,
        passed: pass,
        failed: fail,
        status: fail > 0 ? 'fail' : 'pass',
      },
    ],
    overallStatus: fail > 0 ? 'fail' : 'pass',
    totalTests: total,
    totalPassed: pass,
    totalFailed: fail,
  };
}

/**
 * Build a test run summary from individually-captured per-suite TAP outputs.
 * Each suite was run separately, so its TAP block is unambiguously bound to
 * exactly one suite — no positional guessing.
 *
 * @param {Array<{ id: string, name: string, command: string, tapOutput: string }>} suiteInputs
 * @param {{ runId?: string, timestamp?: string }} options
 * @returns {object} — canonical v0.2.0 summary
 */
export function buildTestRunSummaryFromSuites(suiteInputs, options = {}) {
  const ts = options.timestamp || new Date().toISOString();
  const runId = options.runId || `run-${ts}`;

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  const suites = suiteInputs.map((input) => {
    const { total, pass, fail } = parseTapBlock(input.tapOutput);
    totalTests += total;
    totalPassed += pass;
    totalFailed += fail;
    return {
      id: input.id,
      name: input.name,
      command: input.command,
      totalTests: total,
      passed: pass,
      failed: fail,
      status: fail > 0 ? 'fail' : 'pass',
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    runId,
    timestamp: ts,
    runner: 'node --test (TAP)',
    suites,
    overallStatus: totalFailed > 0 ? 'fail' : 'pass',
    totalTests,
    totalPassed,
    totalFailed,
  };
}
