/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Single entry point for the form-validation bounded module — the only file other modules may import.
 * @sidecar public-api.mjs.header.md
 * @layer module | @hex application | @ctx form-validation
 * @public true
 * @edit careful
 */

/**
 * Single entry point for the form-validation bounded module.
 * The only file other modules may import.
 *
 * SpecRefs: TPL-146, TPL-147
 */

// Domain — field-level rules
export {
  required,
  minLength,
  maxLength,
  pattern,
  email,
  matches,
  custom,
  combineRules,
  validateField,
} from './domain/rules.mjs';

// Domain — form-level validation
export { validateForm, isFormValid } from './domain/validate-form.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
