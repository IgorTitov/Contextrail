<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the form-validation hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx form-validation
@public false
@edit careful -->

# form-validation

Pure domain module for field-level and form-level validation rules.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/rules.mjs` | Pure rule factories: `required`, `minLength`, `maxLength`, `pattern`, `email`, `matches`, `custom`, plus composition utilities `combineRules` and `validateField` |
| Domain | `domain/validate-form.mjs` | Form-level orchestration: `validateForm` and `isFormValid` |
| Messages | `messages.mjs` | i18n message layer for all built-in validation error keys |
| Public API | `public-api.mjs` | Single cross-module entry point |

This is a domain-only module. No ports or adapters are needed because all logic is pure and framework-free.

## Usage

```js
import {
  required,
  minLength,
  email,
  matches,
  validateForm,
  isFormValid,
} from '../../modules/form-validation/public-api.mjs';

const fieldRules = {
  username: [required(), minLength(3)],
  email: [required(), email()],
  password: [required(), minLength(8)],
  confirmPassword: [required(), matches('password')],
};

const result = validateForm(
  { username: 'jo', email: 'bad', password: '12345678', confirmPassword: '12345679' },
  fieldRules,
);

console.log(isFormValid(result)); // false
console.log(result.errors);
// { username: { valid: false, errorKey: 'form-validation.min_length', params: { min: 3 } },
//   email: { valid: false, errorKey: 'form-validation.email' },
//   confirmPassword: { valid: false, errorKey: 'form-validation.matches', params: { field: 'password' } } }
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/` are forbidden.
- Domain must stay framework-free.
- All error keys use the i18n message pattern from `messages.mjs`.
