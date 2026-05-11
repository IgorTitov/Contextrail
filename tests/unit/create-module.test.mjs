/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for the create-module scaffolding helpers — name validation, case helpers, file map shape, and disk write semantics against a tmp directory.
 * @sidecar create-module.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateModuleName,
  toPascalCase,
  toCamelCase,
  buildModuleFiles,
  writeModuleFiles,
} from '../../scripts/checks/create-module.mjs';

describe('validateModuleName', () => {
  test('accepts simple kebab-case', () => {
    assert.equal(validateModuleName('payment').ok, true);
    assert.equal(validateModuleName('user-preferences').ok, true);
    assert.equal(validateModuleName('a1-b2').ok, true);
  });

  test('rejects empty', () => {
    assert.equal(validateModuleName('').ok, false);
    assert.equal(validateModuleName(undefined).ok, false);
  });

  test('rejects PascalCase', () => {
    assert.equal(validateModuleName('Payment').ok, false);
  });

  test('rejects snake_case', () => {
    assert.equal(validateModuleName('user_preferences').ok, false);
  });

  test('rejects leading or trailing hyphen', () => {
    assert.equal(validateModuleName('-payment').ok, false);
    assert.equal(validateModuleName('payment-').ok, false);
  });

  test('rejects names that are too short or too long', () => {
    assert.equal(validateModuleName('a').ok, false);
    assert.equal(validateModuleName('a'.repeat(50)).ok, false);
  });

  test('rejects names starting with a digit', () => {
    assert.equal(validateModuleName('1payment').ok, false);
  });
});

describe('case helpers', () => {
  test('toPascalCase', () => {
    assert.equal(toPascalCase('payment'), 'Payment');
    assert.equal(toPascalCase('user-preferences'), 'UserPreferences');
    assert.equal(toPascalCase('a-b-c'), 'ABC');
  });

  test('toCamelCase', () => {
    assert.equal(toCamelCase('payment'), 'payment');
    assert.equal(toCamelCase('user-preferences'), 'userPreferences');
  });
});

describe('buildModuleFiles', () => {
  const files = buildModuleFiles('payment', 'Bounded payment module.');

  test('produces the canonical hex skeleton paths', () => {
    const expected = [
      'modules/payment/public-api.mjs',
      'modules/payment/public-api.mjs.header.md',
      'modules/payment/domain/payment.mjs',
      'modules/payment/domain/payment.mjs.header.md',
      'modules/payment/domain/README.md',
      'modules/payment/domain/README.md.header.md',
      'modules/payment/ports/payment-port.mjs',
      'modules/payment/ports/payment-port.mjs.header.md',
      'modules/payment/ports/README.md',
      'modules/payment/ports/README.md.header.md',
      'modules/payment/adapters/default-adapter.mjs',
      'modules/payment/adapters/default-adapter.mjs.header.md',
      'modules/payment/adapters/README.md',
      'modules/payment/adapters/README.md.header.md',
      'modules/payment/messages.mjs',
      'modules/payment/messages.mjs.header.md',
      'modules/payment/manifest.json',
      'modules/payment/manifest.json.header.md',
      'modules/payment/README.md',
      'modules/payment/README.md.header.md',
    ];
    for (const path of expected) {
      assert.ok(files[path], `expected file map to contain ${path}`);
    }
  });

  test('public-api re-exports the named domain function and asserter', () => {
    const publicApi = files['modules/payment/public-api.mjs'];
    assert.match(publicApi, /export \{ payment \} from '\.\/domain\/payment\.mjs'/);
    assert.match(publicApi, /export \{ assertPaymentPort \} from '\.\/ports\/payment-port\.mjs'/);
    assert.match(
      publicApi,
      /export \{ defaultPaymentAdapter \} from '\.\/adapters\/default-adapter\.mjs'/,
    );
  });

  test('port file declares the typedef and asserter using PascalCase port name', () => {
    const port = files['modules/payment/ports/payment-port.mjs'];
    assert.match(port, /@typedef \{object\} PaymentPort/);
    assert.match(port, /export function assertPaymentPort/);
  });

  test('default adapter exports the camelCase adapter object', () => {
    const adapter = files['modules/payment/adapters/default-adapter.mjs'];
    assert.match(adapter, /export const defaultPaymentAdapter = \{/);
  });

  test('messages file uses the module name as the i18n key namespace', () => {
    const messages = files['modules/payment/messages.mjs'];
    assert.match(messages, /'payment\.port\.missing_run'/);
  });

  test('manifest.json is valid JSON with the expected shape', () => {
    const manifest = JSON.parse(files['modules/payment/manifest.json']);
    assert.equal(manifest.name, 'payment');
    assert.equal(manifest.description, 'Bounded payment module.');
    assert.deepEqual(manifest.exports, ['public-api.mjs']);
    assert.deepEqual(manifest.structure.domain, ['payment.mjs']);
    assert.deepEqual(manifest.structure.ports, ['payment-port.mjs']);
    assert.deepEqual(manifest.structure.adapters, ['default-adapter.mjs']);
    assert.deepEqual(manifest.testFiles, ['tests/unit/payment.test.mjs']);
  });

  test('every generated text file carries the slim ADR-0009 header (json is sidecar-only)', () => {
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.header.md')) continue;
      if (path.endsWith('.json')) continue; // sidecar-only per ADR-0009
      assert.match(
        content,
        /@HEADER[\s\S]*?@version [\d.]+ \| \d{4}-\d{2}-\d{2}[\s\S]*?@purpose [\s\S]*?@sidecar [\s\S]*?@layer [\s\S]*?@public [\s\S]*?@edit /,
        `${path} is missing a slim header`,
      );
    }
  });

  test('every sidecar carries the canonical YAML frontmatter fields', () => {
    for (const [path, content] of Object.entries(files)) {
      if (!path.endsWith('.header.md')) continue;
      assert.ok(content.startsWith('---\n'), `${path} must start with YAML frontmatter`);
      assert.match(content, /\nfileId: /, `${path} missing fileId`);
      assert.match(content, /\nmodule: /, `${path} missing module`);
      assert.match(content, /\nsummary: /, `${path} missing summary`);
      assert.match(content, /\nspecRefs:/, `${path} missing specRefs`);
    }
  });

  test('handles multi-word module names correctly', () => {
    const userPrefs = buildModuleFiles('user-preferences', '');
    const publicApi = userPrefs['modules/user-preferences/public-api.mjs'];
    assert.match(
      publicApi,
      /export \{ userPreferences \} from '\.\/domain\/user-preferences\.mjs'/,
    );
    assert.match(publicApi, /export \{ assertUserPreferencesPort \}/);
    assert.match(publicApi, /export \{ defaultUserPreferencesAdapter \}/);
  });
});

describe('writeModuleFiles', () => {
  let tmpRoot;

  before(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'create-module-test-'));
  });

  after(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  test('writes all files to disk and creates parent directories', () => {
    const files = buildModuleFiles('payment', 'Test module');
    const result = writeModuleFiles(files, tmpRoot);
    assert.equal(result.skipped.length, 0);
    assert.equal(result.written.length, Object.keys(files).length);
    assert.ok(existsSync(join(tmpRoot, 'modules/payment/public-api.mjs')));
    assert.ok(existsSync(join(tmpRoot, 'modules/payment/domain/payment.mjs')));
    assert.ok(existsSync(join(tmpRoot, 'modules/payment/manifest.json')));
  });

  test('skips existing files by default', () => {
    const files = buildModuleFiles('payment', 'Test module');
    const result = writeModuleFiles(files, tmpRoot);
    assert.equal(result.written.length, 0);
    assert.equal(result.skipped.length, Object.keys(files).length);
  });

  test('overwrites existing files when overwrite=true', () => {
    const files = buildModuleFiles('payment', 'Different description');
    const result = writeModuleFiles(files, tmpRoot, { overwrite: true });
    assert.equal(result.written.length, Object.keys(files).length);
    assert.equal(result.skipped.length, 0);
    const manifest = JSON.parse(
      readFileSync(join(tmpRoot, 'modules/payment/manifest.json'), 'utf8'),
    );
    assert.equal(manifest.description, 'Different description');
  });
});
