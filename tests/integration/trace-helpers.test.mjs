/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of trace-helpers-test in this repository.
 * @sidecar trace-helpers.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { collectWorkItems } from '../../scripts/lib/trace-helpers.mjs';

describe('collectWorkItems() — integration', () => {
  test('returns an array', async () => {
    const items = await collectWorkItems();
    assert.ok(Array.isArray(items));
  });

  test('every item has the required shape', async () => {
    const items = await collectWorkItems();
    for (const item of items) {
      assert.ok(item.id, `item must have a non-empty id: ${JSON.stringify(item)}`);
      assert.equal(typeof item.type, 'string');
      assert.equal(typeof item.title, 'string');
      assert.equal(typeof item.source_file, 'string');
      assert.ok(Array.isArray(item.depends_on));
      assert.ok(Array.isArray(item.spec_refs));
      assert.ok(Array.isArray(item.test_refs));
      assert.ok(Array.isArray(item.bdd_refs));
      assert.ok(Array.isArray(item.acceptance));
    }
  });

  test('source_file points to a real docs path', async () => {
    const items = await collectWorkItems();
    for (const item of items) {
      assert.ok(
        item.source_file.startsWith('docs/'),
        `source_file should be under docs/: ${item.source_file}`,
      );
    }
  });
});
