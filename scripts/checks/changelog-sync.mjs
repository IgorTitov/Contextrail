/* @HEADER
 * @version 0.7.109 | 2026-05-06
 * @purpose Keep CHANGELOG.md structurally ready for the current commit by ensuring an Unreleased section exists and by inserting staged work-item trace references into the Changed section when needed. Includes --check-uniqueness mode for version-dupe detection (C5, TPL-286).
 * @sidecar changelog-sync.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ensureWriteIfChanged, parseArgs, readText, result } from './_shared.mjs';
import { ValidationError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const checkOnly = args.has('--check');
const checkUniqueness = args.has('--check-uniqueness');
const FILE = 'CHANGELOG.md';

// ---------------------------------------------------------------------------
// C5 — Changelog version uniqueness check (TPL-286)
// ---------------------------------------------------------------------------

/**
 * Parse all versioned section headings from CHANGELOG text.
 * Returns an array of { version, line } objects.
 */
export function parseVersionHeadings(text) {
  const headings = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+\[([^\]]+)\]/);
    if (m && m[1] !== 'Unreleased') {
      headings.push({ version: m[1], line: i + 1 });
    }
  }
  return headings;
}

/**
 * Check CHANGELOG text for duplicate versioned section headings.
 * Returns null when all versions are unique; otherwise returns an object
 * { version, occurrences: [{ version, line }, ...] } for the first duplicate found.
 */
export function findDuplicateVersion(text) {
  const headings = parseVersionHeadings(text);
  const seen = new Map();
  for (const h of headings) {
    if (!seen.has(h.version)) {
      seen.set(h.version, [h]);
    } else {
      seen.get(h.version).push(h);
    }
  }
  for (const [version, occurrences] of seen) {
    if (occurrences.length > 1) return { version, occurrences };
  }
  return null;
}

// ---------------------------------------------------------------------------

function stagedDiff() {
  const out = spawnSync('git', ['diff', '--cached', '--unified=0'], {
    encoding: 'utf8',
  });
  return out.stdout || '';
}

function findIds(text) {
  // Multi-segment prefix support (TPL-303): AIC-DEV-167, RELEASE-Q1-FEAT-008
  return [...new Set((text.match(/[A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*-\d{3,}/g) || []).sort())];
}

function ensureUnreleasedSection(text, ids) {
  if (!text.includes('## [Unreleased]')) {
    text += `\n## [Unreleased]\n\n### Changed\n- Trace refs: ${ids.length ? ids.join(', ') : '_none_'}\n`;
    return text;
  }

  if (!ids.length || ids.every((id) => text.includes(id))) return text;

  return text.replace('### Changed\n- _none_', `### Changed\n- Trace refs: ${ids.join(', ')}`);
}

async function main() {
  // --check-uniqueness: parse CHANGELOG for duplicate version headings, exit 0/1.
  // This is a check-only mode — never mutates CHANGELOG.md.
  if (checkUniqueness) {
    if (!existsSync(FILE)) {
      if (wantJson) {
        console.log(JSON.stringify({ ok: true, checked: FILE, duplicates: [] }));
      } else {
        console.log(`[changelog-sync] ${FILE} not found — skipping uniqueness check`);
      }
      return;
    }
    const text = await readText(FILE);
    const dupe = findDuplicateVersion(text);
    if (dupe) {
      const lines = dupe.occurrences.map((o) => `line ${o.line}`).join(', ');
      const msg = [
        `[changelog-sync] FAIL: duplicate version section detected`,
        `  ## [${dupe.version}] appears ${dupe.occurrences.length} times (${lines})`,
        `  Recovery:`,
        `    1. Remove the older duplicate section manually`,
        `    2. Or run: git restore CHANGELOG.md`,
        `       then re-release once via: node scripts/checks/changelog-release.mjs --version=<N>`,
      ].join('\n');
      if (wantJson) {
        console.log(JSON.stringify({ ok: false, error: msg, duplicate: dupe.version, occurrences: dupe.occurrences }));
      } else {
        console.error(msg);
      }
      process.exit(1);
    }
    if (wantJson) {
      console.log(JSON.stringify({ ok: true, checked: FILE, duplicates: [] }));
    }
    return;
  }

  const current = existsSync(FILE)
    ? await readText(FILE)
    : '# CHANGELOG\n\n## [Unreleased]\n\n### Changed\n- _none_\n';
  const ids = findIds(stagedDiff());
  const next = ensureUnreleasedSection(current, ids);
  const changed = current !== next;

  if (!checkOnly && changed) await ensureWriteIfChanged(FILE, next);

  const errors = checkOnly && changed ? [new ValidationError(`${FILE} is out of date`)] : [];
  const output = result('changelog-sync', errors.length === 0, errors, [], {
    file: FILE,
    changed,
    ids,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }
  if (!output.ok) {
    console.error(errors[0]?.message ?? output.errors[0]);
    process.exit(1);
  }
  console.log(changed ? `updated ${FILE}` : `${FILE} already up to date`);
}

main().catch((error) => {
  const output = result('changelog-sync', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
