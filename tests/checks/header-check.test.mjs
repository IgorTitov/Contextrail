/* @HEADER
 * @version 0.7.67 | 2026-05-03
 * @purpose Unit + meta tests for header-check.mjs: untracked-file exclusion (TPL-253), agent-memory exemption, and checkNotesForLLMFiller.
 * @sidecar header-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isHeaderExempt,
  HEADER_EXEMPT_PREFIXES,
} from '../../scripts/lib/header.mjs';
import { checkNotesForLLMFiller } from '../../scripts/checks/header-check.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const HEADER_CHECK_SRC = readFileSync(
  join(REPO_ROOT, 'scripts', 'checks', 'header-check.mjs'),
  'utf8',
);
const HEADER_LIB_SRC = readFileSync(join(REPO_ROOT, 'scripts', 'lib', 'header.mjs'), 'utf8');

// ---------------------------------------------------------------------------
// agent-memory exemption (AC1 + AC4, TPL-253)
// ---------------------------------------------------------------------------

describe('header-check — agent-memory exemption', () => {
  test('.claude/agent-memory/MEMORY.md is exempt', () => {
    assert.equal(isHeaderExempt('.claude/agent-memory/MEMORY.md'), true);
  });

  test('.claude/agent-memory/project/foo.md is exempt', () => {
    assert.equal(isHeaderExempt('.claude/agent-memory/project/foo.md'), true);
  });

  test('HEADER_EXEMPT_PREFIXES includes .claude/agent-memory/', () => {
    assert.ok(
      HEADER_EXEMPT_PREFIXES.includes('.claude/agent-memory/'),
      'HEADER_EXEMPT_PREFIXES must contain .claude/agent-memory/ (TPL-253)',
    );
  });
});

// ---------------------------------------------------------------------------
// Tracked-only file discovery (AC2 + AC3 + AC4, TPL-253)
// Meta-tests verify source-level invariants so no live git repo is needed.
// ---------------------------------------------------------------------------

describe('header-check — tracked-only file discovery (meta, TPL-253)', () => {
  test('header-check.mjs imports collectTrackedFiles (not collectRepoFiles) for default mode', () => {
    assert.ok(
      HEADER_CHECK_SRC.includes('collectTrackedFiles'),
      'header-check.mjs must use collectTrackedFiles for the default (non-changed) scan',
    );
    assert.ok(
      !HEADER_CHECK_SRC.includes('collectRepoFiles'),
      'header-check.mjs must NOT use collectRepoFiles (includes --others untracked files)',
    );
  });

  test('header-check.mjs imports collectChangedTrackedFiles for --changed mode', () => {
    assert.ok(
      HEADER_CHECK_SRC.includes('collectChangedTrackedFiles'),
      'header-check.mjs must use collectChangedTrackedFiles for --changed mode',
    );
    assert.ok(
      !HEADER_CHECK_SRC.includes('changedRepoFiles'),
      'header-check.mjs must NOT use changedRepoFiles (includes --others untracked files)',
    );
  });

  test('collectTrackedFiles does NOT use ls-files --others (untracked files)', () => {
    // Extract the function body up to its closing brace — stops before any trailing docblock.
    const fnStart = HEADER_LIB_SRC.indexOf('export async function collectTrackedFiles()');
    assert.ok(fnStart !== -1, 'collectTrackedFiles must exist in header.mjs');
    // Locate the closing `\n}` of this specific function (first `\n}` after fnStart).
    const fnEnd = HEADER_LIB_SRC.indexOf('\n}', fnStart) + 2;
    const fnBody = HEADER_LIB_SRC.slice(fnStart, fnEnd);

    assert.ok(
      !fnBody.includes('--others'),
      'collectTrackedFiles must not use ls-files --others (would include untracked files)',
    );
    assert.ok(
      fnBody.includes('--cached'),
      'collectTrackedFiles must use ls-files --cached (tracked + staged files)',
    );
  });

  test('collectChangedTrackedFiles does NOT use ls-files --others', () => {
    const fnStart = HEADER_LIB_SRC.indexOf('export async function collectChangedTrackedFiles()');
    assert.ok(fnStart !== -1, 'collectChangedTrackedFiles must exist in header.mjs');
    const fnEnd = HEADER_LIB_SRC.indexOf('\n}', fnStart) + 2;
    const fnBody = HEADER_LIB_SRC.slice(fnStart, fnEnd);

    assert.ok(
      !fnBody.includes('--others'),
      'collectChangedTrackedFiles must not use ls-files --others',
    );
  });
});

// ---------------------------------------------------------------------------
// isHeaderExempt — positive and negative cases (AC2)
// ---------------------------------------------------------------------------

describe('header-check — isHeaderExempt contract', () => {
  test('tracked source files are NOT exempt', () => {
    assert.equal(isHeaderExempt('scripts/checks/header-check.mjs'), false);
    assert.equal(isHeaderExempt('modules/auth/domain/auth-service.mjs'), false);
  });

  test('.agents/ prefix is exempt (pre-existing behavior preserved)', () => {
    assert.equal(isHeaderExempt('.agents/skills/foo/SKILL.md'), true);
    assert.equal(isHeaderExempt('.agents/README.md'), true);
  });

  test('docs/analysis/session-summaries/ is exempt (pre-existing behavior preserved)', () => {
    assert.equal(isHeaderExempt('docs/analysis/session-summaries/2026-05-04_foo.md'), true);
  });
});

// ---------------------------------------------------------------------------
// checkNotesForLLMFiller — exported pure function
// ---------------------------------------------------------------------------

describe('checkNotesForLLMFiller', () => {
  test('returns ok when notesForLLM is absent', () => {
    assert.deepEqual(checkNotesForLLMFiller('purpose: does something\n'), { ok: true });
  });

  test('returns ok for a specific, non-filler note', () => {
    const sidecar = 'notesForLLM: Never call this after the index is sealed — causes silent data loss\n';
    assert.deepEqual(checkNotesForLLMFiller(sidecar), { ok: true });
  });

  test('rejects "Test in isolation" standalone filler', () => {
    // "Test in isolation" alone — no leading "Core X logic" to trigger the first guard.
    const result = checkNotesForLLMFiller('notesForLLM: Test in isolation\n');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'test-in-isolation-filler');
  });

  test('rejects "X for the Y module" filler', () => {
    const result = checkNotesForLLMFiller('notesForLLM: Logic for the auth module.\n');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'x-for-the-y-module');
  });

  test('rejects "Core X logic" filler (generic-core-logic reason)', () => {
    // "Core domain logic." starts with "Core \w+ logic" — first guard fires.
    const result = checkNotesForLLMFiller('notesForLLM: Core domain logic.\n');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'generic-core-logic');
  });

  test('rejects pure core-layer variant without "logic" suffix', () => {
    // "Core domain." does NOT match "Core \w+ logic" — falls through to the layer guard.
    const result = checkNotesForLLMFiller('notesForLLM: Core domain.\n');
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'generic-core-layer');
  });
});
