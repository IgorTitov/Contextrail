/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify that the state module satisfies its hexagonal architecture contract: required folder layout, public-api.mjs surface, expected named exports, and no deep internal imports from unit tests.
 * @sidecar state-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Hex contract test for the state module.
 * Verifies structural compliance: folder layout, public-api surface, no deep imports.
 *
 * SpecRefs: TPL-052
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = new URL('../../modules/state/', import.meta.url);

describe('state hex contract', () => {
  test('has required hex folders: domain, ports, adapters', () => {
    for (const folder of ['domain', 'ports', 'adapters']) {
      assert.ok(existsSync(new URL(`${folder}/`, BASE)), `Missing folder: ${folder}`);
    }
  });

  test('has public-api.mjs', () => {
    assert.ok(existsSync(new URL('public-api.mjs', BASE)));
  });

  test('public-api.mjs exports expected surface', async () => {
    const publicApi = await import(new URL('public-api.mjs', BASE));
    const expected = [
      'assertStatePort',
      'createMemoryStateAdapter',
      'createPersistentStateAdapter',
      'createSqliteStateAdapter',
    ];
    for (const name of expected) {
      assert.ok(name in publicApi, `Missing export: ${name}`);
    }
  });

  test('unit tests do not deep-import module internals', async () => {
    const testFile = await readFile(
      join(process.cwd(), 'tests', 'unit', 'state.test.mjs'),
      'utf-8',
    );
    const imports = testFile.match(/from\s+['"]([^'"]+)['"]/g) || [];
    for (const imp of imports) {
      if (imp.includes('modules/state')) {
        assert.ok(imp.includes('public-api'), `Deep import detected: ${imp}`);
      }
    }
  });
});
