/* @HEADER
 * @version 0.7.124 | 2026-05-06
 * @purpose TPL-317 — proves claim-check --frozen=<paths> subset stores frozen list at acquire time, --enforce --staged refuses commits that touch frozen paths in any active claim, two-factor operator override (COA_OPERATOR=1 + Allow-frozen-write: <reason ≥3 chars>) is required for bypass, legacy claims without a frozen field continue to behave unchanged, and --query / --audit surface frozen-path counts. Defense-in-depth (P4) for F12 explicit-scope violation surfaced during D6 cross-variant synthesis.
 * @sidecar claim-check-frozen.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeGitSpawn, SAFE_GIT_ENV_KEYS } from '../_setup/safe-git.mjs';

const claimCheckPath = fileURLToPath(
  new URL('../../scripts/checks/claim-check.mjs', import.meta.url),
);

function createRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'claim-check-frozen-'));
  mkdirSync(join(dir, '.claims'), { recursive: true });
  // Init a tiny git repo so .git/ + COMMIT_EDITMSG path resolution works,
  // and so claim-check's git probes (history check, abandoned-check) have
  // a real repo to operate on rather than aborting on missing .git.
  safeGitSpawn(dir, ['init', '-q', '-b', 'main']);
  safeGitSpawn(dir, ['config', 'user.email', 'frozen@test.local']);
  safeGitSpawn(dir, ['config', 'user.name', 'frozen-bot']);
  safeGitSpawn(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'README.md'), '# frozen-test\n');
  safeGitSpawn(dir, ['add', 'README.md']);
  safeGitSpawn(dir, ['commit', '-q', '-m', 'init']);
  return dir;
}

function farFutureExpiry() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
}

function writeClaim(dir, claim) {
  writeFileSync(
    join(dir, '.claims', `${claim.id}.json`),
    JSON.stringify(claim, null, 2) + '\n',
    'utf8',
  );
}

function readClaim(dir, claimId) {
  return JSON.parse(readFileSync(join(dir, '.claims', `${claimId}.json`), 'utf8'));
}

function stageFiles(dir, files) {
  // Create + stage each file so `git diff --cached --name-only` returns them.
  for (const rel of files) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, `// staged content for ${rel}\n`);
    safeGitSpawn(dir, ['add', '--', rel]);
  }
}

function writeCommitEditMsg(dir, body) {
  writeFileSync(join(dir, '.git', 'COMMIT_EDITMSG'), body, 'utf8');
}

function runClaimCheck(cwd, args, env = {}) {
  const baseEnv = { ...process.env };
  delete baseEnv.COA_OPERATOR;
  for (const key of SAFE_GIT_ENV_KEYS) delete baseEnv[key];
  // CLAIMS_DIR override — keep test claims local to the temp repo even when
  // the claim-check script defaults to resolveMainRepoRoot().
  return spawnSync(process.execPath, [claimCheckPath, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...baseEnv, CLAIMS_DIR: join(cwd, '.claims'), COA_SKIP_HISTORY_CHECK: '1', ...env },
  });
}

// ---------------------------------------------------------------------------
// Test 1 — --acquire stores `frozen` list in the claim JSON
// ---------------------------------------------------------------------------
test('TPL-317 #1: --acquire --frozen=<csv> stores frozen list as top-level array on claim', () => {
  const repo = createRepo();
  try {
    const result = runClaimCheck(repo, [
      '--acquire',
      '--agent=feature-implementer',
      '--slice=DEMO-001',
      '--targets=src/foo.mjs,src/bar.mjs',
      '--frozen=src/public-api.mjs,src/locked.mjs',
      '--action=modify',
    ]);
    assert.equal(result.status, 0, `--acquire must succeed; stderr=${result.stderr}`);
    // Find the new claim file.
    const dirEntries = readdirSync(join(repo, '.claims'));
    const claimFile = dirEntries.find(
      (f) => f.startsWith('clm-') && f.endsWith('.json') && f !== 'config.json',
    );
    assert.ok(claimFile, 'claim file must exist after --acquire');
    const claim = JSON.parse(readFileSync(join(repo, '.claims', claimFile), 'utf8'));
    assert.deepEqual(
      claim.frozen,
      ['src/public-api.mjs', 'src/locked.mjs'],
      'frozen list must be stored verbatim as array of paths',
    );
    assert.equal(claim.slice, 'DEMO-001');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 2 — --enforce --staged: PASS when staged file is NOT in frozen list
// ---------------------------------------------------------------------------
test('TPL-317 #2: --enforce --staged passes when staged files do not intersect any frozen list', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-pass',
      agent: 'feature-implementer',
      slice: 'DEMO-002',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/foo.mjs']);
    const result = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.equal(
      result.status,
      0,
      `expected exit 0, got ${result.status}; stderr=${result.stderr}`,
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 3 — --enforce --staged: BLOCK when staged file is in a claim's frozen list
// ---------------------------------------------------------------------------
test('TPL-317 #3: --enforce --staged blocks when staged file matches a claim frozen path', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-block',
      agent: 'feature-implementer',
      slice: 'DEMO-003',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/locked.mjs']);
    const result = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.notEqual(result.status, 0, 'frozen-path violation must exit non-zero');
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /FROZEN/i, 'output must surface a FROZEN line');
    assert.match(combined, /src\/locked\.mjs/, 'output must name the violating file');
    assert.match(combined, /clm-frozen-block|DEMO-003/, 'output must name the claim or slice');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 4 — multi-file diff with one frozen match still blocks
// ---------------------------------------------------------------------------
test('TPL-317 #4: --enforce --staged blocks when ANY frozen file in a multi-file diff matches', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-multi',
      agent: 'feature-implementer',
      slice: 'DEMO-004',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/foo.mjs', 'src/locked.mjs', 'src/baz.mjs']);
    const result = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.notEqual(result.status, 0, 'any frozen match in a diff must trigger block');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 5 — multiple frozen files, one matches → block
// ---------------------------------------------------------------------------
test('TPL-317 #5: --enforce --staged blocks when one of several frozen paths matches a staged file', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-list',
      agent: 'feature-implementer',
      slice: 'DEMO-005',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/A.mjs', 'src/B.mjs', 'src/C.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/B.mjs']);
    const result = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.notEqual(result.status, 0);
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /src\/B\.mjs/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 6 — BACKWARDS COMPAT: legacy claim WITHOUT `frozen` field passes
// ---------------------------------------------------------------------------
test('TPL-317 #6: backwards compat — legacy claim without frozen field never blocks (CRITICAL)', () => {
  const repo = createRepo();
  try {
    // Hand-crafted legacy claim shape — no `frozen` field at all.
    writeClaim(repo, {
      id: 'clm-legacy',
      agent: 'old-agent',
      slice: 'LEGACY-001',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/anywhere.mjs', action: 'modify' }],
      strategy: 'modify-in-place',
      // NOTE: no `frozen` key
    });
    stageFiles(repo, ['src/anywhere.mjs', 'src/random.mjs']);
    const result = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.equal(
      result.status,
      0,
      `legacy claim without frozen field must not introduce blocks; stderr=${result.stderr}`,
    );
    // Sanity: ensure the claim file was NOT mutated to add a frozen array
    // (we don't want a parse-time normalization that materializes the field
    // into the on-disk JSON unexpectedly).
    const reloaded = readClaim(repo, 'clm-legacy');
    assert.equal(
      'frozen' in reloaded,
      false,
      'legacy claim file must remain unchanged on disk (no frozen normalization)',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 7 — BACKWARDS COMPAT: --acquire without --frozen produces a claim
//          that still works (the new default is `frozen: []` or absent).
// ---------------------------------------------------------------------------
test('TPL-317 #7: --acquire without --frozen flag still succeeds; no enforcement happens', () => {
  const repo = createRepo();
  try {
    const acq = runClaimCheck(repo, [
      '--acquire',
      '--agent=feature-implementer',
      '--slice=DEMO-007',
      '--targets=src/x.mjs',
      '--action=modify',
    ]);
    assert.equal(
      acq.status,
      0,
      `--acquire without --frozen must still succeed; stderr=${acq.stderr}`,
    );
    stageFiles(repo, ['src/x.mjs', 'src/elsewhere.mjs']);
    const enforce = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.equal(enforce.status, 0, 'no frozen list means no blocks');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 8 — path in BOTH targets and frozen → frozen wins (block)
// ---------------------------------------------------------------------------
test('TPL-317 #8: path in both targets and frozen → frozen wins, block fires', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-overlap',
      agent: 'feature-implementer',
      slice: 'DEMO-008',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/dual.mjs', action: 'modify' }],
      frozen: ['src/dual.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/dual.mjs']);
    const result = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.notEqual(
      result.status,
      0,
      'frozen+targets overlap must escalate to block (frozen wins)',
    );
    const combined = `${result.stdout}\n${result.stderr}`;
    assert.match(combined, /FROZEN/i);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 9 — operator override: COA_OPERATOR=1 + Allow-frozen-write: <reason>
// ---------------------------------------------------------------------------
test('TPL-317 #9: two-factor override (COA_OPERATOR=1 + Allow-frozen-write line) succeeds', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-override',
      agent: 'feature-implementer',
      slice: 'DEMO-009',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/locked.mjs']);
    writeCommitEditMsg(
      repo,
      'fix(scope): emergency edit\n\nAllow-frozen-write: hotfix for production outage\n',
    );
    const result = runClaimCheck(repo, ['--enforce', '--staged'], {
      COA_OPERATOR: '1',
    });
    assert.equal(
      result.status,
      0,
      `two-factor override must clear the frozen block; stderr=${result.stderr}`,
    );
    // Reason must surface on stderr for audit trail.
    assert.match(
      result.stderr,
      /hotfix for production outage/,
      'override reason must be logged to stderr',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 10 — operator override: COA_OPERATOR=1 only (no Allow line) → block
// ---------------------------------------------------------------------------
test('TPL-317 #10: COA_OPERATOR=1 alone is NOT enough — Allow-frozen-write line is required', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-half-1',
      agent: 'feature-implementer',
      slice: 'DEMO-010',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/locked.mjs']);
    // Empty COMMIT_EDITMSG — no Allow-frozen-write line.
    writeCommitEditMsg(repo, 'fix(scope): something\n');
    const result = runClaimCheck(repo, ['--enforce', '--staged'], {
      COA_OPERATOR: '1',
    });
    assert.notEqual(result.status, 0, 'env alone must not bypass the frozen block');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 11 — operator override: Allow line only (no COA_OPERATOR env) → block
// ---------------------------------------------------------------------------
test('TPL-317 #11: Allow-frozen-write line alone is NOT enough — COA_OPERATOR=1 is required', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-half-2',
      agent: 'feature-implementer',
      slice: 'DEMO-011',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/locked.mjs']);
    writeCommitEditMsg(repo, 'fix(scope): something\n\nAllow-frozen-write: not enough by itself\n');
    const result = runClaimCheck(repo, ['--enforce', '--staged']);
    assert.notEqual(result.status, 0, 'commit-msg alone must not bypass the frozen block');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 12 — empty / too-short reason after Allow-frozen-write: → block
// ---------------------------------------------------------------------------
test('TPL-317 #12: Allow-frozen-write with empty / <3-char reason fails the override', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-shortreason',
      agent: 'feature-implementer',
      slice: 'DEMO-012',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    stageFiles(repo, ['src/locked.mjs']);
    writeCommitEditMsg(repo, 'fix: x\n\nAllow-frozen-write: ab\n');
    const result = runClaimCheck(repo, ['--enforce', '--staged'], { COA_OPERATOR: '1' });
    assert.notEqual(result.status, 0, 'reason shorter than 3 chars must not satisfy the override');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 13 — --query=<path> reports frozen status
// ---------------------------------------------------------------------------
test('TPL-317 #13: --query=<path> reports a frozen flag when the path is in any active claim frozen list', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-frozen-query',
      agent: 'feature-implementer',
      slice: 'DEMO-013',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/locked.mjs'],
      strategy: 'modify-in-place',
    });
    const hit = runClaimCheck(repo, ['--query=src/locked.mjs']);
    assert.equal(hit.status, 0);
    assert.match(hit.stdout, /FROZEN/i, '--query of a frozen path must surface a FROZEN indicator');
    const miss = runClaimCheck(repo, ['--query=src/elsewhere.mjs']);
    assert.equal(miss.status, 0);
    assert.doesNotMatch(
      miss.stdout,
      /FROZEN/i,
      '--query of an unrelated path must NOT surface FROZEN',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 14 — --audit shows frozen-count per claim
// ---------------------------------------------------------------------------
test('TPL-317 #14: --audit surfaces frozen-count per claim (and 0 for legacy claims)', () => {
  const repo = createRepo();
  try {
    writeClaim(repo, {
      id: 'clm-audit-frozen',
      agent: 'feature-implementer',
      slice: 'DEMO-014A',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/foo.mjs', action: 'modify' }],
      frozen: ['src/p1.mjs', 'src/p2.mjs', 'src/p3.mjs'],
      strategy: 'modify-in-place',
    });
    writeClaim(repo, {
      id: 'clm-audit-legacy',
      agent: 'old-agent',
      slice: 'DEMO-014B',
      created: new Date().toISOString(),
      expires: farFutureExpiry(),
      status: 'active',
      targets: [{ path: 'src/bar.mjs', action: 'modify' }],
      // no frozen field
      strategy: 'modify-in-place',
    });
    const result = runClaimCheck(repo, ['--audit', '--json']);
    assert.equal(result.status, 0, `--audit must succeed; stderr=${result.stderr}`);
    // The audit JSON output should expose frozen-count info on each active claim.
    // We assert by grepping the JSON text for both claim IDs and a frozen count.
    assert.match(
      result.stdout,
      /"frozenCount"\s*:\s*3/,
      'claim with 3 frozen paths must report frozenCount=3',
    );
    assert.match(
      result.stdout,
      /"frozenCount"\s*:\s*0/,
      'legacy claim without frozen must report frozenCount=0',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
