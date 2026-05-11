/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of knowledge-graph-hex-contract-test in this repository.
 * @sidecar knowledge-graph-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/knowledge-graph/', import.meta.url);

test('knowledge-graph has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('knowledge-graph has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('knowledge-graph has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'knowledge-graph');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('knowledge-graph has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('knowledge') || content.includes('Knowledge') || content.includes('graph'),
    'README should describe the module',
  );
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  // Ports
  assert.equal(typeof mod.assertGraphStorePort, 'function');
  assert.equal(typeof mod.assertEntityExtractorPort, 'function');
  assert.equal(typeof mod.assertRelationshipExtractorPort, 'function');
  // Adapters
  assert.equal(typeof mod.createMemoryGraphAdapter, 'function');
  assert.equal(typeof mod.createRegexEntityExtractor, 'function');
  assert.equal(typeof mod.createCooccurrenceRelationshipExtractor, 'function');
  // Domain
  assert.equal(typeof mod.bfsTraverse, 'function');
  assert.equal(typeof mod.findConnectedComponents, 'function');
  // Messages
  assert.equal(typeof mod.t, 'function');
});

test('each hex layer contains at least one source file', () => {
  assert.ok(existsSync(new URL('domain/graph-algorithms.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/entity-extractor-port.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/graph-store-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-graph-adapter.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/regex-entity-extractor.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/cooccurrence-relationship-extractor.mjs', BASE)));
});

test('unit test file exists for the knowledge-graph module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/knowledge-graph.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/knowledge-graph.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/knowledge-graph/domain/"));
  assert.ok(!content.includes("from '../../modules/knowledge-graph/ports/"));
  assert.ok(!content.includes("from '../../modules/knowledge-graph/adapters/"));
});
