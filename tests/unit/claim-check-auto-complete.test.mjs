/* @HEADER
 * @version 0.7.66 | 2026-05-03
 * @purpose Unit tests for claim-check auto-complete caller self-identification (TPL-254): proves commit-author identity does not gate auto-complete; --agent= and --from-pre-commit-hook are the trust signals.
 * @sidecar claim-check-auto-complete.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-254 — Regression suite for auto-complete caller self-identification.
 *
 * Root cause: coa-merge step 9 called `--auto-complete --staged` with no
 * --agent= and no --from-pre-commit-hook. After a commit the staging area is
 * empty, so callerAgent could never be resolved → claim stayed active.
 *
 * Trust hierarchy (M4, post-TPL-254):
 *   1. --from-pre-commit-hook  (hook environment is the trust signal)
 *   2. --agent=<name>          (caller self-identification, matches claim.agent)
 *   3. commit-author match     NOT used — operators run as "Igor Titov"
 *                              regardless of which agent role owns the claim.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyAgentAuthorization,
  verifyClaimWorkCommitted,
  findCompletableClaims,
} from '../../scripts/checks/claim-check.mjs';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeActiveClaim(overrides = {}) {
  return {
    id: 'clm-tpl254-001',
    agent: 'feature-implementer',
    slice: 'TPL-254',
    created: new Date(Date.now() - 60_000).toISOString(),
    expires: new Date(Date.now() + 8 * 3600_000).toISOString(),
    status: 'active',
    targets: [
      { path: 'scripts/checks/claim-check.mjs', action: 'modify' },
      { path: 'docs/rules-registry.md', action: 'modify' },
    ],
    strategy: 'bba-additive',
    dependsOn: [],
    notes: '',
    ...overrides,
  };
}

function makeGitCmd(table) {
  return (args) => {
    const key = args.join(' ');
    if (Object.prototype.hasOwnProperty.call(table, key)) {
      return { stdout: '', stderr: '', status: 0, ...table[key] };
    }
    return { stdout: '', stderr: 'unknown git args', status: 128 };
  };
}

// ---------------------------------------------------------------------------
// Case 1 — Previously-failing case (TPL-254 core regression)
//
// Claim agent = "feature-implementer".
// Commit author = "Igor Titov" (typical operator git config — different from
// claim.agent). Caller passes --agent=feature-implementer --from-pre-commit-hook.
//
// Expected: BOTH gates pass. Commit author is NOT consulted.
// ---------------------------------------------------------------------------
describe('TPL-254 regression — commit author ≠ claim.agent does not block auto-complete', () => {
  const claim = makeActiveClaim();

  test('verifyAgentAuthorization authorizes when callerAgent=claim.agent (self-identification)', () => {
    // Simulate: caller passes --agent=feature-implementer
    // Operator git user.name is "Igor Titov" — irrelevant to this check
    const authz = verifyAgentAuthorization({
      claim,
      callerAgent: 'feature-implementer',
    });
    assert.equal(authz.authorized, true);
    assert.equal(authz.classification, 'self');
  });

  test('verifyClaimWorkCommitted passes with --from-pre-commit-hook (trusted context)', () => {
    // Simulate: hook passes --from-pre-commit-hook; HEAD has not yet moved
    // (pre-commit runs before finalization). No gitCmd needed — hook bypasses
    // the HEAD-verification gate entirely.
    const verification = verifyClaimWorkCommitted({
      claim,
      fromPreCommitHook: true,
    });
    assert.equal(verification.verified, true);
    assert.equal(verification.mode, 'pre-commit-hook');
  });

  test('full happy path: authz + work-verified with --agent= + --commit-hash (coa-merge step 9)', () => {
    // Simulate: coa-merge step 9 runs post-commit.
    // HEAD commit contains claim targets (authored by "Igor Titov").
    // Caller passes --agent=feature-implementer + --commit-hash=<HEAD>.
    const gitCmd = makeGitCmd({
      'cat-file -e abc7654': { status: 0 },
      'log -n 1 --format= --name-only abc7654': {
        status: 0,
        // "Igor Titov" is the git commit author; not relevant here
        stdout: 'scripts/checks/claim-check.mjs\ndocs/rules-registry.md\nVERSION\nCHANGELOG.md\n',
      },
    });

    const authz = verifyAgentAuthorization({
      claim,
      callerAgent: 'feature-implementer',
    });
    const verification = verifyClaimWorkCommitted({
      claim,
      gitCmd,
      commitHash: 'abc7654',
    });

    assert.equal(authz.authorized, true, 'authz should be authorized');
    assert.equal(authz.classification, 'self');
    assert.equal(verification.verified, true, 'work should be verified');
    assert.equal(verification.mode, 'commit-hash');
    assert.equal(verification.commitHash, 'abc7654');
  });

  test('findCompletableClaims finds claim when commit files match targets (post-commit source set)', () => {
    // Simulates the --commit-hash path in coa-merge step 9: sourceFiles comes
    // from the commit tree (not the empty staging area).
    const sourceFiles = [
      'scripts/checks/claim-check.mjs',
      'docs/rules-registry.md',
      'VERSION',
      'CHANGELOG.md',
      'package.json',
    ];
    const candidates = findCompletableClaims([claim], sourceFiles);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, claim.id);
  });
});

// ---------------------------------------------------------------------------
// Case 2 — Trusted-context trust path (--from-pre-commit-hook, no --agent=)
//
// The hook can omit --agent= if COA_AGENT is set or auto-detect finds the
// claim. verifyClaimWorkCommitted with fromPreCommitHook=true bypasses all
// commit checks regardless of who authored the commit.
// ---------------------------------------------------------------------------
describe('trusted-context path (--from-pre-commit-hook)', () => {
  const claim = makeActiveClaim();

  test('verifyClaimWorkCommitted bypasses HEAD check even with no gitCmd', () => {
    // No gitCmd supplied — fromPreCommitHook is the only input.
    // Should return verified without attempting any git call.
    const result = verifyClaimWorkCommitted({ claim, fromPreCommitHook: true });
    assert.equal(result.verified, true);
    assert.equal(result.mode, 'pre-commit-hook');
    assert.equal(result.commitHash, undefined);
  });

  test('verifyClaimWorkCommitted bypasses HEAD check even without a claim', () => {
    // The hook's post-success block fires regardless of which claim is active.
    const result = verifyClaimWorkCommitted({ fromPreCommitHook: true });
    assert.equal(result.verified, true);
    assert.equal(result.mode, 'pre-commit-hook');
  });

  test('verifyAgentAuthorization authorizes when agent auto-detected equals claim.agent', () => {
    // Simulates: auto-detect resolved callerAgent = 'feature-implementer'
    // from the most recently created active claim matching the staged set.
    const authz = verifyAgentAuthorization({
      claim,
      callerAgent: 'feature-implementer',
    });
    assert.equal(authz.authorized, true);
    assert.equal(authz.classification, 'self');
  });
});

// ---------------------------------------------------------------------------
// Case 3 — Security: no trust flags → refuses (Layer A gate)
//
// Calling --auto-complete without --agent= AND without --from-pre-commit-hook
// must be rejected. This prevents any session from completing another's claim
// just because the staging set happened to overlap.
// ---------------------------------------------------------------------------
describe('security: no trust flags → refused (Layer A)', () => {
  const claim = makeActiveClaim();

  test('verifyAgentAuthorization rejects when callerAgent is empty', () => {
    const result = verifyAgentAuthorization({ claim, callerAgent: '' });
    assert.equal(result.authorized, false);
    assert.equal(result.classification, null);
    assert.match(result.reason, /--agent/);
  });

  test('verifyAgentAuthorization rejects when callerAgent is missing', () => {
    const result = verifyAgentAuthorization({ claim });
    assert.equal(result.authorized, false);
    assert.equal(result.classification, null);
  });

  test('verifyClaimWorkCommitted rejects without gitCmd in non-hook context', () => {
    // Simulates: no --from-pre-commit-hook, no --commit-hash, no gitCmd
    const result = verifyClaimWorkCommitted({ claim });
    assert.equal(result.verified, false);
    assert.match(result.reason, /gitCmd/);
  });
});

// ---------------------------------------------------------------------------
// Case 4 — Security: wrong agent self-identification → silently skipped
//
// If caller passes --agent=different-agent and the claim's agent is
// "feature-implementer", the cross-agent-no-really classification means the
// claim is skipped (not completed, not hard-rejected), preserving the audit
// trail without blocking the caller's own claims.
// ---------------------------------------------------------------------------
describe('security: wrong agent → silently skipped (cross-agent-no-really)', () => {
  const claim = makeActiveClaim(); // agent = 'feature-implementer'

  test('verifyAgentAuthorization classifies as cross-agent-no-really for wrong agent', () => {
    const result = verifyAgentAuthorization({
      claim,
      callerAgent: 'different-agent',
    });
    assert.equal(result.authorized, false);
    assert.equal(result.classification, 'cross-agent-no-really');
    assert.match(result.reason, /different-agent/);
    assert.match(result.reason, /feature-implementer/);
  });

  test('verifyAgentAuthorization still rejects without --really even for slightly-different names', () => {
    // "feature-implementer " (trailing space trimmed) still matches — but a
    // genuinely different agent must not slip through a typo.
    const exact = verifyAgentAuthorization({
      claim,
      callerAgent: '  feature-implementer  ',
    });
    assert.equal(exact.authorized, true, 'trimmed equal should be authorized');

    const diff = verifyAgentAuthorization({
      claim,
      callerAgent: 'feature-implementer-2',
    });
    assert.equal(diff.authorized, false);
    assert.equal(diff.classification, 'cross-agent-no-really');
  });

  test('cross-agent with --really + non-empty reason is authorized (escape hatch)', () => {
    // Safety valve: aggregator can complete an orphaned claim with explicit
    // justification. This is the cross-agent escape path.
    const result = verifyAgentAuthorization({
      claim,
      callerAgent: 'aggregator',
      hasReally: true,
      reason: 'session orphaned; work confirmed in commit abc1234',
    });
    assert.equal(result.authorized, true);
    assert.equal(result.classification, 'cross-agent');
  });
});
