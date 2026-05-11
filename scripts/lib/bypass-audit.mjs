/* @HEADER
 * @version 0.7.70 | 2026-05-03
 * @purpose Pure library for parsing and correlating bypass-audit log records to commits.
 * @sidecar bypass-audit.mjs.header.md
 * @layer lib | @hex domain | @ctx bypass-audit
 * @public true
 * @edit careful
 */

/**
 * Bypass audit library (R8.4 / TPL-258).
 *
 * Pure functions for reading .claims/commit-audit.log (NDJSON), correlating
 * phases-ran records to git commit SHAs, and classifying gaps (commits with no
 * audit record or with missing NON_SKIPPABLE_PHASES in the record).
 *
 * No I/O side-effects beyond the readFileSync call in parseAuditLog —
 * callers (bypass-audit-check.mjs) own git invocation and filesystem writes.
 */

import { readFileSync, existsSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Phase constants
// ---------------------------------------------------------------------------

/**
 * Phases that must run for every non-bypass commit.
 * Mirrors NON_SKIPPABLE_PHASES in .githooks/pre-commit.
 */
export const NON_SKIPPABLE_PHASES = Object.freeze(['1.0', '2.5', '7']);

// ---------------------------------------------------------------------------
// parseAuditLog
// ---------------------------------------------------------------------------

/**
 * Parse a NDJSON-format commit-audit.log file.
 *
 * Returns an array of valid record objects. Malformed lines are silently
 * skipped so a single bad write never breaks the entire audit chain.
 *
 * @param {string} filePath  Absolute path to commit-audit.log
 * @returns {Array<{ts: string, phases: string[], skipped: string[], skipReason: string, commitSha: string|null}>}
 */
export function parseAuditLog(filePath) {
  if (!existsSync(filePath)) return [];
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const records = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object' && Array.isArray(obj.phases)) {
        records.push(obj);
      }
    } catch {
      // Malformed line — skip
    }
  }
  return records;
}

// ---------------------------------------------------------------------------
// correlateCommitsToPhases
// ---------------------------------------------------------------------------

/**
 * Correlate a list of commit SHAs to audit-log records.
 *
 * Returns:
 *   matched  — commits that have a matching phases-ran record
 *   gaps     — commits with no audit record (likely --no-verify bypass)
 *   incomplete — commits whose record exists but is missing NON_SKIPPABLE_PHASES
 *
 * @param {string[]} commitShas    Ordered list of recent commit SHAs (newest first)
 * @param {Array}    auditRecords  Output of parseAuditLog()
 * @returns {{ matched: string[], gaps: string[], incomplete: Array<{sha: string, missing: string[]}> }}
 */
export function correlateCommitsToPhases(commitShas, auditRecords) {
  const byCommit = new Map();
  for (const rec of auditRecords) {
    if (rec.commitSha && rec.commitSha !== 'null') {
      byCommit.set(rec.commitSha, rec);
    }
  }

  const matched = [];
  const gaps = [];
  const incomplete = [];

  for (const sha of commitShas) {
    const rec = byCommit.get(sha);
    if (!rec) {
      gaps.push(sha);
      continue;
    }
    const missingPhases = validateNonSkippablePresent(rec, NON_SKIPPABLE_PHASES);
    if (missingPhases.length > 0) {
      incomplete.push({ sha, missing: missingPhases });
    } else {
      matched.push(sha);
    }
  }

  return { matched, gaps, incomplete };
}

// ---------------------------------------------------------------------------
// validateNonSkippablePresent
// ---------------------------------------------------------------------------

/**
 * Check that all required phases appear in the audit record's phases list.
 *
 * Returns an array of the missing phase IDs. Empty array means all present.
 *
 * @param {{ phases: string[] }} record           An audit log record
 * @param {string[]}             requiredPhases   Phases that must be present
 * @returns {string[]}  Missing phase IDs
 */
export function validateNonSkippablePresent(record, requiredPhases) {
  const ran = new Set(record.phases || []);
  return requiredPhases.filter(p => !ran.has(p));
}

// ---------------------------------------------------------------------------
// formatPhaseRecord
// ---------------------------------------------------------------------------

/**
 * Produce a JSON string for one phases-ran record suitable for appending to
 * commit-audit.log. commitSha may be null when writing the temp file; it is
 * filled in by the post-commit hook.
 *
 * @param {{ phases: string[], skipped: string[], skipReason: string, commitSha: string|null }} opts
 * @returns {string}  Single-line JSON
 */
export function formatPhaseRecord({ phases, skipped, skipReason, commitSha }) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    phases: phases || [],
    skipped: skipped || [],
    skipReason: skipReason || '',
    commitSha: commitSha || null,
  });
}
