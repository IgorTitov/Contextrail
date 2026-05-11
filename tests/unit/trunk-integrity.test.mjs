/* @HEADER
 * @version 0.7.74 | 2026-05-04
 * @purpose Unit tests for scripts/lib/trunk-integrity.mjs pure helpers (parsePushRefspecs, isPushToTrunk, isForcePush, classifyPush).
 * @sidecar trunk-integrity.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx trunk-integrity
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-259

/**
 * Unit tests for trunk-integrity.mjs (R8.5 / TPL-259).
 *
 * All tests cover pure functions only — no git, no filesystem, no I/O.
 * R1-compliant (no live-git writes, no cwd side-effects).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePushRefspecs,
  isPushToTrunk,
  isForcePush,
  classifyPush,
  TRUNK_BRANCHES,
  ZERO_SHA,
} from '../../scripts/lib/trunk-integrity.mjs';

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SHA_C = 'cccccccccccccccccccccccccccccccccccccccc';

// ---------------------------------------------------------------------------
// parsePushRefspecs
// ---------------------------------------------------------------------------
describe('parsePushRefspecs', () => {
  it('parses a single valid line', () => {
    const stdin = `refs/heads/main ${SHA_A} refs/heads/main ${SHA_B}\n`;
    const result = parsePushRefspecs(stdin);
    assert.equal(result.length, 1);
    assert.equal(result[0].localRef, 'refs/heads/main');
    assert.equal(result[0].localSha, SHA_A);
    assert.equal(result[0].remoteRef, 'refs/heads/main');
    assert.equal(result[0].remoteSha, SHA_B);
  });

  it('parses multiple lines', () => {
    const stdin = [
      `refs/heads/main ${SHA_A} refs/heads/main ${SHA_B}`,
      `refs/heads/feature ${SHA_C} refs/heads/feature ${ZERO_SHA}`,
    ].join('\n');
    const result = parsePushRefspecs(stdin);
    assert.equal(result.length, 2);
    assert.equal(result[1].remoteSha, ZERO_SHA);
  });

  it('returns empty array for empty string', () => {
    assert.deepEqual(parsePushRefspecs(''), []);
  });

  it('skips malformed lines (fewer than 4 tokens)', () => {
    const stdin = `refs/heads/main ${SHA_A} refs/heads/main\nvalid ${SHA_A} valid ${SHA_B}`;
    const result = parsePushRefspecs(stdin);
    assert.equal(result.length, 1, 'only valid line should be included');
    assert.equal(result[0].localRef, 'valid');
  });

  it('handles blank lines between refs', () => {
    const stdin = `\nrefs/heads/main ${SHA_A} refs/heads/main ${SHA_B}\n\n`;
    const result = parsePushRefspecs(stdin);
    assert.equal(result.length, 1);
  });
});

// ---------------------------------------------------------------------------
// isPushToTrunk
// ---------------------------------------------------------------------------
describe('isPushToTrunk', () => {
  it('returns true for full ref refs/heads/main', () => {
    assert.equal(isPushToTrunk({ remoteRef: 'refs/heads/main' }), true);
  });

  it('returns true for full ref refs/heads/master', () => {
    assert.equal(isPushToTrunk({ remoteRef: 'refs/heads/master' }), true);
  });

  it('returns false for feature branch', () => {
    assert.equal(isPushToTrunk({ remoteRef: 'refs/heads/feature-x' }), false);
  });

  it('returns false for tx-TPL-259 transport branch', () => {
    assert.equal(isPushToTrunk({ remoteRef: 'refs/heads/tx-TPL-259' }), false);
  });

  it('returns true using short name without refs/heads/ prefix', () => {
    assert.equal(isPushToTrunk({ remoteRef: 'main' }), true);
  });

  it('respects custom trunkBranches override', () => {
    assert.equal(isPushToTrunk({ remoteRef: 'refs/heads/develop' }, ['develop']), true);
    assert.equal(isPushToTrunk({ remoteRef: 'refs/heads/main' }, ['develop']), false);
  });
});

// ---------------------------------------------------------------------------
// isForcePush
// ---------------------------------------------------------------------------
describe('isForcePush', () => {
  it('returns false when remote is ZERO_SHA (first push to new branch)', () => {
    const refspec = { localSha: SHA_A, remoteSha: ZERO_SHA };
    assert.equal(isForcePush({ refspec, remoteIsAncestor: false }), false);
  });

  it('returns false when local is ZERO_SHA (deletion push)', () => {
    const refspec = { localSha: ZERO_SHA, remoteSha: SHA_B };
    assert.equal(isForcePush({ refspec, remoteIsAncestor: false }), false);
  });

  it('returns false when remote IS an ancestor of local (normal fast-forward)', () => {
    const refspec = { localSha: SHA_A, remoteSha: SHA_B };
    assert.equal(isForcePush({ refspec, remoteIsAncestor: true }), false);
  });

  it('returns true when remote is NOT an ancestor of local (force-push)', () => {
    const refspec = { localSha: SHA_A, remoteSha: SHA_B };
    assert.equal(isForcePush({ refspec, remoteIsAncestor: false }), true);
  });
});

// ---------------------------------------------------------------------------
// classifyPush
// ---------------------------------------------------------------------------
describe('classifyPush', () => {
  it('allows push when no force-push detected', () => {
    const trunkRefspecs = [
      {
        refspec: { localSha: SHA_A, remoteSha: SHA_B, remoteRef: 'refs/heads/main' },
        remoteIsAncestor: true,
      },
    ];
    const result = classifyPush({ trunkRefspecs, env: {} });
    assert.equal(result.allowed, true);
    assert.ok(!result.deniedReason);
  });

  it('denies push when force-push detected and no operator override', () => {
    const trunkRefspecs = [
      {
        refspec: { localSha: SHA_A, remoteSha: SHA_B, remoteRef: 'refs/heads/main' },
        remoteIsAncestor: false,
      },
    ];
    const result = classifyPush({ trunkRefspecs, env: {} });
    assert.equal(result.allowed, false);
    assert.ok(result.deniedReason.includes('force-push'));
    assert.ok(result.deniedReason.includes('refs/heads/main'));
  });

  it('allows force-push with full operator override (COA_OPERATOR=1 COA_FORCE_TRUNK=1)', () => {
    const trunkRefspecs = [
      {
        refspec: { localSha: SHA_A, remoteSha: SHA_B, remoteRef: 'refs/heads/main' },
        remoteIsAncestor: false,
      },
    ];
    const result = classifyPush({
      trunkRefspecs,
      env: { COA_OPERATOR: '1', COA_FORCE_TRUNK: '1' },
    });
    assert.equal(result.allowed, true);
    assert.equal(result.operatorOverride, true);
    assert.ok(Array.isArray(result.forcePushRefspecs));
    assert.equal(result.forcePushRefspecs.length, 1);
  });

  it('denies force-push with COA_OPERATOR=1 but missing COA_FORCE_TRUNK', () => {
    const trunkRefspecs = [
      {
        refspec: { localSha: SHA_A, remoteSha: SHA_B, remoteRef: 'refs/heads/main' },
        remoteIsAncestor: false,
      },
    ];
    const result = classifyPush({
      trunkRefspecs,
      env: { COA_OPERATOR: '1', COA_FORCE_TRUNK: undefined },
    });
    assert.equal(result.allowed, false);
  });

  it('denies force-push with COA_FORCE_TRUNK=1 but missing COA_OPERATOR', () => {
    const trunkRefspecs = [
      {
        refspec: { localSha: SHA_A, remoteSha: SHA_B, remoteRef: 'refs/heads/main' },
        remoteIsAncestor: false,
      },
    ];
    const result = classifyPush({
      trunkRefspecs,
      env: { COA_OPERATOR: undefined, COA_FORCE_TRUNK: '1' },
    });
    assert.equal(result.allowed, false);
  });

  it('allows push when trunkRefspecs is empty', () => {
    const result = classifyPush({ trunkRefspecs: [], env: {} });
    assert.equal(result.allowed, true);
    assert.ok(!result.deniedReason);
  });

  it('includes all forced refs in deniedReason when multiple forced', () => {
    const trunkRefspecs = [
      {
        refspec: { localSha: SHA_A, remoteSha: SHA_B, remoteRef: 'refs/heads/main' },
        remoteIsAncestor: false,
      },
      {
        refspec: { localSha: SHA_A, remoteSha: SHA_C, remoteRef: 'refs/heads/master' },
        remoteIsAncestor: false,
      },
    ];
    const result = classifyPush({ trunkRefspecs, env: {} });
    assert.equal(result.allowed, false);
    assert.equal(result.forcePushRefspecs.length, 2);
  });

  it('TRUNK_BRANCHES constant contains main and master', () => {
    assert.ok(TRUNK_BRANCHES.includes('main'));
    assert.ok(TRUNK_BRANCHES.includes('master'));
  });
});
