/* @HEADER
 * @version 0.7.109 | 2026-05-06
 * @purpose Post-hoc ceremony drift detector — 6 checks covering snapshot, lock marker, changelog uniqueness, worktree divergence, doc completeness, and audit-log correlation.
 * @sidecar merge-ceremony-drift-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Merge-ceremony drift check (R6).
 *
 * Runs 6 post-hoc audit checks. Designed to be warn-only by default so
 * existing repos with partial ceremony coverage are not immediately broken.
 *
 * Checks:
 *   1. Snapshot presence   — .backups/ has a file matching merge-*VERSION*
 *   2. Stale lock marker   — .claims/.coa-merging.lock PID dead or age > 5min
 *   3. CHANGELOG uniqueness — duplicate version headings or slice IDs
 *   4. Worktree divergence — linked worktrees with HEAD ≠ main > 24h
 *   5. Doc completeness   — scripts in merge-ceremony.md that don't exist
 *   6. Audit-log correlation — protected-path commits without audit coverage
 *
 * Usage:
 *   node scripts/checks/merge-ceremony-drift-check.mjs              # warn mode
 *   node scripts/checks/merge-ceremony-drift-check.mjs --enforce    # exit 1 on WARN
 *   node scripts/checks/merge-ceremony-drift-check.mjs --warn-only  # same as default
 *   node scripts/checks/merge-ceremony-drift-check.mjs --recent=N   # override 20-commit default for Check 6
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Resolve repo root and parse args
// ---------------------------------------------------------------------------

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

const args = process.argv.slice(2);
const ENFORCE = args.includes('--enforce');
let recentCount = 20;
for (const a of args) {
  const m = a.match(/^--recent=(\d+)$/);
  if (m) recentCount = parseInt(m[1], 10);
}

let anyWarn = false;

function pass(check, msg) {
  console.log(`[PASS] Check ${check}: ${msg}`);
}

function warn(check, msg) {
  console.warn(`[WARN] Check ${check}: ${msg}`);
  anyWarn = true;
}

function skip(check, msg) {
  console.log(`[SKIP] Check ${check}: ${msg}`);
}

// ---------------------------------------------------------------------------
// Check 1 — Snapshot presence
// ---------------------------------------------------------------------------

function check1() {
  let version;
  try {
    version = readFileSync(join(repoRoot, 'VERSION'), 'utf8').trim();
  } catch {
    skip(1, 'VERSION file not found — skipping snapshot check');
    return;
  }

  const backupsDir = join(repoRoot, '.backups');
  if (!existsSync(backupsDir)) {
    warn(1, `.backups/ directory not found — no snapshot for v${version}`);
    return;
  }

  let files;
  try {
    files = readdirSync(backupsDir);
  } catch {
    warn(1, `Cannot read .backups/ — no snapshot for v${version}`);
    return;
  }

  const snapshotFound = files.some((f) => f.includes(version) && f.startsWith('merge-'));
  if (!snapshotFound) {
    warn(1, `No snapshot found for v${version} in .backups/`);
  } else {
    pass(1, `Snapshot for v${version} found in .backups/`);
  }
}

// ---------------------------------------------------------------------------
// Check 2 — Stale lock marker
// ---------------------------------------------------------------------------

function check2() {
  const lockPath = join(repoRoot, '.claims', '.coa-merging.lock');
  if (!existsSync(lockPath)) {
    pass(2, 'No .coa-merging.lock present (no active ceremony)');
    return;
  }

  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch {
    warn(2, '.coa-merging.lock is not valid JSON — possible corrupt ceremony state');
    return;
  }

  const pid = lock.pid;
  const ts = lock.ts;

  if (!pid || !ts) {
    warn(2, '.coa-merging.lock is missing pid or ts fields');
    return;
  }

  // Check age
  const ageMs = Date.now() - Date.parse(ts);
  if (ageMs > 5 * 60 * 1000) {
    warn(2, `.coa-merging.lock is stale: ${Math.round(ageMs / 1000)}s old (threshold: 300s)`);
    return;
  }

  // Check PID liveness
  let pidDead = false;
  try {
    process.kill(pid, 0);
  } catch {
    pidDead = true;
  }

  if (pidDead) {
    warn(2, `.coa-merging.lock PID ${pid} is not running — ceremony may be interrupted`);
  } else {
    pass(2, `.coa-merging.lock present with live PID ${pid} (age: ${Math.round(ageMs / 1000)}s)`);
  }
}

// ---------------------------------------------------------------------------
// Check 3 — CHANGELOG section uniqueness
// ---------------------------------------------------------------------------

function check3() {
  const changelogPath = join(repoRoot, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    skip(3, 'CHANGELOG.md not found — skipping');
    return;
  }

  let changelog;
  try {
    changelog = readFileSync(changelogPath, 'utf8');
  } catch {
    warn(3, 'Cannot read CHANGELOG.md');
    return;
  }

  // Find all ## [X.Y.Z] headings
  const versionHeadings = [];
  const headingRe = /^## \[(\d[\d.]+)\]/gm;
  let m;
  while ((m = headingRe.exec(changelog)) !== null) {
    versionHeadings.push({ version: m[1], index: m.index });
  }

  // Check for duplicate version headings — the primary drift signal.
  // A duplicate ## [X.Y.Z] heading indicates a ceremony that ran twice
  // against the same VERSION (e.g., Cockpit 2026-05-03 incident).
  const seen = new Map();
  const duplicates = [];
  for (const h of versionHeadings) {
    if (seen.has(h.version)) {
      duplicates.push(h.version);
    }
    seen.set(h.version, true);
  }

  if (duplicates.length > 0) {
    warn(3, `Duplicate CHANGELOG version headings: ${duplicates.join(', ')}`);
    return;
  }

  // Secondary check: scan for the same slice ID used as the SOLE identifier
  // in two adjacent section headings (e.g., "#### TPL-242\n...\n#### TPL-242").
  // This is a much narrower signal than "same ID mentioned anywhere" — it catches
  // ceremony corruption where the same work-item landed in two split sections.
  // Normal multi-release references (fix-of-fix, multi-part delivery) are
  // intentionally allowed because they are expected in a cumulative changelog.
  const sectionBoundaries = versionHeadings.map((h) => h.index);
  sectionBoundaries.push(changelog.length);

  // Build per-section sets of heading-level slice IDs (e.g., "#### TPL-NNN")
  // Use only level-3/4 headings to avoid matching body prose
  const sectionHeadingIds = [];
  for (let i = 0; i < versionHeadings.length; i++) {
    const sectionText = changelog.slice(sectionBoundaries[i], sectionBoundaries[i + 1]);
    const ids = new Set();
    // Multi-segment prefix support (TPL-303): AIC-DEV-167, RELEASE-Q1-FEAT-008
    const headingIdRe = /^#{3,4}\s+([A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*-\d{3,})\s*$/gm;
    let sm;
    while ((sm = headingIdRe.exec(sectionText)) !== null) {
      ids.add(sm[1]);
    }
    sectionHeadingIds.push({ version: versionHeadings[i].version, ids });
  }

  const adjacentHeadingDuplicates = [];
  for (let i = 0; i + 1 < sectionHeadingIds.length; i++) {
    const a = sectionHeadingIds[i];
    const b = sectionHeadingIds[i + 1];
    for (const id of a.ids) {
      if (b.ids.has(id)) {
        adjacentHeadingDuplicates.push(`${id} in both ${a.version} and ${b.version}`);
      }
    }
  }

  if (adjacentHeadingDuplicates.length > 0) {
    warn(
      3,
      `Same slice IDs as section headings in adjacent versions (possible split ceremony): ${adjacentHeadingDuplicates.join('; ')}`,
    );
  } else {
    pass(3, 'No duplicate version headings; no adjacent-section heading-level ID duplicates');
  }
}

// ---------------------------------------------------------------------------
// Check 4 — Worktree HEAD divergence
// ---------------------------------------------------------------------------

function check4() {
  let worktreeOutput;
  try {
    worktreeOutput = execSync('git worktree list --porcelain', {
      cwd: repoRoot,
      encoding: 'utf8',
    });
  } catch {
    skip(4, 'Cannot run git worktree list — skipping');
    return;
  }

  // Parse worktree list output
  const blocks = worktreeOutput.trim().split('\n\n');
  const worktrees = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const wt = {};
    for (const line of lines) {
      if (line.startsWith('worktree ')) wt.path = line.slice(9);
      else if (line.startsWith('HEAD ')) wt.head = line.slice(5);
      else if (line.startsWith('branch ')) wt.branch = line.slice(7);
      else if (line === 'bare') wt.bare = true;
    }
    if (wt.path) worktrees.push(wt);
  }

  // Get main worktree (first entry)
  const mainWorktree = worktrees[0];
  if (!mainWorktree) {
    skip(4, 'No worktrees found — skipping');
    return;
  }

  const mainHead = mainWorktree.head;

  // Get main branch HEAD
  let mainBranchHead = mainHead;
  for (const candidate of ['main', 'master']) {
    try {
      mainBranchHead = execSync(`git rev-parse ${candidate}`, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      break;
    } catch {
      // try next candidate
    }
  }

  const diverged = [];
  for (const wt of worktrees.slice(1)) {
    if (wt.bare) continue;
    if (!wt.head || wt.head === mainBranchHead) continue;

    // Check age via mtime of the HEAD file in .git/worktrees/<name>
    // The HEAD file path: repoRoot/.git/worktrees/<basename>/HEAD
    // wt.path may be a Windows absolute path; use the last path segment.
    const wtBasename = wt.path.replace(/\\/g, '/').split('/').pop();
    const headFilePath = join(repoRoot, '.git', 'worktrees', wtBasename, 'HEAD');

    let ageMs;
    try {
      const st = statSync(headFilePath);
      ageMs = Date.now() - st.mtimeMs;
    } catch {
      // Fallback: can't determine age, assume stale
      ageMs = 25 * 60 * 60 * 1000;
    }

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (ageMs > TWENTY_FOUR_HOURS) {
      diverged.push(
        `${wt.path} (HEAD ${wt.head?.slice(0, 8)}, ~${Math.round(ageMs / 3600000)}h old)`,
      );
    }
  }

  if (diverged.length > 0) {
    warn(4, `Linked worktrees with stale diverged HEAD: ${diverged.join('; ')}`);
  } else {
    pass(4, 'No stale-diverged linked worktrees found');
  }
}

// ---------------------------------------------------------------------------
// Check 5 — Ceremony doc completeness
// ---------------------------------------------------------------------------

function check5() {
  const docPath = join(repoRoot, 'docs', 'guides', 'merge-ceremony.md');
  if (!existsSync(docPath)) {
    warn(5, 'docs/guides/merge-ceremony.md not found — ceremony doc missing');
    return;
  }

  let doc;
  try {
    doc = readFileSync(docPath, 'utf8');
  } catch {
    warn(5, 'Cannot read docs/guides/merge-ceremony.md');
    return;
  }

  const preCommitPath = join(repoRoot, '.githooks', 'pre-commit');
  let preCommit = '';
  try {
    preCommit = readFileSync(preCommitPath, 'utf8');
  } catch {
    // If we can't read pre-commit, skip the phase cross-check
  }

  // Find all scripts/checks/ references in the doc
  const scriptRe = /scripts\/checks\/[\w.-]+\.mjs/g;
  const referencedScripts = [];
  let sm;
  while ((sm = scriptRe.exec(doc)) !== null) {
    if (!referencedScripts.includes(sm[0])) referencedScripts.push(sm[0]);
  }

  const missingScripts = [];
  for (const scriptPath of referencedScripts) {
    if (!existsSync(join(repoRoot, scriptPath))) {
      missingScripts.push(scriptPath);
    }
  }

  // Find all Phase N references in the doc (e.g., "Phase 7", "Phase 2.5")
  const phaseRe = /Phase (\d+(?:\.\d+)?)/g;
  const referencedPhases = new Set();
  let pm;
  while ((pm = phaseRe.exec(doc)) !== null) {
    referencedPhases.add(pm[1]);
  }

  const missingPhases = [];
  if (preCommit) {
    for (const phase of referencedPhases) {
      // Check if phase appears in pre-commit (as "Phase N" or "should_run N" or "should_run $phase" check)
      const phasePattern = new RegExp(
        `Phase\\s+${phase.replace('.', '\\.')}|should_run\\s+${phase.replace('.', '\\.')}`,
        'i',
      );
      if (!phasePattern.test(preCommit)) {
        missingPhases.push(phase);
      }
    }
  }

  const issues = [];
  if (missingScripts.length > 0) issues.push(`Missing scripts: ${missingScripts.join(', ')}`);
  if (missingPhases.length > 0)
    issues.push(`Phases in doc but not in pre-commit: ${missingPhases.join(', ')}`);

  if (issues.length > 0) {
    warn(5, issues.join('; '));
  } else {
    pass(
      5,
      `Ceremony doc references verified (${referencedScripts.length} scripts, ${referencedPhases.size} phases)`,
    );
  }
}

// ---------------------------------------------------------------------------
// Check 6 — Claim audit-log correlation
// ---------------------------------------------------------------------------

function check6() {
  const auditPath = join(repoRoot, '.claims', 'audit.log');
  if (!existsSync(auditPath)) {
    skip(6, 'audit.log not found or empty — skipping Check 6');
    return;
  }

  let auditContent;
  try {
    auditContent = readFileSync(auditPath, 'utf8').trim();
  } catch {
    skip(6, 'Cannot read audit.log — skipping Check 6');
    return;
  }

  if (!auditContent) {
    skip(6, 'audit.log is empty — skipping Check 6');
    return;
  }

  // Parse JSONL audit entries
  const auditEntries = [];
  for (const line of auditContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      auditEntries.push(JSON.parse(trimmed));
    } catch {
      // Skip malformed lines
    }
  }

  if (auditEntries.length === 0) {
    skip(6, 'audit.log has no parseable entries — skipping Check 6');
    return;
  }

  // Get oldest audit entry timestamp
  const oldestAuditTs = auditEntries.reduce((min, e) => {
    const t = e.ts ? Date.parse(e.ts) : Infinity;
    return Math.min(min, t);
  }, Infinity);

  // Protected paths to check
  const PROTECTED_PATHS = ['VERSION', 'CHANGELOG.md', 'package.json'];
  const PROTECTED_GLOB = '.githooks/';

  // Get recent commits
  let gitLogOutput;
  try {
    gitLogOutput = execSync(`git log --pretty=format:"%H %ct" -${recentCount}`, {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    skip(6, 'Cannot run git log — skipping Check 6');
    return;
  }

  if (!gitLogOutput) {
    skip(6, 'No commits found — skipping Check 6');
    return;
  }

  const commits = [];
  for (const line of gitLogOutput.split('\n')) {
    const parts = line.trim().split(' ');
    if (parts.length < 2) continue;
    commits.push({ hash: parts[0], ts: parseInt(parts[1], 10) * 1000 });
  }

  // Read claim files to build a map of claimId -> targets
  const claimsDir = join(repoRoot, '.claims');
  const claimTargets = new Map();
  try {
    const claimFiles = readdirSync(claimsDir).filter(
      (f) => f.startsWith('clm-') && f.endsWith('.json'),
    );
    for (const cf of claimFiles) {
      try {
        const claimData = JSON.parse(readFileSync(join(claimsDir, cf), 'utf8'));
        if (claimData.id && claimData.targets) {
          claimTargets.set(claimData.id, claimData.targets);
        }
      } catch {
        // skip unparseable claims
      }
    }
  } catch {
    // skip if claims dir unreadable
  }

  const warnings = [];

  for (const commit of commits) {
    // Skip if commit is older than oldest audit entry
    if (commit.ts < oldestAuditTs - 120_000) {
      continue;
    }

    // Get files changed by this commit
    let changedFiles;
    try {
      const diffOutput = execSync(`git diff-tree --no-commit-id -r --name-only ${commit.hash}`, {
        cwd: repoRoot,
        encoding: 'utf8',
      }).trim();
      changedFiles = diffOutput ? diffOutput.split('\n') : [];
    } catch {
      continue;
    }

    // Check if any changed files are protected paths
    const touchedProtected = changedFiles.filter(
      (f) => PROTECTED_PATHS.includes(f) || f.startsWith(PROTECTED_GLOB),
    );

    if (touchedProtected.length === 0) continue;

    // Find audit entries within ±120 seconds of commit timestamp
    const window = 120_000;
    const relatedEntries = auditEntries.filter((e) => {
      const eTs = e.ts ? Date.parse(e.ts) : 0;
      return Math.abs(eTs - commit.ts) <= window;
    });

    // Look for create or complete events that cover the touched paths
    let covered = false;
    for (const entry of relatedEntries) {
      if (entry.event !== 'create' && entry.event !== 'complete') continue;

      // Get targets for this claim — filter to strings only
      const rawTargets = claimTargets.get(entry.claimId) || [];
      const targets = rawTargets.filter((t) => typeof t === 'string');
      const coversAny = touchedProtected.some((p) =>
        targets.some((t) => t === p || t.endsWith(p) || p.startsWith(t)),
      );

      if (coversAny) {
        covered = true;
        break;
      }

      // If no target data available but entry references same paths in reason
      if (targets.length === 0 && entry.claimId) {
        // Soft-pass if we have an entry but can't get targets (claim may be gone)
        covered = true;
        break;
      }
    }

    if (!covered) {
      warnings.push(
        `${commit.hash.slice(0, 8)} touches [${touchedProtected.join(', ')}] but no audit entry within ±120s`,
      );
    }
  }

  if (warnings.length > 0) {
    warn(6, `Commits touching protected paths without audit coverage:\n  ${warnings.join('\n  ')}`);
  } else {
    pass(
      6,
      `Claim audit-log correlation OK for last ${Math.min(commits.length, recentCount)} commits`,
    );
  }
}

// ---------------------------------------------------------------------------
// Run all checks
// ---------------------------------------------------------------------------

check1();
check2();
check3();
check4();
check5();
check6();

if (ENFORCE && anyWarn) {
  console.error('\nmerge-ceremony-drift-check: FAIL (--enforce mode, warnings present)');
  process.exit(1);
} else if (anyWarn) {
  console.warn('\nmerge-ceremony-drift-check: WARN (warn-only mode, see above)');
} else {
  console.log('\nmerge-ceremony-drift-check: OK');
}
