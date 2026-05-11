/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Run deterministic validation and test stages before commit
 * @sidecar test-gate.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseArgs, result } from './_shared.mjs';
import { ValidationError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const includeE2E = args.has('--include-e2e');
const failFast = args.has('--fail-fast');

function bin(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function run(command, argv) {
  const started = Date.now();
  const useShell = process.platform === 'win32';
  const cmd = useShell && command.includes(' ') ? `"${command}"` : command;
  const child = spawnSync(cmd, argv, {
    stdio: wantJson ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: useShell,
  });
  return {
    command: [command, ...argv].join(' '),
    ok: (child.status ?? 1) === 0,
    code: child.status ?? 1,
    durationMs: Date.now() - started,
    stdout: wantJson ? child.stdout || '' : '',
    stderr: wantJson ? child.stderr || '' : '',
  };
}

function packageScripts() {
  try {
    return JSON.parse(readFileSync('package.json', 'utf8')).scripts || {};
  } catch {
    return {};
  }
}

async function main() {
  const scripts = packageScripts();
  const plan = [];

  for (const local of [
    'spec-check.mjs',
    'architecture-check.mjs',
    'header-check.mjs',
    'readme-check.mjs',
  ]) {
    const path = `scripts/checks/${local}`;
    if (existsSync(path)) {
      plan.push({ name: local.replace('.mjs', ''), command: process.execPath, args: [path] });
    }
  }

  if (scripts.lint) plan.push({ name: 'lint', command: bin('pnpm'), args: ['run', 'lint'] });
  if (scripts.typecheck) {
    plan.push({ name: 'typecheck', command: bin('pnpm'), args: ['run', 'typecheck'] });
  }

  const granular = ['test:unit', 'test:integration', 'test:contract', 'test:bdd'].filter(
    (x) => scripts[x],
  );
  if (granular.length) {
    for (const name of granular) plan.push({ name, command: bin('pnpm'), args: ['run', name] });
  } else if (scripts.test) {
    plan.push({ name: 'test', command: bin('pnpm'), args: ['run', 'test'] });
  }

  if (includeE2E) {
    for (const name of ['test:e2e:smoke', 'test:e2e', 'e2e']) {
      if (scripts[name]) {
        plan.push({ name, command: bin('pnpm'), args: ['run', name] });
        break;
      }
    }
  }

  const stages = [];
  for (const stage of plan) {
    const outcome = run(stage.command, stage.args);
    stages.push({ name: stage.name, ...outcome });
    if (!outcome.ok && failFast) break;
  }

  const failed = stages.filter((x) => !x.ok).map((x) => x.name);
  const output = result(
    'test-gate',
    failed.length === 0,
    failed.map((x) => new ValidationError(`Stage failed: ${x}`)),
    [],
    {
      plan: plan.map((x) => x.name),
      stages,
    },
  );

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }
  console.log(`test-gate: ${output.ok ? 'OK' : 'FAIL'}`);
  for (const stage of stages) console.log(`- ${stage.ok ? 'PASS' : 'FAIL'} ${stage.name}`);
  if (!output.ok) process.exit(1);
}

main().catch((error) => {
  const output = result('test-gate', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
