/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Typed error hierarchy for deterministic repo scripts so failures carry machine-readable context instead of relying on string matching.
 * @sidecar errors.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * Base error for all deterministic repo scripts.
 *
 * Carries structured context that the result() function and --json
 * output can serialize without string-matching.
 */
export class ScriptError extends Error {
  /**
   * @param {string} message  Human-readable description.
   * @param {object} [options]
   * @param {string} [options.code]     Machine-readable error code.
   * @param {string} [options.file]     File path that caused the error.
   * @param {object} [options.details]  Additional structured context.
   * @param {Error}  [options.cause]    Original error when wrapping.
   */
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code || 'SCRIPT_ERROR';
    this.file = options.file || undefined;
    this.details = options.details || undefined;
  }

  /** Structured representation for JSON output. */
  toJSON() {
    const obj = { name: this.name, code: this.code, message: this.message };
    if (this.file) obj.file = this.file;
    if (this.details) obj.details = this.details;
    return obj;
  }
}

/**
 * A check or validation rule was violated.
 *
 * Use for: boundary violations, missing README, policy drift, etc.
 */
export class ValidationError extends ScriptError {
  constructor(message, options = {}) {
    super(message, { code: 'VALIDATION_ERROR', ...options });
  }
}

/**
 * A required file or sidecar was not found.
 *
 * Use for: missing public-api.ts, missing README.md, missing sidecar.
 */
export class FileNotFoundError extends ScriptError {
  constructor(message, options = {}) {
    super(message, { code: 'FILE_NOT_FOUND', ...options });
  }
}

/**
 * A file could not be parsed as expected.
 *
 * Use for: malformed headers, broken JSON configs, unparseable content.
 */
export class ParseError extends ScriptError {
  constructor(message, options = {}) {
    super(message, { code: 'PARSE_ERROR', ...options });
  }
}

/**
 * A configuration or schema contract was violated.
 *
 * Use for: missing required fields, invalid enum values, schema mismatches.
 */
export class SchemaError extends ScriptError {
  constructor(message, options = {}) {
    super(message, { code: 'SCHEMA_ERROR', ...options });
  }
}
