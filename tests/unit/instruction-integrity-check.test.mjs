/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for instruction-integrity-check pure functions.
 * @sidecar instruction-integrity-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPermissions,
  checkHookExists,
  checkAnchor,
} from '../../scripts/checks/instruction-integrity-check.mjs';

// ---------------------------------------------------------------------------
// checkPermissions
// ---------------------------------------------------------------------------

describe('checkPermissions', () => {
  test('passes with current repo settings shape (no wildcard Bash)', () => {
    const settings = {
      permissions: {
        allow: ['Edit(/.claude/skills/header-sidecar/**)'],
      },
    };
    const { errors, warnings } = checkPermissions(settings);
    assert.equal(errors.length, 0);
    // deny list missing produces a warning, not an error
    assert.ok(warnings.some((w) => w.includes('deny')));
  });

  test('fails when permissions.allow contains Bash(*)', () => {
    const settings = {
      permissions: {
        allow: ['Bash(*)'],
        deny: ['rm -rf /'],
      },
    };
    const { errors } = checkPermissions(settings);
    assert.ok(errors.some((e) => e.includes('wildcard shell')));
  });

  test('fails when permissions.allow contains Bash(/**/*)', () => {
    const settings = {
      permissions: {
        allow: ['Bash(/**/*)', 'Edit(/.claude/**)'],
        deny: ['rm'],
      },
    };
    const { errors } = checkPermissions(settings);
    assert.ok(errors.some((e) => e.includes('wildcard shell')));
  });

  test('warns when permissions.deny is missing', () => {
    const settings = { permissions: { allow: [] } };
    const { errors, warnings } = checkPermissions(settings);
    assert.equal(errors.length, 0);
    assert.ok(warnings.some((w) => w.includes('deny')));
  });

  test('warns when permissions.deny is empty array', () => {
    const settings = { permissions: { allow: [], deny: [] } };
    const { errors, warnings } = checkPermissions(settings);
    assert.equal(errors.length, 0);
    assert.ok(warnings.some((w) => w.includes('deny')));
  });

  test('passes clean when deny list is populated and no wildcard Bash', () => {
    const settings = {
      permissions: {
        allow: ['Read(*)'],
        deny: ['rm -rf', 'curl | bash'],
      },
    };
    const { errors, warnings } = checkPermissions(settings);
    assert.equal(errors.length, 0);
    assert.equal(warnings.length, 0);
  });
});

// ---------------------------------------------------------------------------
// checkHookExists
// ---------------------------------------------------------------------------

describe('checkHookExists', () => {
  test('passes with existing pre-commit hook in current repo', async () => {
    const result = await checkHookExists('.githooks/pre-commit');
    assert.equal(result, null);
  });

  test('fails when hook path does not exist', async () => {
    const result = await checkHookExists('.githooks/nonexistent-hook');
    assert.ok(result !== null);
    assert.ok(result.includes('missing'));
  });
});

// ---------------------------------------------------------------------------
// checkAnchor
// ---------------------------------------------------------------------------

describe('checkAnchor', () => {
  test('passes when content contains compatibility-contract.json', () => {
    const content = 'See docs/agent-contract/compatibility-contract.json for details.';
    const result = checkAnchor(content, 'AGENTS.md');
    assert.equal(result, null);
  });

  test('fails when content lacks the anchor string', () => {
    const content = 'This file has no reference to the contract.';
    const result = checkAnchor(content, 'AGENTS.md');
    assert.ok(result !== null);
    assert.ok(result.includes('compatibility-contract.json'));
    assert.ok(result.includes('AGENTS.md'));
  });
});
