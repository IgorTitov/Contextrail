/* @HEADER
 * @version 0.7.107 | 2026-05-06
 * @purpose Render Claude, Codex, and Cursor compatibility adapters from the canonical repo-level agent contract.
 * @sidecar sync.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CONTRACT_PATH = path.join(ROOT, 'docs/agent-contract/compatibility-contract.json');
const CLAUDE_PATH = path.join(ROOT, '.claude/CLAUDE.md');
const CURSORRULES_PATH = path.join(ROOT, '.cursorrules');
const LOCAL_PATH = path.join(ROOT, 'LOCAL.md');
const LOCAL_SIDECAR_PATH = path.join(ROOT, 'LOCAL.md.header.md');
const MICRO_PATH = path.join(ROOT, 'MICRO.md');
const MICRO_SIDECAR_PATH = path.join(ROOT, 'MICRO.md.header.md');
const MARKER_START = '<!-- AGENT-CONTRACT:START -->';
const MARKER_END = '<!-- AGENT-CONTRACT:END -->';

/**
 * Read the live repo version from VERSION (preferred) or package.json,
 * with a safe '0.0.0' fallback. Mirrors `scripts/lib/repo-meta.repoVersion`
 * but stays local so sync.mjs has no cwd-dependent imports.
 */
export function readRepoVersion(rootDir = ROOT) {
  try {
    const text = readFileSync(path.join(rootDir, 'VERSION'), 'utf8').trim();
    if (text) return text;
  } catch {
    // VERSION missing or unreadable — fall through to package.json
  }
  try {
    const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    if (pkg.version) return String(pkg.version);
  } catch {
    // package.json missing or malformed — fall through to default
  }
  return '0.0.0';
}

const REPO_VERSION = readRepoVersion();
const DATE = new Date().toISOString().slice(0, 10);

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeIfChanged(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  let current;
  try {
    current = await readFile(filePath, 'utf8');
  } catch {
    current = null;
  }
  if (current === content) return false;
  await writeFile(filePath, content, 'utf8');
  return true;
}

/**
 * Strip the leading `<!-- @HEADER ... -->` block (header-fix stamp) and any
 * blank lines that immediately follow it. Used to compare adapter body content
 * across sync runs without fighting the pre-commit header-fix script over
 * @version / @purpose stamping.
 */
export function stripLeadingInlineHeader(text) {
  if (typeof text !== 'string' || !text.startsWith('<!--')) return text;
  const end = text.indexOf('-->');
  if (end < 0) return text;
  let i = end + 3;
  while (i < text.length && (text[i] === '\n' || text[i] === '\r')) i++;
  return text.slice(i);
}

async function writeBodyIfChanged(filePath, body) {
  await mkdir(path.dirname(filePath), { recursive: true });
  let current;
  try {
    current = await readFile(filePath, 'utf8');
  } catch {
    current = null;
  }
  const currentBody = current === null ? null : stripLeadingInlineHeader(current);
  // Preserve any existing inline header so header-fix can keep stamping it.
  const headerPrefix =
    current === null ? '' : current.slice(0, current.length - currentBody.length);
  if (currentBody === body) return false;
  await writeFile(filePath, headerPrefix + body, 'utf8');
  return true;
}

function mdHeader({
  filePath,
  purpose,
  api = 'Documentation',
  steward = 'shared',
  dependsOn = [],
  owns,
  boundaries,
  invariants,
  tests = [],
  risks,
  linkedDocs = [],
  related = [],
  publicValue = 'false',
  modulePackage,
  notes,
}) {
  const pathPosix = filePath.replaceAll('\\', '/');
  const moduleValue = modulePackage ?? (path.posix.dirname(pathPosix) || 'root');
  return [
    '<!-- @HEADER-START',
    `version ${REPO_VERSION} | ${DATE}`,
    `path: ${pathPosix}`,
    `Purpose: ${purpose}`,
    'CHANGELOG-BEGIN',
    'Summary:',
    '- Synced this generated adapter from the canonical agent contract.',
    'Added:',
    '- _none_',
    'Changed:',
    '- Regenerated content from docs/agent-contract/compatibility-contract.json.',
    'Fixed:',
    '- _none_',
    'Removed:',
    '- _none_',
    'Notes:',
    '- Edit the canonical contract, then rerun scripts/agent-contract/sync.mjs instead of patching this file by hand.',
    'CHANGELOG-END',
    'FILEINFO-BEGIN',
    `FileId: contextrail-template:${pathPosix.replace(/^\./, '').replace(/^\//, '').replace(/[/.]/g, ':').replace(/:+/g, ':').replace(/:md$/, '') || 'root'}`,
    `Path: ${pathPosix}`,
    pathPosix === 'AGENTS.md'
      ? 'Layer: root'
      : pathPosix.startsWith('.agents/')
        ? 'Layer: control-plane'
        : 'Layer: tooling',
    `Module/Package: ${moduleValue}`,
    `Public: ${publicValue}`,
    `API: ${api}`,
    'Stability: evolving',
    'EditPolicy: sync-only',
    `Steward: ${steward}`,
    `DependsOn: ${dependsOn.length ? dependsOn.join('; ') : 'docs/agent-contract/compatibility-contract.json'}`,
    `Owns: ${owns}`,
    `Boundaries: ${boundaries}`,
    `Invariants: ${invariants}`,
    `Tests: ${tests.length ? tests.join('; ') : 'node scripts/agent-contract/check.mjs'}`,
    `Risks: ${risks}`,
    `LinkedDocs: ${linkedDocs.length ? linkedDocs.join('; ') : 'docs/agent-contract/README.md'}`,
    'SpecRefs: _none_',
    'UsmRefs: _none_',
    `Related: ${related.length ? related.join('; ') : 'docs/agent-contract/compatibility-contract.json'}`,
    'Generated: true',
    'Security/Privacy: Documentation content only; avoid secrets or private credentials.',
    `NotesForLLM: ${notes}`,
    'FILEINFO-END',
    'HEADER-END -->',
    '',
  ].join('\n');
}

function slimMdHeader({
  filePath,
  purpose,
  layer = 'root',
  publicValue = 'false',
  edit = 'sync-only',
}) {
  const sidecarName = path.posix.basename(filePath.replaceAll('\\', '/')) + '.header.md';
  return [
    '<!-- @HEADER',
    ` * @version ${REPO_VERSION} | ${DATE}`,
    ` * @purpose ${purpose}`,
    ` * @sidecar ${sidecarName}`,
    ` * @layer ${layer}`,
    ` * @public ${publicValue}`,
    ` * @edit ${edit}`,
    ' -->',
    '',
  ].join('\n');
}

function sidecarContent({
  filePath,
  purpose,
  api = 'Documentation',
  steward = 'shared',
  dependsOn = [],
  owns,
  boundaries,
  invariants,
  tests = [],
  risks,
  linkedDocs = [],
  related = [],
  modulePackage,
  notes,
}) {
  const pathPosix = filePath.replaceAll('\\', '/');
  const moduleValue = modulePackage ?? (path.posix.dirname(pathPosix) || 'root');
  const fileName = path.posix.basename(pathPosix);
  const fileId = `contextrail-template:${pathPosix.replace(/^\./, '').replace(/^\//, '').replace(/[/.]/g, ':').replace(/:+/g, ':').replace(/:md$/, '') || 'root'}`;

  const yaml = [];
  yaml.push('---');
  yaml.push(`fileId: ${fileId}`);
  yaml.push(`module: ${moduleValue}`);
  yaml.push('stability: evolving');
  yaml.push(`steward: ${steward}`);
  yaml.push(`api: ${api}`);
  if (dependsOn.length) {
    yaml.push('dependsOn:');
    for (const d of dependsOn) yaml.push(`  - ${d}`);
  } else {
    yaml.push('dependsOn:');
    yaml.push('  - docs/agent-contract/compatibility-contract.json');
  }
  yaml.push(`summary: ${purpose}`);
  if (owns) yaml.push(`owns: ${owns}`);
  if (boundaries) yaml.push(`boundaries: ${boundaries}`);
  if (invariants) yaml.push(`invariants: ${invariants}`);
  if (risks) yaml.push(`risks: ${risks}`);
  yaml.push('securityPrivacy: Documentation content only; avoid secrets or credentials.');
  if (notes) yaml.push(`notesForLLM: ${notes}`);
  if (tests.length) {
    yaml.push('tests:');
    for (const t of tests) yaml.push(`  - ${t}`);
  } else {
    yaml.push('tests:');
    yaml.push('  - node scripts/agent-contract/check.mjs');
  }
  if (linkedDocs.length) {
    yaml.push('linkedDocs:');
    for (const d of linkedDocs) yaml.push(`  - ${d}`);
  }
  if (related.length) {
    yaml.push('related:');
    for (const r of related) yaml.push(`  - ${r}`);
  }
  yaml.push('generated: true');
  yaml.push('---');
  yaml.push('');
  yaml.push(`# ${fileName}`);
  yaml.push('');

  return yaml.join('\n');
}

function bullets(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function commandBlock(items) {
  return ['```bash', ...items, '```'].join('\n');
}

function renderEnforcedRulesSection(contract) {
  if (!Array.isArray(contract.enforcedRules) || contract.enforcedRules.length === 0) {
    return '';
  }
  const items = contract.enforcedRules.map((r) => {
    const operatorGated =
      Array.isArray(r.operatorGated) && r.operatorGated.length > 0
        ? `  - Operator-gated commands: ${r.operatorGated.map((c) => '`' + c + '`').join(', ')}`
        : null;
    const parts = [
      `- **${r.id}** — ${r.rule}.`,
      r.owner ? `  - Owner: \`${r.owner}\`` : null,
      r.runtimeGuard ? `  - Runtime guard: \`${r.runtimeGuard}\`` : null,
      r.sanctionedHelper ? `  - Sanctioned helper: \`${r.sanctionedHelper}\`` : null,
      r.auditLib ? `  - Audit library: \`${r.auditLib}\`` : null,
      r.refreshLib ? `  - Refresh library: \`${r.refreshLib}\`` : null,
      r.adr ? `  - ADR: \`${r.adr}\`` : null,
      r.nonSkippablePhase ? `  - Non-skippable pre-commit phase: \`${r.nonSkippablePhase}\`` : null,
      operatorGated,
    ].filter(Boolean);
    return parts.join('\n');
  });
  const registryLine = contract.enforcedRulesNarrativeRegistry
    ? `Canonical narrative registry with whitehack analysis: \`${contract.enforcedRulesNarrativeRegistry}\`. Coverage backlog: \`${contract.enforcedRulesCoverageBacklog || 'docs/backlog/rule-coverage-gaps.md'}\`.`
    : null;
  return [
    '### Enforced rules',
    '',
    'These rules are blocked at lint time AND at runtime; bypass paths are explicitly closed (see each ADR).',
    ...(registryLine ? ['', registryLine] : []),
    '',
    items.join('\n'),
    '',
  ].join('\n');
}

function renderClaudeCompatibilityBlock(contract) {
  const enforcedSection = renderEnforcedRulesSection(contract);
  const enforcedLines = enforcedSection ? enforcedSection.split('\n') : [];
  const lines = [
    MARKER_START,
    '## Shared compatibility contract',
    '',
    `The cross-tool source of truth is \`${contract.sourceOfTruth.machine}\` and the human guide is \`${contract.sourceOfTruth.human}\`.`,
    '',
    'Claude remains fully supported in this repository, but `.claude/CLAUDE.md` is now the **Claude adapter** to the shared delivery contract rather than the only source of process truth.',
    '',
    '### Shared non-negotiables',
    '',
    bullets(contract.principles),
    '',
    '### Shared parity workflow',
    '',
    bullets([
      'Edit the canonical contract first when the shared process changes.',
      'Regenerate adapters and synced sections before commit-ready finalization.',
      'Do not mark work complete until checks, acceptance proof, changelog discipline, and commit discipline are satisfied.',
    ]),
    '',
    commandBlock(contract.commands.compatibility),
    '',
    ...enforcedLines,
    '### Codex and Cursor parity surfaces generated from the same contract',
    '',
    bullets([
      '`AGENTS.md`',
      '`.agents/README.md`',
      '`.agents/skills/README.md`',
      '`.agents/skills/*/SKILL.md`',
      '`.cursorrules`',
    ]),
    '',
    MARKER_END,
  ];
  return lines.join('\n');
}

function renderAgents(contract) {
  const headerMeta = {
    filePath: 'AGENTS.md',
    purpose: 'Codex adapter for the shared repo-level delivery contract and skill map.',
    api: 'Codex repository instructions',
    publicValue: 'true',
    dependsOn: [
      'docs/agent-contract/compatibility-contract.json',
      'docs/agent-contract/README.md',
      '.agents/skills/README.md',
      '.claude/CLAUDE.md',
    ],
    owns: 'The Codex-facing adapter to the shared Claude↔Codex delivery contract.',
    boundaries:
      'This file is an adapter. It must not become an independent process source that drifts from the canonical JSON contract.',
    invariants:
      'The shared process rules, command map, role names, and skill roster stay aligned with the canonical contract.',
    tests: [
      'node scripts/agent-contract/check.mjs',
      'tests/integration/agent-compatibility-coherence.test.mjs',
      'tests/contract/agent-adapter-consistency.test.mjs',
    ],
    risks:
      'Manual edits here can fork Codex behavior away from Claude and reintroduce duplicate process authority.',
    linkedDocs: ['docs/agent-contract/README.md', '.claude/CLAUDE.md'],
    related: ['.agents/README.md', '.agents/skills/README.md'],
    modulePackage: 'root',
    notes:
      'Read this file first in Codex. It is generated from the canonical compatibility contract and should be regenerated, not hand-edited.',
  };

  const header = slimMdHeader({
    filePath: headerMeta.filePath,
    purpose: headerMeta.purpose,
    layer: 'root',
    publicValue: 'true',
    edit: 'sync-only',
  });

  const roleLines = contract.roles
    .map((role) => {
      const tier = role.capabilityTier ? ` _(tier: ${role.capabilityTier})_` : '';
      return `- \`${role.name}\`${tier} — ${role.useWhen}; owns ${role.owns.join(', ')}.`;
    })
    .join('\n');
  const skillLines = contract.skills
    .map((skill) => {
      const tier = skill.capabilityTier ? ` _(tier: ${skill.capabilityTier})_` : '';
      return `- \`${skill.name}\`${tier} — ${skill.purpose}`;
    })
    .join('\n');

  const bddSection = contract.bddConventions
    ? `\n\n### BDD modularity conventions\n\n${bullets(contract.bddConventions)}`
    : '';

  const profilesSection = Array.isArray(contract.agentProfiles)
    ? `\n\n## Agent capability tiers\n\nContextrail supports mixed-tier teams. Each role and skill names the **minimum** tier that can fulfill it; higher tiers may always step in.\n\n${contract.agentProfiles
        .map(
          (profile) =>
            `- **${profile.name}** (≥${profile.minContextTokens.toLocaleString('en-US')} ctx tokens) — ${profile.notes}\n  - Capabilities: ${profile.capabilities.join(', ')}\n  - Harnesses: ${profile.harnessExamples.join(', ')}`,
        )
        .join(
          '\n',
        )}\n\nLocal-tier support is landing across TPL-208..215. The \`local\` adapter slot in \`adapters\` reserves \`LOCAL.md\` and \`MICRO.md\` for upcoming generation.`
    : '';

  const enforcedRulesSection = renderEnforcedRulesSection(contract);
  const enforcedRulesBlock = enforcedRulesSection
    ? `\n\n## Enforced rules\n\n${enforcedRulesSection.replace(/^### Enforced rules\n\n/, '').trimEnd()}`
    : '';
  const content = `${header}# AGENTS\n\nThis repository supports **Claude, Codex, Cursor, and any harness driving a frontier-, mid-, or small-tier agent** through one shared delivery contract.\n\n## Canonical source of truth\n\n- Machine source: \`${contract.sourceOfTruth.machine}\`\n- Human guide: \`${contract.sourceOfTruth.human}\`\n\nDo not define a second process contract here. Edit the canonical contract first, then regenerate this adapter.${profilesSection}\n\n## Non-negotiable working rules\n\n${bullets(contract.principles)}\n\n## Shared delivery flow\n\n${bullets(contract.deliveryFlow)}\n\n## Gates and finalization\n\n### Test gate\n\n${bullets(contract.testGate)}${bddSection}\n\n### Acceptance gate\n\n${bullets(contract.acceptanceFlow)}\n\n### Changelog flow\n\n${bullets(contract.changelogFlow)}\n\n### Commit flow\n\n${bullets(contract.commitFlow)}\n\n### Finalization discipline\n\n${bullets(contract.finalizationFlow)}${enforcedRulesBlock}\n\n## Commands to use\n\n### Compatibility sync and parity\n\n${commandBlock(contract.commands.compatibility)}\n\n### Traceability and docs\n\n${commandBlock(contract.commands.traceability)}\n\n### Headers\n\n${commandBlock(contract.commands.headers)}\n\n### Coordination (inter-agent claims)\n\n${commandBlock(contract.commands.coordination)}\n\n### Quality gates\n\n${commandBlock(contract.commands.quality)}\n\n### Artifacts\n\n${commandBlock(contract.commands.artifacts)}\n\n## Role routing\n\n${roleLines}\n\n## Codex skills\n\nUse the generated skills under \`.agents/skills/\` as workflow modules:\n\n${skillLines}\n\n## Definition of done\n\n${bullets(contract.doneDefinition)}\n\n## Adapter discipline\n\n- \`.claude/CLAUDE.md\` is the Claude adapter.\n- \`AGENTS.md\` is the Codex adapter.\n- \`.cursorrules\` is the Cursor adapter.\n- \`LOCAL.md\` / \`MICRO.md\` slots reserve the local-tier adapter (generated in TPL-209).\n- \`.agents/skills/*\` are generated Codex-compatible workflow modules.\n- Shared repo scripts, git hooks, and tests remain the executable truth for all tools.\n`;

  const sidecar = sidecarContent(headerMeta);

  return { content, sidecar };
}

function renderAgentsReadme(contract) {
  const meta = {
    filePath: '.agents/README.md',
    purpose: 'Folder guide for the Codex-facing agent adapter layer.',
    api: 'Folder guide',
    publicValue: 'true',
    dependsOn: [
      'AGENTS.md',
      '.agents/skills/README.md',
      'docs/agent-contract/compatibility-contract.json',
    ],
    owns: 'The folder-level map for generated Codex adapter assets.',
    boundaries: 'This file is navigational only. It must not grow into a second process contract.',
    invariants: 'The listed files stay aligned with the generated Codex adapter layer.',
    tests: [
      'node scripts/agent-contract/check.mjs',
      'tests/integration/agent-compatibility-coherence.test.mjs',
    ],
    risks:
      'If this guide drifts, Codex users may edit generated files directly or miss the canonical source of truth.',
    linkedDocs: ['AGENTS.md', 'docs/agent-contract/README.md'],
    related: ['.agents/skills/README.md'],
    modulePackage: '.agents',
    notes:
      'Treat this folder as generated Codex-facing adapter surface. Update the canonical contract and rerun sync instead of editing generated skill files by hand.',
  };

  const header = slimMdHeader({
    filePath: meta.filePath,
    purpose: meta.purpose,
    layer: 'control-plane',
    publicValue: meta.publicValue,
    edit: 'sync-only',
  });
  const sidecar = sidecarContent(meta);
  const content = `${header}# .agents\n\nThis folder contains the Codex-facing adapter layer generated from \`${contract.sourceOfTruth.machine}\`.\n\n## Structure\n\n- \`README.md\` — this folder guide\n- \`skills/README.md\` — generated skill index\n- \`skills/<skill>/SKILL.md\` — Codex-compatible workflow summaries\n\n## Rules\n\n- Edit the canonical contract, not the generated skill files.\n- Regenerate with \`node scripts/agent-contract/sync.mjs\`.\n- Validate parity with \`node scripts/agent-contract/check.mjs\`.\n`;
  return { content, sidecar };
}

function renderSkillsReadme(contract) {
  const meta = {
    filePath: '.agents/skills/README.md',
    purpose:
      'Index of generated Codex-compatible skills that mirror the shared repo workflow contract.',
    api: 'Folder guide',
    publicValue: 'true',
    dependsOn: ['docs/agent-contract/compatibility-contract.json', 'AGENTS.md'],
    owns: 'The generated index of Codex-compatible skills.',
    boundaries:
      'This file is an index only. Workflow policy stays in the canonical contract and AGENTS adapter.',
    invariants: 'The listed skill folders stay aligned with the canonical skill roster.',
    tests: [
      'node scripts/agent-contract/check.mjs',
      'tests/contract/agent-adapter-consistency.test.mjs',
    ],
    risks:
      'Drift here makes Codex skill discovery unreliable and can hide missing generated skill folders.',
    linkedDocs: ['AGENTS.md', 'docs/agent-contract/README.md'],
    related: contract.skills.map((skill) => `.agents/skills/${skill.name}/SKILL.md`),
    modulePackage: '.agents/skills',
    notes:
      'Use this file as the Codex skill index. The canonical roster lives in the compatibility contract JSON.',
  };

  const header = slimMdHeader({
    filePath: meta.filePath,
    purpose: meta.purpose,
    layer: 'control-plane',
    publicValue: meta.publicValue,
    edit: 'sync-only',
  });
  const sidecar = sidecarContent(meta);

  const listed = contract.skills.map((skill) => `- \`${skill.name}\``).join('\n');
  const content = `${header}# Skills\n\nThese Codex-compatible skills are generated from the shared compatibility contract.\n\n## Included\n\n${listed}\n`;
  return { content, sidecar };
}

function renderSkill(contract, skill) {
  const filePath = `.agents/skills/${skill.name}/SKILL.md`;
  const meta = {
    filePath,
    purpose: `${skill.purpose}`,
    api: 'Codex skill',
    publicValue: 'true',
    dependsOn: ['docs/agent-contract/compatibility-contract.json', 'AGENTS.md', skill.claudeSkill],
    owns: `The generated Codex-facing summary for the ${skill.name} workflow module.`,
    boundaries:
      'This skill is an adapter summary. It must not become the canonical owner of the workflow.',
    invariants:
      'The shared process summary stays aligned with the canonical contract; Claude-specific detail remains referenced instead of duplicated.',
    tests: [
      'node scripts/agent-contract/check.mjs',
      'tests/contract/agent-adapter-consistency.test.mjs',
    ],
    risks: `Manual edits here can fork the ${skill.name} workflow away from the canonical contract.`,
    linkedDocs: ['AGENTS.md', 'docs/agent-contract/README.md', skill.claudeSkill],
    related: ['.agents/skills/README.md', skill.claudeSkill],
    modulePackage: `.agents/skills/${skill.name}`,
    notes:
      'Read this as the Codex-friendly workflow summary. For repo-specific Claude elaboration, consult the linked .claude skill after confirming the shared contract still matches.',
  };

  const header = slimMdHeader({
    filePath: meta.filePath,
    purpose: meta.purpose,
    layer: 'control-plane',
    publicValue: meta.publicValue,
    edit: 'sync-only',
  });
  const sidecar = sidecarContent(meta);
  const content = `${header}# ${skill.name}\n\n${skill.purpose}\n\n## When to use\n\n${skill.whenToUse}\n\n## Shared workflow\n\n${bullets(skill.steps)}\n\n## Commands\n\n${commandBlock(skill.commands)}\n\n## Shared contract notes\n\n- Source of truth: \`${contract.sourceOfTruth.machine}\`\n- Claude-side detailed reference: \`${skill.claudeSkill}\`\n- Keep semantics aligned with the shared delivery contract rather than inventing a Codex-only variant.\n`;
  return { content, sidecar };
}

const SIGNATURE = 'generated from compatibility-contract.json — do not edit by hand';

export function collectLocalTierEquivalents(contract) {
  const equipped = [];
  const reasoningOnly = [];
  for (const role of contract.roles ?? []) {
    if (!role || typeof role !== 'object') continue;
    if (role.localTierEquivalent && typeof role.localTierEquivalent === 'object') {
      equipped.push({
        kind: 'role',
        name: role.name,
        command: role.localTierEquivalent.command,
        scope: role.localTierEquivalent.scope,
        limits: role.localTierEquivalent.limits,
      });
    } else {
      reasoningOnly.push({ kind: 'role', name: role.name });
    }
  }
  for (const skill of contract.skills ?? []) {
    if (!skill || typeof skill !== 'object') continue;
    if (skill.localTierEquivalent && typeof skill.localTierEquivalent === 'object') {
      equipped.push({
        kind: 'skill',
        name: skill.name,
        command: skill.localTierEquivalent.command,
        scope: skill.localTierEquivalent.scope,
        limits: skill.localTierEquivalent.limits,
      });
    } else {
      reasoningOnly.push({ kind: 'skill', name: skill.name });
    }
  }
  return { equipped, reasoningOnly };
}

function renderLocalTierEquivalentsSection(contract) {
  const { equipped, reasoningOnly } = collectLocalTierEquivalents(contract);
  if (equipped.length === 0) return null;
  const tableRows = equipped
    .map((entry) => `| \`${entry.name}\` (${entry.kind}) | \`${entry.command}\` |`)
    .join('\n');
  const reasoningList = reasoningOnly
    .map((entry) => `- \`${entry.name}\` (${entry.kind})`)
    .join('\n');
  const lines = [
    '## Local-tier equivalents (when role delegation is unavailable)',
    '',
    'When the canonical workflow says "route through X" or "delegate to Y" but your harness can only invoke deterministic commands, run the equivalent below instead. Each entry has a **scope** (what the script does) and **limits** (what still requires reasoning) — read the canonical contract for those before relying on the command.',
    '',
    '| Role/skill | Run instead |',
    '| --- | --- |',
    tableRows,
    '',
  ];
  if (reasoningOnly.length > 0) {
    lines.push(
      '### Cannot run locally — escalate or stop',
      '',
      'These roles/skills require reasoning that no deterministic script substitutes for. If the workflow points here and your harness has no higher tier to delegate to, surface the question to the operator and stop.',
      '',
      reasoningList,
      '',
    );
  }
  return lines.join('\n');
}

export function renderLocalMd(contract) {
  const profiles = Array.isArray(contract.agentProfiles)
    ? contract.agentProfiles.filter((p) => p.name === 'mid' || p.name === 'small')
    : [];
  const profileSummaries = {
    mid: 'Single-agent tool-use loop. Owns bounded slices inside ONE module.',
    small:
      'Deterministic helper only — header sync, README touch-ups, commit-message templating, prettier-fix. NOT a slice owner.',
  };
  const profileLines = profiles
    .map(
      (p) =>
        `- **${p.name}** (≥${p.minContextTokens.toLocaleString('en-US')} ctx tokens) — ${profileSummaries[p.name] ?? ''}`,
    )
    .join('\n');

  const principlesTrimmed = contract.principles.map((line) =>
    line.replace(
      /^Before implementing.*?exists\.$/,
      'Route user-facing behavior changes through PRD/USM before implementing.',
    ),
  );

  const coordinationCmds = (contract.commands.coordination || []).slice(0, 3);
  const compatibilityCmds = contract.commands.compatibility || [];
  const headerCmds = (contract.commands.headers || []).slice(0, 2);
  const equivalentsSection = renderLocalTierEquivalentsSection(contract);

  const localAdapter = contract.adapters?.local;
  const firstActionLines = localAdapter?.firstAction
    ? [
        '## First action — get a slice brief',
        '',
        localAdapter.firstAction,
        '',
        '```bash',
        'node scripts/agent-context.mjs --slice=<SLICE_ID> --files=<comma-separated-paths>',
        '```',
        '',
      ]
    : [];

  return [
    `<!-- ${SIGNATURE} -->`,
    `<!-- source: ${contract.sourceOfTruth.machine} | regenerate: node scripts/agent-contract/sync.mjs -->`,
    '',
    '# LOCAL — slim contract for local-tier harnesses',
    '',
    'You are a **mid-** or **small-tier** agent (16K-32K context) running in a tool-use harness (Aider, Cline, Continue, LM Studio + a local 7B/70B model). Read this file, then start work. The full Claude/Codex adapter lives in `AGENTS.md` if you ever need it; you do not need it for bounded slices.',
    '',
    ...firstActionLines,
    '## Capability tier (for context, not action)',
    '',
    profileLines,
    '',
    'You own bounded slices inside ONE module at a time. Architectural decisions, multi-module refactors, and control-plane work belong to a frontier-tier agent — escalate by surfacing the question, not by improvising.',
    '',
    '## Non-negotiable rules',
    '',
    bullets(principlesTrimmed),
    '',
    '## Coordination — file a claim before cross-file work',
    '',
    'Before editing files outside your single target module, acquire a claim. The pre-commit hook blocks commits that touch claimed files without a claim of your own.',
    '',
    commandBlock(coordinationCmds),
    '',
    'See `.claims/README.md` for the full lifecycle.',
    '',
    '## Commit ceremony — use coa-merge',
    '',
    'Do not touch `VERSION`, `CHANGELOG.md`, or `package.json` by hand. `coa-merge` does the pull, claim, version bump, and changelog release atomically:',
    '',
    commandBlock([
      'git add <your slice files>',
      'node scripts/coa-merge.mjs --message="feat(module): description (TPL-XXX)"',
    ]),
    '',
    'Commit message rules: `<type>(<scope>): <summary>` ≤100 chars; types ∈ {feat, fix, docs, test, refactor, chore, perf, build, ci, style}; include a work-item ID like `(TPL-209)` in the header or `Refs TPL-209` in the body.',
    '',
    '## Header discipline (ADR-0009)',
    '',
    'Every meaningful tracked file carries a slim 7-line inline header plus a sparse `<file>.header.md` sidecar. **Do not write `@version` yourself** — leave whatever value is there; the pre-commit hook stamps the right number.',
    '',
    'Inline header (7 lines):',
    '',
    '```',
    '/* @HEADER',
    ' * @version <untouched>',
    ' * @purpose One line on the file role.',
    ' * @sidecar <filename>.header.md',
    ' * @layer <layer> | @hex <hex-layer> | @ctx <bounded-context>',
    ' * @public <true|false>',
    ' * @edit <careful|rewrite-ok|append-only|sync-only|generated|manual-only>',
    ' */',
    '```',
    '',
    'Use `node scripts/checks/header-create.mjs <file>` to scaffold both inline + sidecar.',
    '',
    commandBlock(headerCmds),
    '',
    '## Module size constraint (ADR-0013)',
    '',
    'Each module has a **work-surface budget** so it fits a 16K local-LLM context. Warn threshold: 8K tokens. If you find yourself touching a module that already warns, prefer trimming the representative test or splitting an adapter over adding more code. Run `pnpm modules:fit-check` to inspect.',
    '',
    '## Test gate',
    '',
    bullets(contract.testGate.slice(0, 3)),
    '',
    '## Definition of done',
    '',
    bullets(contract.doneDefinition),
    '',
    '## Quality and compatibility commands',
    '',
    commandBlock(compatibilityCmds),
    '',
    ...(equivalentsSection ? [equivalentsSection] : []),
    '## What this adapter intentionally OMITS',
    '',
    bullets([
      'Detailed role routing (frontier-tier concern — see `AGENTS.md`).',
      'Hooks, skills, and runtime-tool plugin protocols (Claude/Codex-class harness features).',
      'BDD modularity detail (apply only when touching `.feature` files; see canonical contract).',
      'Multi-module atomic-commit checklists (escalate to a frontier-tier agent).',
    ]),
    '',
    'If your harness lacks the equivalent of those concepts, run only what the canonical contract calls executable truth: the deterministic scripts under `scripts/`. They are the source of authority — your agent loop is the decision authority for the slice itself.',
    '',
    '## When the slice gets bigger than this file',
    '',
    'If you find yourself needing to read `AGENTS.md` end-to-end, or wandering across more than two modules, **stop and surface that to the operator**. Local-tier agents are specifically scoped to bounded slices; growing the slice silently is the wrong path.',
    '',
    `Footer — full contract: \`${contract.sourceOfTruth.machine}\`. Human guide: \`${contract.sourceOfTruth.human}\`.`,
    '',
  ].join('\n');
}

export function renderMicroMd(contract) {
  return [
    `<!-- ${SIGNATURE} -->`,
    `<!-- source: ${contract.sourceOfTruth.machine} -->`,
    '',
    '# MICRO — deterministic-helper contract',
    '',
    'You are a narrow helper (header sync, README touch-up, commit-message templating, prettier-fix, doc-translation). You are NOT a slice owner. A higher-tier agent or operator drives; you transform.',
    '',
    '## Commit message',
    '',
    '`<type>(<scope>): <summary>` — header ≤100 chars, no trailing period.',
    '',
    'Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `build`, `ci`, `style`.',
    '',
    'Reference at least one work-item ID like `(TPL-123)` in the header or `Refs TPL-123` in the body.',
    '',
    '## Header sidecar (ADR-0009)',
    '',
    'For a tracked file `path/to/foo.mjs`, expect a 7-line inline header AND a sparse YAML sidecar `path/to/foo.mjs.header.md`. Inline shape:',
    '',
    '```',
    '/* @HEADER',
    ' * @version <do not touch>',
    ' * @purpose One line.',
    ' * @sidecar foo.mjs.header.md',
    ' * @layer <layer>',
    ' * @public <true|false>',
    ' * @edit <careful|rewrite-ok|append-only|sync-only|generated|manual-only>',
    ' */',
    '```',
    '',
    'Sidecar starts with `---` YAML frontmatter (camelCase keys: `fileId`, `module`, `stability`, `steward`, `summary`, `tests`, etc.) and ends with `---` then `# <filename>`. Omit fields you do not have a real value for — never write `_none_`.',
    '',
    '## CHANGELOG entry',
    '',
    'Add new bullets under `## [Unreleased]` → `### Added` / `### Changed` / `### Fixed` / `### Removed`. One bullet per slice. End each bullet with the work-item ID in parentheses, e.g. `(TPL-123)`. Do not bump the version number; `coa-merge` does that.',
    '',
    '## Stop conditions',
    '',
    'Defer to the operator if any of the following appear:',
    '',
    bullets([
      'A behavior change to user-visible code (PRD/USM territory).',
      'A cross-module edit (claim required).',
      'A merge conflict, failing test, or unresolved gate output.',
      'A request to touch `VERSION`, `package.json` version field, or release infrastructure.',
    ]),
    '',
    `Footer — escalate to LOCAL.md or AGENTS.md when in doubt. Source: \`${contract.sourceOfTruth.machine}\`.`,
    '',
  ].join('\n');
}

function renderCursorRules(contract) {
  const roleLines = contract.roles
    .map((role) => `| ${role.name} | ${role.capabilityTier ?? '—'} | ${role.useWhen} |`)
    .join('\n');

  const profilesBlock = Array.isArray(contract.agentProfiles)
    ? [
        '## Agent capability tiers',
        '',
        'Each role and skill names the **minimum** tier that can fulfill it; higher tiers may always step in. Local-tier support is landing across TPL-208..215.',
        '',
        ...contract.agentProfiles.flatMap((profile) => [
          `- **${profile.name}** (≥${profile.minContextTokens.toLocaleString('en-US')} ctx tokens) — ${profile.notes}`,
          `  - Capabilities: ${profile.capabilities.join(', ')}`,
          `  - Harnesses: ${profile.harnessExamples.join(', ')}`,
        ]),
        '',
      ]
    : [];

  const sections = [
    '# Contextrail — Cursor Rules',
    '# Generated from docs/agent-contract/compatibility-contract.json',
    '# Do not edit manually — run: node scripts/agent-contract/sync.mjs',
    '',
    '## Project overview',
    '',
    'This is a Contextrail (COA) template — a hexagonal-architecture monorepo with 40 modules. Context-Optimized Architecture treats AI agent context windows as a first-class design constraint.',
    '',
    ...profilesBlock,
    '## Architecture rules',
    '',
    bullets([
      'Hex module boundaries: cross-module access through `public-api.mjs` only.',
      "No deep imports into another module's internals.",
      'Domain stays framework-free; the app layer (`apps/*`) may use any UI framework.',
      'TDD is the default; bugfixes start with a failing regression test.',
      'Trunk-based delivery with Branch by Abstraction.',
      'Keep commits atomic and reviewable — one slice per commit.',
    ]),
    '',
    '## Non-negotiable principles',
    '',
    bullets(contract.principles),
    '',
    '## Navigation protocol',
    '',
    'Use tiered loading to minimize context usage:',
    '',
    '1. **Tier 1** — Start with `docs/SYSTEM_MAP.md` (~1850 tokens full, ~950 focused). Scan the Category Index to find your target domain.',
    '2. **Tier 2** — Read `modules/X/manifest.json` + `public-api.mjs` + `README.md` for your target module.',
    '3. **Tier 3** — Consult `docs/module-catalog.md` only if you need full API details.',
    '4. **Deep-read only files you will actually change** and their direct collaborators.',
    '',
    '## Quality commands',
    '',
    '### Headers',
    '',
    commandBlock(contract.commands.headers),
    '',
    '### Quality gates',
    '',
    commandBlock(contract.commands.quality),
    '',
    '### Traceability and docs',
    '',
    commandBlock(contract.commands.traceability),
    '',
    '### Coordination (inter-agent claims)',
    '',
    commandBlock(contract.commands.coordination),
    '',
    '### Compatibility sync',
    '',
    commandBlock(contract.commands.compatibility),
    '',
    '## Roles',
    '',
    '| Role | Min tier | When to use |',
    '| --- | --- | --- |',
    roleLines,
    '',
    ...(Array.isArray(contract.enforcedRules) && contract.enforcedRules.length > 0
      ? [
          '## Enforced rules',
          '',
          'Blocked at lint time AND runtime — bypass paths are explicitly closed.',
          '',
          contract.enforcedRules
            .map((r) => {
              const owner = r.owner ? ` (\`${r.owner}\`)` : '';
              const adr = r.adr ? ` — see \`${r.adr}\`` : '';
              return `- **${r.id}** — ${r.rule}${owner}${adr}.`;
            })
            .join('\n'),
          '',
        ]
      : []),
    '## Definition of done',
    '',
    bullets(contract.doneDefinition),
    '',
    '## Adapter discipline',
    '',
    `- Source of truth: \`${contract.sourceOfTruth.machine}\``,
    `- Human guide: \`${contract.sourceOfTruth.human}\``,
    '- `.claude/CLAUDE.md` is the Claude adapter.',
    '- `AGENTS.md` is the Codex adapter.',
    '- `.cursorrules` is the Cursor adapter.',
    '- `LOCAL.md` / `MICRO.md` slots reserve the local-tier adapter (generated in TPL-209).',
    '- All four are generated from the same contract — do not edit manually.',
    '',
  ];

  return sections.join('\n');
}

async function syncClaudeFile(contract, checkOnly = false) {
  const current = await readFile(CLAUDE_PATH, 'utf8');
  const block = renderClaudeCompatibilityBlock(contract);

  let next;
  if (current.includes(MARKER_START) && current.includes(MARKER_END)) {
    const start = current.indexOf(MARKER_START);
    const end = current.indexOf(MARKER_END) + MARKER_END.length;
    next = `${current.slice(0, start)}${block}${current.slice(end)}`;
  } else {
    const anchor = '## Always true';
    const idx = current.indexOf(anchor);
    if (idx === -1) {
      throw new Error(
        '.claude/CLAUDE.md is missing the expected "## Always true" anchor for compatibility block insertion.',
      );
    }
    next = `${current.slice(0, idx)}${block}\n\n${current.slice(idx)}`;
  }

  if (checkOnly) return current === next;
  return writeIfChanged(CLAUDE_PATH, next);
}

export async function loadContract() {
  return readJson(CONTRACT_PATH);
}

export async function renderedTargets(contract) {
  const targets = new Map();
  const agents = renderAgents(contract);
  targets.set(path.join(ROOT, 'AGENTS.md'), agents.content);
  targets.set(path.join(ROOT, 'AGENTS.md.header.md'), agents.sidecar);
  targets.set(CURSORRULES_PATH, renderCursorRules(contract));
  targets.set(LOCAL_PATH, renderLocalMd(contract));
  targets.set(
    LOCAL_SIDECAR_PATH,
    sidecarContent({
      filePath: 'LOCAL.md',
      purpose: 'Slim adapter for mid- and small-tier agent harnesses (16K-32K context floor).',
      api: 'Local-tier repository instructions',
      dependsOn: [
        'docs/agent-contract/compatibility-contract.json',
        'AGENTS.md',
        '.claude/CLAUDE.md',
      ],
      owns: 'The slim local-tier adapter to the shared delivery contract.',
      boundaries:
        'This file is an adapter. It must not become an independent process source that drifts from the canonical JSON contract.',
      invariants:
        'Token budget under 5K tokens; omits Claude-class concepts (subagents, hooks, MCP, slash commands).',
      tests: ['node scripts/agent-contract/check.mjs'],
      risks: 'Manual edits here can fork local-tier guidance away from frontier-tier adapters.',
      linkedDocs: ['AGENTS.md', '.claude/CLAUDE.md', 'docs/adr/0013-module-work-surface-budget.md'],
      related: ['MICRO.md', 'docs/agent-contract/compatibility-contract.json'],
      modulePackage: 'root',
      notes:
        'Read this in Aider/Cline/Continue or any harness driving a local 7B/70B model. Regenerated from the contract; do not edit by hand.',
    }),
  );
  targets.set(MICRO_PATH, renderMicroMd(contract));
  targets.set(
    MICRO_SIDECAR_PATH,
    sidecarContent({
      filePath: 'MICRO.md',
      purpose: 'Ultra-slim adapter for narrow deterministic-helper tasks (<2K token budget).',
      api: 'Local-tier helper instructions',
      dependsOn: ['docs/agent-contract/compatibility-contract.json', 'LOCAL.md'],
      owns: 'The ultra-slim helper adapter for header-fix / README-sync / commit-message bots.',
      boundaries:
        'This adapter is for deterministic transformations only — never a slice owner. Behavior decisions escalate to LOCAL.md or AGENTS.md.',
      invariants:
        'Token budget under 2K tokens; covers commit shape, header sidecar, CHANGELOG entry, and stop conditions only.',
      tests: ['node scripts/agent-contract/check.mjs'],
      risks:
        'If this drifts above 2K tokens it loses its niche and operators will reach for LOCAL.md anyway.',
      linkedDocs: ['LOCAL.md', 'AGENTS.md'],
      related: ['LOCAL.md', 'docs/agent-contract/compatibility-contract.json'],
      modulePackage: 'root',
      notes:
        'Use as the system prompt for a narrow helper agent. Defer to operator on any behavior change.',
    }),
  );
  const agentsReadme = renderAgentsReadme(contract);
  targets.set(path.join(ROOT, '.agents/README.md'), agentsReadme.content);
  targets.set(path.join(ROOT, '.agents/README.md.header.md'), agentsReadme.sidecar);
  const skillsReadme = renderSkillsReadme(contract);
  targets.set(path.join(ROOT, '.agents/skills/README.md'), skillsReadme.content);
  targets.set(path.join(ROOT, '.agents/skills/README.md.header.md'), skillsReadme.sidecar);
  for (const skill of contract.skills) {
    const rendered = renderSkill(contract, skill);
    targets.set(path.join(ROOT, `.agents/skills/${skill.name}/SKILL.md`), rendered.content);
    targets.set(
      path.join(ROOT, `.agents/skills/${skill.name}/SKILL.md.header.md`),
      rendered.sidecar,
    );
  }
  return targets;
}

const BODY_ONLY_PATHS = new Set([LOCAL_PATH, MICRO_PATH]);

export async function syncAll({ checkOnly = false } = {}) {
  const contract = await loadContract();
  const targets = await renderedTargets(contract);
  const changed = [];

  for (const [filePath, content] of targets) {
    const bodyOnly = BODY_ONLY_PATHS.has(filePath);
    if (checkOnly) {
      let current;
      try {
        current = await readFile(filePath, 'utf8');
      } catch {
        current = null;
      }
      if (bodyOnly) {
        const currentBody = current === null ? null : stripLeadingInlineHeader(current);
        if (currentBody !== content) changed.push(rel(filePath));
      } else if (current !== content) {
        changed.push(rel(filePath));
      }
    } else if (bodyOnly) {
      if (await writeBodyIfChanged(filePath, content)) changed.push(rel(filePath));
    } else if (await writeIfChanged(filePath, content)) {
      changed.push(rel(filePath));
    }
  }

  const claudeOkOrChanged = await syncClaudeFile(contract, checkOnly);
  if (checkOnly) {
    if (!claudeOkOrChanged) changed.push('.claude/CLAUDE.md');
  } else if (claudeOkOrChanged) {
    changed.push('.claude/CLAUDE.md');
  }

  return { contract, changed };
}

async function main() {
  const checkOnly = process.argv.slice(2).includes('--check');
  const { changed } = await syncAll({ checkOnly });
  if (checkOnly) {
    if (changed.length) {
      console.error(
        'agent-contract sync drift detected:\n' + changed.map((file) => `- ${file}`).join('\n'),
      );
      process.exit(1);
    }
    console.log('agent-contract sync parity: OK');
    return;
  }
  console.log(
    `agent-contract sync: ${changed.length ? `updated ${changed.length} file(s)` : 'already up to date'}`,
  );
  if (changed.length) {
    for (const file of changed) console.log(`- ${file}`);
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
