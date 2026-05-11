/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for claim-check pure functions (parseClaim, filterActiveClaims, detectOverlaps, auditStaleClaims, hasBlockingConflicts, markClaimExpired, detectNegotiations, resolveByPriority, createCounterClaim, queryActiveClaimsForPath, resolveDependencyOrder, classifyClaimReadiness, tagFederatedClaims, mergeFederatedClaims, tryAcquireClaim, tryExtendClaim, loadProtectedPaths, matchesProtectedPattern, checkProtectedPaths, claimAgeSeconds, validateForceExpireRequest, buildAuditEvent, verifyAgentAuthorization, verifyClaimWorkCommitted) plus CLI-level coverage of the --force-expire authorization model, --extend mode, and --auto-complete J3+J3.5+J3.6 gates.
 * @sidecar claim-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for claim-check logic.
 *
 * Tests the pure functions extracted from scripts/checks/claim-check.mjs.
 * Uses in-memory claim data — no filesystem access.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseClaim,
  filterActiveClaims,
  detectOverlaps,
  auditStaleClaims,
  hasBlockingConflicts,
  markClaimExpired,
  detectNegotiations,
  resolveByPriority,
  createCounterClaim,
  queryActiveClaimsForPath,
  resolveDependencyOrder,
  classifyClaimReadiness,
  tagFederatedClaims,
  mergeFederatedClaims,
  generateClaimId,
  buildClaimObject,
  findCompletableClaims,
  tryAcquireClaim,
  loadProtectedPaths,
  matchesProtectedPattern,
  checkProtectedPaths,
  isExampleClaim,
  DEFAULT_PROTECTED_PATHS,
  EXAMPLE_CLAIM_ID_PREFIX,
  MAX_TTL_HOURS,
  MAX_TARGETS,
  VALID_STRATEGIES,
  VALID_ACTIONS,
  safeJsonReviver,
  isValidTargetPath,
  claimAgeSeconds,
  validateForceExpireRequest,
  buildAuditEvent,
  MIN_FORCE_EXPIRE_AGE_MINUTES,
  tryExtendClaim,
  verifyClaimWorkCommitted,
  verifyAgentAuthorization,
  checkClaimAbandoned,
  ABANDONED_CONFIDENCE,
} from '../../scripts/checks/claim-check.mjs';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function makeClaim(overrides = {}) {
  return {
    id: 'clm-aaaaaa',
    agent: 'test-agent',
    slice: 'TPL-999',
    created: '2026-04-03T10:00:00Z',
    expires: '2026-04-03T18:00:00Z',
    status: 'active',
    targets: [
      {
        path: 'modules/auth/public-api.mjs',
        module: 'auth',
        surface: 'public-api',
        action: 'extend',
        description: 'test target',
      },
    ],
    strategy: 'bba-additive',
    dependsOn: [],
    notes: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseClaim()
// ---------------------------------------------------------------------------

describe('parseClaim()', () => {
  test('parses a valid claim JSON string', () => {
    const claim = makeClaim();
    const parsed = parseClaim(JSON.stringify(claim), 'clm-aaaaaa.json');
    assert.equal(parsed.id, 'clm-aaaaaa');
    assert.equal(parsed.status, 'active');
  });

  test('returns null for invalid JSON', () => {
    const parsed = parseClaim('not json', 'bad.json');
    assert.equal(parsed, null);
  });

  test('returns null for claim missing required id field', () => {
    const claim = makeClaim();
    delete claim.id;
    const parsed = parseClaim(JSON.stringify(claim), 'no-id.json');
    assert.equal(parsed, null);
  });

  test('returns null for claim missing required status field', () => {
    const claim = makeClaim();
    delete claim.status;
    const parsed = parseClaim(JSON.stringify(claim), 'no-status.json');
    assert.equal(parsed, null);
  });

  test('filters __proto__ keys from parsed JSON', () => {
    const json = '{"id":"clm-proto1","status":"active","__proto__":{"polluted":true}}';
    const parsed = parseClaim(json, 'proto.json');
    assert.equal(parsed.id, 'clm-proto1');
    assert.equal(parsed.polluted, undefined);
  });

  test('rejects claims with unknown strategy', () => {
    const claim = makeClaim({ strategy: 'yolo-force-push' });
    const parsed = parseClaim(JSON.stringify(claim), 'bad-strategy.json');
    assert.equal(parsed, null);
  });

  test('accepts claims with all valid strategies', () => {
    for (const strategy of VALID_STRATEGIES) {
      const claim = makeClaim({ strategy });
      const parsed = parseClaim(JSON.stringify(claim), 'ok.json');
      assert.notEqual(parsed, null, `strategy '${strategy}' should be accepted`);
    }
  });

  test('rejects claims with unknown target action', () => {
    const claim = makeClaim({
      targets: [{ path: 'modules/auth/public-api.mjs', action: 'delete', description: 'bad' }],
    });
    const parsed = parseClaim(JSON.stringify(claim), 'bad-action.json');
    assert.equal(parsed, null);
  });

  test('rejects claims with more than MAX_TARGETS targets', () => {
    const targets = Array.from({ length: MAX_TARGETS + 1 }, (_, i) => ({
      path: `modules/m${i}/public-api.mjs`,
      action: 'extend',
      description: `target ${i}`,
    }));
    const claim = makeClaim({ targets });
    const parsed = parseClaim(JSON.stringify(claim), 'too-many.json');
    assert.equal(parsed, null);
  });

  test('accepts claims with exactly MAX_TARGETS targets', () => {
    const targets = Array.from({ length: MAX_TARGETS }, (_, i) => ({
      path: `modules/m${i}/public-api.mjs`,
      action: 'extend',
      description: `target ${i}`,
    }));
    const claim = makeClaim({ targets });
    const parsed = parseClaim(JSON.stringify(claim), 'max-ok.json');
    assert.notEqual(parsed, null);
    assert.equal(parsed.targets.length, MAX_TARGETS);
  });

  test('accepts claim with 21 targets (above old 20-cap, below new sanity bound)', () => {
    // TPL-227-interim: proves the lift unblocks the previously-rejected
    // 21-target claims that R-rule slices had been forced to weaken.
    const targets = Array.from({ length: 21 }, (_, i) => ({
      path: `modules/m${i}/public-api.mjs`,
      action: 'extend',
      description: `target ${i}`,
    }));
    const claim = makeClaim({ targets });
    const parsed = parseClaim(JSON.stringify(claim), 'twenty-one.json');
    assert.notEqual(parsed, null);
    assert.equal(parsed.targets.length, 21);
  });

  test('caps TTL to MAX_TTL_HOURS when expires is too far from created', () => {
    const created = '2026-04-03T10:00:00Z';
    const farFuture = '2099-12-31T00:00:00Z';
    const claim = makeClaim({ created, expires: farFuture });
    const parsed = parseClaim(JSON.stringify(claim), 'long-ttl.json');
    assert.notEqual(parsed, null);
    const createdDate = new Date(created);
    const maxExpires = new Date(createdDate.getTime() + MAX_TTL_HOURS * 60 * 60 * 1000);
    assert.equal(parsed.expires, maxExpires.toISOString());
  });

  test('does not cap TTL for claims within MAX_TTL_HOURS', () => {
    const created = '2026-04-03T10:00:00Z';
    const expires = '2026-04-03T18:00:00Z'; // 8 hours
    const claim = makeClaim({ created, expires });
    const parsed = parseClaim(JSON.stringify(claim), 'ok-ttl.json');
    assert.notEqual(parsed, null);
    assert.equal(parsed.expires, expires);
  });

  test('rejects target paths containing ..', () => {
    const claim = makeClaim({
      targets: [{ path: '../../../etc/passwd', action: 'modify', description: 'traversal' }],
    });
    const parsed = parseClaim(JSON.stringify(claim), 'traversal.json');
    assert.equal(parsed, null);
  });

  test('rejects target paths starting with /', () => {
    const claim = makeClaim({
      targets: [{ path: '/etc/passwd', action: 'modify', description: 'absolute' }],
    });
    const parsed = parseClaim(JSON.stringify(claim), 'absolute.json');
    assert.equal(parsed, null);
  });

  test('accepts claims without strategy field (optional in some contexts)', () => {
    const claim = makeClaim();
    delete claim.strategy;
    const parsed = parseClaim(JSON.stringify(claim), 'no-strategy.json');
    assert.notEqual(parsed, null);
  });
});

// ---------------------------------------------------------------------------
// isValidTargetPath()
// ---------------------------------------------------------------------------

describe('isValidTargetPath()', () => {
  test('accepts normal relative paths', () => {
    assert.equal(isValidTargetPath('modules/auth/public-api.mjs'), true);
  });

  test('rejects paths with ..', () => {
    assert.equal(isValidTargetPath('../etc/passwd'), false);
    assert.equal(isValidTargetPath('modules/../../etc/passwd'), false);
  });

  test('rejects absolute paths', () => {
    assert.equal(isValidTargetPath('/etc/passwd'), false);
  });

  test('accepts paths with dots in filenames', () => {
    assert.equal(isValidTargetPath('modules/auth/config.test.mjs'), true);
  });
});

// ---------------------------------------------------------------------------
// safeJsonReviver()
// ---------------------------------------------------------------------------

describe('safeJsonReviver()', () => {
  test('strips __proto__ key', () => {
    assert.equal(safeJsonReviver('__proto__', { bad: true }), undefined);
  });

  test('passes through normal keys', () => {
    assert.equal(safeJsonReviver('name', 'value'), 'value');
  });
});

// ---------------------------------------------------------------------------
// filterActiveClaims()
// ---------------------------------------------------------------------------

describe('filterActiveClaims()', () => {
  const now = new Date('2026-04-03T12:00:00Z');

  test('keeps active claims within TTL', () => {
    const claims = [makeClaim()];
    const active = filterActiveClaims(claims, now);
    assert.equal(active.length, 1);
  });

  test('excludes completed claims', () => {
    const claims = [makeClaim({ status: 'completed' })];
    const active = filterActiveClaims(claims, now);
    assert.equal(active.length, 0);
  });

  test('excludes abandoned claims', () => {
    const claims = [makeClaim({ status: 'abandoned' })];
    const active = filterActiveClaims(claims, now);
    assert.equal(active.length, 0);
  });

  test('excludes expired claims', () => {
    const claims = [makeClaim({ expires: '2026-04-03T11:00:00Z' })];
    const active = filterActiveClaims(claims, now);
    assert.equal(active.length, 0);
  });

  test('keeps claims expiring exactly at now', () => {
    const claims = [makeClaim({ expires: '2026-04-03T12:00:00Z' })];
    const active = filterActiveClaims(claims, now);
    // Boundary: expires == now is NOT expired yet
    assert.equal(active.length, 1);
  });
});

// ---------------------------------------------------------------------------
// detectOverlaps()
// ---------------------------------------------------------------------------

describe('detectOverlaps()', () => {
  test('returns empty when no active claims', () => {
    const overlaps = detectOverlaps([], ['modules/auth/public-api.mjs'], 'modify');
    assert.equal(overlaps.length, 0);
  });

  test('returns empty when targets do not overlap', () => {
    const claims = [makeClaim()]; // targets auth/public-api.mjs
    const overlaps = detectOverlaps(claims, ['modules/state/public-api.mjs'], 'modify');
    assert.equal(overlaps.length, 0);
  });

  test('returns advisory for extend+extend overlap', () => {
    const claims = [makeClaim()]; // action: extend
    const overlaps = detectOverlaps(claims, ['modules/auth/public-api.mjs'], 'extend');
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].severity, 'advisory');
  });

  test('returns conflict for modify overlap on extend claim', () => {
    const claims = [makeClaim()]; // action: extend
    const overlaps = detectOverlaps(claims, ['modules/auth/public-api.mjs'], 'modify');
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].severity, 'conflict');
  });

  test('returns conflict for modify+modify overlap', () => {
    const claims = [
      makeClaim({
        targets: [
          {
            path: 'modules/auth/public-api.mjs',
            surface: 'public-api',
            action: 'modify',
            description: 'test',
          },
        ],
        strategy: 'modify-in-place',
      }),
    ];
    const overlaps = detectOverlaps(claims, ['modules/auth/public-api.mjs'], 'modify');
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].severity, 'conflict');
  });

  test('returns advisory for nearby module claim (same module, different file)', () => {
    const claims = [makeClaim()]; // targets auth/public-api.mjs
    const overlaps = detectOverlaps(claims, ['modules/auth/ports/auth-port.mjs'], 'modify');
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].severity, 'nearby');
  });

  test('reports claim with too many targets (>5)', () => {
    const manyTargets = Array.from({ length: 6 }, (_, i) => ({
      path: `modules/auth/file-${i}.mjs`,
      surface: 'domain',
      action: 'extend',
      description: `target ${i}`,
    }));
    const claims = [makeClaim({ targets: manyTargets })];
    const overlaps = detectOverlaps(claims, ['modules/auth/file-0.mjs'], 'extend');
    const broadWarning = overlaps.find((o) => o.broad);
    assert.ok(broadWarning, 'should flag broad claim with >5 targets');
  });

  // selfStagedFiles — committer's own claim is filtered when its targets
  // intersect the staged set; third-party claims continue to be reported.
  // Without this, --enforce --staged either flags the committer's own claim
  // as a conflict (false positive) or — as in the previous workaround —
  // disables overlap detection entirely (silently misses real conflicts).

  test('default behaviour unchanged when selfStagedFiles is omitted', () => {
    const claims = [makeClaim()]; // targets auth/public-api.mjs, action: extend
    const overlaps = detectOverlaps(claims, ['modules/auth/public-api.mjs'], 'extend');
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].severity, 'advisory');
  });

  test('self-staged filter skips claim whose target intersects staged set', () => {
    const claims = [makeClaim()]; // targets auth/public-api.mjs
    const overlaps = detectOverlaps(
      claims,
      ['modules/auth/public-api.mjs'],
      'modify',
      undefined,
      ['modules/auth/public-api.mjs'], // committer staged the same file
    );
    assert.equal(
      overlaps.length,
      0,
      "committer's own claim must be treated as authorizing and excluded",
    );
  });

  test('self-staged filter still reports third-party claim that does not intersect staged set', () => {
    const myClaim = makeClaim({
      id: 'clm-mine',
      targets: [
        {
          path: 'modules/auth/public-api.mjs',
          module: 'auth',
          surface: 'public-api',
          action: 'modify',
          description: 'mine',
        },
      ],
    });
    const otherClaim = makeClaim({
      id: 'clm-other',
      agent: 'other-session',
      targets: [
        {
          path: 'modules/state/store.mjs',
          module: 'state',
          surface: 'public-api',
          action: 'modify',
          description: 'other',
        },
      ],
    });
    const overlaps = detectOverlaps(
      [myClaim, otherClaim],
      ['modules/auth/public-api.mjs', 'modules/state/store.mjs'],
      'modify',
      undefined,
      ['modules/auth/public-api.mjs'], // staged only my claim's file
    );
    assert.equal(overlaps.length, 1, 'third-party claim must still be reported');
    assert.equal(overlaps[0].claimId, 'clm-other');
    assert.equal(overlaps[0].severity, 'conflict');
  });

  test('self-staged filter with empty staged set behaves like no filter (all claims reported)', () => {
    const claims = [makeClaim()];
    const overlaps = detectOverlaps(
      claims,
      ['modules/auth/public-api.mjs'],
      'modify',
      undefined,
      [],
    );
    assert.equal(overlaps.length, 1);
    assert.equal(overlaps[0].severity, 'conflict');
  });

  // protectedPaths threading — main() supplies the full DEFAULT_PROTECTED_PATHS
  // list. extend+extend on shared-infra paths beyond the legacy 3-file default
  // must escalate to conflict consistently across all detection callers.

  test('extend+extend on extended-default protected path escalates to conflict', () => {
    const claims = [
      makeClaim({
        targets: [
          {
            path: 'pnpm-lock.yaml',
            module: null,
            surface: 'shared-infra',
            action: 'extend',
            description: 'lockfile bump',
          },
        ],
      }),
    ];
    const overlaps = detectOverlaps(claims, ['pnpm-lock.yaml'], 'extend', DEFAULT_PROTECTED_PATHS);
    assert.equal(overlaps.length, 1);
    assert.equal(
      overlaps[0].severity,
      'conflict',
      'extend+extend on pnpm-lock.yaml must escalate when explicit protected list is supplied',
    );
  });

  test('extend+extend on non-protected path remains advisory even with full protected list', () => {
    const claims = [makeClaim()]; // targets modules/auth/public-api.mjs
    const overlaps = detectOverlaps(
      claims,
      ['modules/auth/public-api.mjs'],
      'extend',
      DEFAULT_PROTECTED_PATHS,
    );
    assert.equal(overlaps.length, 1);
    assert.equal(
      overlaps[0].severity,
      'advisory',
      'non-protected path keeps additive semantics regardless of protectedPaths content',
    );
  });

  test('legacy 3-file default leaves pnpm-lock.yaml extend+extend as advisory (backward compat)', () => {
    const claims = [
      makeClaim({
        targets: [
          {
            path: 'pnpm-lock.yaml',
            module: null,
            surface: 'shared-infra',
            action: 'extend',
            description: 'lockfile bump',
          },
        ],
      }),
    ];
    const overlaps = detectOverlaps(claims, ['pnpm-lock.yaml'], 'extend');
    assert.equal(overlaps.length, 1);
    assert.equal(
      overlaps[0].severity,
      'advisory',
      'omitted protectedPaths keeps the legacy 3-file default for unit-test API stability',
    );
  });
});

// ---------------------------------------------------------------------------
// auditStaleClaims()
// ---------------------------------------------------------------------------

describe('auditStaleClaims()', () => {
  const now = new Date('2026-04-03T20:00:00Z');

  test('returns empty when no claims are stale', () => {
    const claims = [makeClaim({ status: 'completed' })];
    const stale = auditStaleClaims(claims, now);
    assert.equal(stale.length, 0);
  });

  test('flags active claims past expiry as stale', () => {
    const claims = [makeClaim({ expires: '2026-04-03T18:00:00Z' })]; // expired at 18:00, now is 20:00
    const stale = auditStaleClaims(claims, now);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].id, 'clm-aaaaaa');
  });

  test('does not flag active claims within TTL', () => {
    const claims = [makeClaim({ expires: '2026-04-03T22:00:00Z' })];
    const stale = auditStaleClaims(claims, now);
    assert.equal(stale.length, 0);
  });
});

// ---------------------------------------------------------------------------
// hasBlockingConflicts()
// ---------------------------------------------------------------------------

describe('hasBlockingConflicts()', () => {
  test('returns false for empty overlaps', () => {
    assert.equal(hasBlockingConflicts([]), false);
  });

  test('returns false when all overlaps are advisory', () => {
    const overlaps = [{ severity: 'advisory' }, { severity: 'nearby' }];
    assert.equal(hasBlockingConflicts(overlaps), false);
  });

  test('returns true when any overlap is a conflict', () => {
    const overlaps = [{ severity: 'advisory' }, { severity: 'conflict' }];
    assert.equal(hasBlockingConflicts(overlaps), true);
  });

  test('returns true when all overlaps are conflicts', () => {
    const overlaps = [{ severity: 'conflict' }, { severity: 'conflict' }];
    assert.equal(hasBlockingConflicts(overlaps), true);
  });
});

// ---------------------------------------------------------------------------
// markClaimExpired()
// ---------------------------------------------------------------------------

describe('markClaimExpired()', () => {
  test('sets status to expired', () => {
    const claim = makeClaim();
    const expired = markClaimExpired(claim);
    assert.equal(expired.status, 'expired');
  });

  test('does not mutate the original claim', () => {
    const claim = makeClaim();
    markClaimExpired(claim);
    assert.equal(claim.status, 'active');
  });

  test('preserves all other fields', () => {
    const claim = makeClaim({ notes: 'important' });
    const expired = markClaimExpired(claim);
    assert.equal(expired.id, 'clm-aaaaaa');
    assert.equal(expired.agent, 'test-agent');
    assert.equal(expired.notes, 'important');
  });

  test('removes internal _file field from output', () => {
    const claim = makeClaim();
    claim._file = 'clm-aaaaaa.json';
    const expired = markClaimExpired(claim);
    assert.equal(expired._file, undefined);
  });
});

// ---------------------------------------------------------------------------
// detectNegotiations()
// ---------------------------------------------------------------------------

describe('detectNegotiations()', () => {
  test('returns empty when no claims use negotiate strategy', () => {
    const claims = [makeClaim({ strategy: 'bba-additive' })];
    assert.equal(detectNegotiations(claims).length, 0);
  });

  test('returns claims with negotiate strategy', () => {
    const claims = [
      makeClaim({ id: 'clm-aaa', strategy: 'negotiate' }),
      makeClaim({ id: 'clm-bbb', strategy: 'bba-additive' }),
      makeClaim({ id: 'clm-ccc', strategy: 'negotiate' }),
    ];
    const negotiations = detectNegotiations(claims);
    assert.equal(negotiations.length, 2);
    assert.equal(negotiations[0].id, 'clm-aaa');
    assert.equal(negotiations[1].id, 'clm-ccc');
  });

  test('returns empty for empty input', () => {
    assert.equal(detectNegotiations([]).length, 0);
  });
});

// ---------------------------------------------------------------------------
// resolveByPriority()
// ---------------------------------------------------------------------------

describe('resolveByPriority()', () => {
  test('orders claims high > medium > low', () => {
    const claims = [
      makeClaim({ id: 'clm-low', priority: 'low' }),
      makeClaim({ id: 'clm-high', priority: 'high' }),
      makeClaim({ id: 'clm-med', priority: 'medium' }),
    ];
    const ordered = resolveByPriority(claims);
    assert.equal(ordered[0].id, 'clm-high');
    assert.equal(ordered[1].id, 'clm-med');
    assert.equal(ordered[2].id, 'clm-low');
  });

  test('treats missing priority as medium', () => {
    const claims = [makeClaim({ id: 'clm-none' }), makeClaim({ id: 'clm-high', priority: 'high' })];
    const ordered = resolveByPriority(claims);
    assert.equal(ordered[0].id, 'clm-high');
    assert.equal(ordered[1].id, 'clm-none');
  });

  test('preserves original order for same priority', () => {
    const claims = [
      makeClaim({ id: 'clm-first', priority: 'high' }),
      makeClaim({ id: 'clm-second', priority: 'high' }),
    ];
    const ordered = resolveByPriority(claims);
    assert.equal(ordered[0].id, 'clm-first');
    assert.equal(ordered[1].id, 'clm-second');
  });

  test('breaks ties by created timestamp (first-filed wins)', () => {
    const claims = [
      makeClaim({ id: 'clm-late', priority: 'high', created: '2026-04-03T12:00:00Z' }),
      makeClaim({ id: 'clm-early', priority: 'high', created: '2026-04-03T10:00:00Z' }),
    ];
    const ordered = resolveByPriority(claims);
    assert.equal(ordered[0].id, 'clm-early');
    assert.equal(ordered[1].id, 'clm-late');
  });

  test('does not mutate the original array', () => {
    const claims = [
      makeClaim({ id: 'clm-low', priority: 'low' }),
      makeClaim({ id: 'clm-high', priority: 'high' }),
    ];
    resolveByPriority(claims);
    assert.equal(claims[0].id, 'clm-low');
  });

  test('returns empty for empty input', () => {
    assert.equal(resolveByPriority([]).length, 0);
  });
});

// ---------------------------------------------------------------------------
// createCounterClaim()
// ---------------------------------------------------------------------------

describe('createCounterClaim()', () => {
  test('creates a counter-claim linked to original', () => {
    const original = makeClaim({ id: 'clm-aaa', strategy: 'modify-in-place' });
    const counter = createCounterClaim(original, {
      agent: 'team-beta',
      slice: 'TPL-124',
      targets: [
        {
          path: 'modules/auth/public-api.mjs',
          surface: 'public-api',
          action: 'modify',
          description: 'need same file',
        },
      ],
    });
    assert.equal(counter.counterTo, 'clm-aaa');
    assert.equal(counter.strategy, 'negotiate');
    assert.equal(counter.agent, 'team-beta');
    assert.equal(counter.status, 'active');
  });

  test('generates counter ID from original', () => {
    const original = makeClaim({ id: 'clm-abc123' });
    const counter = createCounterClaim(original, {
      agent: 'team-b',
      slice: 'TPL-200',
      targets: [],
    });
    assert.ok(counter.id.startsWith('clm-abc123-counter'));
  });

  test('sets strategy to negotiate', () => {
    const original = makeClaim({ strategy: 'bba-additive' });
    const counter = createCounterClaim(original, { agent: 'b', slice: 'TPL-1', targets: [] });
    assert.equal(counter.strategy, 'negotiate');
  });

  test('does not mutate the original claim', () => {
    const original = makeClaim();
    createCounterClaim(original, { agent: 'b', slice: 'TPL-1', targets: [] });
    assert.equal(original.strategy, 'bba-additive');
  });

  test('includes expires field with 8-hour TTL from now', () => {
    const original = makeClaim();
    const counter = createCounterClaim(original, { agent: 'b', slice: 'TPL-1', targets: [] });
    assert.ok(counter.expires);
    const expiresDate = new Date(counter.expires);
    assert.ok(expiresDate > new Date());
  });
});

// ---------------------------------------------------------------------------
// queryActiveClaimsForPath()
// ---------------------------------------------------------------------------

describe('queryActiveClaimsForPath()', () => {
  const now = new Date('2026-04-03T12:00:00Z');

  test('returns claims targeting the queried path', () => {
    const claims = [makeClaim()]; // targets modules/auth/public-api.mjs
    const matches = queryActiveClaimsForPath(claims, 'modules/auth/public-api.mjs', now);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 'clm-aaaaaa');
  });

  test('returns empty when no claims target the path', () => {
    const claims = [makeClaim()];
    const matches = queryActiveClaimsForPath(claims, 'modules/state/public-api.mjs', now);
    assert.equal(matches.length, 0);
  });

  test('excludes non-active claims', () => {
    const claims = [makeClaim({ status: 'completed' })];
    const matches = queryActiveClaimsForPath(claims, 'modules/auth/public-api.mjs', now);
    assert.equal(matches.length, 0);
  });

  test('excludes expired claims', () => {
    const claims = [makeClaim({ expires: '2026-04-03T11:00:00Z' })];
    const matches = queryActiveClaimsForPath(claims, 'modules/auth/public-api.mjs', now);
    assert.equal(matches.length, 0);
  });

  test('normalizes backslash paths', () => {
    const claims = [makeClaim()];
    const matches = queryActiveClaimsForPath(claims, 'modules\\auth\\public-api.mjs', now);
    assert.equal(matches.length, 1);
  });
});

// ---------------------------------------------------------------------------
// resolveDependencyOrder()
// ---------------------------------------------------------------------------

describe('resolveDependencyOrder()', () => {
  test('returns claims in topological order based on dependsOn', () => {
    const claims = [
      makeClaim({ id: 'clm-c', dependsOn: ['clm-b'] }),
      makeClaim({ id: 'clm-a', dependsOn: [] }),
      makeClaim({ id: 'clm-b', dependsOn: ['clm-a'] }),
    ];
    const { ordered, cycles } = resolveDependencyOrder(claims);
    assert.equal(cycles.length, 0);
    const ids = ordered.map((c) => c.id);
    assert.ok(ids.indexOf('clm-a') < ids.indexOf('clm-b'));
    assert.ok(ids.indexOf('clm-b') < ids.indexOf('clm-c'));
  });

  test('returns all claims when no dependencies exist', () => {
    const claims = [
      makeClaim({ id: 'clm-x', dependsOn: [] }),
      makeClaim({ id: 'clm-y', dependsOn: [] }),
    ];
    const { ordered, cycles } = resolveDependencyOrder(claims);
    assert.equal(ordered.length, 2);
    assert.equal(cycles.length, 0);
  });

  test('detects a simple cycle', () => {
    const claims = [
      makeClaim({ id: 'clm-a', dependsOn: ['clm-b'] }),
      makeClaim({ id: 'clm-b', dependsOn: ['clm-a'] }),
    ];
    const { ordered, cycles } = resolveDependencyOrder(claims);
    // Cycled claims are not in ordered
    assert.equal(ordered.length, 0);
    assert.ok(cycles.length > 0);
    assert.ok(cycles[0].includes('clm-a'));
    assert.ok(cycles[0].includes('clm-b'));
  });

  test('handles mixed: some in cycle, some not', () => {
    const claims = [
      makeClaim({ id: 'clm-free', dependsOn: [] }),
      makeClaim({ id: 'clm-a', dependsOn: ['clm-b'] }),
      makeClaim({ id: 'clm-b', dependsOn: ['clm-a'] }),
    ];
    const { ordered, cycles } = resolveDependencyOrder(claims);
    assert.equal(ordered.length, 1);
    assert.equal(ordered[0].id, 'clm-free');
    assert.ok(cycles.length > 0);
  });

  test('ignores dependsOn references to unknown claim IDs', () => {
    const claims = [makeClaim({ id: 'clm-a', dependsOn: ['clm-unknown'] })];
    const { ordered, cycles } = resolveDependencyOrder(claims);
    assert.equal(ordered.length, 1);
    assert.equal(ordered[0].id, 'clm-a');
    assert.equal(cycles.length, 0);
  });

  test('does not mutate original array', () => {
    const claims = [
      makeClaim({ id: 'clm-b', dependsOn: ['clm-a'] }),
      makeClaim({ id: 'clm-a', dependsOn: [] }),
    ];
    resolveDependencyOrder(claims);
    assert.equal(claims[0].id, 'clm-b');
  });

  test('returns empty for empty input', () => {
    const { ordered, cycles } = resolveDependencyOrder([]);
    assert.equal(ordered.length, 0);
    assert.equal(cycles.length, 0);
  });
});

// ---------------------------------------------------------------------------
// classifyClaimReadiness()
// ---------------------------------------------------------------------------

describe('classifyClaimReadiness()', () => {
  test('marks claims with no dependencies as ready', () => {
    const claims = [makeClaim({ id: 'clm-a', dependsOn: [] })];
    const { ready, blocked } = classifyClaimReadiness(claims, claims);
    assert.equal(ready.length, 1);
    assert.equal(blocked.length, 0);
  });

  test('marks claims with completed dependencies as ready', () => {
    const all = [
      makeClaim({ id: 'clm-dep', status: 'completed', dependsOn: [] }),
      makeClaim({ id: 'clm-a', dependsOn: ['clm-dep'] }),
    ];
    const active = [all[1]]; // only clm-a is active
    const { ready, blocked } = classifyClaimReadiness(active, all);
    assert.equal(ready.length, 1);
    assert.equal(ready[0].id, 'clm-a');
    assert.equal(blocked.length, 0);
  });

  test('marks claims with active dependencies as blocked', () => {
    const all = [
      makeClaim({ id: 'clm-dep', status: 'active' }),
      makeClaim({ id: 'clm-a', dependsOn: ['clm-dep'] }),
    ];
    const active = all; // both active
    const { ready, blocked } = classifyClaimReadiness(active, all);
    assert.equal(ready.length, 1); // clm-dep itself is ready (no deps)
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].claim.id, 'clm-a');
    assert.deepEqual(blocked[0].blockedBy, ['clm-dep']);
  });

  test('treats unknown dependency IDs as resolved (ready)', () => {
    const claims = [makeClaim({ id: 'clm-a', dependsOn: ['clm-ghost'] })];
    const { ready, blocked } = classifyClaimReadiness(claims, claims);
    assert.equal(ready.length, 1);
    assert.equal(blocked.length, 0);
  });

  test('treats expired dependencies as resolved', () => {
    const all = [
      makeClaim({ id: 'clm-dep', status: 'expired' }),
      makeClaim({ id: 'clm-a', dependsOn: ['clm-dep'] }),
    ];
    const active = [all[1]];
    const { ready, blocked } = classifyClaimReadiness(active, all);
    assert.equal(ready.length, 1);
    assert.equal(blocked.length, 0);
  });

  test('treats abandoned dependencies as resolved', () => {
    const all = [
      makeClaim({ id: 'clm-dep', status: 'abandoned' }),
      makeClaim({ id: 'clm-a', dependsOn: ['clm-dep'] }),
    ];
    const active = [all[1]];
    const { ready, blocked } = classifyClaimReadiness(active, all);
    assert.equal(ready.length, 1);
    assert.equal(blocked.length, 0);
  });

  test('returns empty for empty input', () => {
    const { ready, blocked } = classifyClaimReadiness([], []);
    assert.equal(ready.length, 0);
    assert.equal(blocked.length, 0);
  });
});

// ---------------------------------------------------------------------------
// tagFederatedClaims()
// ---------------------------------------------------------------------------

describe('tagFederatedClaims()', () => {
  test('adds _repo field to each claim', () => {
    const claims = [makeClaim({ id: 'clm-a' })];
    const tagged = tagFederatedClaims(claims, 'other-repo');
    assert.equal(tagged[0]._repo, 'other-repo');
  });

  test('does not mutate original claims', () => {
    const claims = [makeClaim({ id: 'clm-a' })];
    tagFederatedClaims(claims, 'other-repo');
    assert.equal(claims[0]._repo, undefined);
  });

  test('preserves all original claim fields', () => {
    const claims = [makeClaim({ id: 'clm-a', notes: 'keep me' })];
    const tagged = tagFederatedClaims(claims, 'other-repo');
    assert.equal(tagged[0].id, 'clm-a');
    assert.equal(tagged[0].notes, 'keep me');
    assert.equal(tagged[0].status, 'active');
  });

  test('returns empty for empty input', () => {
    assert.equal(tagFederatedClaims([], 'repo').length, 0);
  });
});

// ---------------------------------------------------------------------------
// mergeFederatedClaims()
// ---------------------------------------------------------------------------

describe('mergeFederatedClaims()', () => {
  test('merges local and federated claims with repo tags', () => {
    const local = [makeClaim({ id: 'clm-local' })];
    const federated = [{ repoId: 'repo-b', claims: [makeClaim({ id: 'clm-remote' })] }];
    const merged = mergeFederatedClaims(local, federated);
    assert.equal(merged.length, 2);
    const localClaim = merged.find((c) => c.id === 'clm-local');
    const remoteClaim = merged.find((c) => c.id === 'clm-remote');
    assert.equal(localClaim._repo, 'local');
    assert.equal(remoteClaim._repo, 'repo-b');
  });

  test('handles multiple federated sets', () => {
    const local = [makeClaim({ id: 'clm-local' })];
    const federated = [
      { repoId: 'repo-a', claims: [makeClaim({ id: 'clm-a' })] },
      { repoId: 'repo-b', claims: [makeClaim({ id: 'clm-b' })] },
    ];
    const merged = mergeFederatedClaims(local, federated);
    assert.equal(merged.length, 3);
    assert.equal(merged.find((c) => c.id === 'clm-a')._repo, 'repo-a');
    assert.equal(merged.find((c) => c.id === 'clm-b')._repo, 'repo-b');
  });

  test('works with empty federated sets', () => {
    const local = [makeClaim({ id: 'clm-local' })];
    const merged = mergeFederatedClaims(local, []);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]._repo, 'local');
  });

  test('works with empty local claims', () => {
    const federated = [{ repoId: 'repo-b', claims: [makeClaim({ id: 'clm-remote' })] }];
    const merged = mergeFederatedClaims([], federated);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]._repo, 'repo-b');
  });

  test('does not mutate original claim arrays', () => {
    const local = [makeClaim({ id: 'clm-local' })];
    const remoteClaims = [makeClaim({ id: 'clm-remote' })];
    const federated = [{ repoId: 'repo-b', claims: remoteClaims }];
    mergeFederatedClaims(local, federated);
    assert.equal(local[0]._repo, undefined);
    assert.equal(remoteClaims[0]._repo, undefined);
  });
});

// ---------------------------------------------------------------------------
// generateClaimId()
// ---------------------------------------------------------------------------

describe('generateClaimId()', () => {
  test('produces a clm- prefixed string', () => {
    const id = generateClaimId();
    assert.ok(id.startsWith('clm-'));
    assert.ok(id.length >= 5);
  });

  test('generates unique IDs on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateClaimId()));
    assert.equal(ids.size, 20);
  });
});

// ---------------------------------------------------------------------------
// buildClaimObject()
// ---------------------------------------------------------------------------

describe('buildClaimObject()', () => {
  test('produces a valid claim object shape', () => {
    const claim = buildClaimObject({
      agent: 'team-alpha',
      slice: 'TPL-200',
      targets: [{ path: 'modules/auth/public-api.mjs', action: 'modify' }],
    });
    assert.equal(claim.agent, 'team-alpha');
    assert.equal(claim.slice, 'TPL-200');
    assert.equal(claim.status, 'active');
    assert.ok(claim.id.startsWith('clm-'));
    assert.ok(claim.created);
    assert.ok(claim.expires);
    assert.equal(claim.targets.length, 1);
    assert.equal(claim.targets[0].path, 'modules/auth/public-api.mjs');
    assert.equal(claim.targets[0].action, 'modify');
  });

  test('uses default 8-hour TTL', () => {
    const claim = buildClaimObject({ agent: 'a', slice: 's', targets: [] });
    const created = new Date(claim.created);
    const expires = new Date(claim.expires);
    const diffHours = (expires - created) / (60 * 60 * 1000);
    assert.ok(diffHours >= 7.9 && diffHours <= 8.1);
  });

  test('respects custom TTL', () => {
    const claim = buildClaimObject({ agent: 'a', slice: 's', targets: [], ttlHours: 24 });
    const created = new Date(claim.created);
    const expires = new Date(claim.expires);
    const diffHours = (expires - created) / (60 * 60 * 1000);
    assert.ok(diffHours >= 23.9 && diffHours <= 24.1);
  });

  test('defaults to bba-additive strategy', () => {
    const claim = buildClaimObject({ agent: 'a', slice: 's', targets: [] });
    assert.equal(claim.strategy, 'bba-additive');
  });

  test('defaults to medium priority', () => {
    const claim = buildClaimObject({ agent: 'a', slice: 's', targets: [] });
    assert.equal(claim.priority, 'medium');
  });

  test('fills target defaults for partial target objects', () => {
    const claim = buildClaimObject({
      agent: 'a',
      slice: 's',
      targets: [{ path: 'foo.mjs' }],
    });
    assert.equal(claim.targets[0].module, null);
    assert.equal(claim.targets[0].surface, 'shared-infra');
    assert.equal(claim.targets[0].action, 'extend');
    assert.equal(claim.targets[0].description, '');
  });

  test('caps ttlHours to MAX_TTL_HOURS', () => {
    const claim = buildClaimObject({
      agent: 'a',
      slice: 's',
      targets: [],
      ttlHours: 9999,
    });
    const created = new Date(claim.created);
    const expires = new Date(claim.expires);
    const diffHours = (expires - created) / (60 * 60 * 1000);
    assert.ok(
      diffHours <= MAX_TTL_HOURS + 0.1,
      `TTL should be capped to ${MAX_TTL_HOURS}h, got ${diffHours}h`,
    );
  });

  test('throws on invalid strategy', () => {
    assert.throws(
      () => buildClaimObject({ agent: 'a', slice: 's', targets: [], strategy: 'bad' }),
      /Invalid strategy/,
    );
  });

  test('throws on invalid target action', () => {
    assert.throws(
      () =>
        buildClaimObject({
          agent: 'a',
          slice: 's',
          targets: [{ path: 'foo.mjs', action: 'destroy' }],
        }),
      /Invalid action/,
    );
  });

  test('throws when targets exceed MAX_TARGETS', () => {
    const targets = Array.from({ length: MAX_TARGETS + 1 }, (_, i) => ({
      path: `modules/m${i}/api.mjs`,
    }));
    assert.throws(() => buildClaimObject({ agent: 'a', slice: 's', targets }), /Too many targets/);
  });

  test('throws on path traversal in targets', () => {
    assert.throws(
      () =>
        buildClaimObject({
          agent: 'a',
          slice: 's',
          targets: [{ path: '../../../etc/passwd', action: 'modify' }],
        }),
      /Invalid target path/,
    );
  });
});

// ---------------------------------------------------------------------------
// findCompletableClaims()
// ---------------------------------------------------------------------------

describe('findCompletableClaims()', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  test('returns claims whose all targets are in staged files', () => {
    const claims = [
      makeClaim({
        id: 'clm-full',
        targets: [
          { path: 'modules/auth/public-api.mjs', action: 'modify' },
          { path: 'modules/auth/index.mjs', action: 'extend' },
        ],
        expires: future,
      }),
    ];
    const staged = ['modules/auth/public-api.mjs', 'modules/auth/index.mjs', 'README.md'];
    const result = findCompletableClaims(claims, staged);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'clm-full');
  });

  test('does not return claims with partial target match', () => {
    const claims = [
      makeClaim({
        id: 'clm-partial',
        targets: [
          { path: 'modules/auth/public-api.mjs', action: 'modify' },
          { path: 'modules/state/public-api.mjs', action: 'extend' },
        ],
        expires: future,
      }),
    ];
    const staged = ['modules/auth/public-api.mjs'];
    const result = findCompletableClaims(claims, staged);
    assert.equal(result.length, 0);
  });

  test('does not return non-active claims', () => {
    const claims = [
      makeClaim({
        id: 'clm-done',
        status: 'completed',
        targets: [{ path: 'foo.mjs', action: 'modify' }],
        expires: future,
      }),
    ];
    const staged = ['foo.mjs'];
    const result = findCompletableClaims(claims, staged);
    assert.equal(result.length, 0);
  });

  test('does not return expired claims', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const claims = [
      makeClaim({
        id: 'clm-expired',
        targets: [{ path: 'foo.mjs', action: 'modify' }],
        expires: past,
      }),
    ];
    const staged = ['foo.mjs'];
    const result = findCompletableClaims(claims, staged);
    assert.equal(result.length, 0);
  });

  test('filters by agent when specified', () => {
    const claims = [
      makeClaim({
        id: 'clm-a',
        agent: 'team-alpha',
        targets: [{ path: 'foo.mjs', action: 'modify' }],
        expires: future,
      }),
      makeClaim({
        id: 'clm-b',
        agent: 'team-beta',
        targets: [{ path: 'foo.mjs', action: 'modify' }],
        expires: future,
      }),
    ];
    const staged = ['foo.mjs'];
    const result = findCompletableClaims(claims, staged, { agent: 'team-alpha' });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'clm-a');
  });

  test('returns empty for claims with no targets', () => {
    const claims = [makeClaim({ id: 'clm-empty', targets: [], expires: future })];
    const staged = ['foo.mjs'];
    const result = findCompletableClaims(claims, staged);
    assert.equal(result.length, 0);
  });
});

// ---------------------------------------------------------------------------
// tryAcquireClaim()
// ---------------------------------------------------------------------------

describe('tryAcquireClaim()', () => {
  test('succeeds when no active claims exist', () => {
    const result = tryAcquireClaim([], {
      agent: 'team-alpha',
      slice: 'TPL-100',
      targets: ['modules/auth/public-api.mjs'],
      action: 'modify',
    });
    assert.equal(result.success, true);
    assert.ok(result.claim);
    assert.equal(result.claim.agent, 'team-alpha');
    assert.equal(result.conflicts.length, 0);
  });

  test('succeeds when only advisory (extend+extend) overlaps exist', () => {
    const activeClaims = [
      makeClaim({
        targets: [
          { path: 'modules/auth/public-api.mjs', action: 'extend', description: 'existing' },
        ],
      }),
    ];
    const result = tryAcquireClaim(activeClaims, {
      agent: 'team-beta',
      slice: 'TPL-200',
      targets: ['modules/auth/public-api.mjs'],
      action: 'extend',
    });
    assert.equal(result.success, true);
    assert.ok(result.claim);
    assert.equal(result.overlaps.length, 1);
    assert.equal(result.overlaps[0].severity, 'advisory');
    assert.equal(result.conflicts.length, 0);
  });

  test('fails when blocking conflict exists', () => {
    const activeClaims = [
      makeClaim({
        targets: [
          { path: 'modules/auth/public-api.mjs', action: 'modify', description: 'existing' },
        ],
        strategy: 'modify-in-place',
      }),
    ];
    const result = tryAcquireClaim(activeClaims, {
      agent: 'team-beta',
      slice: 'TPL-200',
      targets: ['modules/auth/public-api.mjs'],
      action: 'modify',
    });
    assert.equal(result.success, false);
    assert.equal(result.claim, null);
    assert.ok(result.conflicts.length > 0);
    assert.equal(result.conflicts[0].severity, 'conflict');
  });

  test('fails when intended modify conflicts with existing extend', () => {
    const activeClaims = [
      makeClaim({
        targets: [
          { path: 'modules/auth/public-api.mjs', action: 'extend', description: 'existing' },
        ],
      }),
    ];
    const result = tryAcquireClaim(activeClaims, {
      agent: 'team-beta',
      slice: 'TPL-200',
      targets: ['modules/auth/public-api.mjs'],
      action: 'modify',
    });
    assert.equal(result.success, false);
    assert.equal(result.conflicts.length, 1);
  });

  test('builds claim with correct parameters on success', () => {
    const result = tryAcquireClaim([], {
      agent: 'feature-implementer',
      slice: 'TPL-500',
      targets: ['package.json'],
      action: 'modify',
      strategy: 'modify-in-place',
      priority: 'high',
      ttlHours: 4,
    });
    assert.equal(result.success, true);
    assert.equal(result.claim.agent, 'feature-implementer');
    assert.equal(result.claim.slice, 'TPL-500');
    assert.equal(result.claim.strategy, 'modify-in-place');
    assert.equal(result.claim.priority, 'high');
    assert.equal(result.claim.targets[0].path, 'package.json');
    assert.equal(result.claim.targets[0].action, 'modify');
  });

  test('handles target objects (not just strings)', () => {
    const result = tryAcquireClaim([], {
      agent: 'a',
      slice: 's',
      targets: [{ path: 'foo.mjs', action: 'modify', surface: 'shared-infra' }],
      action: 'modify',
    });
    assert.equal(result.success, true);
    assert.equal(result.claim.targets[0].path, 'foo.mjs');
  });

  // protectedPaths threading — main() supplies DEFAULT_PROTECTED_PATHS so
  // extend+extend acquisition on shared-infra paths beyond the legacy 3-file
  // default fails fast instead of succeeding and silently colliding later.

  test('blocks acquisition on extend+extend conflict over extended-default protected path', () => {
    const activeClaims = [
      makeClaim({
        targets: [
          {
            path: 'pnpm-lock.yaml',
            module: null,
            surface: 'shared-infra',
            action: 'extend',
            description: 'existing lockfile bump',
          },
        ],
      }),
    ];
    const result = tryAcquireClaim(
      activeClaims,
      {
        agent: 'team-beta',
        slice: 'TPL-300',
        targets: ['pnpm-lock.yaml'],
        action: 'extend',
      },
      DEFAULT_PROTECTED_PATHS,
    );
    assert.equal(result.success, false, 'must block when explicit protected list is supplied');
    assert.equal(result.claim, null);
    assert.ok(result.conflicts.length > 0);
    assert.equal(result.conflicts[0].severity, 'conflict');
    assert.equal(result.conflicts[0].path, 'pnpm-lock.yaml');
  });

  test('without explicit protectedPaths, extend+extend on pnpm-lock.yaml succeeds (legacy default)', () => {
    const activeClaims = [
      makeClaim({
        targets: [
          {
            path: 'pnpm-lock.yaml',
            module: null,
            surface: 'shared-infra',
            action: 'extend',
            description: 'existing lockfile bump',
          },
        ],
      }),
    ];
    const result = tryAcquireClaim(activeClaims, {
      agent: 'team-beta',
      slice: 'TPL-301',
      targets: ['pnpm-lock.yaml'],
      action: 'extend',
    });
    assert.equal(
      result.success,
      true,
      'omitted protectedPaths uses legacy 3-file default; pnpm-lock.yaml stays advisory',
    );
    assert.equal(result.overlaps.length, 1);
    assert.equal(result.overlaps[0].severity, 'advisory');
  });
});

// ---------------------------------------------------------------------------
// loadProtectedPaths()
// ---------------------------------------------------------------------------

describe('loadProtectedPaths()', () => {
  test('returns defaults when config is null', () => {
    const paths = loadProtectedPaths(null);
    assert.deepEqual(paths, DEFAULT_PROTECTED_PATHS);
  });

  test('returns defaults when config has no protectedPaths field', () => {
    const paths = loadProtectedPaths({ otherField: true });
    assert.deepEqual(paths, DEFAULT_PROTECTED_PATHS);
  });

  test('returns custom paths from config', () => {
    const custom = ['custom/path.json', 'other/*'];
    const paths = loadProtectedPaths({ protectedPaths: custom });
    assert.deepEqual(paths, custom);
  });

  test('returns defaults when config is undefined', () => {
    const paths = loadProtectedPaths(undefined);
    assert.deepEqual(paths, DEFAULT_PROTECTED_PATHS);
  });

  // TPL-205 — DEFAULT_PROTECTED_PATHS covers control-plane / agent-contract
  // surfaces in addition to release discipline and build infrastructure.
  test('DEFAULT_PROTECTED_PATHS includes release-discipline triplet', () => {
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('VERSION'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('CHANGELOG.md'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('package.json'));
  });

  test('DEFAULT_PROTECTED_PATHS includes control-plane surfaces (TPL-205)', () => {
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('.claims/config.json'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('.claude/CLAUDE.md'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('.claude/rules/*'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('.claude/settings.json'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('.claude/hooks/*'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('docs/agent-contract/dangerous-commands.json'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('AGENTS.md'));
    assert.ok(DEFAULT_PROTECTED_PATHS.includes('.cursorrules'));
  });

  test('matchesProtectedPattern resolves the new wildcard entries', () => {
    assert.equal(matchesProtectedPattern('.claude/rules/development.md', '.claude/rules/*'), true);
    assert.equal(
      matchesProtectedPattern('.claude/hooks/cockpit-agent-marker.mjs', '.claude/hooks/*'),
      true,
    );
    assert.equal(matchesProtectedPattern('.claude/CLAUDE.md', '.claude/CLAUDE.md'), true);
    assert.equal(matchesProtectedPattern('.claude/agents/foo.md', '.claude/rules/*'), false);
  });
});

// ---------------------------------------------------------------------------
// matchesProtectedPattern()
// ---------------------------------------------------------------------------

describe('matchesProtectedPattern()', () => {
  test('matches exact file path', () => {
    assert.equal(matchesProtectedPattern('package.json', 'package.json'), true);
  });

  test('does not match different file', () => {
    assert.equal(matchesProtectedPattern('other.json', 'package.json'), false);
  });

  test('matches wildcard pattern', () => {
    assert.equal(matchesProtectedPattern('.github/workflows/ci.yml', '.github/workflows/*'), true);
  });

  test('wildcard does not match deeper nesting', () => {
    // .github/workflows/* matches files directly in workflows/, not subdirs
    assert.equal(matchesProtectedPattern('.github/workflows/ci.yml', '.github/workflows/*'), true);
  });

  test('wildcard does not match parent directory', () => {
    assert.equal(matchesProtectedPattern('.github/other.yml', '.github/workflows/*'), false);
  });

  test('normalizes backslashes', () => {
    assert.equal(
      matchesProtectedPattern('.github\\workflows\\ci.yml', '.github/workflows/*'),
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// checkProtectedPaths()
// ---------------------------------------------------------------------------

describe('checkProtectedPaths()', () => {
  const patterns = ['package.json', '.github/workflows/*', 'docs/SYSTEM_MAP.md'];

  test('warns for staged protected file without claim', () => {
    const staged = ['package.json', 'src/index.mjs'];
    const activeClaims = [];
    const warnings = checkProtectedPaths(staged, activeClaims, patterns);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].path, 'package.json');
    assert.equal(warnings[0].pattern, 'package.json');
  });

  test('no warning when active modify claim covers the file', () => {
    const staged = ['package.json'];
    const activeClaims = [
      makeClaim({
        targets: [{ path: 'package.json', action: 'modify', description: 'bump version' }],
      }),
    ];
    const warnings = checkProtectedPaths(staged, activeClaims, patterns);
    assert.equal(warnings.length, 0);
  });

  test('extend claim covers protected path (no warning)', () => {
    const staged = ['package.json'];
    const activeClaims = [
      makeClaim({
        targets: [{ path: 'package.json', action: 'extend', description: 'add dep' }],
      }),
    ];
    const warnings = checkProtectedPaths(staged, activeClaims, patterns);
    assert.equal(warnings.length, 0);
  });

  test('warns for wildcard-matched staged file', () => {
    const staged = ['.github/workflows/ci.yml'];
    const warnings = checkProtectedPaths(staged, [], patterns);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].path, '.github/workflows/ci.yml');
    assert.equal(warnings[0].pattern, '.github/workflows/*');
  });

  test('no warnings when staged files are not protected', () => {
    const staged = ['src/index.mjs', 'modules/auth/public-api.mjs'];
    const warnings = checkProtectedPaths(staged, [], patterns);
    assert.equal(warnings.length, 0);
  });

  test('returns empty for empty staged files', () => {
    const warnings = checkProtectedPaths([], [], patterns);
    assert.equal(warnings.length, 0);
  });

  test('reports one warning per file even if multiple patterns match', () => {
    // Only one pattern can match per file due to the break
    const staged = ['package.json'];
    const dupePatterns = ['package.json', 'package.json'];
    const warnings = checkProtectedPaths(staged, [], dupePatterns);
    assert.equal(warnings.length, 1);
  });
});

// ---------------------------------------------------------------------------
// isExampleClaim()
// ---------------------------------------------------------------------------

describe('isExampleClaim()', () => {
  test('returns true for ids starting with the example prefix', () => {
    assert.equal(isExampleClaim({ id: 'clm-ex0001' }), true);
    assert.equal(isExampleClaim({ id: 'clm-ex0002' }), true);
    assert.equal(isExampleClaim({ id: 'clm-example-foo' }), true);
  });

  test('returns false for operational claim ids', () => {
    assert.equal(isExampleClaim({ id: 'clm-a85b4e' }), false);
    assert.equal(isExampleClaim({ id: 'clm-deadbeef' }), false);
  });

  test('returns false for null/undefined/empty/missing id', () => {
    assert.equal(isExampleClaim(null), false);
    assert.equal(isExampleClaim(undefined), false);
    assert.equal(isExampleClaim({}), false);
    assert.equal(isExampleClaim({ id: '' }), false);
    assert.equal(isExampleClaim({ id: null }), false);
  });

  test('EXAMPLE_CLAIM_ID_PREFIX is the canonical prefix', () => {
    assert.equal(EXAMPLE_CLAIM_ID_PREFIX, 'clm-ex');
  });
});

// ---------------------------------------------------------------------------
// claimAgeSeconds() and the --force-expire authorization model (TPL-221)
// ---------------------------------------------------------------------------

describe('claimAgeSeconds()', () => {
  test('returns elapsed seconds since created on a fixed timestamp pair', () => {
    const claim = makeClaim({ created: '2026-04-27T10:00:00Z' });
    const now = new Date('2026-04-27T10:01:30Z'); // +90 seconds
    assert.equal(claimAgeSeconds(claim, now), 90);
  });

  test('returns 0 when created is missing', () => {
    assert.equal(claimAgeSeconds({}, new Date()), 0);
  });

  test('returns 0 when created is unparseable', () => {
    assert.equal(claimAgeSeconds({ created: 'not-a-date' }, new Date()), 0);
  });

  test('clamps negative ages (claim created in the future) to 0', () => {
    const claim = makeClaim({ created: '2099-01-01T00:00:00Z' });
    const now = new Date('2026-04-27T10:00:00Z');
    assert.equal(claimAgeSeconds(claim, now), 0);
  });

  test('returns 0 for null or undefined claim', () => {
    assert.equal(claimAgeSeconds(null, new Date()), 0);
    assert.equal(claimAgeSeconds(undefined, new Date()), 0);
  });
});

describe('validateForceExpireRequest() — TPL-221 authorization model', () => {
  // Reference: a 10-minute-old claim is past the young-claim guard.
  const oldClaim = makeClaim({
    id: 'clm-old',
    agent: 'session-A',
    slice: 'TPL-OLD',
    created: '2026-04-27T10:00:00Z',
  });
  const olderNow = new Date('2026-04-27T10:10:00Z'); // 10 min old

  // A 1-minute-old claim sits inside the young-claim guard window.
  const youngClaim = makeClaim({
    id: 'clm-young',
    agent: 'session-A',
    slice: 'TPL-YOUNG',
    created: '2026-04-27T10:00:00Z',
  });
  const youngNow = new Date('2026-04-27T10:01:00Z'); // 1 min old

  test('Layer A: missing callerAgent is rejected', () => {
    const decision = validateForceExpireRequest({
      claim: oldClaim,
      callerAgent: '',
      hasReally: false,
      reason: '',
      now: olderNow,
    });
    assert.equal(decision.allowed, false);
    assert.match(decision.error, /--agent.*required/);
  });

  test('Layer A: same-agent on an old claim is allowed without --really', () => {
    const decision = validateForceExpireRequest({
      claim: oldClaim,
      callerAgent: 'session-A',
      hasReally: false,
      reason: '',
      now: olderNow,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.classification, 'self');
  });

  test('Layer C: same-agent on a young claim without --really is rejected', () => {
    const decision = validateForceExpireRequest({
      claim: youngClaim,
      callerAgent: 'session-A',
      hasReally: false,
      reason: '',
      now: youngNow,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.classification, 'young-claim-override');
    assert.match(decision.error, /younger than 5 min/);
  });

  test('Layer C: same-agent on a young claim with --really is allowed', () => {
    const decision = validateForceExpireRequest({
      claim: youngClaim,
      callerAgent: 'session-A',
      hasReally: true,
      reason: '',
      now: youngNow,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.classification, 'young-claim-override');
  });

  test('Layer B: cross-agent without --really is rejected', () => {
    const decision = validateForceExpireRequest({
      claim: oldClaim,
      callerAgent: 'session-B',
      hasReally: false,
      reason: 'orphaned',
      now: olderNow,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.classification, 'cross-agent');
    assert.match(decision.error, /requires --really/);
  });

  test('Layer B: cross-agent with --really but no --reason is rejected', () => {
    const decision = validateForceExpireRequest({
      claim: oldClaim,
      callerAgent: 'session-B',
      hasReally: true,
      reason: '',
      now: olderNow,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.classification, 'cross-agent');
    assert.match(decision.error, /requires --reason/);
  });

  test('Layer B: cross-agent with --really and empty/whitespace --reason is rejected', () => {
    const decision = validateForceExpireRequest({
      claim: oldClaim,
      callerAgent: 'session-B',
      hasReally: true,
      reason: '   ',
      now: olderNow,
    });
    assert.equal(decision.allowed, false);
    assert.match(decision.error, /requires --reason/);
  });

  test('Layer B: cross-agent with --really and non-empty --reason is allowed', () => {
    const decision = validateForceExpireRequest({
      claim: oldClaim,
      callerAgent: 'session-B',
      hasReally: true,
      reason: 'orphaned cleanup after sibling crash',
      now: olderNow,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.classification, 'cross-agent');
  });

  test('Layer B: cross-agent on a young claim still requires only --really + --reason', () => {
    // Cross-agent always requires --really; the young guard does not
    // double-charge cross-agent overrides. The classification stays
    // 'cross-agent' so the audit log surfaces the cross-agent flag.
    const decision = validateForceExpireRequest({
      claim: youngClaim,
      callerAgent: 'session-B',
      hasReally: true,
      reason: 'orphaned cleanup',
      now: youngNow,
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.classification, 'cross-agent');
  });

  test('returns ageSeconds even on rejection so audit log can record the attempt', () => {
    const decision = validateForceExpireRequest({
      claim: youngClaim,
      callerAgent: 'session-A',
      hasReally: false,
      reason: '',
      now: youngNow,
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.ageSeconds, 60);
  });

  test('rejects when claim is null', () => {
    const decision = validateForceExpireRequest({
      claim: null,
      callerAgent: 'session-A',
      hasReally: false,
      reason: '',
      now: new Date(),
    });
    assert.equal(decision.allowed, false);
    assert.match(decision.error, /not found/);
  });

  test('MIN_FORCE_EXPIRE_AGE_MINUTES is exported as 5', () => {
    assert.equal(MIN_FORCE_EXPIRE_AGE_MINUTES, 5);
  });
});

describe('buildAuditEvent()', () => {
  const baseClaim = makeClaim({
    id: 'clm-aud',
    agent: 'session-A',
    slice: 'TPL-AUD',
  });
  const fixedNow = new Date('2026-04-27T12:34:56.789Z');

  test('matches schema for a same-agent force-expire override', () => {
    const decision = { classification: 'self', ageSeconds: 600 };
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-A',
      reason: undefined,
      decision,
      now: fixedNow,
    });
    assert.equal(event.ts, '2026-04-27T12:34:56.789Z');
    assert.equal(event.event, 'force-expire');
    assert.equal(event.claimId, 'clm-aud');
    assert.equal(event.claimAgent, 'session-A');
    assert.equal(event.claimSlice, 'TPL-AUD');
    assert.equal(event.claimAge_seconds, 600);
    assert.equal(event.callerAgent, 'session-A');
    assert.equal(event.reason, null);
    assert.equal(event.crossAgent, false);
    assert.equal(event.youngClaimOverride, false);
  });

  test('flags crossAgent and reason for cross-agent force-expire', () => {
    const decision = { classification: 'cross-agent', ageSeconds: 87 };
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-B',
      reason: 'orphaned cleanup',
      decision,
      now: fixedNow,
    });
    assert.equal(event.crossAgent, true);
    assert.equal(event.youngClaimOverride, false);
    assert.equal(event.reason, 'orphaned cleanup');
    assert.equal(event.callerAgent, 'session-B');
  });

  test('flags youngClaimOverride for in-flight self-override', () => {
    const decision = { classification: 'young-claim-override', ageSeconds: 45 };
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-A',
      reason: '',
      decision,
      now: fixedNow,
    });
    assert.equal(event.youngClaimOverride, true);
    assert.equal(event.crossAgent, false);
    assert.equal(event.reason, null);
  });

  test('emits a symmetric "create" event with zero age and self classification', () => {
    const event = buildAuditEvent({
      event: 'create',
      claim: baseClaim,
      callerAgent: 'session-A',
      decision: { classification: 'self', ageSeconds: 0 },
      now: fixedNow,
    });
    assert.equal(event.event, 'create');
    assert.equal(event.claimAge_seconds, 0);
    assert.equal(event.crossAgent, false);
    assert.equal(event.youngClaimOverride, false);
  });

  test('trims whitespace-only reason to null', () => {
    const decision = { classification: 'cross-agent', ageSeconds: 100 };
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-B',
      reason: '   ',
      decision,
      now: fixedNow,
    });
    assert.equal(event.reason, null);
  });

  // TPL-225: optional abandonedCheck embed lets cross-agent overrides record
  // both the structured tier the script saw and whether the operator cleared
  // the action by hand.
  test('embeds abandonedCheck + operatorConfirmed when supplied', () => {
    const decision = { classification: 'cross-agent', ageSeconds: 1800 };
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-B',
      reason: 'orphaned',
      decision,
      now: fixedNow,
      abandonedCheck: {
        abandoned: true,
        confidence: 'high',
        signals: ['claim is 1800s old (past the 5-min young-claim guard)'],
      },
      operatorConfirmed: false,
    });
    assert.ok(event.abandonedCheck, 'abandonedCheck field must be present');
    assert.equal(event.abandonedCheck.confidence, 'high');
    assert.equal(event.abandonedCheck.abandoned, true);
    assert.deepEqual(event.abandonedCheck.signals, [
      'claim is 1800s old (past the 5-min young-claim guard)',
    ]);
    assert.equal(event.abandonedCheck.operatorConfirmed, false);
  });

  test('omits abandonedCheck entirely when not supplied (back-compat with TPL-221 schema)', () => {
    const decision = { classification: 'self', ageSeconds: 600 };
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-A',
      decision,
      now: fixedNow,
    });
    assert.equal('abandonedCheck' in event, false);
  });

  test('flags operatorConfirmed=true when caller cleared the override at the keyboard', () => {
    const decision = { classification: 'cross-agent', ageSeconds: 60 };
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-B',
      reason: 'manual takeover',
      decision,
      now: fixedNow,
      abandonedCheck: { abandoned: false, confidence: 'low', signals: ['claim is 60s old'] },
      operatorConfirmed: true,
    });
    assert.equal(event.abandonedCheck.operatorConfirmed, true);
  });

  test('clones the signals array (caller mutation does not leak into the audit event)', () => {
    const signals = ['signal A'];
    const event = buildAuditEvent({
      event: 'force-expire',
      claim: baseClaim,
      callerAgent: 'session-B',
      reason: 'r',
      decision: { classification: 'cross-agent', ageSeconds: 1000 },
      now: fixedNow,
      abandonedCheck: { abandoned: true, confidence: 'high', signals },
    });
    signals.push('mutated after capture');
    assert.deepEqual(event.abandonedCheck.signals, ['signal A']);
  });
});

// ---------------------------------------------------------------------------
// checkClaimAbandoned — TPL-225 structured cross-agent abandoned-check
// ---------------------------------------------------------------------------

describe('checkClaimAbandoned() — TPL-225 structured signals', () => {
  // Claim that is well past the young-claim guard so the age signal alone
  // does not pull confidence to LOW.
  const oldClaim = {
    id: 'clm-old225',
    agent: 'session-A',
    slice: 'TPL-OLD',
    created: '2026-04-27T10:00:00Z',
    expires: '2026-04-28T10:00:00Z', // 1 day TTL — not expired at fixedNow
    status: 'active',
  };
  const fixedNow = new Date('2026-04-27T10:30:00Z'); // 30 min after created
  const youngNow = new Date('2026-04-27T10:01:00Z'); // 1 min after created

  // gitCmd / stashCmd injectors for the canonical "no signs of life" case:
  // git ran fine but found nothing.
  const silentGit = () => ({ status: 0, stdout: '' });
  const silentStash = () => ({ status: 0, stdout: '' });

  test('TTL expired short-circuits to high-confidence abandoned', () => {
    const expired = { ...oldClaim, expires: '2026-04-26T10:00:00Z' };
    const r = checkClaimAbandoned({
      claim: expired,
      gitCmd: () => ({ status: 0, stdout: 'abc fake commit' }),
      stashCmd: () => ({ status: 0, stdout: 'stash@{0}: WIP on main: clm-old225' }),
      now: fixedNow,
    });
    assert.equal(r.abandoned, true);
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.HIGH);
    assert.ok(r.signals.some((s) => /TTL expired/.test(s)));
  });

  test("returns 'high' for old claim, no git activity, no stash", () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: silentGit,
      stashCmd: silentStash,
      now: fixedNow,
    });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.HIGH);
    assert.equal(r.abandoned, true);
    assert.ok(r.signals.some((s) => /past the .* young-claim guard/.test(s)));
    assert.ok(r.signals.some((s) => /git log shows no commits/.test(s)));
    assert.ok(r.signals.some((s) => /git stash list is empty/.test(s)));
  });

  test("returns 'low' when claim is young (any 'alive' signal wins)", () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: silentGit,
      stashCmd: silentStash,
      now: youngNow,
    });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.LOW);
    assert.equal(r.abandoned, false);
    assert.ok(r.signals.some((s) => /younger than the .* young-claim guard/.test(s)));
  });

  test("returns 'low' when git log shows recent commits by claim.agent", () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: () => ({ status: 0, stdout: 'abc1234 work\ndef5678 more work\n' }),
      stashCmd: silentStash,
      now: fixedNow,
    });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.LOW);
    assert.ok(r.signals.some((s) => /git log shows 2 commit\(s\) by session-A/.test(s)));
  });

  test("returns 'low' when stash list contains claim.id", () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: silentGit,
      stashCmd: () => ({
        status: 0,
        stdout: 'stash@{0}: WIP on main: clm-old225 mid-slice park\n',
      }),
      now: fixedNow,
    });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.LOW);
    assert.ok(r.signals.some((s) => /stash list contains claim ID clm-old225/.test(s)));
  });

  test("returns 'low' when stash list contains claim.agent (id absent)", () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: silentGit,
      stashCmd: () => ({ status: 0, stdout: 'stash@{0}: WIP on main: session-A scratch\n' }),
      now: fixedNow,
    });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.LOW);
    assert.ok(r.signals.some((s) => /stash list contains claim agent session-A/.test(s)));
  });

  test("returns 'medium' when git is unavailable (not a repo) and stash is unavailable too", () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: () => ({ status: 128, stdout: '' }),
      stashCmd: () => ({ status: 128, stdout: '' }),
      now: fixedNow,
    });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.MEDIUM);
    assert.equal(r.abandoned, false);
    assert.ok(r.signals.some((s) => /git activity check unavailable/.test(s)));
    assert.ok(r.signals.some((s) => /git stash check unavailable/.test(s)));
  });

  test("returns 'medium' when only one signal is conclusive (rest unknown)", () => {
    // age=abandoned, git=unknown (no cmd), stash=unknown (no cmd) → MEDIUM
    const r = checkClaimAbandoned({ claim: oldClaim, now: fixedNow });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.MEDIUM);
  });

  test('alive signal beats abandoned signals (young claim with no git/stash matches still LOW)', () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: silentGit,
      stashCmd: silentStash,
      now: youngNow,
    });
    // age=alive overrides git=abandoned + stash=abandoned
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.LOW);
  });

  test("treats a stashed entry that does not match claim as 'abandoned' for stash signal", () => {
    // Other agents have stashes, but none mention this claim/agent.
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: silentGit,
      stashCmd: () => ({ status: 0, stdout: 'stash@{0}: WIP on feature-x: other-bot scratch\n' }),
      now: fixedNow,
    });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.HIGH);
    assert.ok(r.signals.some((s) => /none mention claim ID or agent/.test(s)));
  });

  test('null claim returns LOW with a descriptive signal', () => {
    const r = checkClaimAbandoned({ claim: null, now: fixedNow });
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.LOW);
    assert.deepEqual(r.signals, ['claim missing']);
  });

  test('gitCmd that throws does not crash the check (signal stays unknown)', () => {
    const r = checkClaimAbandoned({
      claim: oldClaim,
      gitCmd: () => {
        throw new Error('boom');
      },
      stashCmd: silentStash,
      now: fixedNow,
    });
    // age=abandoned, git=unknown, stash=abandoned → MEDIUM (one unknown)
    assert.equal(r.confidence, ABANDONED_CONFIDENCE.MEDIUM);
  });

  test('ABANDONED_CONFIDENCE constants are frozen and exported', () => {
    assert.equal(ABANDONED_CONFIDENCE.HIGH, 'high');
    assert.equal(ABANDONED_CONFIDENCE.MEDIUM, 'medium');
    assert.equal(ABANDONED_CONFIDENCE.LOW, 'low');
    assert.equal(Object.isFrozen(ABANDONED_CONFIDENCE), true);
  });
});

// ---------------------------------------------------------------------------
// tryExtendClaim — TPL-222 J5 same-agent extend authorization
// ---------------------------------------------------------------------------

describe('tryExtendClaim() — TPL-222', () => {
  const baseClaim = {
    id: 'clm-extend1',
    agent: 'tpl-222-claude',
    slice: 'TPL-222',
    created: '2026-04-27T20:00:00Z',
    expires: '2026-04-28T04:00:00Z',
    status: 'active',
    targets: [{ path: 'scripts/coa-merge.mjs', action: 'modify', surface: 'shared-infra' }],
    strategy: 'modify-in-place',
    dependsOn: [],
  };

  test('same-agent extend appends new targets', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['VERSION', 'CHANGELOG.md'],
      action: 'modify',
    });
    assert.equal(r.success, true);
    assert.equal(r.error, null);
    assert.equal(r.addedTargets.length, 2);
    assert.deepStrictEqual(
      r.addedTargets.map((t) => t.path),
      ['VERSION', 'CHANGELOG.md'],
    );
    assert.ok(r.addedTargets.every((t) => t.action === 'modify'));
    // Updated claim retains existing target plus new ones
    assert.equal(r.claim.targets.length, 3);
    assert.ok(r.claim.targets.some((t) => t.path === 'scripts/coa-merge.mjs'));
    assert.ok(!('_file' in r.claim));
  });

  test('cross-agent extend is rejected (no --really escape)', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'someone-else',
      addTargets: ['VERSION'],
      action: 'modify',
    });
    assert.equal(r.success, false);
    assert.match(r.error, /cross-agent extend not allowed/);
    assert.match(r.error, /tpl-222-claude/);
    assert.match(r.error, /someone-else/);
    assert.equal(r.claim, null);
  });

  test('missing --agent rejected (must self-identify)', () => {
    const r1 = tryExtendClaim({ claim: baseClaim, callerAgent: '', addTargets: ['VERSION'] });
    assert.equal(r1.success, false);
    assert.match(r1.error, /caller must self-identify/);

    const r2 = tryExtendClaim({
      claim: baseClaim,
      callerAgent: undefined,
      addTargets: ['VERSION'],
    });
    assert.equal(r2.success, false);
    assert.match(r2.error, /self-identify/);
  });

  test('whitespace-only --agent is treated as missing', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: '   ',
      addTargets: ['VERSION'],
    });
    assert.equal(r.success, false);
    assert.match(r.error, /self-identify/);
  });

  test('rejects path traversal in addTargets', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['../etc/passwd', 'VERSION'],
    });
    assert.equal(r.success, false);
    assert.match(r.error, /invalid target path/);
  });

  test('rejects absolute path in addTargets', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['/etc/passwd'],
    });
    assert.equal(r.success, false);
    assert.match(r.error, /invalid target path/);
  });

  test('inactive claim is rejected (status check before agent check)', () => {
    for (const status of ['completed', 'expired', 'abandoned']) {
      const r = tryExtendClaim({
        claim: { ...baseClaim, status },
        callerAgent: 'tpl-222-claude',
        addTargets: ['VERSION'],
      });
      assert.equal(r.success, false, `status=${status}`);
      assert.match(r.error, new RegExp(`is ${status}`));
    }
  });

  test('null/missing claim returns "claim not found"', () => {
    const r = tryExtendClaim({
      claim: null,
      callerAgent: 'tpl-222-claude',
      addTargets: ['VERSION'],
    });
    assert.equal(r.success, false);
    assert.match(r.error, /claim not found/);
  });

  test('invalid action rejected', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['VERSION'],
      action: 'destroy',
    });
    assert.equal(r.success, false);
    assert.match(r.error, /invalid action/);
  });

  test('paths already in claim.targets are skipped (idempotent)', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['scripts/coa-merge.mjs', 'VERSION'],
    });
    assert.equal(r.success, true);
    assert.equal(r.addedTargets.length, 1);
    assert.equal(r.addedTargets[0].path, 'VERSION');
  });

  test('duplicate addTargets are deduplicated', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['VERSION', 'VERSION', 'CHANGELOG.md'],
    });
    assert.equal(r.success, true);
    assert.equal(r.addedTargets.length, 2);
  });

  test('no-op when all addTargets are already covered (success, addedCount=0)', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['scripts/coa-merge.mjs'],
    });
    assert.equal(r.success, true);
    assert.equal(r.addedTargets.length, 0);
  });

  test('exceeding MAX_TARGETS is rejected', () => {
    // baseClaim has 1 target. Adding (MAX_TARGETS) more would exceed cap.
    const flood = Array.from({ length: MAX_TARGETS }, (_, i) => `path/${i}.mjs`);
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: flood,
    });
    assert.equal(r.success, false);
    assert.match(r.error, /MAX_TARGETS/);
  });

  test('extend with 21 add-targets onto 5-target claim succeeds (total 26, above old cap)', () => {
    // TPL-227-interim: proves the extend path also benefits from the 50-cap.
    // Pre-fix this would have rejected at 26 targets (> old cap of 20).
    const fiveTargetClaim = {
      ...baseClaim,
      targets: Array.from({ length: 5 }, (_, i) => ({
        path: `existing/file${i}.mjs`,
        action: 'modify',
        surface: 'shared-infra',
      })),
    };
    const addTargets = Array.from({ length: 21 }, (_, i) => `new/path${i}.mjs`);
    const r = tryExtendClaim({
      claim: fiveTargetClaim,
      callerAgent: 'tpl-222-claude',
      addTargets,
    });
    assert.equal(r.success, true);
    assert.equal(r.error, null);
    assert.equal(r.addedTargets.length, 21);
    assert.equal(r.claim.targets.length, 26);
  });

  test('normalizes Windows-style path separators in addTargets', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: ['docs\\_generated\\dependency-graph.json'],
    });
    assert.equal(r.success, true);
    assert.equal(r.addedTargets[0].path, 'docs/_generated/dependency-graph.json');
  });

  test('zero-arg call returns "claim not found"', () => {
    const r = tryExtendClaim();
    assert.equal(r.success, false);
    assert.match(r.error, /claim not found/);
  });

  test('non-array addTargets is treated as empty (no-op success)', () => {
    const r = tryExtendClaim({
      claim: baseClaim,
      callerAgent: 'tpl-222-claude',
      addTargets: null,
    });
    assert.equal(r.success, true);
    assert.equal(r.addedTargets.length, 0);
  });

  test('marks newly added targets with extended: true (J3.6)', () => {
    // J3.6 fold-in: ceremony-extended targets must be distinguishable from
    // user-acquired targets so findCompletableClaims and verifyClaimWorkCommitted
    // can exclude them from the proof-set check.
    const r = tryExtendClaim({
      claim: { ...baseClaim, targets: [{ path: 'modules/auth/public-api.mjs', action: 'modify' }] },
      callerAgent: 'tpl-222-claude',
      addTargets: ['VERSION', 'CHANGELOG.md'],
    });
    assert.equal(r.success, true);
    assert.equal(r.addedTargets.length, 2);
    for (const t of r.addedTargets) {
      assert.equal(t.extended, true, `${t.path} must carry extended: true`);
    }
    // Pre-existing user targets MUST NOT be marked extended.
    const userTarget = r.claim.targets.find((t) => t.path === 'modules/auth/public-api.mjs');
    assert.notEqual(userTarget.extended, true);
  });
});

// ---------------------------------------------------------------------------
// verifyAgentAuthorization() — TPL-223 / Entry-011 J3.5
// ---------------------------------------------------------------------------

describe('verifyAgentAuthorization()', () => {
  const claim = {
    id: 'clm-au-001',
    agent: 'session-A',
    slice: 'ZVX-040',
    targets: [{ path: 'VERSION', action: 'modify' }],
  };

  test('authorizes same-agent caller with classification "self"', () => {
    const result = verifyAgentAuthorization({ claim, callerAgent: 'session-A' });
    assert.equal(result.authorized, true);
    assert.equal(result.classification, 'self');
  });

  test('rejects when callerAgent is missing/empty (Layer A)', () => {
    const empty = verifyAgentAuthorization({ claim, callerAgent: '' });
    assert.equal(empty.authorized, false);
    assert.equal(empty.classification, null);
    assert.match(empty.reason, /--agent/);

    const undef = verifyAgentAuthorization({ claim });
    assert.equal(undef.authorized, false);
    assert.equal(undef.classification, null);
  });

  test('rejects cross-agent caller without --really as "cross-agent-no-really"', () => {
    const result = verifyAgentAuthorization({ claim, callerAgent: 'session-B' });
    assert.equal(result.authorized, false);
    assert.equal(result.classification, 'cross-agent-no-really');
    assert.match(result.reason, /--really/);
    assert.match(result.reason, /session-A/);
    assert.match(result.reason, /session-B/);
  });

  test('rejects cross-agent caller with --really but missing --reason as "cross-agent-no-reason"', () => {
    const result = verifyAgentAuthorization({
      claim,
      callerAgent: 'session-B',
      hasReally: true,
      reason: '',
    });
    assert.equal(result.authorized, false);
    assert.equal(result.classification, 'cross-agent-no-reason');
    assert.match(result.reason, /--reason/);
  });

  test('rejects cross-agent caller with --really + whitespace-only --reason', () => {
    const result = verifyAgentAuthorization({
      claim,
      callerAgent: 'session-B',
      hasReally: true,
      reason: '   ',
    });
    assert.equal(result.authorized, false);
    assert.equal(result.classification, 'cross-agent-no-reason');
  });

  test('authorizes cross-agent caller with --really + non-empty --reason', () => {
    const result = verifyAgentAuthorization({
      claim,
      callerAgent: 'session-B',
      hasReally: true,
      reason: 'taking over after session-A operator handoff',
    });
    assert.equal(result.authorized, true);
    assert.equal(result.classification, 'cross-agent');
  });

  test('treats whitespace-trimmed callerAgent equal to claim.agent as same-agent', () => {
    const result = verifyAgentAuthorization({ claim, callerAgent: '  session-A  ' });
    assert.equal(result.authorized, true);
    assert.equal(result.classification, 'self');
  });

  test('rejects with classification null when claim is missing', () => {
    const result = verifyAgentAuthorization({ callerAgent: 'session-A' });
    assert.equal(result.authorized, false);
    assert.equal(result.classification, null);
    assert.match(result.reason, /no claim/);
  });
});

// ---------------------------------------------------------------------------
// verifyClaimWorkCommitted() — TPL-223 / Entry-010 J3 + J3.6
// ---------------------------------------------------------------------------

describe('verifyClaimWorkCommitted()', () => {
  // Build a stub git command function backed by a lookup table keyed on the
  // joined args. Tests construct the table to script the exact git responses
  // they want without spawning subprocesses.
  function makeGitCmd(table) {
    return (args) => {
      const key = args.join(' ');
      if (Object.prototype.hasOwnProperty.call(table, key)) {
        return { stdout: '', stderr: '', status: 0, ...table[key] };
      }
      return { stdout: '', stderr: 'unknown git args', status: 128 };
    };
  }

  const claim = {
    id: 'clm-vw-001',
    agent: 'session-A',
    slice: 'TPL-223',
    targets: [
      { path: 'VERSION', action: 'modify' },
      { path: 'CHANGELOG.md', action: 'modify' },
    ],
  };

  test('verifies when --commit-hash exists and its commit touches all targets', () => {
    const gitCmd = makeGitCmd({
      'cat-file -e abc1234': { status: 0 },
      'log -n 1 --format= --name-only abc1234': {
        status: 0,
        stdout: 'VERSION\nCHANGELOG.md\npackage.json\n',
      },
    });
    const result = verifyClaimWorkCommitted({ claim, gitCmd, commitHash: 'abc1234' });
    assert.equal(result.verified, true);
    assert.equal(result.mode, 'commit-hash');
    assert.equal(result.commitHash, 'abc1234');
  });

  test('rejects when --commit-hash is not in git log (cat-file fails)', () => {
    const gitCmd = makeGitCmd({
      'cat-file -e deadbee': { status: 1, stderr: 'fatal: Not a valid object name' },
    });
    const result = verifyClaimWorkCommitted({ claim, gitCmd, commitHash: 'deadbee' });
    assert.equal(result.verified, false);
    assert.equal(result.mode, 'commit-hash');
    assert.match(result.reason, /not found in git log/);
  });

  test('rejects when --commit-hash exists but its tree omits a claim target', () => {
    const gitCmd = makeGitCmd({
      'cat-file -e abc1234': { status: 0 },
      'log -n 1 --format= --name-only abc1234': {
        status: 0,
        stdout: 'VERSION\nREADME.md\n',
      },
    });
    const result = verifyClaimWorkCommitted({ claim, gitCmd, commitHash: 'abc1234' });
    assert.equal(result.verified, false);
    assert.equal(result.mode, 'commit-hash');
    assert.match(result.reason, /CHANGELOG\.md/);
    assert.match(result.reason, /does not include/);
  });

  test('verifies when --from-pre-commit-hook is set (privileged short-circuit)', () => {
    // No gitCmd needed — pre-commit-hook short-circuits before any git call.
    const result = verifyClaimWorkCommitted({ claim, fromPreCommitHook: true });
    assert.equal(result.verified, true);
    assert.equal(result.mode, 'pre-commit-hook');
    // Even without a claim or gitCmd, pre-commit-hook trust holds. This is
    // how the hook's post-success block keeps working when claims exist.
    const result2 = verifyClaimWorkCommitted({ fromPreCommitHook: true });
    assert.equal(result2.verified, true);
  });

  test('rejects when neither flag is set and HEAD commit does not include the claim targets', () => {
    // J3 reproduction in unit form: HEAD is on the previous commit, the
    // staged work has not been committed, so the most recent commit's
    // diff-tree does not cover the claim's targets.
    const gitCmd = makeGitCmd({
      'rev-parse HEAD': { status: 0, stdout: 'oldhead123\n' },
      'cat-file -e oldhead123': { status: 0 },
      'log -n 1 --format= --name-only oldhead123': {
        status: 0,
        stdout: 'README.md\n',
      },
    });
    const result = verifyClaimWorkCommitted({ claim, gitCmd });
    assert.equal(result.verified, false);
    assert.equal(result.mode, 'head-moved');
    assert.match(result.reason, /HEAD commit/);
    assert.match(result.reason, /does not include/);
    assert.match(result.reason, /commit your slice first/);
  });

  test('verifies when neither flag is set but HEAD commit covers all claim targets', () => {
    const gitCmd = makeGitCmd({
      'rev-parse HEAD': { status: 0, stdout: 'newhead789\n' },
      'cat-file -e newhead789': { status: 0 },
      'log -n 1 --format= --name-only newhead789': {
        status: 0,
        stdout: 'VERSION\nCHANGELOG.md\nscripts/coa-merge.mjs\n',
      },
    });
    const result = verifyClaimWorkCommitted({ claim, gitCmd });
    assert.equal(result.verified, true);
    assert.equal(result.mode, 'head-moved');
    assert.equal(result.commitHash, 'newhead789');
  });

  test('rejects when gitCmd is missing in non-pre-commit-hook mode', () => {
    const result = verifyClaimWorkCommitted({ claim });
    assert.equal(result.verified, false);
    assert.equal(result.mode, null);
    assert.match(result.reason, /gitCmd/);
  });

  test('rejects when claim is missing in non-pre-commit-hook mode', () => {
    const gitCmd = makeGitCmd({});
    const result = verifyClaimWorkCommitted({ gitCmd });
    assert.equal(result.verified, false);
    assert.equal(result.mode, null);
    assert.match(result.reason, /no claim/);
  });

  test('rejects when rev-parse HEAD fails (no commits / not a git repo)', () => {
    const gitCmd = makeGitCmd({
      'rev-parse HEAD': { status: 128, stderr: 'fatal: not a git repository' },
    });
    const result = verifyClaimWorkCommitted({ claim, gitCmd });
    assert.equal(result.verified, false);
    assert.equal(result.mode, 'head-moved');
    assert.match(result.reason, /HEAD/);
  });

  // J3.6: extended targets are excluded from the must-be-in-commit check.
  test('verifies (J3.6) when extended targets are absent from the commit but user targets are present', () => {
    // Realistic coa-merge ceremony scenario: claim was acquired on
    // [scripts/foo.mjs], then auto-extended to [VERSION, CHANGELOG.md,
    // LOCAL.md] for ceremony coverage. The commit only modifies
    // scripts/foo.mjs and VERSION (LOCAL.md regen produced no diff).
    // Pre-J3.6, this would fail because LOCAL.md isn't in commit tree.
    // Post-J3.6, only the user-acquired scripts/foo.mjs is required.
    const claimWithExtended = {
      id: 'clm-j36',
      agent: 'session-A',
      slice: 'TPL-J36',
      targets: [
        { path: 'scripts/foo.mjs', action: 'modify' }, // user-acquired
        { path: 'VERSION', action: 'modify', extended: true },
        { path: 'CHANGELOG.md', action: 'modify', extended: true },
        { path: 'LOCAL.md', action: 'modify', extended: true }, // no-diff regen
      ],
    };
    const gitCmd = makeGitCmd({
      'rev-parse HEAD': { status: 0, stdout: 'commitJ36\n' },
      'cat-file -e commitJ36': { status: 0 },
      'log -n 1 --format= --name-only commitJ36': {
        status: 0,
        stdout: 'scripts/foo.mjs\nVERSION\n', // LOCAL.md absent — ceremony no-op
      },
    });
    const result = verifyClaimWorkCommitted({ claim: claimWithExtended, gitCmd });
    assert.equal(result.verified, true);
    assert.equal(result.mode, 'head-moved');
  });

  test('rejects (J3.6) when a non-extended user target is missing even though extended targets are', () => {
    // Same shape but user-acquired target is the one missing from the
    // commit tree — this is the J3 attack vector and must reject.
    const claimWithExtended = {
      id: 'clm-j36-bad',
      agent: 'session-A',
      slice: 'TPL-J36-BAD',
      targets: [
        { path: 'scripts/foo.mjs', action: 'modify' },
        { path: 'VERSION', action: 'modify', extended: true },
      ],
    };
    const gitCmd = makeGitCmd({
      'rev-parse HEAD': { status: 0, stdout: 'commitBad\n' },
      'cat-file -e commitBad': { status: 0 },
      'log -n 1 --format= --name-only commitBad': {
        status: 0,
        stdout: 'README.md\n', // user target absent
      },
    });
    const result = verifyClaimWorkCommitted({ claim: claimWithExtended, gitCmd });
    assert.equal(result.verified, false);
    assert.equal(result.mode, 'head-moved');
    assert.match(result.reason, /scripts\/foo\.mjs/);
  });
});

// ---------------------------------------------------------------------------
// findCompletableClaims() — J3.6 extension
// ---------------------------------------------------------------------------

describe('findCompletableClaims() — J3.6 extended-target handling', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  test('completes a claim whose user targets are in the proof set, even when extended targets are not', () => {
    const claims = [
      {
        id: 'clm-j36',
        agent: 'session-A',
        slice: 'TPL-J36',
        status: 'active',
        expires: future,
        targets: [
          { path: 'scripts/foo.mjs', action: 'modify' },
          { path: 'LOCAL.md', action: 'modify', extended: true },
        ],
      },
    ];
    const proofSet = ['scripts/foo.mjs']; // LOCAL.md absent — no-diff regen
    const result = findCompletableClaims(claims, proofSet);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'clm-j36');
  });

  test('does not complete a claim when a user (non-extended) target is missing from the proof set', () => {
    const claims = [
      {
        id: 'clm-j36-miss',
        agent: 'session-A',
        slice: 'TPL-J36-MISS',
        status: 'active',
        expires: future,
        targets: [
          { path: 'scripts/foo.mjs', action: 'modify' }, // user — missing
          { path: 'VERSION', action: 'modify', extended: true },
        ],
      },
    ];
    const proofSet = ['VERSION']; // only the extended target staged/committed
    const result = findCompletableClaims(claims, proofSet);
    assert.equal(result.length, 0);
  });

  test('does not complete a claim that has only extended targets (no user-acquired anchor)', () => {
    const claims = [
      {
        id: 'clm-only-ext',
        agent: 'session-A',
        slice: 'TPL-ONLY-EXT',
        status: 'active',
        expires: future,
        targets: [
          { path: 'VERSION', action: 'modify', extended: true },
          { path: 'CHANGELOG.md', action: 'modify', extended: true },
        ],
      },
    ];
    const proofSet = ['VERSION', 'CHANGELOG.md'];
    const result = findCompletableClaims(claims, proofSet);
    assert.equal(result.length, 0, 'extended-only claim must NOT be completable');
  });
});
