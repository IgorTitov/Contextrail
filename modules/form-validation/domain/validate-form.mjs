/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate Form domain logic for the form-validation module.
 * @sidecar validate-form.mjs.header.md
 * @layer module | @hex domain | @ctx form-validation
 * @public false
 * @edit careful
 */

/**
 * Form-level validation: validates all fields against their rules.
 * Framework-free, no external dependencies, no side effects.
 *
 * SpecRefs: TPL-147
 */

import { combineRules } from './rules.mjs';

/**
 * @typedef {import('./rules.mjs').ValidationRule} ValidationRule
 * @typedef {import('./rules.mjs').ValidationResult} ValidationResult
 * @typedef {{ valid: boolean, errors: Record<string, ValidationResult> }} FormValidationResult
 */

/**
 * Validates all fields. Does NOT short-circuit across fields.
 * Returns errors only for failed fields.
 *
 * @param {Record<string, any>} formValues
 * @param {Record<string, ValidationRule[]>} fieldRules
 * @returns {FormValidationResult}
 */
export function validateForm(formValues, fieldRules) {
  /** @type {Record<string, ValidationResult>} */
  const errors = {};
  let valid = true;

  for (const [field, rules] of Object.entries(fieldRules)) {
    const result = combineRules(...rules)(formValues[field], formValues);
    if (!result.valid) {
      valid = false;
      errors[field] = result;
    }
  }

  return { valid, errors };
}

/**
 * Convenience: returns result.valid.
 * @param {FormValidationResult} result
 * @returns {boolean}
 */
export function isFormValid(result) {
  return result.valid;
}
