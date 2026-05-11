/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Rules domain logic for the form-validation module.
 * @sidecar rules.mjs.header.md
 * @layer module | @hex domain | @ctx form-validation
 * @public false
 * @edit careful
 */

/**
 * Pure domain logic for form field validation rules.
 * Framework-free, no external dependencies, no side effects.
 *
 * SpecRefs: TPL-146
 */

/**
 * @typedef {{ valid: boolean, errorKey?: string, params?: Record<string, any> }} ValidationResult
 * @typedef {(value: any, allValues?: Record<string, any>) => ValidationResult} ValidationRule
 */

const VALID = Object.freeze({ valid: true });

/**
 * Fails if value is null, undefined, or empty string.
 * @returns {ValidationRule}
 */
export function required() {
  return (value) => {
    if (value == null || value === '') {
      return { valid: false, errorKey: 'form-validation.required' };
    }
    return VALID;
  };
}

/**
 * Fails if string length is less than min.
 * @param {number} min
 * @returns {ValidationRule}
 */
export function minLength(min) {
  return (value) => {
    if (typeof value !== 'string' || value.length < min) {
      return { valid: false, errorKey: 'form-validation.min_length', params: { min } };
    }
    return VALID;
  };
}

/**
 * Fails if string length exceeds max.
 * @param {number} max
 * @returns {ValidationRule}
 */
export function maxLength(max) {
  return (value) => {
    if (typeof value === 'string' && value.length > max) {
      return { valid: false, errorKey: 'form-validation.max_length', params: { max } };
    }
    return VALID;
  };
}

/**
 * Fails if value does not match the given regex.
 * @param {RegExp} regex
 * @param {string} [errorKey='form-validation.pattern']
 * @returns {ValidationRule}
 */
export function pattern(regex, errorKey = 'form-validation.pattern') {
  return (value) => {
    if (typeof value !== 'string' || !regex.test(value)) {
      return { valid: false, errorKey };
    }
    return VALID;
  };
}

/**
 * Validates email with a reasonable regex.
 * @returns {ValidationRule}
 */
export function email() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (value) => {
    if (typeof value !== 'string' || !emailRegex.test(value)) {
      return { valid: false, errorKey: 'form-validation.email' };
    }
    return VALID;
  };
}

/**
 * Compares value to allValues[fieldName].
 * @param {string} fieldName
 * @returns {ValidationRule}
 */
export function matches(fieldName) {
  return (value, allValues = {}) => {
    if (value !== allValues[fieldName]) {
      return { valid: false, errorKey: 'form-validation.matches', params: { field: fieldName } };
    }
    return VALID;
  };
}

/**
 * Wraps an arbitrary predicate into a ValidationRule.
 * @param {(value: any, allValues?: Record<string, any>) => boolean} fn
 * @param {string} errorKey
 * @returns {ValidationRule}
 */
export function custom(fn, errorKey) {
  return (value, allValues) => {
    if (!fn(value, allValues)) {
      return { valid: false, errorKey };
    }
    return VALID;
  };
}

/**
 * Combines multiple rules into one. Short-circuits on first failure.
 * @param {...ValidationRule} rules
 * @returns {ValidationRule}
 */
export function combineRules(...rules) {
  return (value, allValues) => {
    for (const rule of rules) {
      const result = rule(value, allValues);
      if (!result.valid) return result;
    }
    return VALID;
  };
}

/**
 * Convenience: runs combineRules(...rules)(value, allValues).
 * @param {any} value
 * @param {ValidationRule[]} rules
 * @param {Record<string, any>} [allValues]
 * @returns {ValidationResult}
 */
export function validateField(value, rules, allValues) {
  return combineRules(...rules)(value, allValues);
}
