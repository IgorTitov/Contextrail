#!/usr/bin/env node
/* @HEADER
 * @version 0.7.108 | 2026-05-06
 * @purpose Implement the bootstrap repository script.
 * @sidecar bootstrap.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Template bootstrapper.
 * Replaces {{PROJECT_NAME}}, {{PROJECT_KEY}}, and {{DEFAULT_MODULE}} placeholders,
 * updates package.json metadata, and installs git hooks.
 *
 * Usage:
 *   node scripts/bootstrap.mjs --name "MyApp" --key "APP" --module "core"
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';

import { writeDefaultSliceIdConfig } from './lib/slice-id-config.mjs';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const { values } = parseArgs({
  options: {
    name: { type: 'string', short: 'n' },
    key: { type: 'string', short: 'k' },
    module: { type: 'string', short: 'm', default: 'core' },
    author: { type: 'string', short: 'a' },
    email: { type: 'string', short: 'e' },
    'github-org': { type: 'string' },
    'github-repo': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'init-slice-config': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

// ---------------------------------------------------------------------------
// --init-slice-config mode: scaffold .coa/slice-id-config.json and exit
// ---------------------------------------------------------------------------

if (values['init-slice-config']) {
  const prefix = values.key || null;
  const result = writeDefaultSliceIdConfig(ROOT, prefix ? { prefix } : {});
  if (result.created) {
    console.log(`Created ${result.path}`);
    console.log(`  prefix: "${result.prefix}"`);
    console.log('');
    console.log(
      'Edit .coa/slice-id-config.json to customize prefix, padding, and numbering_start.',
    );
    console.log('See docs/guides/slice-id-config.md for the full schema.');
  } else {
    console.log(`Slice ID config already exists: ${result.path}`);
    console.log('Nothing to do.');
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Main bootstrap mode
// ---------------------------------------------------------------------------

if (values.help || !values.name || !values.key) {
  const usage = [
    'Usage: node scripts/bootstrap.mjs --name "MyApp" --key "APP" [options]',
    '',
    'Options:',
    '  --name, -n       Project name (used in titles and display text)',
    '  --key, -k        Project key prefix for traceability IDs (e.g. APP-001)',
    '  --module, -m     Default module name (default: "core")',
    '  --author, -a     Author/maintainer name (replaces governance files)',
    '  --email, -e      Author email (replaces SECURITY, CODE_OF_CONDUCT)',
    '  --github-org     GitHub org or username (replaces badges, CODEOWNERS)',
    '  --github-repo    GitHub repo name (replaces badge URLs, issue config)',
    '  --dry-run           Show what would change without writing files',
    '  --init-slice-config Create .coa/slice-id-config.json and exit',
    '  --help, -h       Show this usage information',
  ];
  const stream = values.help ? process.stdout : process.stderr;
  stream.write(usage.join('\n') + '\n');
  process.exit(values.help ? 0 : 1);
}

const projectName = values.name;
const projectKey = values.key;
const defaultModule = values.module;
const authorName = values.author;
const authorEmail = values.email;
const githubOrg = values['github-org'];
const githubRepo = values['github-repo'];
const dryRun = values['dry-run'];

/** Files known to contain template placeholders. */
const PLACEHOLDER_FILES = [
  'README.md',
  'docs/whitepaper.md',
  'docs/quality-assessment.md',
  'docs/guides/getting-started.md',
  'docs/prd/templates/work-item.md',
  'docs/backlog/templates/work-item.md',
  'docs/backlog/templates/intake-item.md',
  'docs/usm/templates/workflow-template.md',
  'docs/usm/templates/story-map.md',
  'templates/capacitor/capacitor.config.json',
  'templates/capacitor/capacitor.config.json.header.md',
  'templates/extension/manifest.json',
  'templates/electron/package.json',
  '.claude/skills/spec-traceability/schema.md',
  'LICENSE',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'GOVERNANCE.md',
  'MAINTAINERS.md',
  '.github/CODEOWNERS',
  '.github/ISSUE_TEMPLATE/config.yml',
];

let filesChanged = 0;
let replacementsTotal = 0;

for (const relPath of PLACEHOLDER_FILES) {
  const absPath = join(ROOT, relPath);
  if (!existsSync(absPath)) continue;

  const original = readFileSync(absPath, 'utf8');
  let content = original;

  content = content.replaceAll('{{PROJECT_NAME}}', projectName);
  content = content.replaceAll('{{PROJECT_KEY}}', projectKey);
  content = content.replaceAll('{{DEFAULT_MODULE}}', defaultModule);
  if (authorName) content = content.replaceAll('{{AUTHOR_NAME}}', authorName);
  if (authorEmail) content = content.replaceAll('{{AUTHOR_EMAIL}}', authorEmail);
  if (githubOrg) content = content.replaceAll('{{GITHUB_ORG}}', githubOrg);
  if (githubRepo) content = content.replaceAll('{{GITHUB_REPO}}', githubRepo);

  if (content !== original) {
    const count =
      (original.match(/\{\{PROJECT_NAME\}\}/g) || []).length +
      (original.match(/\{\{PROJECT_KEY\}\}/g) || []).length +
      (original.match(/\{\{DEFAULT_MODULE\}\}/g) || []).length +
      (authorName ? (original.match(/\{\{AUTHOR_NAME\}\}/g) || []).length : 0) +
      (authorEmail ? (original.match(/\{\{AUTHOR_EMAIL\}\}/g) || []).length : 0) +
      (githubOrg ? (original.match(/\{\{GITHUB_ORG\}\}/g) || []).length : 0) +
      (githubRepo ? (original.match(/\{\{GITHUB_REPO\}\}/g) || []).length : 0);

    if (dryRun) {
      console.log(`  would update: ${relPath} (${count} replacements)`);
    } else {
      writeFileSync(absPath, content, 'utf8');
      console.log(`  updated: ${relPath} (${count} replacements)`);
    }
    filesChanged++;
    replacementsTotal += count;
  }
}

// Update package.json
const pkgPath = join(ROOT, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const pkgChanges = [];

const newPkgName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
if (pkg.name !== newPkgName) {
  pkg.name = newPkgName;
  pkgChanges.push(`name → "${newPkgName}"`);
}

if (pkg.projectPrefix !== projectKey) {
  // Keep old prefix in aliases for temporary compatibility
  if (pkg.projectPrefix && pkg.projectPrefix !== projectKey) {
    const aliases = pkg.projectPrefixAliases || [];
    if (!aliases.includes(pkg.projectPrefix)) {
      aliases.push(pkg.projectPrefix);
    }
    pkg.projectPrefixAliases = aliases;
  }
  pkg.projectPrefix = projectKey;
  pkgChanges.push(`projectPrefix → "${projectKey}"`);
}

// Reset version to 0.1.0 for the new project
pkg.version = '0.1.0';
pkgChanges.push('version → "0.1.0"');

if (pkgChanges.length > 0) {
  if (dryRun) {
    console.log(`  would update: package.json (${pkgChanges.join(', ')})`);
  } else {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`  updated: package.json (${pkgChanges.join(', ')})`);
  }
  filesChanged++;
}

// Reset VERSION file to 0.1.0
const versionFilePath = join(ROOT, 'VERSION');
if (existsSync(versionFilePath)) {
  if (dryRun) {
    console.log('  would reset: VERSION → 0.1.0');
  } else {
    writeFileSync(versionFilePath, '0.1.0\n', 'utf8');
    console.log('  reset: VERSION → 0.1.0');
  }
  filesChanged++;
}

// Reset CHANGELOG to a fresh project start
const changelogPath = join(ROOT, 'CHANGELOG.md');
if (existsSync(changelogPath)) {
  const today = new Date().toISOString().slice(0, 10);
  const freshChangelog = `# CHANGELOG

All notable changes to this project should be tracked here.

## [Unreleased]

_Nothing yet._

## [0.1.0] — ${today}

Initial project setup from Contextrail template.

### Added

- Project scaffolded with COA hex architecture, quality gates, and delivery pipeline.
`;
  if (dryRun) {
    console.log('  would reset: CHANGELOG.md → fresh 0.1.0');
  } else {
    writeFileSync(changelogPath, freshChangelog, 'utf8');
    console.log('  reset: CHANGELOG.md → fresh 0.1.0');
  }
  filesChanged++;
}

console.log('');

if (dryRun) {
  console.log(
    `Dry run complete. ${filesChanged} files would change, ${replacementsTotal} placeholder replacements.`,
  );
} else {
  console.log(
    `Bootstrap complete. ${filesChanged} files updated, ${replacementsTotal} placeholder replacements.`,
  );

  // Install git hooks
  const hooksScript = join(ROOT, 'scripts/checks/install-hooks.mjs');
  if (existsSync(hooksScript)) {
    console.log('');
    console.log('Installing git hooks...');
    try {
      execSync(`node "${hooksScript}"`, { cwd: ROOT, stdio: 'inherit' });
    } catch {
      console.warn(
        'Warning: git hooks installation failed. Run manually: node scripts/checks/install-hooks.mjs',
      );
    }
  }

  console.log('');
  console.log('Next steps:');
  console.log('  1. Review .claude/CLAUDE.md');
  console.log('  2. Run: pnpm test');
  console.log('  3. Replace starter example files with your own data:');
  console.log('     - docs/usm/personas/template-user.md  (use persona-template.md as base)');
  console.log('     - docs/usm/personas/maintainer.md     (use persona-template.md as base)');
  console.log(
    '     - docs/product-data/persona-economics/template-user.md  (use economics-template.md as base)',
  );
  console.log('  4. Create your first work item in docs/backlog/index.md');

  // Scaffold .coa/slice-id-config.json using the provided --key as prefix
  const sliceConfigResult = writeDefaultSliceIdConfig(ROOT, { prefix: projectKey });
  if (sliceConfigResult.created) {
    console.log('');
    console.log(`Created .coa/slice-id-config.json (prefix: "${sliceConfigResult.prefix}")`);
    console.log('  Edit this file to customize your slice ID convention.');
  }
}
