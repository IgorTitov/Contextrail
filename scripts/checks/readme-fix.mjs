/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Create minimal README.md files in meaningful folders when missing
 * @sidecar readme-fix.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { ensureWriteIfChanged, parseArgs, result, walk, resolveScope } from './_shared.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const fromPreCommit = process.env.COA_PRE_COMMIT === '1';
const { isScoped } = resolveScope(args.get('--scope'));

if (!fromPreCommit && !isScoped) {
  console.error(
    'readme-fix: repo-wide run requires --scope=<dir>.\n' +
    'Running without scope in a parallel session can create READMEs in other sessions\' areas.\n' +
    'Use: node scripts/checks/readme-fix.mjs --scope=modules/my-module',
  );
  process.exit(1);
}

const ROOTS = ['.claude', '.githooks', 'scripts', 'docs', 'tests', 'modules', 'apps', 'packages'];
const IGNORED_SUFFIXES = new Set(['_generated', 'node_modules', 'dist', 'coverage']);

const FOLDER_GUIDANCE = new Map([
  [
    '.claude',
    {
      desc: 'Claude Code adapter and operating configuration.',
      belongs: ['Agent prompt definitions', 'Skill definitions', 'Operating rules'],
      notBelongs: ['Application code', 'Test files', 'Build artifacts'],
      related: ['.claude/CLAUDE.md'],
    },
  ],
  [
    '.claude/agents',
    {
      desc: 'Claude subagent prompt definitions.',
      belongs: ['One .md file per subagent role'],
      notBelongs: ['Skill definitions (use .claude/skills/)', 'Implementation code'],
      related: ['.claude/CLAUDE.md'],
    },
  ],
  [
    '.claude/skills',
    {
      desc: 'Claude skill definitions.',
      belongs: ['One folder per skill with a SKILL.md'],
      notBelongs: ['Agent definitions (use .claude/agents/)', 'Implementation code'],
      related: ['.claude/CLAUDE.md'],
    },
  ],
  [
    '.claude/rules',
    {
      desc: 'Topic-specific operating rules.',
      belongs: ['Short, focused rule files (.md)'],
      notBelongs: ['Full documentation (use docs/)', 'Agent or skill definitions'],
      related: ['.claude/CLAUDE.md'],
    },
  ],
  [
    '.githooks',
    {
      desc: 'Git hook scripts executed during the commit workflow.',
      belongs: ['Hook scripts (pre-commit, commit-msg, post-commit)'],
      notBelongs: ['Application code', 'Test files'],
      related: ['scripts/checks/install-hooks.mjs'],
    },
  ],
  [
    '.agents',
    {
      desc: 'Codex-compatible agent adapter surface.',
      belongs: ['Generated adapter files synced from the shared compatibility contract'],
      notBelongs: ['Hand-written agent logic', 'Claude-specific configuration'],
      related: ['docs/agent-contract/'],
    },
  ],
  [
    'scripts',
    {
      desc: 'Repository scripts and tooling.',
      belongs: ['Deterministic check, sync, and build scripts'],
      notBelongs: ['Application source code', 'Test files'],
      related: ['scripts/checks/', 'scripts/lib/'],
    },
  ],
  [
    'scripts/checks',
    {
      desc: 'Deterministic check and sync scripts for the pre-commit pipeline.',
      belongs: [
        'Check scripts (*-check.mjs)',
        'Sync scripts (*-sync.mjs)',
        'Gate scripts (*-gate.mjs)',
      ],
      notBelongs: ['Shared library code (use scripts/lib/)', 'Application logic'],
      related: ['scripts/checks/_shared.mjs', '.githooks/pre-commit'],
    },
  ],
  [
    'scripts/lib',
    {
      desc: 'Shared library modules used by scripts/checks/ and other tooling.',
      belongs: ['Focused, single-responsibility helper modules'],
      notBelongs: ['Executable scripts (use scripts/checks/)', 'Application domain logic'],
      related: ['scripts/checks/_shared.mjs'],
    },
  ],
  [
    'docs',
    {
      desc: 'Project documentation.',
      belongs: ['PRD, USM, backlog, ADR, and design docs'],
      notBelongs: ['Source code', 'Test files', 'Generated artifacts (use _generated/ subfolders)'],
      related: ['.claude/CLAUDE.md'],
    },
  ],
  [
    'docs/prd',
    {
      desc: 'Product requirement documents.',
      belongs: ['PRD markdown files with trace-yaml blocks'],
      notBelongs: ['Implementation details', 'Test files'],
      related: ['docs/backlog/', 'docs/usm/'],
    },
  ],
  [
    'docs/usm',
    {
      desc: 'User story mapping — personas, workflows, and scenarios.',
      belongs: ['Persona definitions', 'Workflow and scenario documents'],
      notBelongs: ['Technical requirements (use docs/prd/)', 'Implementation code'],
      related: ['docs/prd/', 'docs/backlog/'],
    },
  ],
  [
    'docs/backlog',
    {
      desc: 'Backlog work items and generated views.',
      belongs: [
        'Work-item markdown files with trace-yaml blocks',
        'Generated index in _generated/',
      ],
      notBelongs: ['Full PRD documents (use docs/prd/)', 'Source code'],
      related: ['docs/prd/', 'scripts/checks/backlog-sync.mjs'],
    },
  ],
  [
    'docs/design',
    {
      desc: 'Design documentation — brandbook, design system, mockup prompts.',
      belongs: [
        'Visual language and design-system docs',
        'Mockup prompt templates',
        'Asset handoff guidance',
      ],
      notBelongs: ['PRD or USM content', 'Implementation code'],
      related: ['.claude/agents/designer.md'],
    },
  ],
  [
    'docs/adr',
    {
      desc: 'Architecture decision records.',
      belongs: ['Numbered ADR markdown files (0001-*.md)'],
      notBelongs: ['Implementation code', 'Meeting notes'],
      related: ['docs/prd/'],
    },
  ],
  [
    'tests',
    {
      desc: 'Test suites organized by layer.',
      belongs: ['Unit, integration, contract, BDD, and E2E test files'],
      notBelongs: ['Application source code', 'Documentation'],
      related: ['tests/unit/', 'tests/integration/', 'tests/contract/', 'tests/bdd/', 'tests/e2e/'],
    },
  ],
  [
    'tests/unit',
    {
      desc: 'Unit tests — prove pure domain logic in isolation.',
      belongs: ['*.test.mjs files testing pure functions and classes'],
      notBelongs: ['Integration or filesystem tests', 'E2E tests'],
      related: ['pnpm test:unit'],
    },
  ],
  [
    'tests/integration',
    {
      desc: 'Integration tests — prove script orchestration and cross-module wiring.',
      belongs: ['*.test.mjs files testing script execution and file-system interactions'],
      notBelongs: ['Pure-function unit tests', 'Browser E2E tests'],
      related: ['pnpm test:integration'],
    },
  ],
  [
    'tests/contract',
    {
      desc: 'Contract tests — prove adapter compliance and structural invariants.',
      belongs: ['*.test.mjs files verifying file existence, import shapes, and config contracts'],
      notBelongs: ['Behavior tests', 'E2E tests'],
      related: ['pnpm test:contract'],
    },
  ],
  [
    'tests/bdd',
    {
      desc: 'BDD tests — prove user-visible flows via Gherkin scenarios.',
      belongs: ['*.feature files and their step-definition test runners'],
      notBelongs: ['Unit tests', 'Integration tests'],
      related: ['pnpm test:bdd'],
    },
  ],
  [
    'tests/e2e',
    {
      desc: 'E2E tests — prove browser-level smoke and critical-path flows.',
      belongs: ['Playwright spec files and HTML fixtures'],
      notBelongs: ['Unit or integration tests'],
      related: ['pnpm e2e', 'playwright.config.mjs'],
    },
  ],
  [
    'modules',
    {
      desc: 'Bounded-context modules following hexagonal architecture.',
      belongs: ['One folder per bounded context with public-api, ports, adapters, and domain'],
      notBelongs: ['Shared utilities (use scripts/lib/)', 'Test files (use tests/)'],
      related: ['.claude/rules/architecture.md'],
    },
  ],
  [
    'modules/example-greeter',
    {
      desc: 'Example bounded-context module demonstrating hexagonal architecture.',
      belongs: [
        'Domain logic, port contracts, adapter implementations, and public-api entry point',
      ],
      notBelongs: ['Test files (use tests/)', 'Scripts or tooling'],
      related: ['modules/example-greeter/public-api.mjs', 'tests/unit/example-greeter.test.mjs'],
    },
  ],
  [
    'modules/example-greeter/domain',
    {
      desc: 'Pure domain logic — framework-free, no external dependencies.',
      belongs: ['Pure functions and value objects'],
      notBelongs: ['Adapters or infrastructure code', 'Port definitions (use ports/)'],
      related: ['modules/example-greeter/ports/'],
    },
  ],
  [
    'modules/example-greeter/ports',
    {
      desc: 'Port contracts that adapters must satisfy.',
      belongs: ['Contract definitions and validator functions'],
      notBelongs: ['Adapter implementations (use adapters/)', 'Domain logic (use domain/)'],
      related: ['modules/example-greeter/adapters/'],
    },
  ],
  [
    'modules/example-greeter/adapters',
    {
      desc: 'Concrete adapter implementations satisfying port contracts.',
      belongs: ['Adapter objects and infrastructure wiring'],
      notBelongs: ['Domain logic (use domain/)', 'Port definitions (use ports/)'],
      related: ['modules/example-greeter/ports/'],
    },
  ],
  [
    'apps',
    {
      desc: 'Application starters and entry points.',
      belongs: ['Starter applications', 'Feature-scoped selector registries'],
      notBelongs: ['Shared library code', 'Bounded-context modules (use modules/)'],
      related: ['apps/starter/'],
    },
  ],
  [
    'apps/starter/examples/greeter-wiring',
    {
      desc: 'Application-layer wiring example showing cross-module import through public-api.mjs.',
      belongs: ['Wiring code that assembles bounded modules via their public APIs'],
      notBelongs: ['Domain logic (stays in modules/)', 'Port or adapter definitions'],
      related: ['modules/example-greeter/public-api.mjs', 'tests/unit/greeter-wiring.test.mjs'],
    },
  ],
  [
    'tests/bdd/features',
    {
      desc: 'Gherkin feature files for BDD scenarios.',
      belongs: ['.feature files describing user-visible behavior'],
      notBelongs: ['Step runners (use tests/bdd/)', 'Unit or integration tests'],
      related: ['tests/bdd/'],
    },
  ],
]);

function renderReadme(dir) {
  const name = path.basename(dir);
  const posix = dir.replaceAll('\\', '/');
  const guidance = FOLDER_GUIDANCE.get(posix);

  if (guidance) {
    const lines = [`# ${name}`, '', guidance.desc, ''];
    lines.push('## What belongs here', '');
    for (const item of guidance.belongs) lines.push(`- ${item}`);
    lines.push('', '## What does not belong here', '');
    for (const item of guidance.notBelongs) lines.push(`- ${item}`);
    if (guidance.related.length) {
      lines.push('', '## Related', '');
      for (const ref of guidance.related) lines.push(`- \`${ref}\``);
    }
    lines.push('');
    return lines.join('\n');
  }

  // Generic fallback — infer from path prefix
  let category = 'files for this area of the project';
  if (posix.startsWith('docs/')) category = 'documentation for this topic';
  else if (posix.startsWith('tests/')) category = 'tests for this layer';
  else if (posix.startsWith('scripts/')) category = 'scripts and tooling for this area';
  else if (posix.startsWith('modules/')) category = 'bounded-context source code';
  else if (posix.startsWith('apps/')) category = 'application source code';
  else if (posix.startsWith('.claude/')) category = 'Claude configuration for this area';

  return `# ${name}\n\nThis folder contains ${category}.\n`;
}

async function main() {
  const changed = [];
  const dirs = new Set();

  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      const dir = path.dirname(file).replaceAll('\\', '/');
      if (!dir || dir === '.') continue;
      if ([...IGNORED_SUFFIXES].some((x) => dir.endsWith('/' + x) || dir === x)) continue;
      dirs.add(dir);
    }
  }

  for (const dir of [...dirs].sort()) {
    const files = await walk(dir);
    if (files.length === 0) continue;
    const readme = `${dir}/README.md`;
    if (!files.includes(readme)) {
      await ensureWriteIfChanged(readme, renderReadme(dir));
      changed.push(readme);
    }
  }

  const output = result('readme-fix', true, [], [], { changed });

  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else {
    console.log(
      changed.length
        ? `readme-fix created ${changed.length} README file(s)`
        : 'readme-fix no changes',
    );
  }
}

main().catch((error) => {
  const output = result('readme-fix', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
