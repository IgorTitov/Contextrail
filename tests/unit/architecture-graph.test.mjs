/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for the architecture graph builder pure functions.
 * @sidecar architecture-graph.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeclaredGraph,
  buildInferredGraph,
  computeDrift,
  slugifyPath,
  nodeId,
  subsystemId,
  SCHEMA_VERSION,
} from '../../scripts/lib/architecture-graph.mjs';
import { renderHeaderCore } from '../../scripts/lib/header.mjs';

// ---------------------------------------------------------------------------
// Helpers — build synthetic file sources with valid structured headers
// ---------------------------------------------------------------------------

function makeFileSource(file, fileinfoOverrides = {}) {
  const core = renderHeaderCore(file, { fileinfo: fileinfoOverrides });
  return { file, text: `/* ${core} */\nconst x = 1;\n` };
}

function makeJsSource(file, fileinfoOverrides, code) {
  const core = renderHeaderCore(file, { fileinfo: fileinfoOverrides });
  return { file, text: `/* ${core} */\n${code}\n` };
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

describe('slugifyPath()', () => {
  test('replaces non-alphanumeric chars with dashes', () => {
    assert.equal(slugifyPath('modules/auth/domain/user.mjs'), 'modules-auth-domain-user-mjs');
  });

  test('collapses multiple dashes', () => {
    assert.equal(slugifyPath('a//b..c'), 'a-b-c');
  });

  test('strips leading and trailing dashes', () => {
    assert.equal(slugifyPath('/foo/'), 'foo');
  });
});

describe('nodeId()', () => {
  test('produces node-file- prefixed ID', () => {
    assert.equal(nodeId('lib/foo.mjs'), 'node-file-lib-foo-mjs');
  });
});

describe('subsystemId()', () => {
  test('produces subsystem- prefixed ID', () => {
    assert.equal(subsystemId('auth'), 'subsystem-auth');
  });
});

// ---------------------------------------------------------------------------
// buildDeclaredGraph
// ---------------------------------------------------------------------------

describe('buildDeclaredGraph()', () => {
  test('extracts nodes with canonical v0.2.0 shape', () => {
    const sources = [
      makeFileSource('modules/auth/domain/user.mjs', {
        HexLayer: 'domain',
        BoundedContext: 'auth',
      }),
    ];

    const graph = buildDeclaredGraph(sources);
    assert.equal(graph.schemaVersion, SCHEMA_VERSION);
    assert.equal(graph.nodes.length, 1);

    const node = graph.nodes[0];
    assert.equal(node.id, nodeId('modules/auth/domain/user.mjs'));
    assert.equal(node.type, 'file');
    assert.equal(node.path, 'modules/auth/domain/user.mjs');
    assert.equal(node.hexLayer, 'domain');
    assert.equal(node.boundedContext, 'auth');
    assert.equal(node.declared, true);
    assert.equal(typeof node.metadata, 'object');
    assert.ok(Array.isArray(node.metadata.declaredDependencies));
  });

  test('generates subsystems from bounded contexts', () => {
    const sources = [
      makeFileSource('modules/auth/domain/user.mjs', { BoundedContext: 'auth' }),
      makeFileSource('modules/billing/domain/invoice.mjs', { BoundedContext: 'billing' }),
      makeFileSource('scripts/lib/helper.mjs'),
    ];

    const graph = buildDeclaredGraph(sources);
    assert.equal(graph.subsystems.length, 2);
    assert.ok(graph.subsystems.some((s) => s.id === 'subsystem-auth'));
    assert.ok(graph.subsystems.some((s) => s.id === 'subsystem-billing'));

    // Node with _none_ context gets null subsystem
    const helperNode = graph.nodes.find((n) => n.path === 'scripts/lib/helper.mjs');
    assert.equal(helperNode.subsystem, null);

    // Node in auth context gets subsystem ref
    const authNode = graph.nodes.find((n) => n.path === 'modules/auth/domain/user.mjs');
    assert.equal(authNode.subsystem, 'subsystem-auth');
  });

  test('generates depends-on edges for DependsOn entries matching known nodes', () => {
    const sources = [
      makeFileSource('app.mjs', { DependsOn: 'lib.mjs; node:path' }),
      makeFileSource('lib.mjs'),
    ];

    const graph = buildDeclaredGraph(sources);
    // Only lib.mjs matches a known node; node:path does not
    assert.equal(graph.edges.length, 1);
    assert.equal(graph.edges[0].from, nodeId('app.mjs'));
    assert.equal(graph.edges[0].to, nodeId('lib.mjs'));
    assert.equal(graph.edges[0].type, 'depends-on');
    assert.equal(graph.edges[0].declared, true);
  });

  test('computes stats', () => {
    const sources = [
      makeFileSource('modules/auth/domain/user.mjs', {
        BoundedContext: 'auth',
        HexLayer: 'domain',
      }),
      makeFileSource('scripts/lib/helper.mjs'),
    ];

    const graph = buildDeclaredGraph(sources);
    assert.equal(graph.stats.totalNodes, 2);
    assert.equal(graph.stats.nodesByType.file, 2);
    assert.equal(graph.stats.nodesByHexLayer.domain, 1);
  });

  test('sets entityRef from FileId', () => {
    const sources = [makeFileSource('foo.mjs')];
    const graph = buildDeclaredGraph(sources);
    // renderHeaderCore generates a FileId for foo.mjs
    assert.ok(graph.nodes[0].entityRef);
    assert.notEqual(graph.nodes[0].entityRef, nodeId('foo.mjs'));
  });

  test('skips files without structured headers', () => {
    const sources = [{ file: 'no-header.mjs', text: 'const x = 1;' }];
    const graph = buildDeclaredGraph(sources);
    assert.equal(graph.nodes.length, 0);
  });

  test('splits semicolon-delimited fields into metadata arrays', () => {
    const sources = [
      makeFileSource('foo.mjs', {
        DependsOn: 'bar.mjs; baz.mjs',
        ForbiddenDependencies: 'adapters; infra',
        ExternalSystems: 'PostgreSQL; Redis',
      }),
    ];
    const graph = buildDeclaredGraph(sources);
    const m = graph.nodes[0].metadata;
    assert.deepEqual(m.declaredDependencies, ['bar.mjs', 'baz.mjs']);
    assert.deepEqual(m.forbiddenDependencies, ['adapters', 'infra']);
    assert.deepEqual(m.externalSystems, ['PostgreSQL', 'Redis']);
  });

  test('includes repoContext and generatedBy from options', () => {
    const sources = [makeFileSource('foo.mjs')];
    const graph = buildDeclaredGraph(sources, {
      repoContext: 'test-repo',
      generatedBy: 'test-script',
    });
    assert.equal(graph.repoContext, 'test-repo');
    assert.equal(graph.generatedBy, 'test-script');
  });
});

// ---------------------------------------------------------------------------
// buildInferredGraph
// ---------------------------------------------------------------------------

describe('buildInferredGraph()', () => {
  test('extracts import edges with canonical shape', () => {
    const sources = [makeJsSource('app.mjs', {}, "import { foo } from './lib/foo.mjs';")];
    const graph = buildInferredGraph(sources);
    assert.equal(graph.schemaVersion, SCHEMA_VERSION);
    assert.equal(graph.edges.length, 1);

    const edge = graph.edges[0];
    assert.equal(edge.from, nodeId('app.mjs'));
    assert.equal(edge.to, nodeId('lib/foo.mjs'));
    assert.equal(edge.type, 'imports');
    assert.equal(edge.declared, false);
    assert.ok(edge.evidence.includes('app.mjs'));
  });

  test('skips external (non-relative) imports', () => {
    const sources = [makeJsSource('app.mjs', {}, "import path from 'node:path';")];
    const graph = buildInferredGraph(sources);
    assert.equal(graph.edges.length, 0);
  });

  test('creates inferred nodes for unknown import targets', () => {
    // app.mjs imports phantom.mjs which is not in fileSources
    const sources = [makeJsSource('app.mjs', {}, "import { x } from './phantom.mjs';")];
    const graph = buildInferredGraph(sources);
    assert.equal(graph.nodes.length, 1);
    assert.equal(graph.nodes[0].id, nodeId('phantom.mjs'));
    assert.equal(graph.nodes[0].declared, false);
    assert.equal(graph.nodes[0].inferredFrom, 'import-target');
  });

  test('does not create inferred nodes for known targets', () => {
    const sources = [
      makeJsSource('app.mjs', {}, "import { x } from './lib.mjs';"),
      makeFileSource('lib.mjs'),
    ];
    const graph = buildInferredGraph(sources);
    assert.equal(graph.nodes.length, 0); // lib.mjs is known
    assert.equal(graph.edges.length, 1);
  });

  test('skips non-JS files', () => {
    const sources = [{ file: 'readme.md', text: "import { x } from './y';" }];
    const graph = buildInferredGraph(sources);
    assert.equal(graph.edges.length, 0);
  });

  test('deduplicates repeated imports in the same file', () => {
    const sources = [
      makeJsSource(
        'app.mjs',
        {},
        `
        import { a } from './lib.mjs';
        import { b } from './lib.mjs';
      `,
      ),
    ];
    const graph = buildInferredGraph(sources);
    assert.equal(graph.edges.length, 1);
  });

  test('includes stats', () => {
    const sources = [
      makeJsSource('app.mjs', {}, "import { x } from './lib.mjs';"),
      makeFileSource('lib.mjs'),
    ];
    const graph = buildInferredGraph(sources);
    assert.equal(graph.stats.totalEdges, 1);
    assert.equal(graph.stats.totalNodes, 0); // lib.mjs is known, no inferred nodes
  });
});

// ---------------------------------------------------------------------------
// computeDrift
// ---------------------------------------------------------------------------

describe('computeDrift()', () => {
  test('returns clean status when no drift', () => {
    const sources = [
      makeJsSource('app.mjs', { DependsOn: 'lib.mjs' }, "import { x } from './lib.mjs';"),
      makeFileSource('lib.mjs'),
    ];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    assert.equal(drift.schemaVersion, SCHEMA_VERSION);
    assert.equal(drift.status, 'clean');
    assert.equal(drift.violations.length, 0);
  });

  test('detects forbidden dependency violations', () => {
    const sources = [
      makeJsSource(
        'domain/user.mjs',
        { ForbiddenDependencies: 'adapters' },
        "import { db } from '../adapters/db.mjs';",
      ),
    ];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    const v = drift.violations.find((v) => v.type === 'forbidden-dependency');
    assert.ok(v, 'should find forbidden-dependency violation');
    assert.equal(v.severity, 'error');
    assert.equal(v.node, nodeId('domain/user.mjs'));
    assert.ok(v.message.includes('adapters'));
  });

  test('detects undeclared dependencies when AllowedDependencies is set', () => {
    const sources = [
      makeJsSource(
        'app.mjs',
        { AllowedDependencies: 'domain' },
        "import { x } from './infrastructure/config.mjs';",
      ),
    ];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    assert.ok(drift.violations.some((v) => v.type === 'undeclared-dependency'));
    assert.equal(drift.status, 'drift-detected');
  });

  test('flags missing declarations for files in inferred graph sources', () => {
    // no-header.mjs has imports but no structured header
    const sources = [
      { file: 'no-header.mjs', text: "import { x } from './lib.mjs';\n" },
      makeFileSource('lib.mjs'),
    ];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    assert.ok(drift.violations.some((v) => v.type === 'missing-declaration'));
  });

  test('reports orphan nodes', () => {
    // orphan.mjs has a header but no imports and nothing imports it
    const sources = [makeFileSource('orphan.mjs')];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    assert.ok(drift.orphanNodes.includes(nodeId('orphan.mjs')));
  });

  test('reports declared-only edges', () => {
    // app.mjs declares DependsOn lib.mjs but doesn't actually import it
    const sources = [
      makeFileSource('app.mjs', { DependsOn: 'lib.mjs' }),
      makeFileSource('lib.mjs'),
    ];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    assert.equal(drift.declaredOnlyEdges.length, 1);
    assert.equal(drift.declaredOnlyEdges[0].type, 'depends-on');
  });

  test('reports inferred-only edges', () => {
    // app.mjs imports lib.mjs but DependsOn does not list it
    const sources = [
      makeJsSource('app.mjs', {}, "import { x } from './lib.mjs';"),
      makeFileSource('lib.mjs'),
    ];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    assert.ok(drift.inferredOnlyEdges.length > 0);
    assert.equal(drift.inferredOnlyEdges[0].type, 'imports');
  });

  test('includes correct counts', () => {
    const sources = [
      makeJsSource('a.mjs', { DependsOn: 'b.mjs' }, "import { x } from './b.mjs';"),
      makeFileSource('b.mjs'),
    ];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    const drift = computeDrift(declared, inferred, sources);

    assert.equal(drift.declaredNodeCount, 2);
    assert.equal(drift.declaredEdgeCount, 1); // a→b depends-on
    assert.equal(drift.inferredEdgeCount, 1); // a→b imports
  });

  test('works without fileSources (structural analysis only)', () => {
    const sources = [makeFileSource('orphan.mjs')];
    const declared = buildDeclaredGraph(sources);
    const inferred = buildInferredGraph(sources);
    // No fileSources — skips forbidden/allowed checks
    const drift = computeDrift(declared, inferred);

    assert.equal(drift.schemaVersion, SCHEMA_VERSION);
    assert.ok(Array.isArray(drift.violations));
    assert.ok(Array.isArray(drift.orphanNodes));
    assert.ok(drift.orphanNodes.includes(nodeId('orphan.mjs')));
  });
});
