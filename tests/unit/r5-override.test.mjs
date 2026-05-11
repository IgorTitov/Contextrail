/* @HEADER
 * @version 0.8.11 | 2026-05-11
 * @purpose Unit tests for scripts/lib/r5-override.mjs — consumeOverride validates TTL, category, coverage; COA_OPERATOR=1 alone is refused.
 * @sidecar r5-override.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Refs: TPL-329 (rationale-file override, ADR-0047)

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  consumeOverride,
  VALID_CATEGORIES,
  TTL_MS,
  CLOCK_SKEW_TOLERANCE_MS,
} from '../../scripts/lib/r5-override.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpRoot;

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'r5-unit-'));
  mkdirSync(join(tmpRoot, '.coa'), { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

function writeOverride(obj) {
  writeFileSync(join(tmpRoot, '.coa', 'r5-override.json'), JSON.stringify(obj, null, 2), 'utf8');
}

function freshTimestamp() {
  return new Date().toISOString();
}

function validOverride(overrides = {}) {
  return {
    timestamp: freshTimestamp(),
    slice_id: 'TPL-329',
    reason: 'Emergency hotfix: transport ceremony unavailable due to corrupted worktree state.',
    expected_files: ['scripts/checks/main-worktree-guard.mjs'],
    category: 'hotfix-trunk-blocked',
    ...overrides,
  };
}

function logFiles() {
  const logDir = join(tmpRoot, '.coa', 'r5-override-log');
  if (!existsSync(logDir)) return [];
  return readdirSync(logDir).filter((f) => f !== '.gitkeep');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('consumeOverride', () => {
  test('valid file → ok=true + logEntry/logPath returned with consumed_at', () => {
    // consumeOverride is now pure-validation (Gap 3 / TPL-331 / ADR-0047 Revision 1).
    // Side effects (write log, git add, delete override file) are the caller's job.
    // This test verifies the returned logEntry and logPath values.
    writeOverride(validOverride());
    const staged = ['scripts/checks/main-worktree-guard.mjs'];
    const result = consumeOverride(staged, tmpRoot);

    assert.equal(result.ok, true, `Expected ok but got: ${result.reason}`);
    assert.ok(result.logEntry, 'result.logEntry should be present on success');
    assert.ok(result.logPath, 'result.logPath should be present on success');
    assert.ok(result.logEntry.consumed_at, 'logEntry should have consumed_at field');
    assert.equal(result.logEntry.slice_id, 'TPL-329');

    // Override file should still exist — caller deletes it.
    assert.equal(
      existsSync(join(tmpRoot, '.coa', 'r5-override.json')),
      true,
      'consumeOverride must NOT delete the override file (caller responsibility)',
    );

    // Simulate caller side effects: write log + delete override.
    mkdirSync(join(tmpRoot, '.coa', 'r5-override-log'), { recursive: true });
    writeFileSync(result.logPath, JSON.stringify(result.logEntry, null, 2) + '\n', 'utf8');
    unlinkSync(join(tmpRoot, '.coa', 'r5-override.json'));

    const files = logFiles();
    assert.equal(files.length, 1, 'Exactly one log entry should be created by caller');
    const archived = JSON.parse(
      readFileSync(join(tmpRoot, '.coa', 'r5-override-log', files[0]), 'utf8'),
    );
    assert.ok(archived.consumed_at, 'archived entry should have consumed_at field');
  });

  test('missing file → refuse with clear message', () => {
    const result = consumeOverride(['foo.mjs'], tmpRoot);
    assert.equal(result.ok, false);
    assert.ok(
      result.reason.includes('No .coa/r5-override.json'),
      `Unexpected reason: ${result.reason}`,
    );
  });

  test('TTL-expired timestamp → refuse', () => {
    const expired = validOverride({
      timestamp: new Date(Date.now() - TTL_MS - 1000).toISOString(),
    });
    writeOverride(expired);
    const result = consumeOverride(['scripts/checks/main-worktree-guard.mjs'], tmpRoot);
    assert.equal(result.ok, false);
    assert.ok(result.reason.includes('TTL expired'), `Unexpected reason: ${result.reason}`);
  });

  test('invalid category → refuse and list valid categories', () => {
    writeOverride(validOverride({ category: 'not-a-real-category' }));
    const result = consumeOverride(['scripts/checks/main-worktree-guard.mjs'], tmpRoot);
    assert.equal(result.ok, false);
    assert.ok(result.reason.includes('category'), `Unexpected reason: ${result.reason}`);
    for (const c of VALID_CATEGORIES) {
      assert.ok(result.reason.includes(c), `Refusal should list valid category "${c}"`);
    }
  });

  test('short reason (<20 chars) → refuse', () => {
    writeOverride(validOverride({ reason: 'too short' }));
    const result = consumeOverride(['scripts/checks/main-worktree-guard.mjs'], tmpRoot);
    assert.equal(result.ok, false);
    assert.ok(result.reason.includes('20 characters'), `Unexpected reason: ${result.reason}`);
  });

  test('staged file not in expected_files → refuse and name the uncovered file', () => {
    writeOverride(
      validOverride({
        expected_files: ['scripts/checks/main-worktree-guard.mjs'],
      }),
    );
    const staged = ['scripts/checks/main-worktree-guard.mjs', 'scripts/lib/r5-override.mjs'];
    const result = consumeOverride(staged, tmpRoot);
    assert.equal(result.ok, false);
    assert.ok(
      result.reason.includes('scripts/lib/r5-override.mjs'),
      `Refusal should name the uncovered file. Got: ${result.reason}`,
    );
  });

  test('expected_files may contain extras not staged — still accepted', () => {
    writeOverride(
      validOverride({
        expected_files: ['scripts/checks/main-worktree-guard.mjs', 'CHANGELOG.md'],
      }),
    );
    const staged = ['scripts/checks/main-worktree-guard.mjs'];
    const result = consumeOverride(staged, tmpRoot);
    assert.equal(result.ok, true, `Expected ok but got: ${result.reason}`);
  });

  test('COA_OPERATOR=1 alone (no override file) → refuse — regression for old bypass', () => {
    // Regression: the old COA_OPERATOR=1 env-var bypass is closed by ADR-0047.
    // consumeOverride deliberately ignores COA_OPERATOR.
    const origOperator = process.env.COA_OPERATOR;
    process.env.COA_OPERATOR = '1';
    try {
      const result = consumeOverride(['foo.mjs'], tmpRoot);
      assert.equal(result.ok, false, 'consumeOverride must refuse even with COA_OPERATOR=1');
      assert.ok(
        result.reason.includes('No .coa/r5-override.json'),
        `Expected file-not-found message but got: ${result.reason}`,
      );
    } finally {
      if (origOperator === undefined) {
        delete process.env.COA_OPERATOR;
      } else {
        process.env.COA_OPERATOR = origOperator;
      }
    }
  });

  test('malformed JSON in override file → refuse with parse error', () => {
    writeFileSync(join(tmpRoot, '.coa', 'r5-override.json'), '{ not valid json', 'utf8');
    const result = consumeOverride(['foo.mjs'], tmpRoot);
    assert.equal(result.ok, false);
    assert.ok(result.reason.includes('parse'), `Unexpected reason: ${result.reason}`);
  });

  // ---------------------------------------------------------------------------
  // TPL-331 — Gap 1: far-future timestamp rejection
  // ---------------------------------------------------------------------------

  test('far-future timestamp (now + 1 hour) → refuse with timestamp-in-future', () => {
    // Closes whitehack Vector 3 from ADR-0047: an agent setting a far-future
    // timestamp to extend TTL. The check uses CLOCK_SKEW_TOLERANCE_MS (5s).
    const futureTs = new Date(Date.now() + 3_600_000).toISOString(); // 1 hour ahead
    writeOverride(validOverride({ timestamp: futureTs }));
    const result = consumeOverride(['scripts/checks/main-worktree-guard.mjs'], tmpRoot);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'timestamp-in-future', `Unexpected reason: ${result.reason}`);
  });

  // ---------------------------------------------------------------------------
  // TPL-331 — Gap 2: category × expected_files correlation
  // ---------------------------------------------------------------------------

  test('self-modifying-ceremony + non-ceremony file → refuse with category-files-mismatch', () => {
    // expected_files contains a path that does not match CEREMONY_PATH_PATTERNS.
    writeOverride(
      validOverride({
        category: 'self-modifying-ceremony',
        expected_files: ['foo/bar.js'],
      }),
    );
    const result = consumeOverride(['foo/bar.js'], tmpRoot);
    assert.equal(result.ok, false);
    assert.ok(
      result.reason.includes('category-files-mismatch'),
      `Reason should include 'category-files-mismatch'. Got: ${result.reason}`,
    );
    assert.ok(
      result.reason.includes('foo/bar.js'),
      `Reason should name the offending path. Got: ${result.reason}`,
    );
  });

  test('self-modifying-ceremony + only ceremony-pattern files → accepts', () => {
    // All expected_files match CEREMONY_PATH_PATTERNS — should be accepted.
    writeOverride(
      validOverride({
        category: 'self-modifying-ceremony',
        expected_files: ['scripts/coa-merge.mjs'],
      }),
    );
    const result = consumeOverride(['scripts/coa-merge.mjs'], tmpRoot);
    assert.equal(result.ok, true, `Expected ok but got: ${result.reason}`);
    assert.ok(result.logEntry, 'logEntry should be present on success');
  });
});
