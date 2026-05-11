/* @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Meta-test for R1 (ADR-0015) — pins detection of all 17 fixtures, asserts allowlist starts empty, and proves the runtime guard / safe-git helper invariants the static check depends on.
 * @sidecar test-isolation-check.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  detect,
  scanFile,
  readWhitelistMarker,
  stripCommentsAndStrings,
  SELF_TEST_EXPECTATIONS,
} from '../../scripts/checks/test-isolation-check.mjs';
import { SAFE_GIT_ENV_KEYS } from '../_setup/safe-git.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const FIXTURE_ROOT = join(REPO_ROOT, 'tests', 'checks', 'fixtures', 'test-isolation');
const ALLOWLIST_PATH = join(REPO_ROOT, 'scripts', 'checks', 'test-isolation-allowlist.json');
const PRE_COMMIT_PATH = join(REPO_ROOT, '.githooks', 'pre-commit');
const PACKAGE_JSON_PATH = join(REPO_ROOT, 'package.json');

// ---------------------------------------------------------------------------
// Fixture inventory — every entry of SELF_TEST_EXPECTATIONS must exist on disk
// ---------------------------------------------------------------------------

describe('R1 meta-test — fixture inventory', () => {
  test('every expected fixture file exists', () => {
    const missing = [];
    for (const name of Object.keys(SELF_TEST_EXPECTATIONS)) {
      const p = join(FIXTURE_ROOT, name);
      if (!existsSync(p)) missing.push(name);
    }
    assert.deepEqual(missing, [], `missing fixtures: ${missing.join(', ')}`);
  });

  test('19 fixtures total are tracked (14 bad + 2 good + 3 whitelist)', () => {
    const expected = Object.keys(SELF_TEST_EXPECTATIONS).length;
    assert.equal(expected, 19, 'fixture coverage budget — extending requires explicit reason');
  });
});

// ---------------------------------------------------------------------------
// Allowlist starts empty — growth is audit-visible
// ---------------------------------------------------------------------------

describe('R1 meta-test — allowlist discipline', () => {
  test('test-isolation-allowlist.json has exactly 4 entries (R1.3 / TPL-336)', () => {
    // This list was originally empty. R1.3 (ADR-0052 / TPL-336) formally
    // whitelisted four files that intentionally access live .claims/:
    //   - the two C4 slice-ID integration tests (write claims, dynamic IDs, cleanup in after())
    //   - control-plane-coherence.test.mjs (read-only existence check)
    //   - no-test-fixture-leaks.test.mjs (read-only runtime leak detector)
    // Growth beyond 4 requires a CHANGELOG entry and per-file annotation.
    const data = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
    assert.equal(Array.isArray(data.files), true, 'allowlist must have a files array');
    assert.equal(
      data.files.length,
      4,
      `allowlist should have exactly 4 entries (R1.3 TPL-336 whitelist). Current size: ${data.files.length}`,
    );
    const expected = [
      'tests/integration/coa-worktree-slice-id-lock.test.mjs',
      'tests/integration/coa-worktree-slice-id-race.test.mjs',
      'tests/integration/control-plane-coherence.test.mjs',
      'tests/integration/no-test-fixture-leaks.test.mjs',
    ];
    for (const f of expected) {
      assert.ok(data.files.includes(f), `allowlist must include ${f}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Detection contract — every fixture maps to its expected verdict
// ---------------------------------------------------------------------------

describe('R1 meta-test — detection contract per fixture', () => {
  // Synthetic allowlist used only inside this meta-test. Mirrors the
  // synthetic allowlist baked into the static check's --self-test mode.
  const synthAllowlist = {
    files: [
      'tests/checks/fixtures/test-isolation/whitelisted-with-marker-and-allowlist.fixture.mjs',
      'tests/checks/fixtures/test-isolation/whitelisted-allowlist-no-marker.fixture.mjs',
    ],
  };

  for (const [name, exp] of Object.entries(SELF_TEST_EXPECTATIONS)) {
    test(`${name} → expected ${exp.expect}`, () => {
      const path = join(FIXTURE_ROOT, name);
      const result = scanFile(path, synthAllowlist, /*fixturesAreReal*/ true);

      if (exp.expect === 'pass') {
        assert.equal(
          result.violations.length,
          0,
          `expected zero violations, got ${JSON.stringify(result.violations.map((v) => v.pattern))}`,
        );
        return;
      }
      if (exp.expect === 'pass-via-whitelist') {
        assert.equal(
          result.whitelisted,
          true,
          `expected whitelisted=true, got violations=${JSON.stringify(result.violations.map((v) => v.pattern))}`,
        );
        return;
      }
      // expect violation
      assert.ok(result.violations.length > 0, `expected at least one violation, got none`);
      for (const wantPat of exp.patterns) {
        const found = result.violations.some((v) => v.pattern === wantPat);
        assert.ok(
          found,
          `expected pattern '${wantPat}' to be detected; got [${result.violations.map((v) => v.pattern).join(', ')}]`,
        );
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Anti-evasion: helper imports are followed
// ---------------------------------------------------------------------------

describe('R1 meta-test — transitive scan invariant', () => {
  test('bad-helper-import.fixture.mjs has no inline violation but its helper does', () => {
    const importer = join(FIXTURE_ROOT, 'bad-helper-import.fixture.mjs');
    const helper = join(FIXTURE_ROOT, 'bad-helper.mjs');

    const importerScan = scanFile(importer, { files: [] }, /*fixturesAreReal*/ true);
    assert.equal(importerScan.violations.length, 0, 'importer file alone should be clean');

    const helperScan = scanFile(helper, { files: [] }, /*fixturesAreReal*/ true);
    assert.ok(
      helperScan.violations.length > 0,
      'helper file scanned in isolation MUST produce violations — that is what transitive scan exposes',
    );
    assert.ok(
      helperScan.violations.some((v) => v.pattern === 'no-cwd'),
      'helper violation should be no-cwd',
    );
  });
});

// ---------------------------------------------------------------------------
// Token-aware stripping does not produce false positives in comments / strings
// ---------------------------------------------------------------------------

describe('R1 meta-test — token-aware stripping', () => {
  test('execSync mention inside a // comment is not flagged', () => {
    const src = `
      import { execSync } from 'node:child_process';
      // execSync('git status') — example only
      export const x = 1;
    `;
    assert.equal(detect(src).length, 0);
  });

  test('execSync mention inside a /* block comment */ is not flagged', () => {
    const src = `
      import { execSync } from 'node:child_process';
      /* execSync('git status', { cwd: process.cwd() }) — disabled */
      export const x = 1;
    `;
    assert.equal(detect(src).length, 0);
  });

  test('execSync mention inside a string literal is not flagged', () => {
    const src = `
      import { execSync } from 'node:child_process';
      const doc = "execSync('git status') is bad";
      export const y = doc;
    `;
    assert.equal(detect(src).length, 0);
  });

  test('regex literal containing /git/ does not produce false positive', () => {
    const src = `
      const re = /git status/;
      export const x = re;
    `;
    assert.equal(detect(src).length, 0);
  });
});

// ---------------------------------------------------------------------------
// TPL-272: raw-git-call pattern — raw execSync/spawn with git is forbidden
// even when cwd and env are correctly set
// ---------------------------------------------------------------------------

describe('R1 meta-test — raw-git-call pattern (TPL-272)', () => {
  test('execSync("git init") with no cwd produces a violation', () => {
    const src = `
      import { execSync } from 'node:child_process';
      execSync('git init');
    `;
    const v = detect(src);
    assert.ok(v.length > 0, 'expected at least one violation');
  });

  test('execSync("git init") with proper cwd+env still produces raw-git-call', () => {
    const src = `
      import { execSync } from 'node:child_process';
      import { mkdtempSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      import { join } from 'node:path';
      const dir = mkdtempSync(join(tmpdir(), 'fx-'));
      execSync('git init', { cwd: dir, env: { ...process.env, GIT_DIR: '', GIT_WORK_TREE: '' }, stdio: 'pipe' });
    `;
    const v = detect(src);
    assert.ok(
      v.some((x) => x.pattern === 'raw-git-call'),
      `expected raw-git-call violation; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('spawnSync("git", [...]) with proper cwd+env still produces raw-git-call', () => {
    const src = `
      import { spawnSync } from 'node:child_process';
      import { mkdtempSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      const dir = mkdtempSync(tmpdir() + '/fx-');
      spawnSync('git', ['init'], { cwd: dir, env: { ...process.env, GIT_DIR: '', GIT_WORK_TREE: '' }, stdio: 'pipe' });
    `;
    const v = detect(src);
    assert.ok(
      v.some((x) => x.pattern === 'raw-git-call'),
      `expected raw-git-call violation; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('safeGit call does not produce raw-git-call', () => {
    const src = `
      import { safeGit } from '../_setup/safe-git.mjs';
      import { mkdtempSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      const dir = mkdtempSync(tmpdir() + '/fx-');
      safeGit(dir, 'init', { stdio: 'pipe' });
    `;
    const v = detect(src);
    assert.equal(
      v.filter((x) => x.pattern === 'raw-git-call').length,
      0,
      `safeGit must not produce raw-git-call; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });
});

// ---------------------------------------------------------------------------
// R1.3 — claims-dir-leak pattern (ADR-0052 / TPL-336)
// ---------------------------------------------------------------------------

describe('R1 meta-test — claims-dir-leak pattern (R1.3)', () => {
  test('new URL(.../.claims, import.meta.url) construction is detected', () => {
    const src = `
      import { fileURLToPath } from 'node:url';
      const LIVE_CLAIMS_DIR = fileURLToPath(new URL('../../.claims', import.meta.url));
    `;
    const v = detect(src);
    assert.ok(
      v.some((x) => x.pattern === 'claims-dir-leak'),
      `expected claims-dir-leak violation; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('join(ROOT, ".claims") construction is detected', () => {
    const src = `
      import { join } from 'node:path';
      const CLAIMS = join(ROOT, '.claims');
    `;
    const v = detect(src);
    assert.ok(
      v.some((x) => x.pattern === 'claims-dir-leak'),
      `expected claims-dir-leak violation; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('join(REPO_ROOT, ".claims") construction is detected', () => {
    const src = `
      import { join } from 'node:path';
      const CLAIMS_DIR = join(REPO_ROOT, '.claims');
    `;
    const v = detect(src);
    assert.ok(
      v.some((x) => x.pattern === 'claims-dir-leak'),
      `expected claims-dir-leak violation; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('join(root, ".claims") where "root" is a local test var is NOT flagged', () => {
    // The variable "root" is a common local name for tmpdir-derived test repos.
    // Only canonical repo-root identifiers (ROOT, REPO_ROOT, __dirname, repoRoot)
    // trigger the detection.
    const src = `
      import { join } from 'node:path';
      import { mkdtempSync } from 'node:fs';
      import { tmpdir } from 'node:os';
      const root = mkdtempSync(join(tmpdir(), 'test-'));
      const claimsDir = join(root, '.claims');
    `;
    const v = detect(src);
    assert.equal(
      v.filter((x) => x.pattern === 'claims-dir-leak').length,
      0,
      `local 'root' variable must not produce claims-dir-leak; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('join(dir, ".claims") local variable is NOT flagged', () => {
    const src = `
      import { join } from 'node:path';
      const dir = mkdtempSync(join(tmpdir(), 'test-'));
      const claimsDir = join(dir, '.claims');
    `;
    const v = detect(src);
    assert.equal(
      v.filter((x) => x.pattern === 'claims-dir-leak').length,
      0,
      `local 'dir' variable must not produce claims-dir-leak; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('join(tmpdir(), ".claims") is NOT flagged — tmpdir-derived paths are safe', () => {
    const src = `
      import { join } from 'node:path';
      import { tmpdir } from 'node:os';
      const claimsDir = join(tmpdir(), 'test-repo', '.claims');
    `;
    const v = detect(src);
    assert.equal(
      v.filter((x) => x.pattern === 'claims-dir-leak').length,
      0,
      `tmpdir-derived .claims path must not produce claims-dir-leak; got [${v.map((x) => x.pattern).join(', ')}]`,
    );
  });

  test('bad-claims-write.fixture.mjs is detected with claims-dir-leak', () => {
    const path = join(FIXTURE_ROOT, 'bad-claims-write.fixture.mjs');
    const result = scanFile(path, { files: [] }, /*fixturesAreReal*/ true);
    assert.ok(
      result.violations.some((v) => v.pattern === 'claims-dir-leak'),
      `bad-claims-write.fixture.mjs must produce claims-dir-leak; got [${result.violations.map((v) => v.pattern).join(', ')}]`,
    );
  });

  test('coa-worktree-slice-id-lock.test.mjs is cleared by whitelist annotation + allowlist', () => {
    const lockPath = join(REPO_ROOT, 'tests', 'integration', 'coa-worktree-slice-id-lock.test.mjs');
    // Load the real allowlist (includes coa-worktree-slice-id-lock.test.mjs after TPL-336)
    const realAllowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
    const result = scanFile(lockPath, realAllowlist, /*fixturesAreReal*/ false);
    assert.equal(
      result.violations.filter((v) => v.pattern === 'claims-dir-leak').length,
      0,
      `coa-worktree-slice-id-lock.test.mjs with whitelist should have no claims-dir-leak violations; got [${result.violations.map((v) => v.pattern).join(', ')}]`,
    );
    assert.equal(result.whitelisted, true, 'file must be fully whitelisted (no violations at all)');
  });
});

// ---------------------------------------------------------------------------
// safeGit helper invariants the static check depends on
// ---------------------------------------------------------------------------

describe('R1 meta-test — SAFE_GIT_ENV_KEYS contract', () => {
  test('safe-git.mjs exports the 6 GIT_* keys it strips', () => {
    // GIT_COMMON_DIR added in TPL-274: git sets this in linked-worktree hook
    // contexts; without scrubbing it, fixture commits land in the live repo.
    const required = [
      'GIT_DIR',
      'GIT_WORK_TREE',
      'GIT_INDEX_FILE',
      'GIT_OBJECT_DIRECTORY',
      'GIT_ALTERNATE_OBJECT_DIRECTORIES',
      'GIT_COMMON_DIR',
    ];
    for (const key of required) {
      assert.ok(
        SAFE_GIT_ENV_KEYS.includes(key),
        `SAFE_GIT_ENV_KEYS must include ${key} — dropping it would silently widen the escape hatch the rule is meant to close`,
      );
    }
    // Tampering check: the export must be exactly these 6 (no more, no less)
    // until a deliberate change updates this assertion.
    assert.equal(
      SAFE_GIT_ENV_KEYS.length,
      6,
      'unexpected SAFE_GIT_ENV_KEYS size — review and update the meta-test',
    );
  });
});

// ---------------------------------------------------------------------------
// Pre-commit hook wiring — Phase 2.5 must be present and non-skippable
// ---------------------------------------------------------------------------

describe('R1 meta-test — pre-commit hook wiring', () => {
  const preCommit = readFileSync(PRE_COMMIT_PATH, 'utf8');

  test('pre-commit references test-isolation-check by path', () => {
    assert.match(
      preCommit,
      /scripts\/checks\/test-isolation-check\.mjs/,
      'pre-commit must invoke scripts/checks/test-isolation-check.mjs',
    );
  });

  test('pre-commit invokes --self-test before the real scan', () => {
    const selfTestIdx = preCommit.indexOf('test-isolation-check.mjs --self-test');
    const realScanIdx = preCommit.indexOf('test-isolation-check.mjs', selfTestIdx + 1);
    assert.ok(selfTestIdx > -1, 'pre-commit must run --self-test');
    assert.ok(
      realScanIdx === -1 || realScanIdx > selfTestIdx,
      'pre-commit must run --self-test before the real scan',
    );
  });

  test('Phase 2.5 is in NON_SKIPPABLE_PHASES (or equivalent hard-coded exclusion)', () => {
    // Either an explicit NON_SKIPPABLE_PHASES list contains "2.5" / "r1",
    // or COA_SKIP_GATES handling must hardcode an exclusion for the phase.
    const hasList = /NON_SKIPPABLE_PHASES\s*=\s*[("'][^)"']*\b(2\.5|r1)\b/.test(preCommit);
    const hasInline =
      /(?:test-isolation|2\.5|r1)[\s\S]{0,200}cannot be skipped|never skip|always run/i.test(
        preCommit,
      );
    const hardcoded = /should_run_r1|R1_NEVER_SKIP|always.*test-isolation/i.test(preCommit);
    assert.ok(
      hasList || hasInline || hardcoded,
      'pre-commit must mark Phase 2.5 / R1 as non-skippable (NON_SKIPPABLE_PHASES list or hard-coded exclusion in skip handling)',
    );
  });

  test('Phase 7 unset command includes GIT_COMMON_DIR (TPL-274)', () => {
    // GIT_COMMON_DIR is set by git when running hooks inside a linked worktree.
    // It must be unset before Phase 7 so tests cannot accidentally write objects
    // or refs into the live repo via git's common-dir routing. This is the
    // root cause discovered in TPL-274 / ZVX-064.
    assert.match(
      preCommit,
      /unset\b[^\n]*\bGIT_COMMON_DIR\b/,
      'pre-commit Phase 7 must unset GIT_COMMON_DIR before running the test gate',
    );
  });
});

// ---------------------------------------------------------------------------
// package.json test scripts load the runtime guard
// ---------------------------------------------------------------------------

describe('R1 meta-test — package.json wiring', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));

  test('test:unit script loads the no-live-git runtime guard via --import', () => {
    const script = pkg.scripts['test:unit'] ?? '';
    assert.match(
      script,
      /--import\s+\.?\/?tests\/_setup\/no-live-git\.mjs/,
      `test:unit must load tests/_setup/no-live-git.mjs via node --import. Got: ${script}`,
    );
  });

  test('test:integration script loads the runtime guard', () => {
    const script = pkg.scripts['test:integration'] ?? '';
    assert.match(
      script,
      /--import\s+\.?\/?tests\/_setup\/no-live-git\.mjs/,
      `test:integration must load the runtime guard. Got: ${script}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Whitelist marker shape — the regex contract is fixed
// ---------------------------------------------------------------------------

describe('R1 meta-test — whitelist marker parser', () => {
  test('marker with reason ≥ 60 chars is recognized', () => {
    const src = `// @test-isolation: live-repo-allowed | reason: ${'a'.repeat(70)}\n\nexport const x = 1;`;
    const wl = readWhitelistMarker(src);
    assert.equal(wl.hasMarker, true);
    assert.ok(wl.reason.length >= 60);
  });

  test('marker outside first 10 lines is NOT recognized', () => {
    const filler = Array.from({ length: 12 }, () => '// filler line').join('\n');
    const src = `${filler}\n// @test-isolation: live-repo-allowed | reason: ${'a'.repeat(70)}`;
    const wl = readWhitelistMarker(src);
    assert.equal(wl.hasMarker, false);
  });
});
