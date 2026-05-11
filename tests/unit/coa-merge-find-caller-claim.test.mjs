/* @HEADER
 * @version 0.7.118 | 2026-05-06
 * @purpose Unit tests for tiered pickCallerClaim scoring (TPL-311 / TPL-280 Incident #2).
 * @sidecar coa-merge-find-caller-claim.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * TPL-311 — `pickCallerClaim` disambiguation tests.
 *
 * Covers TPL-280 Incident #2 regression class: a parallel session's
 * claim created 1 ms after the caller's, intersecting on
 * VERSION/CHANGELOG.md/package.json, was wrong-picked by recency-only
 * sort. New behavior: agent identity > slice match > target overlap >
 * recency (tiebreak only).
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickCallerClaim,
  PICK_CALLER_CLAIM_TIERS,
} from '../../scripts/coa-merge.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function claim(overrides = {}) {
  return {
    id: 'clm-test',
    status: 'active',
    agent: 'feature-implementer',
    slice: 'TPL-X',
    targets: [{ path: 'VERSION' }],
    created: '2026-05-06T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Case 1 — single intersecting claim returns unconditionally (regression)
// ---------------------------------------------------------------------------

describe('pickCallerClaim: single-claim path', () => {
  test('single intersecting active claim → returned directly', () => {
    const c = claim({ id: 'clm-only' });
    const r = pickCallerClaim({
      claims: [c],
      stagedFiles: ['VERSION'],
      callerAgent: 'someone-else', // mismatched on purpose
      slice: 'TPL-OTHER',
    });
    assert.equal(r.ok, true);
    assert.equal(r.claim.id, 'clm-only');
    assert.equal(r.reason, 'unambiguous');
  });

  test('no claims → not-found', () => {
    const r = pickCallerClaim({ claims: [], stagedFiles: ['VERSION'] });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'not-found');
  });

  test('expired claim is filtered out', () => {
    const expired = claim({
      id: 'clm-expired',
      expires: '2020-01-01T00:00:00.000Z',
    });
    const r = pickCallerClaim({
      claims: [expired],
      stagedFiles: ['VERSION'],
      now: new Date('2026-05-06T10:00:00.000Z'),
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'not-found');
  });
});

// ---------------------------------------------------------------------------
// Case 2 — two active claims, one matches agent → returns matching agent's
// ---------------------------------------------------------------------------

describe('pickCallerClaim: tier 1 (agent identity)', () => {
  test('agent match wins over recency', () => {
    const older = claim({
      id: 'clm-older',
      agent: 'feature-implementer',
      created: '2026-05-06T10:00:00.000Z',
    });
    const newer = claim({
      id: 'clm-newer',
      agent: 'frontend-specialist',
      created: '2026-05-06T10:00:00.001Z', // 1ms newer (TPL-280 reproducer)
    });
    const r = pickCallerClaim({
      claims: [older, newer],
      stagedFiles: ['VERSION'],
      callerAgent: 'feature-implementer',
    });
    assert.equal(r.ok, true);
    assert.equal(r.claim.id, 'clm-older');
  });
});

// ---------------------------------------------------------------------------
// Case 3 — neither matches agent, one matches slice → slice wins
// ---------------------------------------------------------------------------

describe('pickCallerClaim: tier 2 (slice match)', () => {
  test('slice match wins when no agent match', () => {
    const a = claim({
      id: 'clm-a',
      agent: 'agent-x',
      slice: 'TPL-CALLER',
      created: '2026-05-06T10:00:00.000Z',
    });
    const b = claim({
      id: 'clm-b',
      agent: 'agent-y',
      slice: 'TPL-OTHER',
      created: '2026-05-06T10:00:00.001Z',
    });
    const r = pickCallerClaim({
      claims: [a, b],
      stagedFiles: ['VERSION'],
      callerAgent: null,
      slice: 'TPL-CALLER',
    });
    assert.equal(r.ok, true);
    assert.equal(r.claim.id, 'clm-a');
  });
});

// ---------------------------------------------------------------------------
// Case 4 — no agent/slice match, one has more target overlap → wins
// ---------------------------------------------------------------------------

describe('pickCallerClaim: tier 3 (target overlap)', () => {
  test('greater target overlap wins when tiers 1-2 tied', () => {
    const wide = claim({
      id: 'clm-wide',
      agent: 'agent-x',
      slice: 'TPL-X',
      targets: [
        { path: 'VERSION' },
        { path: 'CHANGELOG.md' },
        { path: 'package.json' },
      ],
      created: '2026-05-06T10:00:00.000Z',
    });
    const narrow = claim({
      id: 'clm-narrow',
      agent: 'agent-x',
      slice: 'TPL-X',
      targets: [{ path: 'VERSION' }],
      created: '2026-05-06T10:00:00.001Z',
    });
    const r = pickCallerClaim({
      claims: [wide, narrow],
      stagedFiles: ['VERSION', 'CHANGELOG.md', 'package.json'],
      callerAgent: 'agent-x',
      slice: 'TPL-X',
    });
    assert.equal(r.ok, true);
    assert.equal(r.claim.id, 'clm-wide');
  });
});

// ---------------------------------------------------------------------------
// Case 5 — total tie → ambiguous error
// ---------------------------------------------------------------------------

describe('pickCallerClaim: ambiguous tie', () => {
  test('two claims tied on all dimensions → ambiguous', () => {
    const t = '2026-05-06T10:00:00.000Z'; // identical created
    const a = claim({
      id: 'clm-a',
      agent: 'agent-x',
      slice: 'TPL-X',
      targets: [{ path: 'VERSION' }],
      created: t,
    });
    const b = claim({
      id: 'clm-b',
      agent: 'agent-x',
      slice: 'TPL-X',
      targets: [{ path: 'VERSION' }],
      created: t,
    });
    const r = pickCallerClaim({
      claims: [a, b],
      stagedFiles: ['VERSION'],
      callerAgent: 'agent-x',
      slice: 'TPL-X',
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'ambiguous');
    assert.equal(r.candidates.length, 2);
  });
});

// ---------------------------------------------------------------------------
// Case 6 — --claim-id override returns specified claim regardless of score
// ---------------------------------------------------------------------------

describe('pickCallerClaim: --claim-id operator override', () => {
  test('override picks specified claim even when scoring would prefer another', () => {
    const winner = claim({
      id: 'clm-would-win',
      agent: 'feature-implementer',
      slice: 'TPL-X',
      targets: [{ path: 'VERSION' }, { path: 'CHANGELOG.md' }],
      created: '2026-05-06T10:00:00.001Z',
    });
    const overridden = claim({
      id: 'clm-operator-pick',
      agent: 'other-agent',
      slice: 'TPL-OTHER',
      targets: [{ path: 'unrelated.mjs' }],
      created: '2026-05-06T10:00:00.000Z',
    });
    const r = pickCallerClaim({
      claims: [winner, overridden],
      stagedFiles: ['VERSION', 'CHANGELOG.md'],
      callerAgent: 'feature-implementer',
      slice: 'TPL-X',
      claimIdOverride: 'clm-operator-pick',
    });
    assert.equal(r.ok, true);
    assert.equal(r.claim.id, 'clm-operator-pick');
    assert.equal(r.reason, 'override');
  });

  test('override id missing from active claims → override-not-found', () => {
    const c = claim({ id: 'clm-real' });
    const r = pickCallerClaim({
      claims: [c],
      stagedFiles: ['VERSION'],
      claimIdOverride: 'clm-does-not-exist',
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'override-not-found');
  });

  test('override refuses to pick a non-active claim', () => {
    const completed = claim({ id: 'clm-done', status: 'completed' });
    const r = pickCallerClaim({
      claims: [completed],
      stagedFiles: ['VERSION'],
      claimIdOverride: 'clm-done',
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'override-not-found');
  });
});

// ---------------------------------------------------------------------------
// Case 7 — TPL-280 Incident #2 reproducer: recency must NOT override stronger
// agent/slice/target signals.
// ---------------------------------------------------------------------------

describe('pickCallerClaim: TPL-280 Incident #2 regression', () => {
  test('older claim with stronger tiers beats 1ms-newer claim with weaker tiers', () => {
    // Reproducer from the TPL-280 incident report: parallel session's
    // claim was created 1 ms after the caller's and intersected with
    // VERSION/CHANGELOG/package.json. Recency-only sort wrong-picked it.
    const callerClaim = claim({
      id: 'clm-a5c0ce',
      agent: 'feature-implementer',
      slice: 'TPL-280',
      targets: [
        { path: 'VERSION' },
        { path: 'CHANGELOG.md' },
        { path: 'package.json' },
      ],
      created: '2026-05-05T12:00:00.000Z',
    });
    const parallelClaim = claim({
      id: 'clm-683a3a',
      agent: 'other-agent',
      slice: 'TPL-292',
      targets: [
        { path: 'VERSION' },
        { path: 'CHANGELOG.md' },
        { path: 'package.json' },
      ],
      created: '2026-05-05T12:00:00.001Z', // 1ms newer
    });
    const r = pickCallerClaim({
      claims: [parallelClaim, callerClaim],
      stagedFiles: ['VERSION', 'CHANGELOG.md', 'package.json', 'AGENTS.md'],
      callerAgent: 'feature-implementer',
      slice: 'TPL-280',
    });
    assert.equal(r.ok, true);
    assert.equal(
      r.claim.id,
      'clm-a5c0ce',
      'Tier 1 (agent) + Tier 2 (slice) must beat 1ms recency advantage',
    );
  });

  test('recency only resolves true tiebreak (no discriminating signal)', () => {
    // Both claims tie on agent (none), slice (none), and target overlap.
    // Recency tiebreak picks the newer.
    const older = claim({
      id: 'clm-older',
      agent: 'agent-x',
      slice: 'TPL-X',
      targets: [{ path: 'VERSION' }],
      created: '2026-05-06T10:00:00.000Z',
    });
    const newer = claim({
      id: 'clm-newer',
      agent: 'agent-x',
      slice: 'TPL-X',
      targets: [{ path: 'VERSION' }],
      created: '2026-05-06T10:00:00.001Z',
    });
    const r = pickCallerClaim({
      claims: [older, newer],
      stagedFiles: ['VERSION'],
      callerAgent: null, // no discriminator
      slice: null,
    });
    assert.equal(r.ok, true);
    assert.equal(r.claim.id, 'clm-newer');
  });
});

// ---------------------------------------------------------------------------
// Tier weights — sanity check the spacing
// ---------------------------------------------------------------------------

describe('PICK_CALLER_CLAIM_TIERS', () => {
  test('tier weights are spaced wide enough for realistic claim counts', () => {
    const { AGENT_MATCH, SLICE_MATCH, TARGET_OVERLAP } = PICK_CALLER_CLAIM_TIERS;
    // Tier 1 must beat tier 2 + a realistic target overlap (≤ 40).
    // Realistic claims cover at most a handful of files.
    assert.ok(AGENT_MATCH > SLICE_MATCH + TARGET_OVERLAP * 40);
    assert.ok(SLICE_MATCH > TARGET_OVERLAP * 40);
  });
});
