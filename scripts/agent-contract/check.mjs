/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Verify that Claude, Codex, and Cursor adapters remain aligned with the canonical repo-level compatibility contract.
 * @sidecar check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { access, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContract, syncAll } from './sync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const args = new Set(process.argv.slice(2));
const wantJson = args.has('--json');
const errors = [];

function abs(relPath) {
  return path.join(ROOT, relPath);
}

async function readText(relPath) {
  return readFile(abs(relPath), 'utf8');
}

async function exists(relPath) {
  try {
    await access(abs(relPath));
    return true;
  } catch {
    return false;
  }
}

function fail(message) {
  errors.push(message);
}

function expectIncludes(text, needle, owner) {
  if (!text.includes(needle)) fail(`${owner} is missing required text: ${needle}`);
}

const DANGEROUS_PATTERNS = [
  { re: /ignore\s+safety/i, label: 'ignore safety' },
  { re: /ignore\s+security/i, label: 'ignore security' },
  { re: /disable\s+safety/i, label: 'disable safety' },
  { re: /disable\s+security/i, label: 'disable security' },
  { re: /skip\s+checks/i, label: 'skip checks' },
  { re: /skip\s+gates/i, label: 'skip gates' },
  { re: /skip\s+tests/i, label: 'skip tests' },
  { re: /bypass/i, label: 'bypass' },
  { re: /disable.*hook/i, label: 'disable...hook' },
  { re: /disable.*blocker/i, label: 'disable...blocker' },
  { re: /\bdelete\b.*\ball\b/i, label: 'delete...all' },
  { re: /\bexfiltrate\b/i, label: 'exfiltrate' },
  { re: /\bleak\b/i, label: 'leak' },
  { re: /\bsteal\b/i, label: 'steal' },
  { re: /rm\s+-rf/i, label: 'rm -rf' },
  { re: /rm\s+-r\s+\//i, label: 'rm -r /' },
  { re: /format\s+c:/i, label: 'format c:' },
  { re: /curl.*\|.*bash/i, label: 'curl...|...bash' },
  { re: /wget.*\|.*sh/i, label: 'wget...|...sh' },
  { re: /--no-verify/i, label: '--no-verify' },
  { re: /--force/i, label: '--force' },
];

const SCANNED_ARRAYS = [
  'principles',
  'deliveryFlow',
  'acceptanceFlow',
  'commitFlow',
  'finalizationFlow',
  'changelogFlow',
  'testGate',
  'doneDefinition',
];

const ALLOWED_CAPABILITY_TIERS = new Set(['frontier', 'mid', 'small', 'any']);
const ALLOWED_AGENT_PROFILE_NAMES = new Set(['frontier', 'mid', 'small']);

const LOCAL_TOKEN_HARD_CAP = 5000;
const MICRO_TOKEN_HARD_CAP = 2000;
const SIGNATURE_NEEDLE = 'generated from compatibility-contract.json — do not edit by hand';

export function approximateTokenCount(text) {
  if (typeof text !== 'string' || text.length === 0) return 0;
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}

export function validateLocalAdapter(text, hardCap = LOCAL_TOKEN_HARD_CAP, failFn = fail) {
  if (typeof text !== 'string' || text.length === 0) {
    failFn('LOCAL.md adapter: file is missing or empty');
    return;
  }
  if (!text.includes(SIGNATURE_NEEDLE)) {
    failFn(`LOCAL.md adapter: missing canonical signature comment "${SIGNATURE_NEEDLE}"`);
  }
  const tokens = approximateTokenCount(text);
  if (tokens > hardCap) {
    failFn(
      `LOCAL.md adapter: ${tokens} tokens exceeds hard cap ${hardCap} — trim, do not grow`,
    );
  }
}

export function validateMicroAdapter(text, hardCap = MICRO_TOKEN_HARD_CAP, failFn = fail) {
  if (typeof text !== 'string' || text.length === 0) {
    failFn('MICRO.md adapter: file is missing or empty');
    return;
  }
  if (!text.includes(SIGNATURE_NEEDLE)) {
    failFn(`MICRO.md adapter: missing canonical signature comment "${SIGNATURE_NEEDLE}"`);
  }
  const tokens = approximateTokenCount(text);
  if (tokens > hardCap) {
    failFn(
      `MICRO.md adapter: ${tokens} tokens exceeds hard cap ${hardCap} — trim, do not grow`,
    );
  }
}

function validateAgentProfiles(contract, failFn = fail) {
  if (!Array.isArray(contract.agentProfiles)) {
    failFn('agentProfiles validation: agentProfiles[] is required when schemaVersion >= 2');
    return;
  }
  const seen = new Set();
  for (let i = 0; i < contract.agentProfiles.length; i++) {
    const profile = contract.agentProfiles[i];
    if (!profile || typeof profile !== 'object') {
      failFn(`agentProfiles[${i}] must be an object`);
      continue;
    }
    if (!ALLOWED_AGENT_PROFILE_NAMES.has(profile.name)) {
      failFn(
        `agentProfiles[${i}].name must be one of frontier|mid|small (got: ${JSON.stringify(profile.name)})`,
      );
    }
    if (seen.has(profile.name)) {
      failFn(`agentProfiles[${i}].name duplicates an earlier entry: ${profile.name}`);
    }
    seen.add(profile.name);
    if (typeof profile.minContextTokens !== 'number' || profile.minContextTokens <= 0) {
      failFn(`agentProfiles[${i}].minContextTokens must be a positive number`);
    }
    if (!Array.isArray(profile.capabilities) || profile.capabilities.length === 0) {
      failFn(`agentProfiles[${i}].capabilities must be a non-empty array of strings`);
    }
  }
}

function validateCapabilityTiers(contract, failFn = fail) {
  if (Array.isArray(contract.roles)) {
    for (let i = 0; i < contract.roles.length; i++) {
      const role = contract.roles[i];
      if (!role || typeof role !== 'object') continue;
      if (!ALLOWED_CAPABILITY_TIERS.has(role.capabilityTier)) {
        failFn(
          `roles[${i}] (${role.name ?? '?'}).capabilityTier must be one of frontier|mid|small|any (got: ${JSON.stringify(role.capabilityTier)})`,
        );
      }
    }
  }
  if (Array.isArray(contract.skills)) {
    for (let i = 0; i < contract.skills.length; i++) {
      const skill = contract.skills[i];
      if (!skill || typeof skill !== 'object') continue;
      if (!ALLOWED_CAPABILITY_TIERS.has(skill.capabilityTier)) {
        failFn(
          `skills[${i}] (${skill.name ?? '?'}).capabilityTier must be one of frontier|mid|small|any (got: ${JSON.stringify(skill.capabilityTier)})`,
        );
      }
    }
  }
}

const SHELL_PIPELINE_PATTERNS = [/&&/, /\|\|/, /(?<![|>])\|(?!\|)/, /;/, />/, /<(?!=)/, /\$\(/, /`/];
const PNPM_SCRIPT_RE = /^pnpm\s+([^\s]+)/;
const NODE_FILE_RE = /^node\s+("([^"]+)"|([^\s]+))/;

export function commandTargetExists(command, rootDir, pkgScripts = null) {
  if (typeof command !== 'string' || !command.length) return false;
  const pnpmMatch = command.match(PNPM_SCRIPT_RE);
  if (pnpmMatch) {
    const scriptName = pnpmMatch[1];
    return Boolean(pkgScripts && Object.prototype.hasOwnProperty.call(pkgScripts, scriptName));
  }
  const nodeMatch = command.match(NODE_FILE_RE);
  if (nodeMatch) {
    const filePath = nodeMatch[2] ?? nodeMatch[3];
    if (!filePath) return false;
    return existsSync(path.join(rootDir, filePath));
  }
  return false;
}

export function validateLocalTierEquivalent(
  entry,
  ownerLabel,
  rootDir,
  pkgScripts,
  failFn = fail,
) {
  const eq = entry.localTierEquivalent;
  if (eq === undefined || eq === null) return;
  if (typeof eq !== 'object' || Array.isArray(eq)) {
    failFn(`${ownerLabel}.localTierEquivalent must be an object`);
    return;
  }
  if (typeof eq.command !== 'string' || eq.command.trim() === '') {
    failFn(`${ownerLabel}.localTierEquivalent.command must be a non-empty string`);
  } else {
    const cmd = eq.command.trim();
    if (!/^node\s/.test(cmd) && !/^pnpm\s/.test(cmd)) {
      failFn(
        `${ownerLabel}.localTierEquivalent.command must start with "node " or "pnpm " (got: ${JSON.stringify(cmd)})`,
      );
    }
    for (const pattern of SHELL_PIPELINE_PATTERNS) {
      if (pattern.test(cmd)) {
        failFn(
          `${ownerLabel}.localTierEquivalent.command must be invocable directly — no shell pipelines, redirects, or substitutions (got: ${JSON.stringify(cmd)})`,
        );
        break;
      }
    }
    if (!commandTargetExists(cmd, rootDir, pkgScripts)) {
      failFn(
        `${ownerLabel}.localTierEquivalent.command target does not exist in repo (got: ${JSON.stringify(cmd)})`,
      );
    }
  }
  if (typeof eq.scope !== 'string' || eq.scope.trim() === '') {
    failFn(`${ownerLabel}.localTierEquivalent.scope must be a non-empty string`);
  }
  if (typeof eq.limits !== 'string' || eq.limits.trim() === '') {
    failFn(`${ownerLabel}.localTierEquivalent.limits must be a non-empty string`);
  }
}

function validateLocalTierEquivalents(contract, rootDir, pkgScripts, failFn = fail) {
  if (Array.isArray(contract.roles)) {
    for (let i = 0; i < contract.roles.length; i++) {
      const role = contract.roles[i];
      if (!role || typeof role !== 'object') continue;
      validateLocalTierEquivalent(
        role,
        `roles[${i}] (${role.name ?? '?'})`,
        rootDir,
        pkgScripts,
        failFn,
      );
    }
  }
  if (Array.isArray(contract.skills)) {
    for (let i = 0; i < contract.skills.length; i++) {
      const skill = contract.skills[i];
      if (!skill || typeof skill !== 'object') continue;
      validateLocalTierEquivalent(
        skill,
        `skills[${i}] (${skill.name ?? '?'})`,
        rootDir,
        pkgScripts,
        failFn,
      );
    }
  }
}

function validateContractContent(contract, failFn = fail) {
  for (const arrayKey of SCANNED_ARRAYS) {
    const arr = contract[arrayKey];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string') continue;
      for (const { re, label } of DANGEROUS_PATTERNS) {
        if (re.test(arr[i])) {
          failFn(
            `contract content validation: dangerous pattern '${label}' found in ${arrayKey}[${i}]`,
          );
        }
      }
    }
  }

  if (Array.isArray(contract.roles)) {
    for (let i = 0; i < contract.roles.length; i++) {
      const role = contract.roles[i];
      if (typeof role.useWhen !== 'string') continue;
      for (const { re, label } of DANGEROUS_PATTERNS) {
        if (re.test(role.useWhen)) {
          failFn(
            `contract content validation: dangerous pattern '${label}' found in roles[${i}].useWhen`,
          );
        }
      }
    }
  }
}

export {
  DANGEROUS_PATTERNS,
  SCANNED_ARRAYS,
  ALLOWED_CAPABILITY_TIERS,
  ALLOWED_AGENT_PROFILE_NAMES,
  LOCAL_TOKEN_HARD_CAP,
  MICRO_TOKEN_HARD_CAP,
  SIGNATURE_NEEDLE,
  ROOT,
  validateContractContent,
  validateAgentProfiles,
  validateCapabilityTiers,
  validateLocalTierEquivalents,
};

async function main() {
  const contract = await loadContract();
  const { changed } = await syncAll({ checkOnly: true });
  if (changed.length) {
    for (const file of changed) fail(`generated adapter drift: ${file}`);
  }

  const [pkgText, preCommit, docsReadme, ag, claude, cursorrules, localMd, microMd] =
    await Promise.all([
      readText('package.json'),
      readText('.githooks/pre-commit'),
      readText('docs/agent-contract/README.md'),
      readText('AGENTS.md'),
      readText('.claude/CLAUDE.md'),
      readText('.cursorrules').catch(() => null),
      readText('LOCAL.md').catch(() => null),
      readText('MICRO.md').catch(() => null),
    ]);
  const pkg = JSON.parse(pkgText);

  if (pkg.scripts?.['agent-contract:sync'] !== 'node scripts/agent-contract/sync.mjs') {
    fail(
      'package.json is missing script agent-contract:sync -> node scripts/agent-contract/sync.mjs',
    );
  }

  if (pkg.scripts?.['agent-contract:check'] !== 'node scripts/agent-contract/check.mjs') {
    fail(
      'package.json is missing script agent-contract:check -> node scripts/agent-contract/check.mjs',
    );
  }
  if (pkg.scripts?.['usm-check'] !== 'node scripts/checks/usm-check.mjs') {
    fail('package.json is missing script usm-check -> node scripts/checks/usm-check.mjs');
  }
  if (pkg.scripts?.['pre-impl-gate'] !== 'node scripts/checks/pre-impl-gate.mjs') {
    fail('package.json is missing script pre-impl-gate -> node scripts/checks/pre-impl-gate.mjs');
  }

  expectIncludes(preCommit, 'node scripts/agent-contract/sync.mjs', '.githooks/pre-commit');
  expectIncludes(preCommit, 'node scripts/agent-contract/check.mjs', '.githooks/pre-commit');
  expectIncludes(preCommit, 'node scripts/checks/usm-check.mjs', '.githooks/pre-commit');
  expectIncludes(preCommit, 'node scripts/checks/pre-impl-gate.mjs', '.githooks/pre-commit');
  expectIncludes(docsReadme, contract.sourceOfTruth.machine, 'docs/agent-contract/README.md');
  expectIncludes(ag, contract.sourceOfTruth.machine, 'AGENTS.md');
  expectIncludes(claude, contract.sourceOfTruth.machine, '.claude/CLAUDE.md');
  expectIncludes(ag, 'atomic', 'AGENTS.md');
  expectIncludes(ag, 'acceptance', 'AGENTS.md');
  expectIncludes(ag, 'CHANGELOG.md', 'AGENTS.md');

  if (!cursorrules) {
    fail('.cursorrules file is missing');
  } else {
    expectIncludes(cursorrules, contract.sourceOfTruth.machine, '.cursorrules');
    expectIncludes(cursorrules, 'SYSTEM_MAP', '.cursorrules');
    expectIncludes(cursorrules, 'public-api', '.cursorrules');
    expectIncludes(cursorrules, contract.principles[0], '.cursorrules');
  }

  validateLocalAdapter(localMd);
  validateMicroAdapter(microMd);

  for (const skill of contract.skills) {
    const claudeSkill = skill.claudeSkill;
    const codexSkill = `.agents/skills/${skill.name}/SKILL.md`;
    if (!(await exists(claudeSkill))) {
      fail(`missing Claude skill for canonical skill ${skill.name}: ${claudeSkill}`);
    }
    if (!(await exists(codexSkill))) {
      fail(`missing Codex skill for canonical skill ${skill.name}: ${codexSkill}`);
    }
  }

  validateContractContent(contract);
  if (typeof contract.schemaVersion === 'number' && contract.schemaVersion >= 2) {
    validateAgentProfiles(contract);
    validateCapabilityTiers(contract);
  }
  if (typeof contract.schemaVersion === 'number' && contract.schemaVersion >= 3) {
    validateLocalTierEquivalents(contract, ROOT, pkg.scripts ?? {});
  }

  const output = {
    script: 'agent-contract-check',
    ok: errors.length === 0,
    errors,
    checked: [
      'docs/agent-contract/compatibility-contract.json',
      'docs/agent-contract/README.md',
      'AGENTS.md',
      '.cursorrules',
      'LOCAL.md',
      'MICRO.md',
      '.claude/CLAUDE.md',
      '.githooks/pre-commit',
      'package.json',
      '.agents/skills/*/SKILL.md',
      '.claude/skills/*/SKILL.md',
    ],
  };

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    console.error(
      'agent-contract-check failed:\n' + output.errors.map((error) => `- ${error}`).join('\n'),
    );
    process.exit(1);
  }

  console.log('agent-contract-check: OK');
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? '')) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (wantJson) {
      console.log(
        JSON.stringify({ script: 'agent-contract-check', ok: false, errors: [message] }, null, 2),
      );
    } else {
      console.error(message);
    }
    process.exit(1);
  });
}
