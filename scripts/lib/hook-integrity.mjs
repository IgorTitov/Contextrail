/* @HEADER
 * @version 0.7.87 | 2026-05-05
 * @purpose Pure library for computing and comparing sha256 fingerprints of .githooks/* files.
 * @sidecar hook-integrity.mjs.header.md
 * @layer lib | @hex domain | @ctx hook-integrity
 * @public true
 * @edit careful
 */

/**
 * Hook integrity library (R8.2 / TPL-256).
 *
 * Pure functions for computing sha256 fingerprints of .githooks/* files,
 * loading a stored fingerprint registry, and comparing the two to detect
 * tampered hooks. No I/O side-effects in the compare/format helpers —
 * callers (hook-integrity-check.mjs) own the filesystem reads/writes.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// computeFingerprint
// ---------------------------------------------------------------------------

/**
 * Compute the sha256 fingerprint of a file on disk.
 *
 * @param {string} filePath — absolute or relative path to the file
 * @returns {{ sha256: string, size: number }}
 */
export function computeFingerprint(filePath) {
  const buf = readFileSync(filePath);
  const sha256 = createHash('sha256').update(buf).digest('hex');
  return { sha256, size: buf.length };
}

// ---------------------------------------------------------------------------
// loadFingerprints
// ---------------------------------------------------------------------------

/**
 * Load the fingerprint registry from a JSON file.
 *
 * Returns the parsed registry object. Throws if the file is missing or
 * malformed — callers should handle ENOENT to distinguish "registry not
 * yet created" from other errors.
 *
 * @param {string} registryPath — path to the .fingerprints.json file
 * @returns {{ version: string, hooks: Record<string, { sha256: string, size: number, lastUpdated: string, lastUpdateSlice: string }> }}
 */
export function loadFingerprints(registryPath) {
  const raw = readFileSync(registryPath, 'utf8');
  // Strip any inline header block that header-fix may have prepended to the
  // JSON file. The block consists of comment lines (# or /*) followed by a
  // blank line before the opening '{'. We find the first '{' to locate the
  // actual JSON start. This is a defensive measure; comment-unsafe formats
  // like JSON should never receive inline headers (ADR-0009), but the fix
  // in scripts/lib/header.mjs commentStyle() should prevent recurrence.
  const jsonStart = raw.indexOf('{');
  if (jsonStart === -1) {
    throw new SyntaxError(`No JSON object found in fingerprint registry: ${registryPath}`);
  }
  return JSON.parse(jsonStart === 0 ? raw : raw.slice(jsonStart));
}

// ---------------------------------------------------------------------------
// compareFingerprints
// ---------------------------------------------------------------------------

/**
 * Compare computed hook fingerprints against a stored registry.
 *
 * @param {Array<{ path: string, sha256: string, size: number }>} hookFiles
 *   — array of freshly-computed entries; `path` is the canonical key
 *     (e.g. ".githooks/pre-commit") that appears in the registry.
 * @param {Record<string, { sha256: string, size: number }>} registry
 *   — the `hooks` property from the loaded registry JSON.
 * @returns {{ mismatches: string[], missing: string[], extras: string[] }}
 *   mismatches — files present in both but with different sha256/size
 *   missing    — files in registry but not in actual scanned set
 *   extras     — files in actual scanned set but not in registry
 */
export function compareFingerprints(hookFiles, registry) {
  const mismatches = [];
  const extras = [];

  const registryKeys = new Set(Object.keys(registry));

  for (const { path, sha256, size } of hookFiles) {
    if (!registryKeys.has(path)) {
      extras.push(path);
      continue;
    }
    const stored = registry[path];
    if (stored.sha256 !== sha256 || stored.size !== size) {
      mismatches.push(path);
    }
    registryKeys.delete(path);
  }

  // Anything left in registryKeys was in registry but absent from actual scan
  const missing = [...registryKeys];

  return { mismatches, missing, extras };
}

// ---------------------------------------------------------------------------
// formatRegistry
// ---------------------------------------------------------------------------

/**
 * Build the full JSON registry string from a list of hook entries.
 *
 * @param {Array<{ path: string, sha256: string, size: number }>} hookEntries
 * @param {string} sliceId — e.g. "TPL-256"
 * @returns {string} — formatted JSON ready to write to .fingerprints.json
 */
export function formatRegistry(hookEntries, sliceId) {
  const now = new Date().toISOString();
  const hooks = {};
  for (const { path, sha256, size } of hookEntries) {
    hooks[path] = {
      sha256,
      size,
      lastUpdated: now,
      lastUpdateSlice: String(sliceId),
    };
  }
  return JSON.stringify({ version: '1.0', hooks }, null, 2) + '\n';
}
