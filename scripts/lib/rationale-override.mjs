/* @HEADER
 * @version 0.8.12 | 2026-05-11
 * @purpose Generalized one-shot rationale-file override helper: parse, validate (TTL, category, archive), and consume .coa/<key>-override.json.
 * @sidecar rationale-override.mjs.header.md
 * @layer lib | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * Generalized rationale-file override helper (TPL-333).
 *
 * validateAndConsumeOverride(overridePath, expectedValue, options) is a pure
 * validator — it does NOT write, archive, or delete any files. On success it
 * returns { valid: true, logEntry, logPath } so the caller can perform side
 * effects in the correct order.
 *
 * On failure it returns { valid: false, reason: string }.
 *
 * Parameters:
 *   overridePath   — absolute path to the override file
 *   expectedValue  — the value the override file's configKey must match
 *   options:
 *     configKey          — string key in the override file (e.g. "slice_id")
 *     categoryWhitelist  — array of valid category strings
 *     logDir             — absolute path to the archive directory
 *
 * TTL: 60 seconds. Clock-skew tolerance: 5 seconds in the future.
 * Reason must be >= 20 characters.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const TTL_MS = 60_000;
export const CLOCK_SKEW_TOLERANCE_MS = 5_000;

/**
 * Validate a one-shot override file.
 *
 * PURE — no file-system side effects. Returns result with logEntry + logPath
 * on success so the caller can archive and delete in the right order.
 *
 * @param {string}   overridePath   Absolute path to the override JSON file
 * @param {string}   expectedValue  Expected value for the configKey field
 * @param {{ configKey: string, categoryWhitelist: string[], logDir: string }} options
 * @returns {{ valid: boolean, reason?: string, logEntry?: object, logPath?: string }}
 */
export function validateAndConsumeOverride(overridePath, expectedValue, { configKey, categoryWhitelist, logDir }) {
  if (!existsSync(overridePath)) {
    return { valid: false, reason: `No override file found at ${overridePath}.` };
  }

  let data;
  try {
    data = JSON.parse(readFileSync(overridePath, 'utf8'));
  } catch (err) {
    return { valid: false, reason: `Failed to parse override file: ${err.message}` };
  }

  const { timestamp, reason, category } = data;
  const value = data[configKey];

  // configKey must match expectedValue
  if (!value || typeof value !== 'string') {
    return { valid: false, reason: `Override file: missing or invalid "${configKey}" field.` };
  }
  if (value !== expectedValue) {
    return { valid: false, reason: `Override file: "${configKey}" is "${value}" but expected "${expectedValue}".` };
  }

  // timestamp required
  if (!timestamp || typeof timestamp !== 'string') {
    return { valid: false, reason: 'Override file: missing or invalid "timestamp" field.' };
  }
  const ts = Date.parse(timestamp);
  if (isNaN(ts)) {
    return { valid: false, reason: `Override file: "timestamp" is not a valid ISO-8601 date: ${timestamp}` };
  }

  // Far-future rejection (clock-skew guard)
  if (ts > Date.now() + CLOCK_SKEW_TOLERANCE_MS) {
    return { valid: false, reason: 'timestamp-in-future' };
  }

  // TTL check
  if (Date.now() - ts > TTL_MS) {
    return { valid: false, reason: 'Override file: timestamp is older than 60 seconds (TTL expired). Re-create the file.' };
  }

  // reason must be >= 20 characters
  if (!reason || typeof reason !== 'string' || reason.length < 20) {
    return { valid: false, reason: `Override file: "reason" must be >= 20 characters (got ${reason?.length ?? 0}).` };
  }

  // category must be in whitelist
  if (!categoryWhitelist.includes(category)) {
    return { valid: false, reason: `Override file: "category" must be one of: ${categoryWhitelist.join(', ')}. Got: ${JSON.stringify(category)}` };
  }

  // Build log entry — consumed_at set here after all validation passes.
  const nowMs = Date.now();
  const safeValue = String(value).replace(/[^a-zA-Z0-9_-]/g, '-');
  const logPath = join(logDir, `${nowMs}-${safeValue}.json`);
  const logEntry = { ...data, consumed_at: new Date(nowMs).toISOString() };

  return { valid: true, logEntry, logPath };
}
