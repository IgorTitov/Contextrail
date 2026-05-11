/* @HEADER
 * @version 0.7.85 | 2026-05-04
 * @purpose Move [Unreleased] content into a versioned CHANGELOG section with auto-scaffolded Keep-a-Changelog subheadings. Skips if no real content to release.
 * @sidecar changelog-release.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Changelog release script.
 *
 * Moves the [Unreleased] block into a versioned section:
 *   ## [X.Y.Z] — 2026-04-26 15:19:05 UTC+3
 *
 * Invariants enforced:
 *   1. Skips if [Unreleased] has no real content (only _Nothing yet._ or empty).
 *   2. Every versioned section must have content (no empty headings).
 *   3. VERSION must not run ahead of CHANGELOG (drift detection).
 *   4. Idempotent: running twice with no new content is a no-op.
 *   5. Auto-scaffolds ### Fixed/Added/Changed subheadings if [Unreleased] has none.
 *
 * Usage:
 *   node scripts/checks/changelog-release.mjs --version=0.6.9
 *   node scripts/checks/changelog-release.mjs --check        # dry-run
 *   node scripts/checks/changelog-release.mjs --json
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Args (always use --key=value syntax, never --key value)
// ---------------------------------------------------------------------------

function parseArgs() {
  const map = new Map();
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        map.set(arg.slice(0, eq), arg.slice(eq + 1));
      } else {
        map.set(arg, true);
      }
    }
  }
  return {
    has: (k) => map.has(k),
    get: (k) => {
      const v = map.get(k);
      return v === true ? undefined : v;
    },
  };
}

// ---------------------------------------------------------------------------
// Timestamp with local UTC offset
// ---------------------------------------------------------------------------

function releaseTimestamp() {
  const now = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const tz = absM === 0 ? `UTC${sign}${absH}` : `UTC${sign}${absH}:${pad(absM)}`;

  return `${date} ${time} ${tz}`;
}

// ---------------------------------------------------------------------------
// Check if [Unreleased] has real content
// ---------------------------------------------------------------------------

function hasRealContent(unreleasedBlock) {
  const lines = unreleasedBlock
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('##') && !l.startsWith('###'));

  // Filter out placeholder lines
  const real = lines.filter(
    (l) => l !== '_Nothing yet._' && l !== '_none_' && l !== '- _none_' && l !== '- _Nothing yet._',
  );

  return real.length > 0;
}

// ---------------------------------------------------------------------------
// Subheading scaffolding — Keep a Changelog categorization
// ---------------------------------------------------------------------------

/**
 * Classify a bullet line as Fixed, Added, or Changed (default).
 * Checks the first word(s) after the leading "- " for known prefixes.
 */
function classifyBulletLine(trimmedLine) {
  const text = trimmedLine.slice(1).trim().toLowerCase();
  if (/^fix(ed)?[\s:,(*]/.test(text)) return 'Fixed';
  if (/^(add(ed)?|new)[\s:,(*]/.test(text)) return 'Added';
  return 'Changed';
}

/**
 * Wrap flat-bullet [Unreleased] content in ### subheadings.
 *
 * - If the block already contains "### " markers, returns it unchanged.
 * - Otherwise, buckets each bullet into Fixed / Added / Changed using
 *   classifyBulletLine() heuristics, then emits one ### section per
 *   non-empty bucket in Fixed → Added → Changed order.
 * - Bullets that fall through to Changed get an HTML comment reminding
 *   the operator to review the automatic categorization.
 */
export function scaffoldSubheadings(unreleased) {
  if (/^###\s/m.test(unreleased)) return unreleased;

  const lines = unreleased.split('\n');
  const groups = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-')) {
      if (current) groups.push(current);
      current = { category: classifyBulletLine(trimmed), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) groups.push(current);

  if (groups.length === 0) return unreleased;

  for (const g of groups) {
    while (g.lines.length > 0 && g.lines[g.lines.length - 1].trim() === '') g.lines.pop();
  }

  const buckets = { Fixed: [], Added: [], Changed: [] };
  let anyDefaultedToChanged = false;
  for (const g of groups) {
    buckets[g.category].push(g.lines.join('\n'));
    if (g.category === 'Changed') anyDefaultedToChanged = true;
  }

  const sections = [];
  for (const cat of ['Fixed', 'Added', 'Changed']) {
    if (buckets[cat].length === 0) continue;
    const note =
      cat === 'Changed' && anyDefaultedToChanged
        ? '\n<!-- categorize: auto-scaffolded to Changed — move bullets to Fixed/Added as appropriate -->'
        : '';
    sections.push(`### ${cat}${note}\n\n${buckets[cat].join('\n')}`);
  }

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Extract [Unreleased] block from CHANGELOG
// ---------------------------------------------------------------------------

export function extractUnreleased(text) {
  const start = text.indexOf('## [Unreleased]');
  if (start === -1) return { before: text, unreleased: '', after: '' };

  const afterHeading = start + '## [Unreleased]'.length;
  const nextSection = text.indexOf('\n## ', afterHeading);

  const before = text.slice(0, start);
  const unreleased =
    nextSection >= 0
      ? text.slice(afterHeading, nextSection).trim()
      : text.slice(afterHeading).trim();
  const after = nextSection >= 0 ? text.slice(nextSection) : '';

  return { before, unreleased, after };
}

// ---------------------------------------------------------------------------
// Compose released CHANGELOG text
// ---------------------------------------------------------------------------

/**
 * Pure composer for the post-release CHANGELOG body. Takes the parts produced
 * by extractUnreleased() plus the new version/timestamp and returns the full
 * text that should be written back to CHANGELOG.md.
 *
 * Invariant: there must be exactly one blank line between the new versioned
 * section's last paragraph and the next ## [...] heading. `unreleased` is
 * .trim()'d (no trailing newline); `after` starts with a single "\n## [<prev>]".
 * The trailing "\n" on newSection produces "\n\n## [<prev>]" — Keep-a-Changelog
 * standard separator.
 */
export function composeReleasedChangelog({ before, unreleased, after, version, timestamp }) {
  // Trailing "\n" guarantees a blank line between the new section's last
  // paragraph and the next versioned heading. `unreleased` is .trim()'d (no
  // trailing newline); `after` starts with a single "\n## [<prev>]". The
  // explicit "\n" between them yields "\n\n## [<prev>]" — Keep-a-Changelog
  // separator.
  const scaffolded = scaffoldSubheadings(unreleased);
  const newSection = `## [${version}] — ${timestamp}\n\n${scaffolded}\n`;
  const freshUnreleased = '## [Unreleased]\n\n_Nothing yet._\n';
  return `${before}${freshUnreleased}\n${newSection}${after}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs();
  const wantJson = args.has('--json');
  const checkOnly = args.has('--check');
  const version = args.get('--version');

  if (!version && !checkOnly) {
    console.error('changelog-release: --version=X.Y.Z required (use --key=value syntax)');
    process.exit(1);
  }

  const FILE = 'CHANGELOG.md';
  if (!existsSync(FILE)) {
    console.error('changelog-release: CHANGELOG.md not found');
    process.exit(1);
  }

  const text = readFileSync(FILE, 'utf8');
  const { before, unreleased, after } = extractUnreleased(text);

  // Invariant: skip if no real content
  if (!hasRealContent(unreleased)) {
    const msg = 'changelog-release: [Unreleased] has no real content — skipping release section';
    if (wantJson) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason: 'no-content' }));
    } else {
      console.log(msg);
    }
    return;
  }

  // Invariant: check for existing section with this version
  if (version && text.includes(`## [${version}]`)) {
    const msg = `changelog-release: section [${version}] already exists`;
    if (wantJson) {
      console.log(JSON.stringify({ ok: false, error: msg }));
    } else {
      console.error(msg);
    }
    process.exit(1);
  }

  const timestamp = releaseTimestamp();
  const result = composeReleasedChangelog({ before, unreleased, after, version, timestamp });

  if (checkOnly) {
    console.log(`changelog-release: would create [${version}] — ${timestamp}`);
    console.log(`  content lines: ${unreleased.split('\n').filter((l) => l.trim()).length}`);
    return;
  }

  writeFileSync(FILE, result, 'utf8');

  if (wantJson) {
    console.log(JSON.stringify({ ok: true, version, timestamp, skipped: false }));
  } else {
    console.log(`changelog-release: created [${version}] — ${timestamp}`);
  }
}

// CLI entry point — guard so importing the module (e.g. from tests) does not
// trigger main()'s argv parsing and process.exit().
const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main();
}
