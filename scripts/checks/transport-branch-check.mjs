/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose R2 enforcement (ADR-0017) — refuses commits on any branch that is neither trunk nor a tx-<slice> transport branch, and gates VERSION/CHANGELOG/package.json bumps behind a coa-merge-issued marker.
 * @sidecar transport-branch-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * R2 — transport-branch enforcement.
 *
 * Owns the pre-commit guard that:
 *
 *   1. Refuses commits on branches that are neither `main` / `master`
 *      nor `tx-<slice>` transport branches (banned shapes get a
 *      specific error pointing at coa-worktree --create --slice=).
 *   2. On a transport branch, allows ordinary code commits but refuses
 *      a VERSION / package.json / CHANGELOG.md bump unless coa-merge
 *      wrote a fresh `.claims/.coa-merging.lock` marker tying the
 *      commit to a known parent process.
 *   3. Warns on transport branches older than 24h and refuses ones
 *      older than 7d (operator override gated behind --really).
 *
 * Modes:
 *   --self-test   — runs known-good and known-bad fixture cases through
 *                    the helpers; ensures regex / threshold weakening
 *                    fails CI before a real scan happens.
 *   --phase=pre-commit (default for hook context) — exits 1 on any
 *                    refusal; emits a copy-pasteable hint.
 *   --json         — machine-readable output { ok, refused, warnings }.
 *   --really       — operator override for the 7d refusal path. Together
 *                    with COA_OPERATOR=1 in the env, lets a known-stale
 *                    transport branch commit one more time so the
 *                    operator can finish merging it.
 *
 * The check delegates name validation, marker shape, and age verdicts
 * to scripts/lib/transport-branch.mjs (pure-logic, unit-tested).
 *
 * @see scripts/lib/transport-branch.mjs
 * @see docs/adr/0017-transport-branch-enforcement.md
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isTransportBranchName,
  isTrunkBranchName,
  isAcceptableBranchName,
  findBannedBranchReason,
  mergingMarkerPath,
  parseMergingMarker,
  MERGING_MARKER_MAX_AGE_MS,
  hoursSinceBranchCreation,
  ageVerdict,
  ceremonyFilesIn,
  TRANSPORT_BRANCH_AGE_WARN_HOURS,
  TRANSPORT_BRANCH_AGE_REFUSE_HOURS,
} from '../lib/transport-branch.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Git probes — small, defensive wrappers
// ---------------------------------------------------------------------------

/**
 * Run a git command at `cwd` and return { ok, stdout, stderr }. Never
 * throws — the checker prefers explicit failures with the operator
 * actually seeing the message over a stack-trace.
 */
function git(args, cwd = ROOT) {
  const run = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  return {
    ok: run.status === 0,
    stdout: (run.stdout || '').trim(),
    stderr: (run.stderr || '').trim(),
    status: run.status,
  };
}

/**
 * Current branch name, or null when detached / unavailable.
 */
function currentBranch() {
  const out = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!out.ok) return null;
  if (out.stdout === 'HEAD') return null; // detached
  return out.stdout || null;
}

/**
 * Files in the current commit's staged set.
 */
function stagedFiles() {
  const out = git(['diff', '--cached', '--name-only']);
  if (!out.ok) return [];
  return out.stdout.split('\n').filter((s) => s.length > 0);
}

/**
 * Branch creation timestamp (epoch ms) — best approximation we can get
 * cheaply. Uses the branch's earliest unique commit date relative to
 * the trunk (`git log <trunk>..<branch> --format=%ct | tail -1`). Falls
 * back to the branch's reflog "branch: Created" entry, then to current
 * time (which yields ageVerdict='ok' so we don't false-refuse).
 */
function branchCreationTimestamp(branch) {
  // First try: rev-list of commits unique to the branch, oldest first.
  const trunkProbe = git(['rev-parse', '--verify', '--quiet', 'refs/heads/main']);
  const trunk = trunkProbe.ok ? 'main' : 'master';
  const range = git(['rev-list', '--reverse', '--format=%ct', `${trunk}..${branch}`]);
  if (range.ok && range.stdout) {
    // rev-list with --format emits "commit <hash>" and "<ts>" alternating.
    const lines = range.stdout.split('\n').filter((l) => /^\d+$/.test(l.trim()));
    if (lines.length > 0) {
      return Number(lines[0]) * 1000;
    }
  }

  // Second try: reflog — last entry is the oldest, "Created from main".
  const reflog = git(['reflog', 'show', '--format=%ct %gs', branch]);
  if (reflog.ok && reflog.stdout) {
    const lines = reflog.stdout.split('\n').filter((l) => l.length > 0);
    const last = lines[lines.length - 1];
    const m = last.match(/^(\d+)\s/);
    if (m) return Number(m[1]) * 1000;
  }

  // Fallback — assume now (no age penalty rather than spurious refusal).
  return Date.now();
}

// ---------------------------------------------------------------------------
// Marker validation
// ---------------------------------------------------------------------------

/**
 * Walk the parent process chain (PPID → grand-PPID) and return the
 * resolved set of ancestor PIDs for `pid`. Cross-platform: uses ps -o
 * ppid= on POSIX, wmic on Windows. Returns the empty array when the
 * platform query fails — caller treats that as "cannot verify ancestry"
 * and falls back to a conservative match.
 */
function ancestorPids(pid) {
  const chain = [pid];
  let current = pid;
  // Cap depth so a misbehaving ps loop doesn't hang the hook.
  for (let i = 0; i < 8; i++) {
    let parent = null;
    if (process.platform === 'win32') {
      const r = spawnSync('wmic', [
        'process', 'where', `ProcessId=${current}`, 'get', 'ParentProcessId', '/value',
      ], { encoding: 'utf8', stdio: 'pipe', shell: false });
      const m = (r.stdout || '').match(/ParentProcessId=(\d+)/);
      if (m) parent = Number(m[1]);
    } else {
      const r = spawnSync('ps', ['-o', 'ppid=', '-p', String(current)], {
        encoding: 'utf8', stdio: 'pipe', shell: false,
      });
      const m = (r.stdout || '').trim().match(/^(\d+)$/);
      if (m) parent = Number(m[1]);
    }
    if (!parent || parent <= 0 || parent === current) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
}

/**
 * Read the merge marker, if any, and decide whether it authorizes a
 * ceremony bump on `branch` from this hook process. Returns:
 *
 *   { ok: true,  marker }                  — marker valid, allow bump
 *   { ok: false, reason: '<message>' }    — marker missing/stale/forged
 *
 * Pure-ish: I/O for reading the marker file, but no git calls beyond
 * the parent-PID query.
 */
function checkMarker(repoRoot, branch) {
  const path = mergingMarkerPath(repoRoot);
  if (!existsSync(path)) {
    return {
      ok: false,
      reason:
        'no .claims/.coa-merging.lock marker — ceremony bumps must run via coa-merge.mjs',
    };
  }

  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    return { ok: false, reason: `marker unreadable: ${err.message}` };
  }
  const parsed = parseMergingMarker(raw);
  if (!parsed) {
    return { ok: false, reason: 'marker is malformed or has invalid fields' };
  }

  // Branch must match — a marker for a different branch is forged or stale.
  if (parsed.branch !== branch) {
    return {
      ok: false,
      reason: `marker is for branch "${parsed.branch}" but commit is on "${branch}"`,
    };
  }

  // Age check.
  const age = Date.now() - parsed.ts;
  if (age > MERGING_MARKER_MAX_AGE_MS) {
    return {
      ok: false,
      reason: `marker is ${Math.round(age / 1000)}s old (max ${MERGING_MARKER_MAX_AGE_MS / 1000}s)`,
    };
  }
  if (age < 0) {
    return { ok: false, reason: 'marker timestamp is in the future' };
  }

  // PID lineage — the marker was written by coa-merge, which spawns
  // `git commit` as a child. The pre-commit hook runs as a grandchild
  // of coa-merge (git → hook). So the marker's `pid` must appear in
  // the ancestry chain of the hook process.
  const chain = ancestorPids(process.pid);
  // Empty chain means the platform probe failed; treat that as a soft
  // pass IF the marker is fresh and branch matches — the time + branch
  // gate is still load-bearing. We log this case to stderr (visible in
  // hook output) so the operator notices.
  if (chain.length <= 1) {
    process.stderr.write(
      'transport-branch-check: WARN — could not query parent PIDs; relying on marker freshness + branch match alone\n',
    );
    return { ok: true, marker: parsed, note: 'pid-chain-unknown' };
  }
  if (!chain.includes(parsed.pid)) {
    return {
      ok: false,
      reason:
        `marker's pid ${parsed.pid} is not an ancestor of this hook process (chain: ${chain.join('→')})`,
    };
  }

  return { ok: true, marker: parsed };
}

// ---------------------------------------------------------------------------
// Self-test mode
// ---------------------------------------------------------------------------

/**
 * Self-test runs the helpers through known-good and known-bad inputs
 * one more time at hook time. Cheap (sub-millisecond) and ensures the
 * helper file hasn't been weakened between commit and now. Mirrors the
 * R1 self-test pattern.
 */
function runSelfTest(wantJson) {
  const failures = [];

  const goods = ['tx-TPL-234', 'tx-AIC-088', 'tx-ZVX-053', 'tx-TPL-227-interim'];
  for (const name of goods) {
    if (!isTransportBranchName(name)) failures.push(`expected accept: ${name}`);
  }

  const bads = [
    'feature/foo', 'feat/bar', 'fix/baz',
    'tpl234', 'TPL-234', 'tx-', 'tx-foo',
    'tx-tpl-234', 'tpl234-backport', 'backport-tpl234', 'main2',
  ];
  for (const name of bads) {
    if (isTransportBranchName(name)) failures.push(`expected reject: ${name}`);
  }

  for (const trunk of ['main', 'master']) {
    if (!isTrunkBranchName(trunk)) failures.push(`expected trunk: ${trunk}`);
  }
  if (isTrunkBranchName('main2')) failures.push('main2 must not be trunk');

  if (ageVerdict(23.99) !== 'ok') failures.push('23.99h must be ok');
  if (ageVerdict(24) !== 'warn') failures.push('24h must be warn (inclusive)');
  if (ageVerdict(168) !== 'refuse') failures.push('168h must be refuse (inclusive)');

  if (parseMergingMarker('not json') !== null) {
    failures.push('parseMergingMarker should reject malformed input');
  }
  if (parseMergingMarker(JSON.stringify({ pid: 1, branch: 'main', ts: 1 })) !== null) {
    failures.push('parseMergingMarker should reject non-transport branch');
  }
  const round = parseMergingMarker(
    JSON.stringify({ pid: 1, branch: 'tx-TPL-1', ts: 1 }),
  );
  if (!round || round.pid !== 1) failures.push('round-trip parseMergingMarker failed');

  if (ceremonyFilesIn(['VERSION', 'foo.mjs']).length !== 1) {
    failures.push('ceremonyFilesIn smoke');
  }

  const ok = failures.length === 0;
  if (wantJson) {
    console.log(JSON.stringify({ ok, failures }, null, 2));
  } else if (!ok) {
    console.error('transport-branch-check --self-test: FAIL');
    for (const f of failures) console.error(`  - ${f}`);
  } else {
    console.log('transport-branch-check --self-test: OK');
  }
  process.exit(ok ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Phase: pre-commit (default)
// ---------------------------------------------------------------------------

function explainBannedBranch(branch, banReason) {
  return [
    `Refusing to commit on branch "${branch}".`,
    banReason
      ? `Reason: ${banReason}`
      : 'This branch is neither trunk (main/master) nor a transport branch (tx-<slice>).',
    '',
    'Either:',
    '  - Switch to main:   git checkout main',
    '  - Create a transport worktree:',
    '      node scripts/coa-worktree.mjs --create --slice=<TPL-XXX>',
    '',
    'See docs/adr/0017-transport-branch-enforcement.md for the policy.',
  ].join('\n');
}

/**
 * Run the pre-commit phase. Exits 0 on pass, 1 on refusal. Returns the
 * structured result for callers that import this directly (the R2
 * integration tests exercise it without spawning a child process).
 */
export function runPreCommit({ repoRoot = ROOT, json = false, really = false, silent = false } = {}) {
  const refuse = (reason, extras = {}) => {
    const out = { ok: false, reason, ...extras };
    if (!silent) {
      if (json) console.log(JSON.stringify(out));
      else console.error(`transport-branch-check: ${reason}`);
    }
    return { exitCode: 1, result: out };
  };
  const pass = (extras = {}) => {
    const out = { ok: true, ...extras };
    if (!silent) {
      if (json) console.log(JSON.stringify(out));
      // human-friendly path stays quiet on success
    }
    return { exitCode: 0, result: out };
  };

  const branch = (() => {
    const probe = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot, encoding: 'utf8', stdio: 'pipe', shell: false,
    });
    if (probe.status !== 0) return null;
    const out = (probe.stdout || '').trim();
    if (!out || out === 'HEAD') return null;
    return out;
  })();

  if (!branch) {
    return refuse('cannot determine current branch (detached HEAD?)');
  }

  // Trunk: backward-compat — direct commits to main are allowed.
  if (isTrunkBranchName(branch)) {
    return pass({ branch, mode: 'trunk' });
  }

  if (!isAcceptableBranchName(branch)) {
    const banned = findBannedBranchReason(branch);
    return refuse(explainBannedBranch(branch, banned ? banned.reason : null), {
      branch,
      banned: banned ? banned.reason : null,
    });
  }

  // Transport-branch path.
  const stagedProbe = spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd: repoRoot, encoding: 'utf8', stdio: 'pipe', shell: false,
  });
  const staged = stagedProbe.status === 0
    ? (stagedProbe.stdout || '').split('\n').filter((s) => s.length > 0)
    : [];
  const ceremonyHits = ceremonyFilesIn(staged);

  // Age check first — a 7d-old branch refuses even ordinary code
  // commits unless the operator passes --really + COA_OPERATOR=1.
  const ageMs = branchCreationTimestamp(branch);
  const hours = hoursSinceBranchCreation(ageMs, Date.now());
  const verdict = ageVerdict(hours);

  if (verdict === 'refuse') {
    if (!(really && process.env.COA_OPERATOR === '1')) {
      return refuse(
        [
          `Refusing to commit: branch "${branch}" is ${hours.toFixed(1)}h old`,
          `(refuse threshold = ${TRANSPORT_BRANCH_AGE_REFUSE_HOURS}h, ADR-0017).`,
          'A transport branch this old should be rebased + merged or abandoned.',
          '',
          'Override (operator only):',
          '  COA_OPERATOR=1 ... commit ... (with --really propagated to the check)',
        ].join('\n'),
        { branch, ageHours: hours, verdict },
      );
    }
    if (!silent) {
      process.stderr.write(
        `transport-branch-check: OPERATOR OVERRIDE — committing on ${hours.toFixed(1)}h-old branch "${branch}"\n`,
      );
    }
  } else if (verdict === 'warn' && !silent) {
    process.stderr.write(
      `transport-branch-check: WARN — branch "${branch}" is ${hours.toFixed(1)}h old (warn ≥ ${TRANSPORT_BRANCH_AGE_WARN_HOURS}h)\n`,
    );
  }

  if (ceremonyHits.length === 0) {
    return pass({ branch, mode: 'transport-code', ageHours: hours, verdict });
  }

  // Ceremony files staged — require valid marker.
  const markerCheck = checkMarker(repoRoot, branch);
  if (!markerCheck.ok) {
    return refuse(
      [
        `Refusing to commit ceremony files (${ceremonyHits.join(', ')}) on transport branch "${branch}".`,
        markerCheck.reason,
        '',
        'Ceremony bumps are only valid when invoked through coa-merge.mjs,',
        'which writes a fresh .claims/.coa-merging.lock before staging.',
      ].join('\n'),
      { branch, ceremonyHits, markerError: markerCheck.reason },
    );
  }

  return pass({
    branch,
    mode: 'transport-ceremony',
    ageHours: hours,
    verdict,
    marker: markerCheck.marker,
    ceremonyHits,
    ...(markerCheck.note ? { note: markerCheck.note } : {}),
  });
}

// ---------------------------------------------------------------------------
// Argv parsing + main
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const map = new Map();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) map.set(arg.slice(0, eq), arg.slice(eq + 1));
    else map.set(arg, true);
  }
  return {
    has: (k) => map.has(k),
    get: (k) => { const v = map.get(k); return v === true ? undefined : v; },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const wantJson = args.has('--json');

  if (args.has('--self-test')) {
    runSelfTest(wantJson);
    return;
  }

  const phase = args.get('--phase') || 'pre-commit';
  if (phase !== 'pre-commit') {
    console.error(`transport-branch-check: unknown phase "${phase}"`);
    process.exit(1);
  }

  const { exitCode } = runPreCommit({
    json: wantJson,
    really: args.has('--really'),
  });
  process.exit(exitCode);
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('transport-branch-check.mjs') ||
  process.argv[1].endsWith('transport-branch-check')
);

if (isDirectRun) {
  main();
}

// Exports for integration tests + coa-merge consumers.
export {
  ROOT,
  branchCreationTimestamp,
  checkMarker,
  ancestorPids,
};
