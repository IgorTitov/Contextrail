/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify hex architecture structural compliance for the retrieval module -- folder layout, public-api surface, and no deep imports.
 * @sidecar retrieval-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Hex contract test for the retrieval module.
 * Verifies structural compliance: folder layout, public-api surface, no deep imports.
 *
 * SpecRefs: TPL-086; TPL-087; TPL-092
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = new URL('../../modules/retrieval/', import.meta.url);

describe('retrieval hex contract', () => {
  test('has required hex folders: domain, ports, adapters', () => {
    for (const folder of ['domain', 'ports', 'adapters']) {
      assert.ok(existsSync(new URL(`${folder}/`, BASE)), `Missing folder: ${folder}`);
    }
  });

  test('has public-api.mjs', () => {
    assert.ok(existsSync(new URL('public-api.mjs', BASE)));
  });

  test('has public-api.d.ts sidecar', () => {
    assert.ok(existsSync(new URL('public-api.d.ts', BASE)));
  });

  test('has messages.mjs for i18n', () => {
    assert.ok(existsSync(new URL('messages.mjs', BASE)));
  });

  test('has types.d.ts', () => {
    assert.ok(existsSync(new URL('types.d.ts', BASE)));
  });

  test('public-api.mjs exports expected surface', async () => {
    const publicApi = await import(new URL('public-api.mjs', BASE));
    const expected = [
      'assertRetrievalPort',
      'createChunker',
      'createBm25Adapter',
      'createVectorLocalAdapter',
      'createAugmentPrompt',
    ];
    for (const name of expected) {
      assert.ok(name in publicApi, `Missing export: ${name}`);
    }
  });

  test('unit tests do not deep-import module internals', async () => {
    const testFile = await readFile(
      join(process.cwd(), 'tests', 'unit', 'retrieval.test.mjs'),
      'utf-8',
    );
    const imports = testFile.match(/from\s+['"]([^'"]+)['"]/g) || [];
    for (const imp of imports) {
      if (imp.includes('modules/retrieval') && !imp.includes('messages.mjs')) {
        assert.ok(imp.includes('public-api'), `Deep import detected: ${imp}`);
      }
    }
  });
});
