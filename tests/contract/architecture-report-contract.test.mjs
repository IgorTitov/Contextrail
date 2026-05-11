/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Contract proof that architecture and test-run report scripts produce well-formed JSON artifacts matching the documented v0.2.0 shapes.
 * @sidecar architecture-report-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

function readJson(relPath) {
  return JSON.parse(readFileSync(path.join(ROOT, relPath), 'utf8'));
}

// ---------------------------------------------------------------------------
// Architecture report artifacts (v0.2.0)
// ---------------------------------------------------------------------------

describe('architecture-report contract v0.2.0', () => {
  before(() => {
    execSync('node scripts/reports/architecture-report.mjs', { cwd: ROOT, stdio: 'pipe' });
  });

  test('declared-graph.json has v0.2.0 top-level shape', () => {
    const data = readJson('reports/architecture/declared-graph.json');
    assert.equal(data.schemaVersion, '0.2.0');
    assert.equal(typeof data.generatedAt, 'string');
    assert.equal(typeof data.generatedBy, 'string');
    assert.equal(data.scope, 'full');
    assert.equal(typeof data.repoContext, 'string');
    assert.ok(Array.isArray(data.subsystems), 'subsystems must be an array');
    assert.ok(Array.isArray(data.nodes), 'nodes must be an array');
    assert.ok(data.nodes.length > 0, 'nodes must not be empty');
    assert.ok(Array.isArray(data.edges), 'edges must be an array');
    assert.equal(typeof data.stats, 'object');
    assert.equal(typeof data.stats.totalNodes, 'number');
    assert.equal(typeof data.stats.totalEdges, 'number');
  });

  test('declared-graph.json nodes have canonical v0.2.0 keys', () => {
    const data = readJson('reports/architecture/declared-graph.json');
    const node = data.nodes[0];
    const requiredKeys = [
      'id',
      'type',
      'name',
      'path',
      'entityRef',
      'subsystem',
      'hexLayer',
      'boundedContext',
      'portType',
      'adapterType',
      'declared',
      'metadata',
    ];
    for (const key of requiredKeys) {
      assert.ok(key in node, `node missing key: ${key}`);
    }
    assert.ok(node.id.startsWith('node-file-'), 'node id must start with node-file-');
    assert.equal(node.type, 'file');
    assert.equal(node.declared, true);
    assert.equal(typeof node.metadata, 'object');
  });

  test('declared-graph.json edges have canonical v0.2.0 keys', () => {
    const data = readJson('reports/architecture/declared-graph.json');
    if (data.edges.length === 0) return;
    const edge = data.edges[0];
    const requiredKeys = ['from', 'to', 'type', 'declared'];
    for (const key of requiredKeys) {
      assert.ok(key in edge, `edge missing key: ${key}`);
    }
    assert.equal(edge.declared, true);
    assert.equal(edge.type, 'depends-on');
  });

  test('declared-graph.json stats have breakdown keys', () => {
    const data = readJson('reports/architecture/declared-graph.json');
    assert.equal(typeof data.stats.nodesByType, 'object');
    assert.equal(typeof data.stats.nodesByHexLayer, 'object');
    assert.equal(typeof data.stats.nodesBySubsystem, 'object');
  });

  test('inferred-graph.json has v0.2.0 top-level shape', () => {
    const data = readJson('reports/architecture/inferred-graph.json');
    assert.equal(data.schemaVersion, '0.2.0');
    assert.ok(Array.isArray(data.nodes), 'nodes must be an array');
    assert.ok(Array.isArray(data.edges), 'edges must be an array');
    assert.equal(typeof data.stats, 'object');
    assert.equal(typeof data.generatedAt, 'string');
  });

  test('inferred-graph.json edges have canonical v0.2.0 keys', () => {
    const data = readJson('reports/architecture/inferred-graph.json');
    if (data.edges.length === 0) return;
    const edge = data.edges[0];
    const requiredKeys = ['from', 'to', 'type', 'declared', 'evidence'];
    for (const key of requiredKeys) {
      assert.ok(key in edge, `edge missing key: ${key}`);
    }
    assert.equal(edge.declared, false);
    assert.equal(edge.type, 'imports');
  });

  test('drift-report.json has v0.2.0 top-level shape', () => {
    const data = readJson('reports/architecture/drift-report.json');
    assert.equal(data.schemaVersion, '0.2.0');
    assert.equal(typeof data.generatedAt, 'string');
    assert.equal(typeof data.declaredNodeCount, 'number');
    assert.equal(typeof data.inferredNodeCount, 'number');
    assert.equal(typeof data.declaredEdgeCount, 'number');
    assert.equal(typeof data.inferredEdgeCount, 'number');
    assert.ok(Array.isArray(data.violations), 'violations must be an array');
    assert.ok(Array.isArray(data.orphanNodes), 'orphanNodes must be an array');
    assert.ok(Array.isArray(data.declaredOnlyEdges), 'declaredOnlyEdges must be an array');
    assert.ok(Array.isArray(data.inferredOnlyEdges), 'inferredOnlyEdges must be an array');
    assert.ok(
      ['clean', 'drift-detected'].includes(data.status),
      'status must be clean or drift-detected',
    );
  });

  test('drift-report.json violations have canonical keys (if any)', () => {
    const data = readJson('reports/architecture/drift-report.json');
    if (data.violations.length === 0) return;
    const v = data.violations[0];
    const requiredKeys = ['type', 'node', 'file', 'message', 'severity'];
    for (const key of requiredKeys) {
      assert.ok(key in v, `violation missing key: ${key}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Test-run report artifacts (v0.2.0)
// ---------------------------------------------------------------------------

describe('test-run-report contract v0.2.0', () => {
  before(() => {
    execSync('node scripts/reports/test-run-report.mjs', { cwd: ROOT, stdio: 'pipe' });
  });

  test('latest-entities.json has v0.2.0 top-level shape', () => {
    const data = readJson('reports/test-runs/latest-entities.json');
    assert.equal(data.schemaVersion, '0.2.0');
    assert.equal(typeof data.runId, 'string');
    assert.equal(typeof data.timestamp, 'string');
    assert.equal(typeof data.totalEntities, 'number');
    assert.equal(typeof data.coveredEntities, 'number');
    assert.equal(typeof data.untestedEntities, 'number');
    assert.ok(Array.isArray(data.entities), 'entities must be an array');
    assert.ok(data.entities.length > 0, 'entities must not be empty');
  });

  test('latest-entities.json entities have canonical v0.2.0 keys', () => {
    const data = readJson('reports/test-runs/latest-entities.json');
    const e = data.entities[0];
    const requiredKeys = [
      'entityRef',
      'entityType',
      'path',
      'architectureNodeRef',
      'testStatus',
      'coveragePercent',
      'suiteIds',
      'testIds',
      'lastRunId',
      'timestamp',
    ];
    for (const key of requiredKeys) {
      assert.ok(key in e, `entity missing key: ${key}`);
    }
    assert.equal(e.entityType, 'file');
    assert.ok(['covered', 'untested'].includes(e.testStatus));
    assert.ok(e.architectureNodeRef.startsWith('node-file-'));
  });

  test('latest-entities.json has correct totals', () => {
    const data = readJson('reports/test-runs/latest-entities.json');
    assert.equal(
      data.totalEntities,
      data.coveredEntities + data.untestedEntities,
      'totalEntities must equal covered + untested',
    );
  });

  test('latest-summary.json has v0.2.0 top-level shape', () => {
    const data = readJson('reports/test-runs/latest-summary.json');
    assert.equal(data.schemaVersion, '0.2.0');
    assert.equal(typeof data.runId, 'string');
    assert.equal(typeof data.timestamp, 'string');
    assert.equal(typeof data.runner, 'string');
    assert.ok(Array.isArray(data.suites), 'suites must be an array');
    assert.ok(['pass', 'fail'].includes(data.overallStatus));
    assert.equal(typeof data.totalTests, 'number');
    assert.equal(typeof data.totalPassed, 'number');
    assert.equal(typeof data.totalFailed, 'number');
  });

  test('latest-summary.json suites have canonical keys', () => {
    const data = readJson('reports/test-runs/latest-summary.json');
    if (data.suites.length === 0) return;
    const suite = data.suites[0];
    const requiredKeys = ['id', 'name', 'command', 'totalTests', 'passed', 'failed', 'status'];
    for (const key of requiredKeys) {
      assert.ok(key in suite, `suite missing key: ${key}`);
    }
  });
});
