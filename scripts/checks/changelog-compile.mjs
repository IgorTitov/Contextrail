/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Compile changelog fragments into CHANGELOG.md (towncrier-style).
 * @sidecar changelog-compile.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Compiles one-file-per-entry changelog fragments from `changelog/` into
// the `## [Unreleased]` section of `CHANGELOG.md`.
//
// Usage:
//   node scripts/checks/changelog-compile.mjs               # compile + delete fragments
//   node scripts/checks/changelog-compile.mjs --dry-run      # preview without writing
//   node scripts/checks/changelog-compile.mjs --check        # fail if fragments exist (CI)
//   node scripts/checks/changelog-compile.mjs --json         # JSON output

import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CHECK = args.has('--check');
const JSON_ONLY = args.has('--json');

const CHANGELOG_PATH = 'CHANGELOG.md';
const FRAGMENTS_DIR = 'changelog';

const CATEGORY_ORDER = ['added', 'changed', 'fixed', 'removed', 'security'];
const CATEGORY_HEADINGS = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed',
  security: 'Security',
};

// ---------------------------------------------------------------------------
// 1. Collect fragments
// ---------------------------------------------------------------------------

function collectFragments() {
  if (!existsSync(FRAGMENTS_DIR)) return [];

  const files = readdirSync(FRAGMENTS_DIR).filter((f) => {
    if (f === 'README.md' || f.endsWith('.header.md') || f.startsWith('.')) return false;
    return f.endsWith('.md');
  });

  const fragments = [];
  for (const file of files) {
    const match = file.match(/^(.+)\.(added|changed|fixed|removed|security|internal)\.md$/);
    if (!match) {
      console.warn(`changelog-compile: skipping unknown fragment format: ${file}`);
      continue;
    }
    const [, workItem, category] = match;
    const content = readFileSync(path.join(FRAGMENTS_DIR, file), 'utf8').trim();
    if (!content) continue;

    fragments.push({ file, workItem, category, content });
  }

  return fragments;
}

// ---------------------------------------------------------------------------
// 2. Group by category
// ---------------------------------------------------------------------------

function groupByCategory(fragments) {
  const groups = {};
  for (const frag of fragments) {
    if (frag.category === 'internal') continue; // internal fragments are consumed but not shown
    if (!groups[frag.category]) groups[frag.category] = [];
    groups[frag.category].push(frag);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// 3. Render the Unreleased section
// ---------------------------------------------------------------------------

function renderUnreleasedSection(groups) {
  const lines = [];
  for (const cat of CATEGORY_ORDER) {
    const entries = groups[cat];
    if (!entries || entries.length === 0) continue;

    lines.push(`### ${CATEGORY_HEADINGS[cat]}`);
    lines.push('');
    for (const entry of entries.sort((a, b) => a.workItem.localeCompare(b.workItem))) {
      // First line as bullet, rest indented
      const contentLines = entry.content.split('\n');
      lines.push(`- ${contentLines[0]} (${entry.workItem})`);
      for (let i = 1; i < contentLines.length; i++) {
        lines.push(`  ${contentLines[i]}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 4. Splice into CHANGELOG.md
// ---------------------------------------------------------------------------

function spliceIntoChangelog(rendered) {
  let changelog;
  if (existsSync(CHANGELOG_PATH)) {
    changelog = readFileSync(CHANGELOG_PATH, 'utf8');
  } else {
    changelog =
      '# CHANGELOG\n\nAll notable changes to this project should be tracked here.\n\n## [Unreleased]\n';
  }

  // Find the [Unreleased] section and replace its content up to the next ## heading
  const unreleasedIdx = changelog.indexOf('## [Unreleased]');
  if (unreleasedIdx === -1) {
    // No unreleased section — insert one after the first line
    const firstNewline = changelog.indexOf('\n');
    return (
      changelog.slice(0, firstNewline + 1) +
      '\n## [Unreleased]\n\n' +
      rendered +
      changelog.slice(firstNewline + 1)
    );
  }

  // Find the end of the Unreleased section (next ## or EOF)
  const afterHeading = unreleasedIdx + '## [Unreleased]'.length;
  const nextSection = changelog.indexOf('\n## ', afterHeading);

  const before = changelog.slice(0, afterHeading) + '\n\n';
  const after = nextSection >= 0 ? changelog.slice(nextSection) : '';

  return before + rendered + after;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const fragments = collectFragments();
const publicFragments = fragments.filter((f) => f.category !== 'internal');

if (CHECK) {
  if (fragments.length > 0) {
    const msg = `changelog-compile: ${fragments.length} fragment(s) not yet compiled — run \`node scripts/checks/changelog-compile.mjs\``;
    if (JSON_ONLY) {
      console.log(JSON.stringify({ ok: false, error: msg, fragmentCount: fragments.length }));
    } else {
      console.error(msg);
      for (const f of fragments) console.error(`  ${f.file}`);
    }
    process.exit(1);
  }
  if (JSON_ONLY) {
    console.log(JSON.stringify({ ok: true, fragmentCount: 0 }));
  } else {
    console.log('changelog-compile: OK — no pending fragments');
  }
  process.exit(0);
}

if (fragments.length === 0) {
  if (JSON_ONLY) {
    console.log(JSON.stringify({ ok: true, fragmentCount: 0, message: 'no fragments to compile' }));
  } else {
    console.log('changelog-compile: no fragments to compile');
  }
  process.exit(0);
}

const groups = groupByCategory(fragments);
const rendered = renderUnreleasedSection(groups);
const newChangelog = spliceIntoChangelog(rendered);

if (JSON_ONLY) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        fragmentCount: fragments.length,
        publicEntries: publicFragments.length,
        categories: Object.keys(groups),
        preview: rendered,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (DRY_RUN) {
  console.log(`changelog-compile: would compile ${fragments.length} fragment(s)\n`);
  console.log(rendered);
  process.exit(0);
}

// Write updated changelog
writeFileSync(CHANGELOG_PATH, newChangelog, 'utf8');

// Delete consumed fragments
for (const frag of fragments) {
  unlinkSync(path.join(FRAGMENTS_DIR, frag.file));
}

console.log(
  `changelog-compile: compiled ${fragments.length} fragment(s) into ${CHANGELOG_PATH}, ${publicFragments.length} public entries`,
);
