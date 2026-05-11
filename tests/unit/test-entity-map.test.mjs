/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for the test-to-entity mapping pure functions.
 * @sidecar test-entity-map.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTestToEntityMap,
  buildTestRunSummary,
  buildTestRunSummaryFromSuites,
  parseTapBlock,
} from '../../scripts/lib/test-entity-map.mjs';
import { nodeId, SCHEMA_VERSION } from '../../scripts/lib/architecture-graph.mjs';
import { renderHeaderCore } from '../../scripts/lib/header.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFileSource(file, fileinfoOverrides = {}) {
  const core = renderHeaderCore(file, { fileinfo: fileinfoOverrides });
  return { file, text: `/* ${core} */\nconst x = 1;\n` };
}

// ---------------------------------------------------------------------------
// buildTestToEntityMap
// ---------------------------------------------------------------------------

describe('buildTestToEntityMap()', () => {
  test('creates entity with canonical v0.2.0 shape', () => {
    const sources = [
      makeFileSource('modules/auth/domain/user.mjs', {
        Tests: 'tests/unit/user.test.mjs',
        HexLayer: 'domain',
        BoundedContext: 'auth',
      }),
    ];

    const entities = buildTestToEntityMap(sources);
    assert.equal(entities.length, 1);

    const e = entities[0];
    assert.equal(e.entityType, 'file');
    assert.equal(e.path, 'modules/auth/domain/user.mjs');
    assert.equal(e.architectureNodeRef, nodeId('modules/auth/domain/user.mjs'));
    assert.equal(e.testStatus, 'covered');
    assert.equal(e.coveragePercent, null);
    assert.ok(Array.isArray(e.suiteIds));
    assert.ok(Array.isArray(e.testIds));
    assert.ok(e.testIds.includes('tests/unit/user.test.mjs'));
  });

  test('marks entity as covered with correct suiteIds', () => {
    const sources = [
      makeFileSource('lib.mjs', {
        Tests: 'tests/unit/lib.test.mjs; tests/integration/lib.test.mjs',
      }),
    ];

    const entities = buildTestToEntityMap(sources);
    assert.equal(entities[0].testStatus, 'covered');
    assert.ok(entities[0].suiteIds.includes('unit'));
    assert.ok(entities[0].suiteIds.includes('integration'));
    assert.equal(entities[0].testIds.length, 2);
  });

  test('marks entity as untested when Tests is _none_', () => {
    const sources = [makeFileSource('a.mjs', { Tests: '_none_' })];
    const entities = buildTestToEntityMap(sources);
    assert.equal(entities[0].testStatus, 'untested');
    assert.equal(entities[0].suiteIds.length, 0);
    assert.equal(entities[0].testIds.length, 0);
  });

  test('marks entity as untested when Tests is self', () => {
    const sources = [makeFileSource('a.mjs', { Tests: 'self' })];
    const entities = buildTestToEntityMap(sources);
    assert.equal(entities[0].testStatus, 'untested');
  });

  test('sets entityRef from FileId field', () => {
    const sources = [makeFileSource('foo.mjs')];
    const entities = buildTestToEntityMap(sources);
    // renderHeaderCore generates a FileId
    assert.ok(entities[0].entityRef);
    // entityRef should be the FileId, not the nodeId
    assert.notEqual(entities[0].entityRef, nodeId('foo.mjs'));
  });

  test('skips files without structured headers', () => {
    const sources = [{ file: 'no-header.mjs', text: 'const x = 1;' }];
    const entities = buildTestToEntityMap(sources);
    assert.equal(entities.length, 0);
  });

  test('produces one entity per source file', () => {
    const sources = [
      makeFileSource('a.mjs', { Tests: 'tests/unit/shared.test.mjs' }),
      makeFileSource('b.mjs', { Tests: 'tests/unit/shared.test.mjs' }),
    ];

    const entities = buildTestToEntityMap(sources);
    // Each source file is its own entity (even if they share a test file)
    assert.equal(entities.length, 2);
    assert.equal(entities[0].path, 'a.mjs');
    assert.equal(entities[1].path, 'b.mjs');
  });

  test('lastRunId and timestamp default to null', () => {
    const sources = [makeFileSource('foo.mjs')];
    const entities = buildTestToEntityMap(sources);
    assert.equal(entities[0].lastRunId, null);
    assert.equal(entities[0].timestamp, null);
  });
});

// ---------------------------------------------------------------------------
// buildTestRunSummary
// ---------------------------------------------------------------------------

describe('buildTestRunSummary()', () => {
  test('parses TAP output and wraps in canonical v0.2.0 shape', () => {
    const tap = `
TAP version 13
1..5
# tests 10
# suites 3
# pass 8
# fail 1
# cancelled 0
# skipped 1
# todo 0
# duration_ms 250.5
    `.trim();

    const summary = buildTestRunSummary(tap, {
      runId: 'run-test',
      timestamp: '2026-03-28T12:00:00.000Z',
    });

    assert.equal(summary.schemaVersion, SCHEMA_VERSION);
    assert.equal(summary.runId, 'run-test');
    assert.equal(summary.timestamp, '2026-03-28T12:00:00.000Z');
    assert.equal(summary.runner, 'node --test (TAP)');
    assert.equal(summary.totalTests, 10);
    assert.equal(summary.totalPassed, 8);
    assert.equal(summary.totalFailed, 1);
    assert.equal(summary.overallStatus, 'fail');

    assert.ok(Array.isArray(summary.suites));
    assert.equal(summary.suites.length, 1);
    assert.equal(summary.suites[0].totalTests, 10);
    assert.equal(summary.suites[0].passed, 8);
    assert.equal(summary.suites[0].failed, 1);
    assert.equal(summary.suites[0].status, 'fail');
  });

  test('returns pass status for zero failures', () => {
    const tap = `
# tests 5
# pass 5
# fail 0
    `.trim();

    const summary = buildTestRunSummary(tap);
    assert.equal(summary.overallStatus, 'pass');
    assert.equal(summary.suites[0].status, 'pass');
  });

  test('returns canonical shape for empty input', () => {
    const summary = buildTestRunSummary('');
    assert.equal(summary.schemaVersion, SCHEMA_VERSION);
    assert.equal(summary.totalTests, 0);
    assert.equal(summary.totalPassed, 0);
    assert.equal(summary.totalFailed, 0);
    assert.equal(summary.overallStatus, 'pass');
    assert.ok(summary.runId.startsWith('run-'));
    assert.ok(summary.timestamp);
  });

  test('generates runId from timestamp when not provided', () => {
    const summary = buildTestRunSummary('');
    assert.ok(summary.runId.startsWith('run-'));
    assert.ok(summary.runId.includes(summary.timestamp));
  });
});

// ---------------------------------------------------------------------------
// parseTapBlock
// ---------------------------------------------------------------------------

describe('parseTapBlock()', () => {
  test('extracts counters from TAP output', () => {
    const tap = '# tests 10\n# pass 8\n# fail 2\n# skipped 1\n# duration_ms 150.5';
    const result = parseTapBlock(tap);
    assert.equal(result.total, 10);
    assert.equal(result.pass, 8);
    assert.equal(result.fail, 2);
    assert.equal(result.skip, 1);
    assert.equal(result.durationMs, 150.5);
  });

  test('returns zeros for empty input', () => {
    const result = parseTapBlock('');
    assert.equal(result.total, 0);
    assert.equal(result.pass, 0);
    assert.equal(result.fail, 0);
  });
});

// ---------------------------------------------------------------------------
// buildTestRunSummaryFromSuites
// ---------------------------------------------------------------------------

describe('buildTestRunSummaryFromSuites()', () => {
  test('produces per-suite breakdown with correct aggregates', () => {
    const suiteInputs = [
      {
        id: 'unit',
        name: 'Unit tests',
        command: 'pnpm test:unit',
        tapOutput: '# tests 100\n# pass 99\n# fail 1',
      },
      {
        id: 'contract',
        name: 'Contract tests',
        command: 'pnpm test:contract',
        tapOutput: '# tests 50\n# pass 50\n# fail 0',
      },
    ];

    const summary = buildTestRunSummaryFromSuites(suiteInputs, {
      runId: 'run-multi',
      timestamp: '2026-04-03T12:00:00.000Z',
    });

    assert.equal(summary.schemaVersion, SCHEMA_VERSION);
    assert.equal(summary.runId, 'run-multi');
    assert.equal(summary.suites.length, 2);
    assert.equal(summary.suites[0].id, 'unit');
    assert.equal(summary.suites[0].totalTests, 100);
    assert.equal(summary.suites[0].status, 'fail');
    assert.equal(summary.suites[1].id, 'contract');
    assert.equal(summary.suites[1].totalTests, 50);
    assert.equal(summary.suites[1].status, 'pass');
    assert.equal(summary.totalTests, 150);
    assert.equal(summary.totalPassed, 149);
    assert.equal(summary.totalFailed, 1);
    assert.equal(summary.overallStatus, 'fail');
  });

  test('reports pass when all suites pass', () => {
    const suiteInputs = [
      { id: 'unit', name: 'Unit', command: 'x', tapOutput: '# tests 5\n# pass 5\n# fail 0' },
      { id: 'bdd', name: 'BDD', command: 'y', tapOutput: '# tests 3\n# pass 3\n# fail 0' },
    ];

    const summary = buildTestRunSummaryFromSuites(suiteInputs);
    assert.equal(summary.overallStatus, 'pass');
    assert.equal(summary.totalTests, 8);
    assert.equal(summary.totalFailed, 0);
  });

  test('handles empty suite output gracefully', () => {
    const suiteInputs = [{ id: 'unit', name: 'Unit', command: 'x', tapOutput: '' }];

    const summary = buildTestRunSummaryFromSuites(suiteInputs);
    assert.equal(summary.suites[0].totalTests, 0);
    assert.equal(summary.overallStatus, 'pass');
  });
});
