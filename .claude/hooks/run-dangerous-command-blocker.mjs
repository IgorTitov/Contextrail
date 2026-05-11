/* @HEADER
 * @version 0.7.64 | 2026-05-03
 * @purpose Portable Node entrypoint for the dangerous-command blocker used by Claude PreToolUse hooks.
 * @sidecar run-dangerous-command-blocker.mjs.header.md
 * @layer control-plane | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOCKLIST_PATH = resolve(__dirname, '../../docs/agent-contract/dangerous-commands.json');

let blocklist;
try {
  blocklist = JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf8'));
} catch {
  // Fallback: if the shared JSON is missing, use inline defaults
  blocklist = {
    dangerousCommands: [
      { label: 'rm recursive force', pattern: String.raw`\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive)\b` },
      { label: 'mkfs', pattern: String.raw`\bmkfs\b` },
      { label: 'dd if=', pattern: String.raw`\bdd\s+if=` },
      { label: 'fork bomb', pattern: String.raw`:\(\)\s*\{\s*:\|:&\s*\};:` },
      { label: 'git reset --hard', pattern: String.raw`\bgit\s+reset\s+--hard\b` },
      { label: 'git clean -f', pattern: String.raw`\bgit\s+clean\s+(-[a-zA-Z]*f|--force)\b` },
      { label: 'git push --force', pattern: String.raw`\bgit\s+push\s+(-[a-zA-Z]*f|--force)\b` },
      { label: 'git checkout -- .', pattern: String.raw`\bgit\s+(checkout|restore)\s+(--)?(\s+\.\s*$|\s+\*)` },
      { label: 'git branch -D', pattern: String.raw`\bgit\s+branch\s+-D\b` },
      { label: 'curl pipe sh', pattern: String.raw`\bcurl\b.*\|.*\b(sh|bash|zsh)\b` },
      { label: 'wget pipe sh', pattern: String.raw`\bwget\b.*\|.*\b(sh|bash|zsh)\b` },
      { label: 'chmod 777', pattern: String.raw`\bchmod\s+(-[a-zA-Z]*R)?\s*777\b` },
    ],
    sensitivePathFragments: ['.git/', '.claude/settings.json', '.claude/hooks/', '.env', 'secrets', 'id_rsa'],
    sensitivePathExceptions: ['.env.example'],
  };
}

const SENSITIVE_PATH_FRAGMENTS = blocklist.sensitivePathFragments;
const SENSITIVE_PATH_EXCEPTIONS = blocklist.sensitivePathExceptions;
const DANGEROUS_COMMAND_SPECS = blocklist.dangerousCommands.map((entry) => ({
  label: entry.label,
  pattern: new RegExp(entry.pattern),
}));

function isLocalFsRemote(remote) {
  if (!remote) return false;
  if (remote.startsWith('file://')) return true;
  if (/^[a-zA-Z]:[\\/]/.test(remote)) return true;
  if (remote.startsWith('/')) return true;
  try { return existsSync(resolve(remote)); } catch { return false; }
}

function extractPushRemote(command) {
  const tokens = command.trim().split(/\s+/);
  let i = 0;
  while (i < tokens.length && tokens[i] !== 'push') i++;
  i++;
  while (i < tokens.length && tokens[i].startsWith('-')) i++;
  return tokens[i] || null;
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

/**
 * Normalize a command string for pattern matching:
 * - Strip leading backslashes from command tokens (shell alias-bypass idiom)
 * - Strip zero-width Unicode characters that could evade regex
 */
function normalizeCommand(cmd) {
  return cmd
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/(^|\s)\\(?=[a-zA-Z])/g, '$1');
}

function parsePayload() {
  const raw = readFileSync(0, 'utf8').trim() || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function main() {
  const payload = parsePayload();
  if (!payload) {
    deny('Malformed or empty hook payload — failing closed');
    return;
  }

  const toolName = payload.tool_name || payload.toolName || '';
  const toolInput = payload.tool_input || payload.toolInput || {};

  if (toolName === 'Bash') {
    const command = normalizeCommand(String(toolInput.command || ''));

    // git push --force-with-lease: allow for local-fs remotes, block for network remotes.
    // Must run before the generic pattern loop because --force-with-lease is partially
    // matched by the existing "git push --force" pattern via word-boundary.
    if (/\bgit\s+push\b/.test(command) && /--force-with-lease\b/.test(command)) {
      // If command also carries a bare --force / -f, deny — too destructive even locally.
      if (/--force(?!-with-lease)\b/.test(command) || /\s-[a-zA-Z]*f(\s|$)/.test(command)) {
        deny('Blocked dangerous shell command: git push --force');
      }
      const remote = extractPushRemote(command);
      if (isLocalFsRemote(remote)) {
        process.exit(0);
      }
      deny('Blocked dangerous shell command: git push --force-with-lease to non-local remote');
    }

    for (const spec of DANGEROUS_COMMAND_SPECS) {
      if (spec.pattern.test(command)) {
        deny(`Blocked dangerous shell command: ${spec.label}`);
      }
    }

    for (const fragment of SENSITIVE_PATH_FRAGMENTS) {
      if (command.includes(fragment)) {
        const excepted = SENSITIVE_PATH_EXCEPTIONS.some((exc) => command.includes(exc));
        if (!excepted) {
          deny(`Blocked shell command touching sensitive path fragment: ${fragment}`);
        }
      }
    }
  }

  if (toolName === 'Edit' || toolName === 'Write') {
    const filePath = String(toolInput.file_path || toolInput.path || '');
    for (const fragment of SENSITIVE_PATH_FRAGMENTS) {
      if (filePath.includes(fragment)) {
        const excepted = SENSITIVE_PATH_EXCEPTIONS.some((exc) => filePath.includes(exc));
        if (!excepted) {
          deny(`Blocked edit to sensitive path: ${filePath}`);
        }
      }
    }
  }

  process.exit(0);
}

main();
