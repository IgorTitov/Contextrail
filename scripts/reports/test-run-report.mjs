/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose CLI script that generates machine-readable test-run report artifacts for AI Cockpit.
 * @sidecar test-run-report.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from '../lib/cli-helpers.mjs';
import { result } from '../lib/output.mjs';
import { ROOT, toPosix } from '../lib/fs-helpers.mjs';
import { collectRepoFiles, isSidecarHeader, HEADER_EXEMPT_FILES } from '../lib/header.mjs';
import {
  buildTestToEntityMap,
  buildTestRunSummary,
  buildTestRunSummaryFromSuites,
} from '../lib/test-entity-map.mjs';
import { SCHEMA_VERSION } from '../lib/architecture-graph.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const tapFile = args.get('--tap-file');
const skipRun = args.has('--skip-run');

const REPORT_DIR = path.join(ROOT, 'reports', 'test-runs');

async function main() {
  mkdirSync(REPORT_DIR, { recursive: true });

  // Collect all repo files and read their contents
  const files = await collectRepoFiles();
  const fileSources = [];

  for (const file of files) {
    if (isSidecarHeader(file)) continue;
    if (HEADER_EXEMPT_FILES.has(file)) continue;

    const fullPath = path.join(ROOT, file);
    let text;
    try {
      text = readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }
    fileSources.push({ file: toPosix(file), text });
  }

  // Build entity map (v0.2.0 entity-centric shape)
  const entities = buildTestToEntityMap(fileSources);

  const ts = new Date().toISOString();
  const runId = `run-${ts}`;

  // Build entities report
  const entitiesReport = {
    schemaVersion: SCHEMA_VERSION,
    runId,
    timestamp: ts,
    totalEntities: entities.length,
    coveredEntities: entities.filter((e) => e.testStatus === 'covered').length,
    untestedEntities: entities.filter((e) => e.testStatus === 'untested').length,
    entities,
  };

  // Build summary report
  let summaryReport;
  if (tapFile && typeof tapFile === 'string') {
    // Manual TAP file provided — parse it as a single block
    try {
      const tapOutput = readFileSync(tapFile, 'utf8');
      summaryReport = buildTestRunSummary(tapOutput, { runId, timestamp: ts });
    } catch {
      summaryReport = buildTestRunSummary('', { runId, timestamp: ts });
    }
  } else if (skipRun) {
    // Entities-only mode — no test execution
    summaryReport = buildTestRunSummary('', { runId, timestamp: ts });
  } else {
    // Auto-run each suite individually for reliable per-suite results
    const SUITES = [
      { id: 'unit', name: 'Unit tests', command: 'pnpm test:unit' },
      { id: 'integration', name: 'Integration tests', command: 'pnpm test:integration' },
      { id: 'contract', name: 'Contract tests', command: 'pnpm test:contract' },
      { id: 'bdd', name: 'BDD tests', command: 'pnpm test:bdd' },
    ];

    const suiteInputs = SUITES.map((suite) => {
      let tapOutput;
      try {
        tapOutput = execSync(suite.command, {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 120_000,
        });
      } catch (err) {
        // execSync throws on non-zero exit — stdout still has TAP output
        tapOutput = (err.stdout || '') + '\n' + (err.stderr || '');
      }
      return { ...suite, tapOutput };
    });

    summaryReport = buildTestRunSummaryFromSuites(suiteInputs, { runId, timestamp: ts });
  }

  // Write artifacts
  const entitiesPath = path.join(REPORT_DIR, 'latest-entities.json');
  const summaryPath = path.join(REPORT_DIR, 'latest-summary.json');

  writeFileSync(entitiesPath, JSON.stringify(entitiesReport, null, 2) + '\n');
  writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2) + '\n');

  // Append to green-history.jsonl if ALL tests passed (Cockpit Stable mode reads this)
  const totalFailed = summaryReport.suites.reduce((sum, s) => sum + (s.failed || 0), 0);
  if (totalFailed === 0 && summaryReport.totalTests > 0) {
    try {
      const { appendFileSync } = await import('node:fs');
      const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
      const version = readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
      const greenEntry = JSON.stringify({
        version,
        sha,
        timestamp: new Date().toISOString(),
        total: summaryReport.totalTests,
        passed: summaryReport.totalTests - totalFailed,
        runner: 'node:test',
      });
      appendFileSync(path.join(REPORT_DIR, 'green-history.jsonl'), greenEntry + '\n', 'utf8');
    } catch { /* skip if git or VERSION not available */ }
  }

  const hasTestResults = summaryReport.totalTests > 0;
  const output = result('test-run-report', true, [], [], {
    totalEntities: entitiesReport.totalEntities,
    coveredEntities: entitiesReport.coveredEntities,
    untestedEntities: entitiesReport.untestedEntities,
    hasTestResults,
    suites: summaryReport.suites.length,
    artifacts: [
      toPosix(path.relative(ROOT, entitiesPath)),
      toPosix(path.relative(ROOT, summaryPath)),
    ],
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`test-run-report: OK`);
    console.log(`  total entities:   ${entitiesReport.totalEntities}`);
    console.log(`  covered:          ${entitiesReport.coveredEntities}`);
    console.log(`  untested:         ${entitiesReport.untestedEntities}`);
    console.log(
      `  test results:     ${hasTestResults ? `${summaryReport.totalTests} tests, ${summaryReport.totalPassed} passed, ${summaryReport.totalFailed} failed` : 'none (use without --skip-run to auto-run)'}`,
    );
    if (hasTestResults && summaryReport.suites.length > 1) {
      for (const s of summaryReport.suites) {
        console.log(`    ${s.name}: ${s.totalTests} tests, ${s.passed} passed, ${s.failed} failed`);
      }
    }
    console.log(`  artifacts written to reports/test-runs/`);
  }
}

main().catch((error) => {
  const output = result('test-run-report', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
