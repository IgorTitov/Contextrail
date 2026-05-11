/* @HEADER
 * @version 0.8.0 | 2026-05-07
 * @purpose Validate trace-yaml work items and cross-reference integrity
 * @sidecar spec-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { collectWorkItems, parseArgs, parseBddRef, readText, result, walk } from './_shared.mjs';
import { ValidationError } from '../lib/errors.mjs';
import { spawnSync } from 'node:child_process';

const args = parseArgs();
const wantJson = args.has('--json');
const projectKeyArg = args.get('--project-key');
// In pre-commit context, only cross-check SpecRefs in staged files — unstaged
// changes with broken SpecRefs belong to other parallel sessions.
const fromPreCommit = process.env.COA_PRE_COMMIT === '1';

function idPrefix(id) {
  // Multi-segment prefix support (TPL-303): match TPL, AIC-DEV, RELEASE-Q1-FEAT.
  const m = String(id).match(/^([A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*)-\d+$/);
  return m ? m[1] : null;
}

function validId(id, projectKey) {
  return new RegExp(`^${projectKey}-\\d{3,}$`).test(String(id));
}

function extractSpecRefsFromHeaders(text) {
  const refs = [];
  const source = String(text);
  // Legacy form: `# SpecRefs: TPL-001` (capital S, comment-marker prefix required).
  for (const match of source.matchAll(/^\s*(?:#|\/\/|\*|<!--)\s*SpecRefs:\s*(.+)$/gm)) {
    const raw = match[1].trim()
      .replace(/\s*-->$/g, '')   // strip HTML comment closer
      .replace(/\s*\*\/$/g, ''); // strip block comment closer
    const normalizedRaw = raw.replace(/[,'"]+$/g, '').replace(/^['"]+|['"]+$/g, '');
    if (!normalizedRaw || normalizedRaw === '_none_') continue;
    refs.push(
      ...normalizedRaw
        .split(/[;,]/)
        .map((value) =>
          value
            .trim()
            .replace(/[,'"]+$/g, '')
            .replace(/^['"]+|['"]+$/g, ''),
        )
        .filter(Boolean),
    );
  }
  // ADR-0009 sparse-sidecar form: YAML `specRefs:` (camelCase) as scalar or block list.
  const scalarMatch = source.match(/^specRefs:[ \t]+([^\s\n][^\n]*)$/m);
  if (scalarMatch && scalarMatch[1].trim() !== '_none_') {
    refs.push(
      ...scalarMatch[1]
        .split(/[;,]/)
        .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean),
    );
  }
  const listMatch = source.match(/^specRefs:\s*\n((?:[ \t]+-[^\n]*\n?)+)/m);
  if (listMatch) {
    for (const line of listMatch[1].split('\n')) {
      const item = line.replace(/^[ \t]+-\s*/, '').trim();
      if (item && item !== '_none_') refs.push(item.replace(/^['"]|['"]$/g, ''));
    }
  }
  return [...new Set(refs)];
}

function fail(errors, message) {
  errors.push(new ValidationError(message));
}

async function main() {
  const items = await collectWorkItems();
  const errors = [];
  const warnings = [];

  const prefixes = new Set(items.map((x) => idPrefix(x.id)).filter(Boolean));
  const projectKey = projectKeyArg || (prefixes.size === 1 ? [...prefixes][0] : null);
  const ids = new Set(items.map((x) => x.id));

  if (!projectKey) {
    fail(errors, 'Could not determine a single project key. Pass --project-key=KEY.');
  }

  const seen = new Map();
  for (const item of items) {
    const required = ['id', 'type', 'title', 'status', 'module_ref'];
    for (const key of required) {
      if (!item[key]) fail(errors, `${item.source_file}: missing required field "${key}"`);
    }
    if (seen.has(item.id)) {
      fail(
        errors,
        `${item.source_file}: duplicate id "${item.id}" also found in ${seen.get(item.id)}`,
      );
    } else seen.set(item.id, item.source_file);

    if (projectKey && !validId(item.id, projectKey)) {
      fail(
        errors,
        `${item.source_file}: id "${item.id}" does not match project key "${projectKey}"`,
      );
    }
    if (!item.acceptance.length) {
      fail(errors, `${item.source_file}: "${item.id}" requires at least one acceptance criterion`);
    }
    if (!item.spec_refs.length) warnings.push(`${item.source_file}: "${item.id}" has no spec_refs`);
    if (!item.test_refs.length) warnings.push(`${item.source_file}: "${item.id}" has no test_refs`);
    if (
      typeof item.parent_ref === 'string' &&
      item.parent_ref.trim() &&
      !ids.has(item.parent_ref)
    ) {
      fail(errors, `${item.source_file}: parent_ref "${item.parent_ref}" does not resolve`);
    }
    for (const dep of item.depends_on) {
      if (!ids.has(dep)) fail(errors, `${item.source_file}: depends_on "${dep}" does not resolve`);
    }
  }

  const featureFiles = (await walk('tests/bdd/features')).filter((file) =>
    file.endsWith('.feature'),
  );
  const featureMap = new Map();
  for (const file of featureFiles) {
    featureMap.set(
      file,
      (await readText(file)).split(/\r?\n/).map((line) => line.trim()),
    );
  }

  for (const item of items) {
    for (const ref of item.bdd_refs) {
      const { file, scenario } = parseBddRef(ref);
      if (!file || !featureMap.has(file)) {
        fail(errors, `${item.source_file}: bdd_ref "${ref}" does not resolve to a feature file`);
        continue;
      }
      if (scenario) {
        const lines = featureMap.get(file);
        const scenarioLine = `Scenario: ${scenario}`;
        const outlineLine = `Scenario Outline: ${scenario}`;
        if (!lines.includes(scenarioLine) && !lines.includes(outlineLine)) {
          fail(errors, `${item.source_file}: scenario "${scenario}" not found in ${file}`);
        }
      }
    }
  }

  // Cross-check SpecRefs in file headers against known work items.
  // In pre-commit mode, only check staged files — broken SpecRefs in unstaged
  // files from other parallel sessions must not block this commit.
  let headerFiles;
  if (fromPreCommit) {
    const run = spawnSync('git', ['diff', '--name-only', '--cached', '--diff-filter=ACMR'], {
      encoding: 'utf8',
      shell: false,
    });
    headerFiles = (run.status === 0 ? String(run.stdout || '') : '')
      .split(/\r?\n/)
      .map((l) => l.trim().replaceAll('\\', '/'))
      .filter(Boolean);
  } else {
    headerFiles = (
      await Promise.all(
        ['modules', 'apps', 'packages', 'scripts', 'docs', 'tests', '.claude'].map(walk),
      )
    ).flat();
  }
  for (const file of headerFiles.filter((f) =>
    /\.(md|js|ts|tsx|jsx|mjs|cjs|py|sh|feature)$/i.test(f),
  )) {
    const refs = extractSpecRefsFromHeaders(await readText(file));
    for (const ref of refs) {
      if (!ids.has(ref)) fail(errors, `${file}: header SpecRefs references unknown id "${ref}"`);
    }
  }

  const output = result('spec-check', errors.length === 0, errors, warnings, {
    projectKey,
    itemCount: items.length,
    featureCount: featureFiles.length,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  console.log(`spec-check: ${output.ok ? 'OK' : 'FAIL'}`);
  if (warnings.length) {
    console.log('Warnings:');
    for (const warning of warnings) console.log(`- ${warning}`);
  }
  if (errors.length) {
    console.error('Errors:');
    for (const error of errors) console.error(`- ${error.message ?? error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const output = result('spec-check', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
