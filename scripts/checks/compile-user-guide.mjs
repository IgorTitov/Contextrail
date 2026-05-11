/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Scan *.help.md sidecars across the repo and assemble docs/user-guide.md grouped by screen.
 * @sidecar compile-user-guide.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * User guide compiler.
 * Scans all *.help.md files, parses YAML frontmatter (feature, screen,
 * element, trigger), groups by screen, and writes docs/user-guide.md.
 *
 * Usage:
 *   node scripts/checks/compile-user-guide.mjs [--dry-run] [--check]
 *
 * --dry-run: show what would be written without writing
 * --check:  exit 1 if docs/user-guide.md is stale (CI mode)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUTPUT = join(ROOT, 'docs', 'user-guide.md');
const DRY_RUN = process.argv.includes('--dry-run');
const CHECK = process.argv.includes('--check');

/**
 * Parse YAML frontmatter from a help.md file.
 * @param {string} content
 * @returns {{ meta: Record<string, string>, body: string }}
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      meta[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
  }
  return { meta, body: match[2].trim() };
}

// Collect all *.help.md files from tracked git files
let files;
try {
  const out = execSync('git ls-files --cached', { cwd: ROOT, encoding: 'utf8' });
  files = out.split('\n').filter((f) => f.endsWith('.help.md'));
} catch {
  files = [];
}

if (files.length === 0) {
  if (CHECK) {
    // No help files — user-guide should not exist or be empty
    if (existsSync(OUTPUT)) {
      const current = readFileSync(OUTPUT, 'utf8');
      if (current.includes('## ')) {
        console.error('compile-user-guide: help files removed but user-guide.md still has content');
        process.exit(1);
      }
    }
    console.log('compile-user-guide: no help files found, nothing to check');
    process.exit(0);
  }
  console.log('compile-user-guide: no *.help.md files found');
  process.exit(0);
}

// Parse all help files and group by screen
const entries = [];
for (const file of files) {
  try {
    const content = readFileSync(join(ROOT, file), 'utf8');
    const { meta, body } = parseFrontmatter(content);
    entries.push({
      file,
      screen: meta.screen || 'general',
      feature: meta.feature || basename(file, '.help.md'),
      element: meta.element || '',
      trigger: meta.trigger || '',
      body,
    });
  } catch {
    // skip unreadable files
  }
}

// Group by screen
const screens = new Map();
for (const entry of entries) {
  if (!screens.has(entry.screen)) screens.set(entry.screen, []);
  screens.get(entry.screen).push(entry);
}

// Assemble user guide
const lines = [
  '# User Guide',
  '',
  `> Auto-generated from ${entries.length} help file(s). Do not edit manually.`,
  `> Run \`node scripts/checks/compile-user-guide.mjs\` to regenerate.`,
  '',
];

for (const [screen, items] of [...screens].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`## ${screen.charAt(0).toUpperCase() + screen.slice(1)}`);
  lines.push('');
  for (const item of items.sort((a, b) => a.feature.localeCompare(b.feature))) {
    if (item.trigger) {
      lines.push(`> **How:** ${item.trigger}`);
      lines.push('');
    }
    lines.push(item.body);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
}

const output = lines.join('\n');

if (DRY_RUN) {
  console.log(`compile-user-guide: would write ${entries.length} entries to docs/user-guide.md`);
  for (const [screen, items] of screens) {
    console.log(`  ${screen}: ${items.length} help item(s)`);
  }
  process.exit(0);
}

if (CHECK) {
  if (!existsSync(OUTPUT)) {
    console.error('compile-user-guide: docs/user-guide.md missing — run compile-user-guide.mjs');
    process.exit(1);
  }
  const current = readFileSync(OUTPUT, 'utf8');
  if (current !== output) {
    console.error('compile-user-guide: docs/user-guide.md is stale — run compile-user-guide.mjs');
    process.exit(1);
  }
  console.log('compile-user-guide: user guide is current');
  process.exit(0);
}

writeFileSync(OUTPUT, output, 'utf8');
console.log(`compile-user-guide: wrote ${entries.length} entries to docs/user-guide.md`);
for (const [screen, items] of screens) {
  console.log(`  ${screen}: ${items.length} help item(s)`);
}
