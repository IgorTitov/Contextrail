/* @HEADER
 * @version 0.7.109 | 2026-05-06
 * @purpose Unit tests for the validateCommitMessage helper that backs the .githooks/commit-msg hook.
 * @sidecar commit-msg-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommitMessage, ALLOWED_TYPES, extractSliceIdFromHeader } from '../../scripts/checks/commit-msg-check.mjs';

describe('validateCommitMessage — happy paths', () => {
  test('accepts a minimal conventional commit with work-item ID', () => {
    const msg = 'feat: add example feature (TPL-001)';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('accepts a scoped conventional commit', () => {
    const msg = 'fix(cache): handle TTL clock skew on resume (TPL-001)';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('accepts a breaking-change marker', () => {
    const msg = 'feat(auth)!: drop legacy session shape\n\nBody (TPL-001)';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('accepts a header with body separated by blank line', () => {
    const msg = 'docs: explain failure surface\n\nDetails about realtime gotchas (TPL-001).';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('accepts work-item ID anywhere in the message', () => {
    const msg = 'fix: header path normalization\n\nFollow-up to TPL-178 epic.';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('skips Merge commits without further validation', () => {
    const msg = 'Merge branch feature/x into main';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true);
  });

  test('skips Revert commits without further validation', () => {
    const msg = 'Revert "feat: bad change"';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true);
  });

  test('strips git comment lines before validating', () => {
    const msg =
      'feat: ship thing (TPL-001)\n\n# Please enter the commit message\n# Lines starting with # are ignored';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });
});

describe('validateCommitMessage — failures', () => {
  test('rejects empty message', () => {
    const result = validateCommitMessage('');
    assert.equal(result.ok, false);
    assert.match(result.errors[0], /empty/);
  });

  test('rejects header without conventional type', () => {
    const result = validateCommitMessage('hello world (TPL-001)');
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /allowed types/.test(e)));
  });

  test('rejects unknown type', () => {
    const result = validateCommitMessage('release: v1 (TPL-001)');
    assert.equal(result.ok, false);
  });

  test('rejects header missing colon-space', () => {
    const result = validateCommitMessage('feat:noSpace (TPL-001)');
    assert.equal(result.ok, false);
  });

  test('rejects header longer than 100 characters', () => {
    const summary = 'a'.repeat(120);
    const result = validateCommitMessage(`feat: ${summary} (TPL-001)`);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /≤ 100/.test(e)));
  });

  test('rejects header ending with a period', () => {
    const result = validateCommitMessage('feat: TPL-001 trailing period.');
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /period/.test(e)));
  });

  test('rejects body without a blank line after header', () => {
    const msg = 'feat: thing (TPL-001)\nimmediate body without blank line';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /blank line/.test(e)));
  });

  test('rejects message without a work-item ID', () => {
    const result = validateCommitMessage('feat: missing trace');
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => /work-item/.test(e)));
  });

  test('rejects lowercase work-item ID', () => {
    const result = validateCommitMessage('feat: tpl-001 lowercase ref');
    assert.equal(result.ok, false);
  });

  test('aggregates multiple errors at once', () => {
    const result = validateCommitMessage('FEAT: SHOUTING.');
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 2);
  });
});

describe('validateCommitMessage — line endings', () => {
  test('handles CRLF line endings', () => {
    const msg = 'feat: thing (TPL-001)\r\n\r\nbody line';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('ignores trailing blank lines (editor noise)', () => {
    const msg = 'fix: thing (TPL-001)\n\n\n\n';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });
});

// TPL-303 — multi-segment prefix support
describe('WORK_ITEM_PATTERN — multi-segment prefix extraction', () => {
  test('accepts single-segment ID AIC-130 in commit message', () => {
    const msg = 'fix: resolve collision (AIC-130)';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('accepts multi-segment ID AIC-DEV-167 in commit message', () => {
    const msg = 'feat(auth): add session store (AIC-DEV-167)';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('accepts three-segment ID RELEASE-Q1-FEAT-008 in commit message', () => {
    const msg = 'feat: ship the feature (RELEASE-Q1-FEAT-008)';
    const result = validateCommitMessage(msg);
    assert.equal(result.ok, true, result.errors.join('; '));
  });

  test('extractSliceIdFromHeader extracts AIC-DEV-167 correctly', () => {
    const id = extractSliceIdFromHeader('feat(auth): add session store (AIC-DEV-167)');
    assert.strictEqual(id, 'AIC-DEV-167');
  });

  test('extractSliceIdFromHeader extracts single-segment TPL-300 correctly', () => {
    const id = extractSliceIdFromHeader('refactor(slice-id): relax regex (TPL-300)');
    assert.strictEqual(id, 'TPL-300');
  });
});

describe('ALLOWED_TYPES — constant pin (CG-T3-1, TPL-241)', () => {
  const EXPECTED = ['feat', 'fix', 'docs', 'test', 'refactor', 'chore', 'perf', 'build', 'ci', 'style'];

  test('ALLOWED_TYPES has exactly 10 entries', () => {
    assert.equal(ALLOWED_TYPES.length, 10);
  });

  test('ALLOWED_TYPES contains the exact canonical set', () => {
    assert.deepEqual([...ALLOWED_TYPES].sort(), [...EXPECTED].sort());
  });
});
