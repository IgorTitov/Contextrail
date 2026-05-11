/* @HEADER
 * @version 0.6.8 | 2026-04-28
 * @purpose PreToolUse hook — writes .cockpit/active-agent.json marker when Agent tool is invoked so Cockpit can distinguish subagent types.
 * @sidecar cockpit-agent-marker.mjs.header.md
 * @layer control-plane | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Cockpit agent marker hook (PreToolUse on Agent).
 *
 * When Claude Code launches a subagent via the Agent tool, this hook
 * fires before execution and writes a marker file that the PostToolUse
 * telemetry hook reads. This lets Cockpit distinguish feature-implementer
 * from acceptance-tester, etc. — without relying on env vars or manual
 * CLAUDE.md instructions.
 *
 * Fire-and-forget: if .cockpit/ can't be created, silently continues.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MARKER_DIR = join(ROOT, '.cockpit');
const MARKER_PATH = join(MARKER_DIR, 'active-agent.json');

function main() {
  let payload;
  try {
    const raw = readFileSync(0, 'utf8').trim() || '{}';
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
    return;
  }

  const input = payload.tool_input || payload.toolInput || {};
  const agentType = input.subagent_type || 'general-purpose';
  const description = input.description || '';

  const marker = {
    agentType,
    sliceId: '',
    agent: description || agentType,
    updatedAt: new Date().toISOString(),
  };

  try {
    mkdirSync(MARKER_DIR, { recursive: true });
    writeFileSync(MARKER_PATH, JSON.stringify(marker, null, 2) + '\n');
  } catch {
    // Can't write marker — continue silently
  }

  process.exit(0);
}

main();
