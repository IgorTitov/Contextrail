/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove that the claim-check CLI actually blocks a realistic two-agent collision when invoked with --enforce, that TPL-221's --force-expire authorization rejects the Zvenix field-finding-008 attack pattern (sibling session wiping a 1-2 minute old live claim with no audit trail), and that TPL-223's --auto-complete gates close J3 (HEAD-must-have-moved), J3.5 (cross-agent claim cannot be falsely completed), and J3.6 (auto-extended ceremony targets are aspirational and do not gate completion).
 * @sidecar claim-check-collision-rehearsal.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeGitSpawn, SAFE_GIT_ENV_KEYS } from '../_setup/safe-git.mjs';

const claimCheckPath = fileURLToPath(
  new URL('../../scripts/checks/claim-check.mjs', import.meta.url),
);

function createRehearsalRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'claim-check-rehearsal-'));
  mkdirSync(join(dir, '.claims'), { recursive: true });
  // TPL-225: initialize a minimal git repo + one commit so the abandoned-check
  // signals (git log + git stash list) resolve cleanly. Production claim-check
  // always runs inside a git repo. The fixed git author "rehearsal-bot" is
  // intentionally distinct from any test claim.agent so `git log --author=...`
  // returns no rows → 'abandoned' signal by default. Tests that need a
  // 'low'-confidence (alive) signal layer their own commits/stashes by the
  // claim's agent on top.
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'rehearsal@test.local']);
  safeGitSpawn(dir, ['config', 'user.name', 'rehearsal-bot']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# rehearsal\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}

function writeClaim(dir, claim) {
  writeFileSync(
    join(dir, '.claims', `${claim.id}.json`),
    JSON.stringify(claim, null, 2) + '\n',
    'utf8',
  );
}

function farFutureExpiry() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

function runClaimCheck(cwd, args, env = {}) {
  // Strip any inherited COA_OPERATOR — tests must opt in explicitly so a
  // developer who happens to have it set in their shell does not silently
  // bypass the TPL-225 operator gate during local test runs.
  // Also strip inherited GIT_DIR / GIT_WORK_TREE / etc. so claim-check's
  // internal git operations use the temp repo (cwd) rather than the live
  // repo — critical when running inside a git hook where GIT_DIR is set.
  const baseEnv = { ...process.env };
  delete baseEnv.COA_OPERATOR;
  for (const key of SAFE_GIT_ENV_KEYS) {
    delete baseEnv[key];
  }
  return spawnSync(process.execPath, [claimCheckPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...baseEnv, ...env },
  });
}

test('claim-check --enforce blocks a colliding modify against an active modify claim', () => {
  const repo = createRehearsalRepo();
  try {
    // Agent A holds an active "modify" claim on the shared port file.
    writeClaim(repo, {
      id: 'clm-rehearsal-a',
      agent: 'team-alpha / hex-architect',
      slice: 'TPL-REHEARSAL-A',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [
        {
          path: 'modules/cache/ports/cache-port.mjs',
          module: 'cache',
          surface: 'port',
          action: 'modify',
          description: 'Add TTL parameter to get() signature',
        },
      ],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'Rehearsal claim — agent A modifies the cache port.',
    });

    // Agent B walks in and tries to modify the same file in the same window.
    const result = runClaimCheck(repo, [
      '--targets=modules/cache/ports/cache-port.mjs',
      '--action=modify',
      '--enforce',
    ]);

    assert.notEqual(result.status, 0, 'enforce mode must exit non-zero on a real conflict');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /CONFLICT/, 'output must surface a CONFLICT line');
    assert.match(combined, /clm-rehearsal-a/, 'output must name the conflicting claim');
    assert.match(
      combined,
      /modules\/cache\/ports\/cache-port\.mjs/,
      'output must name the contested file',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// TPL-221 — Zvenix field-finding-008 collision rehearsal
// ---------------------------------------------------------------------------
//
// Scenario reconstructed from docs/analysis/field-findings-log.md Entry 008:
//   Session A acquires clm-zvx039 on shared-infra paths, agent claude-zvx039.
//   Session B (a parallel tab) decides "this is an orphaned claim" and runs
//   the naive force-expire. Pre-fix this wiped the claim with no audit trail.
//   Post-fix, the naive force-expire MUST be rejected, and the cross-agent
//   override path MUST require --really + --reason and emit an audit event.

function readClaim(repo, claimId) {
  const path = join(repo, '.claims', `${claimId}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readAuditEvents(repo) {
  const path = join(repo, '.claims', 'audit.log');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

test('TPL-221: naive cross-agent --force-expire is rejected (no --agent, no --really)', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-zvx039',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [
        { path: 'docs/backlog/index.md', action: 'modify', description: 'shared infra' },
      ],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'Live work — must not be wipeable by a sibling tab.',
    });

    const result = runClaimCheck(repo, ['--force-expire', '--id=clm-zvx039']);

    assert.notEqual(result.status, 0, 'naive force-expire must be rejected');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /--agent.*required/i, 'rejection must mention --agent requirement');

    // Critical: the claim file is NOT modified.
    const claim = readClaim(repo, 'clm-zvx039');
    assert.equal(claim.status, 'active', 'rejected force-expire must not flip claim status');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-221: cross-agent --force-expire with --agent only (no --really) is rejected', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-zvx039',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify', description: 'release' }],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'Live coordination claim.',
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-zvx039',
      '--agent=claude-zvx-cleanup',
    ]);

    assert.notEqual(result.status, 0, 'cross-agent without --really must be rejected');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /requires --really/i, 'rejection must explain the --really requirement');

    const claim = readClaim(repo, 'clm-zvx039');
    assert.equal(claim.status, 'active');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-221: cross-agent --force-expire with --really but no --reason is rejected', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-zvx039',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      // Old enough to be past the young-claim guard so the only barrier
      // is the cross-agent reason requirement.
      created: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'CHANGELOG.md', action: 'modify', description: 'release' }],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'Coordination claim.',
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-zvx039',
      '--agent=claude-zvx-cleanup',
      '--really',
    ]);

    assert.notEqual(result.status, 0);
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /requires --reason/i);

    const claim = readClaim(repo, 'clm-zvx039');
    assert.equal(claim.status, 'active');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-221: cross-agent --force-expire with --really + --reason succeeds and writes audit log', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-zvx039',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      created: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'shared infra' }],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'Coordination claim.',
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-zvx039',
      '--agent=claude-zvx-cleanup',
      '--really',
      '--reason=orphaned cleanup after sibling tab crash',
    ]);

    assert.equal(result.status, 0, 'authorized cross-agent override must succeed');
    const claim = readClaim(repo, 'clm-zvx039');
    assert.equal(claim.status, 'expired');

    const events = readAuditEvents(repo);
    assert.ok(events.length >= 1, 'audit log must contain at least one event');
    const ev = events.find((e) => e.event === 'force-expire' && e.claimId === 'clm-zvx039');
    assert.ok(ev, 'audit log must contain the force-expire event');
    assert.equal(ev.crossAgent, true);
    assert.equal(ev.youngClaimOverride, false);
    assert.equal(ev.reason, 'orphaned cleanup after sibling tab crash');
    assert.equal(ev.callerAgent, 'claude-zvx-cleanup');
    assert.equal(ev.claimAgent, 'claude-zvx039');
    assert.equal(typeof ev.ts, 'string');
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(ev.ts), 'audit ts must be ISO-8601');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-221: same-agent --force-expire on a young claim without --really is rejected', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-young',
      agent: 'session-A',
      slice: 'TPL-Y',
      // Just acquired — well within the 5-minute young-claim guard.
      created: new Date(Date.now() - 30 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'modules/auth/public-api.mjs', action: 'modify', description: 'wip' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-young',
      '--agent=session-A',
    ]);

    assert.notEqual(result.status, 0, 'young same-agent override must require --really');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /younger than 5 min/i);

    const claim = readClaim(repo, 'clm-young');
    assert.equal(claim.status, 'active');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-221: same-agent --force-expire on a young claim with --really succeeds and audit flags youngClaimOverride', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-young',
      agent: 'session-A',
      slice: 'TPL-Y',
      created: new Date(Date.now() - 30 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'modules/auth/public-api.mjs', action: 'modify', description: 'wip' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-young',
      '--agent=session-A',
      '--really',
    ]);

    assert.equal(result.status, 0);
    const claim = readClaim(repo, 'clm-young');
    assert.equal(claim.status, 'expired');

    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'force-expire' && e.claimId === 'clm-young');
    assert.ok(ev);
    assert.equal(ev.crossAgent, false);
    assert.equal(ev.youngClaimOverride, true);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-221: same-agent --force-expire on an old claim succeeds without --really', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-old',
      agent: 'session-A',
      slice: 'TPL-OLD',
      created: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min old
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'modules/auth/public-api.mjs', action: 'modify', description: 'wip' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-old',
      '--agent=session-A',
    ]);

    assert.equal(result.status, 0);
    const claim = readClaim(repo, 'clm-old');
    assert.equal(claim.status, 'expired');

    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'force-expire' && e.claimId === 'clm-old');
    assert.ok(ev);
    assert.equal(ev.crossAgent, false);
    assert.equal(ev.youngClaimOverride, false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// TPL-225 — structured cross-agent abandoned-check
// ---------------------------------------------------------------------------
//
// Field-finding-012 incident: the TPL-223 session force-expired a 2-minute-old
// claim with active WIP because TPL-221 only validated the *form* of the
// override (--really + --reason), never the *facts* on the ground. TPL-225
// adds checkClaimAbandoned, which evaluates three signals (age, git activity
// by claim.agent, git stash) and gates cross-agent overrides accordingly:
//   high   → succeeds (canonical "old, no signs of life" path)
//   medium → requires --operator-confirmed AND COA_OPERATOR=1
//   low    → hard reject (claim is alive) unless operator-confirmed too

function commitAs(repo, author, email, message, file = 'WIP.md', body = 'wip\n') {
  writeFileSync(join(repo, file), body);
  safeGitSpawn(repo, ['add', file]);
  // Pass GIT_AUTHOR_* and GIT_COMMITTER_* explicitly so a pre-commit hook
  // environment that already has GIT_AUTHOR_NAME set (git resolves identity
  // before invoking hooks) cannot shadow the -c user.name= config override.
  safeGitSpawn(repo, ['commit', '-q', '-m', message], {
    env: {
      GIT_AUTHOR_NAME: author,
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: author,
      GIT_COMMITTER_EMAIL: email,
    },
  });
}

test('TPL-225: cross-agent override on HIGH-confidence abandoned claim succeeds and records signals', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-zvx039',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      created: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'shared infra' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-zvx039',
      '--agent=claude-zvx-cleanup',
      '--really',
      '--reason=orphaned cleanup after sibling tab crash',
    ]);

    assert.equal(result.status, 0, 'HIGH-confidence cross-agent override must succeed');
    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'force-expire' && e.claimId === 'clm-zvx039');
    assert.ok(ev, 'audit log must contain the success event');
    assert.ok(ev.abandonedCheck, 'cross-agent event must embed abandonedCheck');
    assert.equal(ev.abandonedCheck.confidence, 'high');
    assert.equal(ev.abandonedCheck.abandoned, true);
    assert.equal(ev.abandonedCheck.operatorConfirmed, false);
    assert.ok(
      ev.abandonedCheck.signals.length >= 3,
      'signals array must record all three signal evaluations',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-225: cross-agent override on a LOW-confidence (young) claim is rejected even with --really + --reason', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-young225',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      // 30 seconds old — squarely inside the young-claim guard.
      created: new Date(Date.now() - 30 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'wip' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-young225',
      '--agent=claude-zvx-cleanup',
      '--really',
      '--reason=looks abandoned',
    ]);

    assert.notEqual(result.status, 0, 'LOW-confidence cross-agent override must be rejected');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /confidence=low/i);
    assert.match(combined, /COA_OPERATOR=1|operator-confirmed/i);

    const claim = readClaim(repo, 'clm-young225');
    assert.equal(claim.status, 'active', 'rejected override must not flip claim status');

    const events = readAuditEvents(repo);
    const ev = events.find(
      (e) => e.event === 'force-expire-rejected' && e.claimId === 'clm-young225',
    );
    assert.ok(ev, 'audit log must contain the force-expire-rejected event');
    assert.equal(ev.rejectionReason, 'abandoned-check-low');
    assert.equal(ev.abandonedCheck.confidence, 'low');
    assert.equal(ev.abandonedCheck.operatorConfirmed, false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-225: LOW-confidence override with --operator-confirmed but NO COA_OPERATOR=1 is still rejected', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-young225',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      created: new Date(Date.now() - 30 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'wip' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    // Flag set, env var NOT set — agent attempting to fake operator confirmation.
    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-young225',
      '--agent=claude-zvx-cleanup',
      '--really',
      '--reason=I think it is abandoned',
      '--operator-confirmed',
    ]);

    assert.notEqual(result.status, 0, 'flag without env must not unlock the override');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /COA_OPERATOR=1.*must be exported|agents cannot fake/i);

    const claim = readClaim(repo, 'clm-young225');
    assert.equal(claim.status, 'active');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-225: LOW-confidence override with --operator-confirmed AND COA_OPERATOR=1 succeeds and audit records operatorConfirmed=true', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-young225',
      agent: 'claude-zvx039',
      slice: 'ZVX-039',
      created: new Date(Date.now() - 30 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'wip' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const result = runClaimCheck(
      repo,
      [
        '--force-expire',
        '--id=clm-young225',
        '--agent=claude-zvx-cleanup',
        '--really',
        '--reason=manual takeover, sibling crashed',
        '--operator-confirmed',
      ],
      { COA_OPERATOR: '1' },
    );

    assert.equal(result.status, 0, 'operator-cleared override must succeed');
    const claim = readClaim(repo, 'clm-young225');
    assert.equal(claim.status, 'expired');

    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'force-expire' && e.claimId === 'clm-young225');
    assert.ok(ev);
    assert.equal(ev.crossAgent, true);
    assert.equal(ev.abandonedCheck.confidence, 'low');
    assert.equal(ev.abandonedCheck.operatorConfirmed, true);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-225: LOW confidence triggered by recent git commits matching claim.agent — rejected', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-livework',
      agent: 'claude-livework',
      slice: 'TPL-LIVE',
      created: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min old
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'live' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    // Layer a real commit by the claim's agent on top of the rehearsal repo
    // so the git-activity signal flips to 'alive'.
    commitAs(repo, 'claude-livework', 'live@test.local', 'feat: live work in progress');

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-livework',
      '--agent=claude-cleanup',
      '--really',
      '--reason=looks abandoned to me',
    ]);

    assert.notEqual(result.status, 0, 'git-activity alive signal must reject the override');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /confidence=low/);
    assert.match(combined, /commit.*by claude-livework|alive/i);

    const events = readAuditEvents(repo);
    const ev = events.find(
      (e) => e.event === 'force-expire-rejected' && e.claimId === 'clm-livework',
    );
    assert.ok(ev);
    assert.equal(ev.abandonedCheck.confidence, 'low');
    assert.ok(ev.abandonedCheck.signals.some((s) => /commit\(s\) by claude-livework/.test(s)));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-225: LOW confidence triggered by stash list mentioning claim.id — rejected', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-stashed',
      agent: 'claude-parker',
      slice: 'TPL-PARK',
      created: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min old
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'parked' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    // Park WIP work in stash and reference the claim ID in the stash message.
    // Modify the tracked README so we don't need `-u` (which would stash the
    // untracked .claims/ JSON file and make claim-check unable to find it).
    writeFileSync(join(repo, 'README.md'), '# rehearsal\nparked work\n');
    safeGitSpawn(repo, ['stash', 'push', '-m', 'WIP for clm-stashed mid-slice']);

    const result = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-stashed',
      '--agent=claude-cleanup',
      '--really',
      '--reason=looks dead',
    ]);

    assert.notEqual(result.status, 0, 'stash signal must reject the override');
    const events = readAuditEvents(repo);
    const ev = events.find(
      (e) => e.event === 'force-expire-rejected' && e.claimId === 'clm-stashed',
    );
    assert.ok(ev);
    assert.equal(ev.abandonedCheck.confidence, 'low');
    assert.ok(
      ev.abandonedCheck.signals.some((s) => /stash list contains claim ID clm-stashed/.test(s)),
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-225: MEDIUM confidence (non-git working dir) requires --operator-confirmed + COA_OPERATOR=1', () => {
  // Skip git init — both gitCmd and stashCmd will fail → unknown signals.
  // Realistic for someone running claim-check from an extracted tarball.
  const dir = mkdtempSync(join(tmpdir(), 'claim-check-rehearsal-nogit-'));
  mkdirSync(join(dir, '.claims'), { recursive: true });
  try {
    writeClaim(dir, {
      id: 'clm-medium',
      agent: 'claude-medium',
      slice: 'TPL-MED',
      created: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'docs/backlog/index.md', action: 'modify', description: 'medium' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const rejected = runClaimCheck(dir, [
      '--force-expire',
      '--id=clm-medium',
      '--agent=claude-cleanup',
      '--really',
      '--reason=cleanup',
    ]);
    assert.notEqual(rejected.status, 0, 'MEDIUM confidence must require operator clearance');
    const combinedRej = `${rejected.stdout}\n${rejected.stderr}`;
    assert.match(combinedRej, /confidence=medium/);

    let claim = readClaim(dir, 'clm-medium');
    assert.equal(claim.status, 'active');

    const cleared = runClaimCheck(
      dir,
      [
        '--force-expire',
        '--id=clm-medium',
        '--agent=claude-cleanup',
        '--really',
        '--reason=verified at the keyboard',
        '--operator-confirmed',
      ],
      { COA_OPERATOR: '1' },
    );
    assert.equal(cleared.status, 0, 'operator clearance must unblock MEDIUM tier');
    claim = readClaim(dir, 'clm-medium');
    assert.equal(claim.status, 'expired');

    const events = readAuditEvents(dir);
    const successEv = events.find(
      (e) => e.event === 'force-expire' && e.claimId === 'clm-medium',
    );
    assert.ok(successEv);
    assert.equal(successEv.abandonedCheck.confidence, 'medium');
    assert.equal(successEv.abandonedCheck.operatorConfirmed, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('TPL-225: same-agent overrides do NOT run the abandoned-check (preserves TPL-221 same-agent flow)', () => {
  // Field-finding-012 was a cross-agent incident; same-agent overrides are
  // the agent acting on its own state and stay governed by Layer A/C alone.
  // The young-claim guard still rejects, but the error must be the TPL-221
  // young-claim message, NOT a TPL-225 abandoned-check message.
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-self',
      agent: 'session-A',
      slice: 'TPL-SELF',
      created: new Date(Date.now() - 30 * 1000).toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'modules/auth/public-api.mjs', action: 'modify', description: 'wip' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    const rejected = runClaimCheck(repo, ['--force-expire', '--id=clm-self', '--agent=session-A']);
    assert.notEqual(rejected.status, 0);
    const combined = `${rejected.stdout}\n${rejected.stderr}`;
    assert.match(combined, /younger than 5 min/);
    assert.doesNotMatch(combined, /abandoned-check|confidence=/);

    const success = runClaimCheck(repo, [
      '--force-expire',
      '--id=clm-self',
      '--agent=session-A',
      '--really',
    ]);
    assert.equal(success.status, 0, 'same-agent young override with --really must still pass');
    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'force-expire' && e.claimId === 'clm-self');
    assert.ok(ev);
    assert.equal(
      'abandonedCheck' in ev,
      false,
      'same-agent events must NOT carry abandonedCheck',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('claim-check --enforce allows a non-overlapping modify when the active claim targets a different file', () => {
  const repo = createRehearsalRepo();
  try {
    writeClaim(repo, {
      id: 'clm-rehearsal-c',
      agent: 'team-alpha / hex-architect',
      slice: 'TPL-REHEARSAL-C',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [
        {
          path: 'modules/auth/ports/auth-port.mjs',
          module: 'auth',
          surface: 'port',
          action: 'modify',
          description: 'Add MFA challenge field',
        },
      ],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'Rehearsal claim — distinct module, must not block cache work.',
    });

    const result = runClaimCheck(repo, [
      '--targets=modules/cache/ports/cache-port.mjs',
      '--action=modify',
      '--enforce',
    ]);

    assert.equal(
      result.status,
      0,
      'enforce mode must exit zero when no conflict exists on the contested file',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// TPL-223 — Entry-010 J3 + Entry-011 J3.5 + Entry-014 J3.6 collision rehearsal
// ---------------------------------------------------------------------------
//
// J3:   --auto-complete --staged previously flipped a claim to "completed"
//       based on staged-files intersection alone. A session that ran
//       auto-complete and then closed without committing left a claim file
//       lying that the work was done. Fix: caller must prove HEAD moved
//       (commit-hash, pre-commit-hook, or HEAD covers the targets).
//
// J3.5: --auto-complete --staged previously had no agent gate. If session
//       B's commit happened to cover session A's claim's targets (subset),
//       B's auto-complete falsely marked A's claim completed. Fix: --agent
//       is mandatory; same-agent-only by default; cross-agent requires
//       --really + --reason.
//
// J3.6: When `tryExtendClaim` (TPL-222) auto-extended a claim with ceremony
//       paths whose content didn't change (no-op regen of LOCAL.md, MICRO.md,
//       AGENTS.md, .cursorrules), those paths were absent from the commit
//       tree. The pre-J3.6 "ALL targets in proof set" rule then refused to
//       complete the claim despite the user-acquired work landing. Fix:
//       extended targets are aspirational — only user-acquired (non-extended)
//       targets gate completion.

function createGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'claim-check-tpl223-'));
  mkdirSync(join(dir, '.claims'), { recursive: true });
  // Initialize a real git repo so HEAD-verification has something to read.
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'tpl223@test.local']);
  safeGitSpawn(dir, ['config', 'user.name', 'TPL-223 Test']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  // Seed an initial commit so HEAD exists.
  writeFileSync(join(dir, 'README.md'), '# test\n', 'utf8');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}

function gitHead(repo) {
  const r = safeGitSpawn(repo, ['rev-parse', 'HEAD'], { encoding: 'utf8'});
  return r.stdout.trim();
}

test('TPL-223 J3: --auto-complete --staged WITHOUT a real commit is rejected, claim stays active, audit logs rejection', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-j3-stuck',
      agent: 'session-A',
      slice: 'TPL-J3',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'J3 reproduction: staged but never committed.',
    });

    // Mutate VERSION and stage it — but DO NOT commit. This is exactly the
    // state Entry-010 described: VERSION ahead of HEAD, claim active.
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--staged',
      '--agent=session-A',
    ]);

    assert.notEqual(result.status, 0, 'unverified auto-complete must exit non-zero');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /REJECTED/);
    assert.match(combined, /HEAD commit/);

    // Critical: the claim file is NOT modified.
    const claim = readClaim(repo, 'clm-j3-stuck');
    assert.equal(claim.status, 'active', 'rejected auto-complete must not flip claim status');

    const events = readAuditEvents(repo);
    const ev = events.find(
      (e) => e.event === 'auto-complete-rejected' && e.claimId === 'clm-j3-stuck',
    );
    assert.ok(ev, 'audit log must contain the rejection');
    assert.equal(ev.rejectionReason, 'head-did-not-move');
    assert.equal(ev.callerAgent, 'session-A');
    assert.equal(ev.agentMatch, true);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3: after a real commit, --auto-complete --commit-hash=<HEAD> succeeds and audit logs the verification mode', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-j3-good',
      agent: 'session-A',
      slice: 'TPL-J3',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);
    safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: bump VERSION (TPL-J3)']);
    const head = gitHead(repo);

    // With --commit-hash, the CLI uses the commit's diff-tree as the
    // candidate source set — no need for a non-empty staging set.
    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-A',
      `--commit-hash=${head}`,
    ]);

    assert.equal(result.status, 0, `verified auto-complete must exit zero (stderr=${result.stderr})`);
    const claim = readClaim(repo, 'clm-j3-good');
    assert.equal(claim.status, 'completed');

    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'auto-complete' && e.claimId === 'clm-j3-good');
    assert.ok(ev, 'audit log must contain the success event');
    assert.equal(ev.verifiedBy, 'commit-hash');
    assert.equal(ev.commitHash, head);
    assert.equal(ev.agentMatch, true);
    assert.equal(ev.crossAgent, false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3.5: --auto-complete --staged without --agent is rejected (Layer A)', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-j35-noagent',
      agent: 'session-A',
      slice: 'TPL-J35',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);

    const result = runClaimCheck(repo, ['--auto-complete', '--staged']);
    assert.notEqual(result.status, 0);
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /--agent.*required/);

    const claim = readClaim(repo, 'clm-j35-noagent');
    assert.equal(claim.status, 'active');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3.5: with --agent=X, X-owned claim with verified commit is completed', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-j35-mine',
      agent: 'session-X',
      slice: 'TPL-J35',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);
    safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: bump VERSION (TPL-J35)']);
    const head = gitHead(repo);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-X',
      `--commit-hash=${head}`,
    ]);

    assert.equal(result.status, 0);
    const claim = readClaim(repo, 'clm-j35-mine');
    assert.equal(claim.status, 'completed');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3.5: with --agent=X, Y-owned claim is silently skipped (audit logs agent-mismatch)', () => {
  const repo = createGitRepo();
  try {
    // The exact J3.5 incident: foreign agent's claim happens to overlap
    // with our staged files. Pre-fix the foreign claim got completed; the
    // fix demands either same-agent or --really + --reason.
    writeClaim(repo, {
      id: 'clm-j35-foreign',
      agent: 'session-Y',
      slice: 'TPL-Y',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: 'Y is mid-work; X must NOT complete this claim.',
    });
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);
    safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: bump VERSION (X work)']);
    const head = gitHead(repo);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-X',
      `--commit-hash=${head}`,
    ]);

    // Foreign-agent skip is silent (exit 0). The commit proceeds.
    assert.equal(result.status, 0, `expected silent skip, got stderr=${result.stderr}`);
    assert.match(result.stdout, /SKIPPED/);

    const claim = readClaim(repo, 'clm-j35-foreign');
    assert.equal(claim.status, 'active', "Y's claim must NOT be flipped to completed");

    const events = readAuditEvents(repo);
    const ev = events.find(
      (e) => e.event === 'auto-complete-rejected' && e.claimId === 'clm-j35-foreign',
    );
    assert.ok(ev, 'audit log must record the skipped foreign claim');
    assert.equal(ev.rejectionReason, 'agent-mismatch');
    assert.equal(ev.agentMatch, false);
    assert.equal(ev.callerAgent, 'session-X');
    assert.equal(ev.claimAgent, 'session-Y');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3.5: with --agent=X --really --reason, Y-owned claim IS completed and audit shows crossAgent=true', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-j35-takeover',
      agent: 'session-Y',
      slice: 'TPL-Y',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);
    safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: bump VERSION (X taking over)']);
    const head = gitHead(repo);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-X',
      `--commit-hash=${head}`,
      '--really',
      '--reason=operator confirmed handoff from Y',
    ]);

    assert.equal(result.status, 0, `cross-agent override should succeed (stderr=${result.stderr})`);
    const claim = readClaim(repo, 'clm-j35-takeover');
    assert.equal(claim.status, 'completed');

    const events = readAuditEvents(repo);
    const ev = events.find(
      (e) => e.event === 'auto-complete' && e.claimId === 'clm-j35-takeover',
    );
    assert.ok(ev);
    assert.equal(ev.crossAgent, true);
    assert.equal(ev.agentMatch, false);
    assert.equal(ev.callerAgent, 'session-X');
    assert.equal(ev.reason, 'operator confirmed handoff from Y');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3+J3.5 composite: B commits its own slice, A is mid-work — A is skipped, B is completed', () => {
  // The exact Entry-011 scenario: A holds claim on [VERSION, CHANGELOG.md];
  // B's commit covers [scripts/foo.mjs, VERSION, CHANGELOG.md, package.json].
  // Pre-fix B's auto-complete falsely marked A's claim completed; here we
  // prove A stays active and B completes cleanly.
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-A',
      agent: 'session-A',
      slice: 'ZVX-040',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [
        { path: 'VERSION', action: 'modify' },
        { path: 'CHANGELOG.md', action: 'modify' },
      ],
      strategy: 'modify-in-place',
      dependsOn: [],
      notes: "A's mid-work claim — must survive B's auto-complete.",
    });
    writeClaim(repo, {
      id: 'clm-B',
      agent: 'session-B',
      slice: 'TPL-B',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [
        { path: 'scripts/foo.mjs', action: 'modify' },
        { path: 'VERSION', action: 'modify' },
        { path: 'CHANGELOG.md', action: 'modify' },
        { path: 'package.json', action: 'modify' },
      ],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    // B does its work and commits.
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    writeFileSync(join(repo, 'scripts/foo.mjs'), '// B\n', 'utf8');
    writeFileSync(join(repo, 'VERSION'), '0.2.0\n', 'utf8');
    writeFileSync(join(repo, 'CHANGELOG.md'), '# changes\n', 'utf8');
    writeFileSync(join(repo, 'package.json'), '{}\n', 'utf8');
    safeGitSpawn(repo, ['add', 'scripts/foo.mjs', 'VERSION', 'CHANGELOG.md', 'package.json']);
    safeGitSpawn(repo, ['commit', '-q', '-m', "feat: B's slice (TPL-B)"]);
    const head = gitHead(repo);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-B',
      `--commit-hash=${head}`,
    ]);

    assert.equal(result.status, 0);
    const claimA = readClaim(repo, 'clm-A');
    const claimB = readClaim(repo, 'clm-B');
    assert.equal(claimA.status, 'active', "A's claim must remain active");
    assert.equal(claimB.status, 'completed', "B's claim should be completed");

    const events = readAuditEvents(repo);
    const aEv = events.find((e) => e.claimId === 'clm-A');
    const bEv = events.find((e) => e.event === 'auto-complete' && e.claimId === 'clm-B');
    assert.ok(aEv, "audit log must record A's skip");
    assert.equal(aEv.rejectionReason, 'agent-mismatch');
    assert.ok(bEv, "audit log must record B's success");
    assert.equal(bEv.agentMatch, true);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3.6: claim with auto-extended ceremony targets completes when only user targets are in commit', () => {
  // Realistic coa-merge ceremony scenario: claim acquired on
  // [scripts/coa-merge.mjs] for a slice. Coa-merge auto-extends with
  // [VERSION, CHANGELOG.md, LOCAL.md, MICRO.md] for ceremony coverage. The
  // commit modifies scripts/coa-merge.mjs and VERSION + CHANGELOG.md, but
  // LOCAL.md and MICRO.md regen produces no diff and isn't in commit tree.
  // Pre-J3.6 the claim never auto-completes; post-J3.6 it does.
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-j36',
      agent: 'session-A',
      slice: 'TPL-J36',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [
        // User-acquired target — must be in commit.
        { path: 'scripts/coa-merge.mjs', action: 'modify' },
        // Ceremony-extended targets — aspirational, not gating.
        { path: 'VERSION', action: 'modify', extended: true },
        { path: 'CHANGELOG.md', action: 'modify', extended: true },
        { path: 'LOCAL.md', action: 'modify', extended: true },
        { path: 'MICRO.md', action: 'modify', extended: true },
      ],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    // Commit modifies the user target + a couple of extended ones, but NOT
    // LOCAL.md or MICRO.md (no-op regen).
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    writeFileSync(join(repo, 'scripts/coa-merge.mjs'), '// J3.6 work\n', 'utf8');
    writeFileSync(join(repo, 'VERSION'), '0.3.0\n', 'utf8');
    writeFileSync(join(repo, 'CHANGELOG.md'), '# changes\n', 'utf8');
    safeGitSpawn(repo, ['add', 'scripts/coa-merge.mjs', 'VERSION', 'CHANGELOG.md']);
    safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: J3.6 dogfood (TPL-J36)']);
    const head = gitHead(repo);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-A',
      `--commit-hash=${head}`,
    ]);

    assert.equal(result.status, 0, `J3.6 ceremony completion must succeed (stderr=${result.stderr})`);
    const claim = readClaim(repo, 'clm-j36');
    assert.equal(claim.status, 'completed', 'claim should complete despite extended targets being absent from commit');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223 J3.6: still rejects when a user (non-extended) target is missing from the commit', () => {
  // Same shape as above but the user-acquired target is absent — this is
  // the J3 attack vector and must reject regardless of how many extended
  // targets are covered.
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-j36-bad',
      agent: 'session-A',
      slice: 'TPL-J36-BAD',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [
        { path: 'scripts/foo.mjs', action: 'modify' }, // user — absent from commit
        { path: 'VERSION', action: 'modify', extended: true },
      ],
      strategy: 'modify-in-place',
      dependsOn: [],
    });

    writeFileSync(join(repo, 'VERSION'), '0.4.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);
    safeGitSpawn(repo, ['commit', '-q', '-m', 'chore: VERSION only']);
    const head = gitHead(repo);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-A',
      `--commit-hash=${head}`,
    ]);

    // No user target in commit, so the claim is not even a candidate
    // (findCompletableClaims excludes it). Exit code is 0 (no completion
    // attempted), but claim stays active.
    const claim = readClaim(repo, 'clm-j36-bad');
    assert.equal(claim.status, 'active', 'user target absent → claim must stay active');
    assert.equal(result.status, 0, 'no candidates found is not an error');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223: --from-pre-commit-hook short-circuits HEAD verification (preserves TPL-206 hook semantics)', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-hook',
      agent: 'session-A',
      slice: 'TPL-HOOK',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });
    // Stage only — no commit. This is exactly the pre-commit hook context:
    // the staging set is final but git commit hasn't created the object yet.
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--staged',
      '--agent=session-A',
      '--from-pre-commit-hook',
    ]);

    assert.equal(result.status, 0, `pre-commit-hook short-circuit should succeed (stderr=${result.stderr})`);
    const claim = readClaim(repo, 'clm-hook');
    assert.equal(claim.status, 'completed');

    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'auto-complete' && e.claimId === 'clm-hook');
    assert.ok(ev);
    assert.equal(ev.verifiedBy, 'pre-commit-hook');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223: --from-pre-commit-hook auto-derives --agent from COA_AGENT env var', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-env',
      agent: 'env-driven-agent',
      slice: 'TPL-ENV',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);

    const result = spawnSync(
      process.execPath,
      [claimCheckPath, '--auto-complete', '--staged', '--from-pre-commit-hook'],
      { cwd: repo, encoding: 'utf8', env: { ...process.env, COA_AGENT: 'env-driven-agent' } },
    );

    assert.equal(result.status, 0, `COA_AGENT-driven auto-complete should succeed (stderr=${result.stderr})`);
    const claim = readClaim(repo, 'clm-env');
    assert.equal(claim.status, 'completed');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223: --from-pre-commit-hook auto-derives --agent from active-claim match when no env var', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-detect',
      agent: 'auto-detected-agent',
      slice: 'TPL-DETECT',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);

    // No --agent, no COA_AGENT — claim-check must auto-detect from the
    // most recent active claim that overlaps the staged set.
    const cleanedEnv = { ...process.env };
    delete cleanedEnv.COA_AGENT;
    const result = spawnSync(
      process.execPath,
      [claimCheckPath, '--auto-complete', '--staged', '--from-pre-commit-hook'],
      { cwd: repo, encoding: 'utf8', env: cleanedEnv },
    );

    assert.equal(result.status, 0, `auto-detect should succeed (stderr=${result.stderr})`);
    const claim = readClaim(repo, 'clm-detect');
    assert.equal(claim.status, 'completed');

    const events = readAuditEvents(repo);
    const ev = events.find((e) => e.event === 'auto-complete' && e.claimId === 'clm-detect');
    assert.ok(ev);
    assert.equal(ev.callerAgent, 'auto-detected-agent');
    assert.equal(ev.agentSource, 'auto-detect');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('TPL-223: --really without --reason on a cross-agent claim is hard-rejected', () => {
  const repo = createGitRepo();
  try {
    writeClaim(repo, {
      id: 'clm-noreason',
      agent: 'session-Y',
      slice: 'TPL-NR',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'VERSION', action: 'modify' }],
      strategy: 'modify-in-place',
      dependsOn: [],
    });
    writeFileSync(join(repo, 'VERSION'), '0.1.0\n', 'utf8');
    safeGitSpawn(repo, ['add', 'VERSION']);
    safeGitSpawn(repo, ['commit', '-q', '-m', 'feat: bump VERSION']);
    const head = gitHead(repo);

    const result = runClaimCheck(repo, [
      '--auto-complete',
      '--agent=session-X',
      `--commit-hash=${head}`,
      '--really',
    ]);

    assert.notEqual(result.status, 0, 'missing --reason on cross-agent must reject');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /--reason/);

    const claim = readClaim(repo, 'clm-noreason');
    assert.equal(claim.status, 'active');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
