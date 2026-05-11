/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of locale-parity-test in this repository.
 * @sidecar locale-parity.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../../apps/starter/locales/en.mjs';
import { ru } from '../../apps/starter/locales/ru.mjs';

describe('locale parity — en vs ru', () => {
  const enKeys = Object.keys(en).sort();
  const ruKeys = Object.keys(ru).sort();

  test('both locales have the same keys', () => {
    assert.deepEqual(enKeys, ruKeys, 'English and Russian catalogs must have identical key sets');
  });

  test('no empty values in English catalog', () => {
    for (const key of enKeys) {
      assert.ok(en[key].length > 0, `en['${key}'] must not be empty`);
    }
  });

  test('no empty values in Russian catalog', () => {
    for (const key of ruKeys) {
      assert.ok(ru[key].length > 0, `ru['${key}'] must not be empty`);
    }
  });

  test('placeholder parity — same {param} placeholders in both locales', () => {
    const placeholderRe = /\{(\w+)\}/g;
    for (const key of enKeys) {
      const enPlaceholders = [...en[key].matchAll(placeholderRe)].map((m) => m[1]).sort();
      const ruPlaceholders = [...ru[key].matchAll(placeholderRe)].map((m) => m[1]).sort();
      assert.deepEqual(enPlaceholders, ruPlaceholders, `Placeholder mismatch for key '${key}'`);
    }
  });
});
