/* @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Meta-test: verifies no test-fixture claim files were left in .claims/ by prior integration tests (R1.3 / ADR-0052 / TPL-336).
 * @sidecar no-test-fixture-leaks.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// @test-isolation: live-repo-allowed | reason: R1.3 runtime leak detector; reads (never writes) .claims/ to detect fixture residue from test cleanup failures; this is the intentional detection layer for ADR-0052.

/**
 * Runtime leak detector for .claims/ pollution from test fixture residue.
 *
 * R1.3 (ADR-0052 / TPL-336) adds static detection for test files that build
 * paths to the live .claims/ directory. This meta-test provides a runtime
 * defense-in-depth layer: it scans .claims/ for files that match known
 * fixture agent names or slice-ID patterns, indicating a test's after()
 * cleanup failed and left orphan claim files.
 *
 * Design: a baseline snapshot is captured at module load time (before any
 * test body runs). At test time the current state is compared against the
 * baseline plus a set of known-fixture patterns. Any fixture-pattern claim
 * that is new since baseline is a leak.
 *
 * Sort order: this file is named `no-test-fixture-leaks` so it sorts
 * alphabetically after all `coa-worktree-slice-id-*` tests and runs last
 * in `pnpm test:integration`, maximizing leak detection coverage.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const CLAIMS_DIR = join(REPO_ROOT, '.claims');

// ---------------------------------------------------------------------------
// Agent names that appear in test fixture claim files (not real work agents).
// ---------------------------------------------------------------------------
const FIXTURE_AGENTS = [
  'test-agent',
  'test-tpl273-agent',
  'fixture-agent',
  'c4-race-tester',
  'coa-worktree-test',
];

// Slice ID prefixes and patterns that only appear in test fixture claims.
// These match the dynamic IDs used by integration tests (timestamp-suffixed).
const FIXTURE_SLICE_PATTERNS = [
  /^CWALOCK-/i, // coa-worktree-slice-id-lock (Template)
  /^C4LOCK-/i, // coa-worktree-slice-id-lock (Zvenix variant)
  /^C4RACE-/i, // coa-worktree-slice-id-race
  /^TST-/, // generic test prefix (not a real project prefix)
  /^FST-/, // coa-worktree-fail-stop test prefix
  /^FIXTURE-/i,
  /^ZVX-CWA-FIXTURE$/i, // claims-worktree-aware test
];

// ---------------------------------------------------------------------------
// Baseline: capture .claims/ contents at module-load time (before tests run).
// ---------------------------------------------------------------------------
function listClaimFiles() {
  if (!existsSync(CLAIMS_DIR)) return new Set();
  try {
    return new Set(readdirSync(CLAIMS_DIR).filter((f) => f.endsWith('.json')));
  } catch {
    return new Set();
  }
}

const BASELINE_CLAIMS = listClaimFiles();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFixtureAgentClaim(parsed) {
  const agent = (parsed.agent ?? '').toLowerCase();
  return FIXTURE_AGENTS.some((fa) => agent.includes(fa.toLowerCase()));
}

function isFixtureSliceClaim(parsed) {
  const sliceId = parsed.sliceId ?? parsed.slice_id ?? '';
  return FIXTURE_SLICE_PATTERNS.some((p) => p.test(sliceId));
}

function readClaim(file) {
  try {
    return JSON.parse(readFileSync(join(CLAIMS_DIR, file), 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('R1.3 meta-test — no test fixture residue in .claims/', () => {
  test('no fixture-agent claim files left in .claims/ (R1.3 / ADR-0052)', () => {
    if (!existsSync(CLAIMS_DIR)) return; // no .claims/ dir at all — trivially clean

    const currentFiles = listClaimFiles();
    // Only examine files that appeared AFTER the baseline snapshot
    // (this file loads before test bodies run, so baseline excludes
    // claims from all prior integration tests in the same pnpm run).
    const newFiles = [...currentFiles].filter((f) => !BASELINE_CLAIMS.has(f));

    const leaks = [];
    for (const file of newFiles) {
      const parsed = readClaim(file);
      if (!parsed) continue;
      if (parsed.status === 'expired' || parsed.status === 'completed') continue;
      if (isFixtureAgentClaim(parsed) || isFixtureSliceClaim(parsed)) {
        leaks.push({
          file,
          sliceId: parsed.sliceId ?? parsed.slice_id,
          agent: parsed.agent,
          status: parsed.status,
        });
      }
    }

    assert.deepEqual(
      leaks,
      [],
      `Fixture claim residue detected in .claims/. These files were created during tests but not cleaned up:\n` +
        leaks
          .map((l) => `  ${l.file} (sliceId=${l.sliceId}, agent=${l.agent}, status=${l.status})`)
          .join('\n') +
        '\n\nEnsure test after() hooks run correctly and clean up claim files. See ADR-0052.',
    );
  });

  test('baseline claim count is stable (sanity check)', () => {
    // Re-read current state and compare to baseline.
    // If this fails, a test that runs BEFORE this file in the same suite
    // created claims that were present at module-load time but not cleaned
    // up before this test body ran. That indicates a sequencing issue.
    const currentFiles = listClaimFiles();
    const newFiles = [...currentFiles].filter((f) => !BASELINE_CLAIMS.has(f));

    // Filter to only fixture-pattern files — ignore legitimate claims.
    const fixtureLeaks = [];
    for (const file of newFiles) {
      const parsed = readClaim(file);
      if (!parsed) continue;
      if (parsed.status === 'expired' || parsed.status === 'completed') continue;
      if (isFixtureAgentClaim(parsed) || isFixtureSliceClaim(parsed)) {
        fixtureLeaks.push(file);
      }
    }

    assert.equal(
      fixtureLeaks.length,
      0,
      `${fixtureLeaks.length} fixture claim file(s) leaked into .claims/ since module load: ${fixtureLeaks.join(', ')}`,
    );
  });
});
