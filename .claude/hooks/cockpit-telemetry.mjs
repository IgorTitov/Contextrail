/* @HEADER
 * @version 0.6.8 | 2026-04-28
 * @purpose PostToolUse hook — sends agent action telemetry to AI Cockpit for real-time monitoring.
 * @sidecar cockpit-telemetry.mjs.header.md
 * @layer control-plane | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Cockpit telemetry hook.
 * Fires on every Edit, Write, Bash, Read action. Sends a lightweight
 * HTTP POST to localhost:4310 (Cockpit dev server). Fire-and-forget:
 * 2s timeout, errors silently ignored. If Cockpit isn't running, the
 * request fails silently and the agent continues unimpeded.
 */

import { readFileSync } from 'node:fs';
import { request } from 'node:http';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const COCKPIT_URL = process.env.COCKPIT_TELEMETRY_URL || 'http://localhost:4310/api/telemetry/event';

function parsePayload() {
  try {
    const raw = readFileSync(0, 'utf8').trim() || '{}';
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getProjectName() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    return pkg.name || basename(ROOT);
  } catch {
    return basename(ROOT);
  }
}

function sendTelemetry(event) {
  const body = JSON.stringify(event);
  const url = new URL(COCKPIT_URL);

  const req = request(
    {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 2000,
    },
    () => {},
  );

  req.on('error', () => {}); // fire-and-forget
  req.on('timeout', () => req.destroy());
  req.write(body);
  req.end();
}

function main() {
  const payload = parsePayload();
  if (!payload) {
    process.exit(0);
    return;
  }

  const toolName = payload.tool_name || payload.toolName || '';
  const toolInput = payload.tool_input || payload.toolInput || {};

  let target = '';
  if (toolName === 'Edit' || toolName === 'Write' || toolName === 'Read') {
    target = String(toolInput.file_path || toolInput.path || '');
  } else if (toolName === 'Bash') {
    target = String(toolInput.command || '').slice(0, 200);
  }

  const projectName = getProjectName();

  // Read agent marker written by PreToolUse cockpit-agent-marker.mjs.
  // Falls back to env vars for backward compatibility.
  let marker = {};
  try {
    marker = JSON.parse(
      readFileSync(join(ROOT, '.cockpit', 'active-agent.json'), 'utf8'),
    );
  } catch {
    // No marker — use env vars or defaults
  }

  sendTelemetry({
    agentId: process.env.COCKPIT_AGENT_ID || `${projectName}-${process.ppid}`,
    agentType: marker.agentType || process.env.COCKPIT_AGENT_TYPE || 'orchestrator',
    sliceId: marker.sliceId || process.env.COCKPIT_SLICE_ID || '',
    action: toolName,
    target,
    timestamp: new Date().toISOString(),
    status: 'success',
  });

  // Don't block — exit immediately, HTTP request is fire-and-forget
  process.exit(0);
}

main();
