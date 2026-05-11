/* @HEADER
 * @version 0.6.7 | 2026-04-28
 * @purpose PreToolUse hook for Edit/Write — blocks file modifications when another session holds an active claim on the target path.
 * @sidecar run-claim-guard.mjs.header.md
 * @layer control-plane | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Claim guard for Edit/Write tool calls.
 *
 * When a Claude session tries to Edit or Write a file, this hook checks
 * whether another session holds an active claim on that path. If so,
 * the edit is denied with a message explaining who owns the file.
 *
 * This catches the disk-write race that pre-commit hooks cannot see:
 * two sessions modifying the same file between commits.
 *
 * Reads stdin for the Claude Code PreToolUse payload, checks .claims/,
 * and outputs a permit/deny decision.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const CLAIMS_DIR = join(ROOT, '.claims');

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

function parsePayload() {
  try {
    const raw = readFileSync(0, 'utf8').trim() || '{}';
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Load all active claims and return { agent, slice, targets[] } for each.
 */
function loadActiveClaims() {
  if (!existsSync(CLAIMS_DIR)) return [];
  const claims = [];
  for (const file of readdirSync(CLAIMS_DIR)) {
    if (!file.startsWith('clm-') || !file.endsWith('.json')) continue;
    try {
      const claim = JSON.parse(readFileSync(join(CLAIMS_DIR, file), 'utf8'));
      if (claim.status === 'active' && Array.isArray(claim.targets)) {
        claims.push({
          id: claim.id || file,
          agent: claim.agent || 'unknown',
          slice: claim.slice || '',
          targets: claim.targets,
        });
      }
    } catch { /* skip malformed */ }
  }
  return claims;
}

/**
 * Check if a file path matches any claim target (simple prefix/glob match).
 */
function matchesClaim(filePath, claimTargets) {
  const normalized = filePath.replace(/\\/g, '/');
  for (const target of claimTargets) {
    const t = target.replace(/\\/g, '/').replace(/\*$/, '');
    if (normalized.startsWith(t) || normalized === target.replace(/\*/g, '')) {
      return true;
    }
  }
  return false;
}

function main() {
  const payload = parsePayload();
  if (!payload) {
    // Can't parse — allow (fail open for non-claim scenarios)
    process.exit(0);
  }

  const toolName = payload.tool_name || payload.toolName || '';
  if (toolName !== 'Edit' && toolName !== 'Write') {
    process.exit(0);
  }

  const toolInput = payload.tool_input || payload.toolInput || {};
  const filePath = String(toolInput.file_path || toolInput.path || '');
  if (!filePath) {
    process.exit(0);
  }

  // Resolve relative to repo root
  const relative = filePath.startsWith(ROOT)
    ? filePath.slice(ROOT.length + 1).replace(/\\/g, '/')
    : filePath.replace(/\\/g, '/');

  // Get current session's agent identity from environment or claim context
  const myAgent = process.env.COA_AGENT || process.env.CLAUDE_SESSION_ID || '';

  const claims = loadActiveClaims();
  for (const claim of claims) {
    // Skip own claims
    if (myAgent && claim.agent === myAgent) continue;

    if (matchesClaim(relative, claim.targets)) {
      deny(
        `File "${relative}" is under active claim ${claim.id} ` +
        `by agent "${claim.agent}" (slice: ${claim.slice}). ` +
        `Wait for their claim to complete or coordinate via claim-check.`
      );
      return;
    }
  }

  // No blocking claim — allow
  process.exit(0);
}

main();
