/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the seo bounded module follows the hex architecture contract.
 * @sidecar seo-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/seo/', import.meta.url);

test('seo has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('seo has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)), 'public-api.mjs must exist');
});

test('seo has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath), 'README.md must exist');
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('hexagonal') || content.includes('Hexagonal'),
    'README should mention hexagonal architecture',
  );
});

test('public-api.mjs exports domain, port assert, and adapter', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));
  assert.equal(typeof mod.createMetaTags, 'function');
  assert.equal(typeof mod.renderMetaTagsHtml, 'function');
  assert.equal(typeof mod.createSitemap, 'function');
  assert.equal(typeof mod.renderSitemapXml, 'function');
  assert.equal(typeof mod.createRobotsTxt, 'function');
  assert.equal(typeof mod.renderRobotsTxt, 'function');
  assert.equal(typeof mod.assertSeoPublisherPort, 'function');
  assert.equal(typeof mod.createMemorySeoPublisher, 'function');
});

test('each hex layer contains its source file', () => {
  assert.ok(existsSync(new URL('domain/meta-tags.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/sitemap.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/robots.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/seo-publisher-port.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/memory-seo-publisher.mjs', BASE)));
});

test('unit test file exists for the seo module', () => {
  const testPath = new URL('../../tests/unit/seo.test.mjs', import.meta.url);
  assert.ok(existsSync(testPath), 'tests/unit/seo.test.mjs must exist');
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const testPath = new URL('../../tests/unit/seo.test.mjs', import.meta.url);
  const content = readFileSync(testPath, 'utf8');
  assert.ok(content.includes('public-api.mjs'), 'unit test must import from public-api.mjs');
  assert.ok(
    !content.includes("from '../../modules/seo/domain/"),
    'unit test must not deep-import from domain/',
  );
  assert.ok(
    !content.includes("from '../../modules/seo/ports/"),
    'unit test must not deep-import from ports/',
  );
  assert.ok(
    !content.includes("from '../../modules/seo/adapters/"),
    'unit test must not deep-import from adapters/',
  );
});
