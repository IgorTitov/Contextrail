/* @HEADER
 * @version 0.7.116 | 2026-05-06
 * @purpose Unit tests for claim-check --clean-expired (TPL-309 / ADR-0037). Operator-gated physical deletion of stale claim files; deletes status=expired immediately and status=completed older than --keep-completed-days (default 30).
 * @sidecar claim-check-clean-expired.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SAFE_GIT_ENV_KEYS } from '../_setup/safe-git.mjs';

const claimCheckPath = fileURLToPath(
  new URL('../../scripts/checks/claim-check.mjs', import.meta.url),
);

function makeIsolatedEnv(claimsDir, extra = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.COA_OPERATOR;
  for (const key of SAFE_GIT_ENV_KEYS) delete baseEnv[key];
  return {
    ...baseEnv,
    CLAIMS_DIR: claimsDir,
    COA_SKIP_HISTORY_CHECK: '1',
    ...extra,
  };
}

function makeClaimsDir() {
  return mkdtempSync(join(tmpdir(), 'clean-expired-'));
}

function writeClaim(dir, claim) {
  writeFileSync(join(dir, `${claim.id}.json`), JSON.stringify(claim, null, 2) + '\n', 'utf8');
}

function farFutureExpiry() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

function pastIso(daysAgo) {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

function run(claimsDir, args, envExtra = {}) {
  return spawnSync(process.execPath, [claimCheckPath, '--clean-expired', ...args, '--json'], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: makeIsolatedEnv(claimsDir, envExtra),
  });
}

describe('claim-check --clean-expired (TPL-309)', () => {
  test('1. without COA_OPERATOR=1 → refused', () => {
    const dir = makeClaimsDir();
    try {
      writeClaim(dir, {
        id: 'clm-1',
        agent: 'a',
        slice: 'TPL-1',
        status: 'expired',
        created: pastIso(2),
        expires: pastIso(1),
        targets: [],
      });
      const res = run(dir, []);
      assert.equal(res.status, 1);
      assert.match(res.stdout + res.stderr, /COA_OPERATOR=1/);
      assert.ok(existsSync(join(dir, 'clm-1.json')), 'file kept on refusal');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('2. with COA_OPERATOR=1: expired deleted, completed kept (recent), completed deleted (old), active kept', () => {
    const dir = makeClaimsDir();
    try {
      writeClaim(dir, {
        id: 'clm-stale',
        agent: 'a',
        slice: 'TPL-1',
        status: 'expired',
        created: pastIso(3),
        expires: pastIso(2),
        targets: [],
      });
      writeClaim(dir, {
        id: 'clm-completed-recent',
        agent: 'a',
        slice: 'TPL-2',
        status: 'completed',
        created: pastIso(2),
        expires: farFutureExpiry(),
        completed_at: pastIso(1),
        targets: [],
      });
      writeClaim(dir, {
        id: 'clm-completed-old',
        agent: 'a',
        slice: 'TPL-3',
        status: 'completed',
        created: pastIso(60),
        expires: farFutureExpiry(),
        completed_at: pastIso(45),
        targets: [],
      });
      writeClaim(dir, {
        id: 'clm-active',
        agent: 'a',
        slice: 'TPL-4',
        status: 'active',
        created: new Date().toISOString(),
        expires: farFutureExpiry(),
        targets: [],
      });
      const res = run(dir, [], { COA_OPERATOR: '1' });
      assert.equal(res.status, 0, res.stderr);
      assert.ok(!existsSync(join(dir, 'clm-stale.json')), 'expired deleted');
      assert.ok(!existsSync(join(dir, 'clm-completed-old.json')), 'old completed deleted');
      assert.ok(existsSync(join(dir, 'clm-completed-recent.json')), 'recent completed kept');
      assert.ok(existsSync(join(dir, 'clm-active.json')), 'active kept');

      const audit = readFileSync(join(dir, 'audit.log'), 'utf8');
      const lines = audit
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l));
      const cleanEvents = lines.filter((l) => l.event === 'claim-clean-expired');
      assert.equal(cleanEvents.length, 2);
      assert.ok(cleanEvents.some((ev) => ev.claimId === 'clm-stale'));
      assert.ok(cleanEvents.some((ev) => ev.claimId === 'clm-completed-old'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('3. --dry-run does not delete and prints would-delete list', () => {
    const dir = makeClaimsDir();
    try {
      writeClaim(dir, {
        id: 'clm-stale',
        agent: 'a',
        slice: 'TPL-1',
        status: 'expired',
        created: pastIso(3),
        expires: pastIso(2),
        targets: [],
      });
      const res = run(dir, ['--dry-run'], { COA_OPERATOR: '1' });
      assert.equal(res.status, 0, res.stderr);
      assert.ok(existsSync(join(dir, 'clm-stale.json')), 'file preserved on dry-run');
      const out = JSON.parse(res.stdout);
      assert.equal(out.data.dryRun, true);
      assert.equal(out.data.candidateCount, 1);
      assert.ok(!existsSync(join(dir, 'audit.log')), 'no audit entries for dry-run');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('4. --keep-completed-days=7 deletes completed older than 7 days', () => {
    const dir = makeClaimsDir();
    try {
      writeClaim(dir, {
        id: 'clm-c10',
        agent: 'a',
        slice: 'TPL-10',
        status: 'completed',
        created: pastIso(15),
        expires: farFutureExpiry(),
        completed_at: pastIso(10),
        targets: [],
      });
      writeClaim(dir, {
        id: 'clm-c5',
        agent: 'a',
        slice: 'TPL-5',
        status: 'completed',
        created: pastIso(7),
        expires: farFutureExpiry(),
        completed_at: pastIso(5),
        targets: [],
      });
      const res = run(dir, ['--keep-completed-days=7'], { COA_OPERATOR: '1' });
      assert.equal(res.status, 0, res.stderr);
      assert.ok(!existsSync(join(dir, 'clm-c10.json')));
      assert.ok(existsSync(join(dir, 'clm-c5.json')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('5. example claims (clm-ex prefix) are never deleted', () => {
    const dir = makeClaimsDir();
    try {
      writeClaim(dir, {
        id: 'clm-ex0001',
        agent: 'doc',
        slice: 'TPL-X',
        status: 'expired',
        created: pastIso(100),
        expires: pastIso(99),
        targets: [],
      });
      const res = run(dir, [], { COA_OPERATOR: '1' });
      assert.equal(res.status, 0, res.stderr);
      assert.ok(existsSync(join(dir, 'clm-ex0001.json')), 'example claim spared');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('6. empty .claims directory → no-op exit 0', () => {
    const dir = makeClaimsDir();
    try {
      const res = run(dir, [], { COA_OPERATOR: '1' });
      assert.equal(res.status, 0, res.stderr);
      const out = JSON.parse(res.stdout);
      assert.equal(out.data.deletedCount, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
