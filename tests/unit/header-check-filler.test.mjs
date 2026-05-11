/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the F2 notesForLLM filler lint in header-check.mjs — rejects Mode B compliance boilerplate and accepts specific invariants / absent fields.
 * @sidecar header-check-filler.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNotesForLLMFiller } from '../../scripts/checks/header-check.mjs';

describe('checkNotesForLLMFiller', () => {
  test('accepts a sidecar without the field at all', () => {
    const text = '---\nfileId: foo\nmodule: bar\n---\n';
    assert.deepEqual(checkNotesForLLMFiller(text), { ok: true });
  });

  test('accepts a sidecar with an empty field', () => {
    const text = '---\nfileId: foo\nnotesForLLM:\nmodule: bar\n---\n';
    assert.deepEqual(checkNotesForLLMFiller(text), { ok: true });
  });

  test('accepts a specific invariant under 25 words', () => {
    const text = `---\nnotesForLLM: TTL expiry is evaluated lazily on read, not via a background sweep. Stale entries can surface after TTL elapses if no reader touches the key.\n---\n`;
    assert.equal(checkNotesForLLMFiller(text).ok, true);
  });

  test('rejects "Core X logic. Test in isolation" Mode B filler', () => {
    const text = `---\nnotesForLLM: Core domain logic. Test in isolation.\n---\n`;
    const result = checkNotesForLLMFiller(text);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'generic-core-logic');
  });

  test('rejects "Core port logic" standalone', () => {
    const text = `---\nnotesForLLM: Core port logic.\n---\n`;
    assert.equal(checkNotesForLLMFiller(text).ok, false);
  });

  test('rejects "Core X for the Y module"', () => {
    const text = `---\nnotesForLLM: Core adapter for the payment module.\n---\n`;
    const result = checkNotesForLLMFiller(text);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'generic-core-logic');
  });

  test('rejects "X for the Y module" standalone', () => {
    const text = `---\nnotesForLLM: Adapter for the payment module.\n---\n`;
    const result = checkNotesForLLMFiller(text);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'x-for-the-y-module');
  });

  test('rejects "Test in isolation" anywhere in the note', () => {
    const text = `---\nnotesForLLM: Pure helper. Test in isolation.\n---\n`;
    const result = checkNotesForLLMFiller(text);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'test-in-isolation-filler');
  });

  test('rejects "Core adapter" layer filler', () => {
    const text = `---\nnotesForLLM: Core adapter.\n---\n`;
    const result = checkNotesForLLMFiller(text);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'generic-core-layer');
  });

  test('accepts notes that happen to mention "core" non-generically', () => {
    const text = `---\nnotesForLLM: Domain entity. Invariant: balance must never drop below the configured minimumBalance or the account is frozen.\n---\n`;
    assert.equal(checkNotesForLLMFiller(text).ok, true);
  });

  test('field reported on the "note" return when rejected', () => {
    const text = `---\nnotesForLLM: Core domain logic. Test in isolation.\n---\n`;
    const result = checkNotesForLLMFiller(text);
    assert.equal(result.ok, false);
    assert.equal(result.note, 'Core domain logic. Test in isolation.');
  });
});
