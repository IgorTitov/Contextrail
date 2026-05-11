/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pre-commit gate — verifies VERSION bump is +1 patch, CHANGELOG section exists, Unreleased is clean.
 * @sidecar release-discipline-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Release discipline check.
 * Validates that every commit follows the version bump protocol:
 * A. VERSION in working tree !== VERSION in HEAD (bump happened)
 * B. CHANGELOG has a [X.Y.Z] section matching the new VERSION
 * C. [Unreleased] contains only "_Nothing yet._"
 * D. New VERSION === HEAD VERSION + 1 patch (no jumps, no collisions)
 *
 * Usage:
 *   node scripts/checks/release-discipline-check.mjs [--check]
 *
 * --check: CI mode (same behavior, explicit flag for clarity)
 *
 * Exit 0 = all checks pass. Exit 1 = violation found.
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

// ROOT is the invocation cwd, not the script's own location. This matters
// for integration tests that spawn the script with cwd=<temp-repo>: a
// script-relative ROOT would always read VERSION/CHANGELOG from the live
// template repo, ignoring the temp-repo state and producing flaky pass/fail
// coupled to whatever the developer happens to have staged. (TPL-200)
const ROOT = process.cwd();

const errors = [];

// Read working tree VERSION
let workingVersion;
try {
  workingVersion = readFileSync(join(ROOT, 'VERSION'), 'utf8').trim();
} catch {
  errors.push('VERSION file not found');
}

// Read HEAD VERSION
let headVersion;
try {
  headVersion = execSync('git show HEAD:VERSION', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  // First commit or no HEAD — skip comparison
  headVersion = null;
}

if (workingVersion && headVersion) {
  // Check A: VERSION bumped
  if (workingVersion === headVersion) {
    errors.push(`VERSION not bumped: still ${headVersion}. Bump before committing.`);
  }

  // Check D: +1 patch (no jumps)
  const parseSemver = (v) => {
    const parts = v.split('.').map(Number);
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 };
  };
  const head = parseSemver(headVersion);
  const work = parseSemver(workingVersion);

  const expectedPatch = `${head.major}.${head.minor}.${head.patch + 1}`;
  const expectedMinor = `${head.major}.${head.minor + 1}.0`;
  const expectedMajor = `${head.major + 1}.0.0`;

  if (
    workingVersion !== expectedPatch &&
    workingVersion !== expectedMinor &&
    workingVersion !== expectedMajor
  ) {
    errors.push(
      `VERSION jump: ${headVersion} → ${workingVersion}. Expected ${expectedPatch} (patch), ${expectedMinor} (minor), or ${expectedMajor} (major). ` +
        'Did you forget git pull --rebase? Or did you pre-pick a version number?',
    );
  }
}

// Check B: CHANGELOG has section for working version
if (workingVersion) {
  try {
    const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
    const sectionRegex = new RegExp(`^## \\[${workingVersion.replace(/\./g, '\\.')}\\]`, 'm');
    if (!sectionRegex.test(changelog)) {
      errors.push(
        `CHANGELOG.md missing section [${workingVersion}]. Add a versioned section before committing.`,
      );
    }

    // Check C: [Unreleased] is clean
    const unreleasedMatch = changelog.match(/## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|$)/);
    if (unreleasedMatch) {
      const content = unreleasedMatch[1].trim();
      if (content && content !== '_Nothing yet._') {
        errors.push(
          '[Unreleased] has content that should be in a versioned section. Move entries to [' +
            workingVersion +
            '] before committing.',
        );
      }
    }
  } catch {
    errors.push('CHANGELOG.md not found');
  }
}

if (errors.length > 0) {
  console.error('release-discipline-check: FAIL');
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
} else {
  console.log('release-discipline-check: OK');
}
