/* @HEADER
 * @version 0.7.109 | 2026-05-06
 * @purpose Read and validate the per-repo .coa/slice-id-config.json; provide config-based prefix detection and default config scaffolding for bootstrap.
 * @sidecar slice-id-config.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Thrown when .coa/slice-id-config.json does not exist.
 * Callers (runCreate, detectDefaultPrefix) surface this with a recovery hint.
 */
export class ConfigMissingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigMissingError';
    this.code = 'CONFIG_MISSING';
  }
}

/**
 * Thrown when .coa/slice-id-config.json exists but fails schema validation.
 */
export class ConfigSchemaError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ConfigSchemaError';
    this.code = 'CONFIG_SCHEMA_ERROR';
    this.field = field || null;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// Multi-segment prefix: allows TPL, AIC-DEV, RELEASE-Q1-FEAT.
// Rejects: lowercase, leading digit, double hyphen, trailing hyphen.
// Each segment must start with [A-Z] and consist of [A-Z0-9]+.
// Single-segment (no hyphens) remains the industry default.
export const PREFIX_RE = /^[A-Z][A-Z0-9]+(?:-[A-Z][A-Z0-9]+)*$/;

/**
 * Validate a parsed slice-id-config object.
 * Throws ConfigSchemaError on the first violated constraint.
 *
 * @param {unknown} config
 */
export function validateSliceIdConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new ConfigSchemaError('slice-id-config.json must be a JSON object', null);
  }
  if (typeof config.prefix !== 'string' || !PREFIX_RE.test(config.prefix)) {
    throw new ConfigSchemaError(
      `"prefix" must be an uppercase string matching [A-Z][A-Z0-9]+(-[A-Z][A-Z0-9]+)* (got: ${JSON.stringify(config.prefix)})`,
      'prefix',
    );
  }
  if (config.format !== undefined) {
    if (typeof config.format !== 'string' || !config.format.includes('{NNN}')) {
      throw new ConfigSchemaError(
        '"format" must be a string containing the {NNN} placeholder (e.g. "MYPROJ-{NNN}")',
        'format',
      );
    }
  }
  if (config.numbering_start !== undefined) {
    if (!Number.isInteger(config.numbering_start) || config.numbering_start < 0) {
      throw new ConfigSchemaError(
        '"numbering_start" must be a non-negative integer',
        'numbering_start',
      );
    }
  }
  if (config.padding !== undefined) {
    if (!Number.isInteger(config.padding) || config.padding < 1 || config.padding > 6) {
      throw new ConfigSchemaError(
        '"padding" must be an integer between 1 and 6',
        'padding',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

/**
 * Read, parse, and validate .coa/slice-id-config.json from the given repo root.
 *
 * Throws ConfigMissingError when the file is absent.
 * Throws ConfigSchemaError when the file is present but invalid.
 *
 * @param {string} repoRoot  - absolute path to the repository root
 * @returns {{ prefix: string, format?: string, numbering_start?: number, padding?: number }}
 */
export function readSliceIdConfig(repoRoot) {
  const configPath = join(repoRoot, '.coa', 'slice-id-config.json');
  if (!existsSync(configPath)) {
    throw new ConfigMissingError(
      `Slice ID config not found: ${configPath}\n` +
      '\n' +
      "This repository requires .coa/slice-id-config.json declaring its slice ID convention.\n" +
      'Run:\n' +
      '\n' +
      '  node scripts/bootstrap.mjs --init-slice-config\n' +
      '\n' +
      'Or create the file manually — see docs/guides/slice-id-config.md for the full schema.',
    );
  }
  let raw;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (err) {
    throw new ConfigMissingError(`Failed to read ${configPath}: ${err.message}`);
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new ConfigSchemaError(`Failed to parse ${configPath}: ${err.message}`, null);
  }
  validateSliceIdConfig(config);
  return config;
}

// ---------------------------------------------------------------------------
// Bootstrap helper (used by bootstrap.mjs --init-slice-config)
// ---------------------------------------------------------------------------

/**
 * Write a default .coa/slice-id-config.json if one does not already exist.
 *
 * Idempotent: if the file already exists, returns { created: false }.
 *
 * @param {string} repoRoot
 * @param {{ prefix?: string }} [opts]
 * @returns {{ created: boolean, path: string, prefix?: string }}
 */
export function writeDefaultSliceIdConfig(repoRoot, opts = {}) {
  const configPath = join(repoRoot, '.coa', 'slice-id-config.json');
  if (existsSync(configPath)) {
    return { created: false, path: configPath };
  }
  // Normalize: uppercase and strip characters not valid in a prefix segment.
  // Allow hyphens so multi-segment prefixes (e.g. AIC-DEV) survive round-trip;
  // strip anything else that would break the regex.
  const prefix = (opts.prefix || 'MYPROJ').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const safePrefix = PREFIX_RE.test(prefix) ? prefix : 'MYPROJ';
  const config = {
    prefix: safePrefix,
    format: `${safePrefix}-{NNN}`,
    numbering_start: 1,
    padding: 3,
    description: `Slice ID convention for this repository. Edit prefix to match your project. See docs/guides/slice-id-config.md for full schema.`,
  };
  mkdirSync(join(repoRoot, '.coa'), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  return { created: true, path: configPath, prefix: safePrefix };
}
