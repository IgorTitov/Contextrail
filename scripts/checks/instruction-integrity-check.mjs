/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate instruction-layer integrity: settings.json safety, hook existence, and adapter sync anchors.
 * @sidecar instruction-integrity-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const errors = [];

function abs(relPath) {
  return path.resolve(ROOT, relPath);
}

async function readText(relPath) {
  return readFile(abs(relPath), 'utf8');
}

async function readJson(relPath) {
  return JSON.parse(await readText(relPath));
}

function fail(message) {
  errors.push(message);
}

// ---------------------------------------------------------------------------
// Check 1: settings.json safety
// ---------------------------------------------------------------------------

export function checkPermissions(settings) {
  const errors = [];
  const warnings = [];
  const allow = settings?.permissions?.allow;
  if (Array.isArray(allow)) {
    for (const entry of allow) {
      if (typeof entry === 'string' && /^Bash\(.*\*.*\)$/i.test(entry)) {
        errors.push(`permissions.allow contains wildcard shell entry: ${entry}`);
      }
    }
  }

  const deny = settings?.permissions?.deny;
  if (!Array.isArray(deny) || deny.length === 0) {
    warnings.push('permissions.deny is missing or empty (no dangerous-command deny list)');
  }

  return { errors, warnings };
}

async function checkSettingsJson() {
  let settings;
  try {
    settings = await readJson('.claude/settings.json');
  } catch {
    fail('settings.json: could not read or parse .claude/settings.json');
    return;
  }

  const result = checkPermissions(settings);
  for (const e of result.errors) fail(`settings.json: ${e}`);
  for (const w of result.warnings) {
    console.warn(`instruction-integrity-check WARN: settings.json: ${w}`);
  }
}

// ---------------------------------------------------------------------------
// Check 2: Hook existence
// ---------------------------------------------------------------------------

export async function checkHookExists(hookPath) {
  const full = abs(hookPath);
  try {
    const info = await stat(full);
    if (info.size === 0) {
      return `${hookPath} exists but is empty`;
    }
    return null;
  } catch {
    return `${hookPath} is missing`;
  }
}

async function checkPreCommitHook() {
  const finding = await checkHookExists('.githooks/pre-commit');
  if (finding) fail(`hook: ${finding}`);
}

// ---------------------------------------------------------------------------
// Check 3: Adapter sync anchors
// ---------------------------------------------------------------------------

const ADAPTER_FILES = ['AGENTS.md', '.cursorrules', '.agents/README.md'];
const ANCHOR = 'compatibility-contract.json';

export function checkAnchor(content, fileName) {
  if (!content.includes(ANCHOR)) {
    return `${fileName} does not reference ${ANCHOR} (adapter may be stale)`;
  }
  return null;
}

async function checkAdapterAnchors() {
  for (const file of ADAPTER_FILES) {
    let content;
    try {
      content = await readText(file);
    } catch {
      fail(`adapter: could not read ${file}`);
      continue;
    }
    const finding = checkAnchor(content, file);
    if (finding) fail(`adapter: ${finding}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await Promise.all([checkSettingsJson(), checkPreCommitHook(), checkAdapterAnchors()]);

  const wantJson = process.argv.includes('--json');

  if (wantJson) {
    const output = {
      script: 'instruction-integrity-check',
      ok: errors.length === 0,
      errors,
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (errors.length > 0) {
    console.error(
      'instruction-integrity-check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'),
    );
    process.exit(1);
  }

  console.log('instruction-integrity-check: OK');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
