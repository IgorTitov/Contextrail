/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of form-validation-test in this repository.
 * @sidecar form-validation.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  required,
  minLength,
  maxLength,
  pattern,
  email,
  matches,
  custom,
  combineRules,
  validateField,
  validateForm,
  isFormValid,
} from '../../modules/form-validation/public-api.mjs';

describe('form-validation domain — required()', () => {
  const rule = required();

  test('fails for null', () => {
    const result = rule(null);
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.required');
  });

  test('fails for undefined', () => {
    const result = rule(undefined);
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.required');
  });

  test('fails for empty string', () => {
    const result = rule('');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.required');
  });

  test('passes for non-empty string', () => {
    const result = rule('hello');
    assert.equal(result.valid, true);
    assert.equal(result.errorKey, undefined);
  });

  test('passes for zero (not null-ish)', () => {
    const result = rule(0);
    assert.equal(result.valid, true);
  });
});

describe('form-validation domain — minLength()', () => {
  const rule = minLength(3);

  test('fails for string shorter than min', () => {
    const result = rule('ab');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.min_length');
    assert.equal(result.params.min, 3);
  });

  test('passes for string equal to min', () => {
    const result = rule('abc');
    assert.equal(result.valid, true);
  });

  test('passes for string longer than min', () => {
    const result = rule('abcd');
    assert.equal(result.valid, true);
  });
});

describe('form-validation domain — maxLength()', () => {
  const rule = maxLength(5);

  test('fails for string longer than max', () => {
    const result = rule('abcdef');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.max_length');
    assert.equal(result.params.max, 5);
  });

  test('passes for string equal to max', () => {
    const result = rule('abcde');
    assert.equal(result.valid, true);
  });

  test('passes for string shorter than max', () => {
    const result = rule('ab');
    assert.equal(result.valid, true);
  });
});

describe('form-validation domain — pattern()', () => {
  const rule = pattern(/^\d+$/);

  test('passes for matching value', () => {
    const result = rule('12345');
    assert.equal(result.valid, true);
  });

  test('fails for non-matching value', () => {
    const result = rule('abc');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.pattern');
  });

  test('uses custom errorKey when provided', () => {
    const customRule = pattern(/^\d+$/, 'form-validation.digits_only');
    const result = customRule('abc');
    assert.equal(result.errorKey, 'form-validation.digits_only');
  });
});

describe('form-validation domain — email()', () => {
  const rule = email();

  test('passes for valid email', () => {
    assert.equal(rule('user@example.com').valid, true);
  });

  test('passes for email with subdomain', () => {
    assert.equal(rule('user@mail.example.com').valid, true);
  });

  test('fails for missing @', () => {
    const result = rule('userexample.com');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.email');
  });

  test('fails for missing domain', () => {
    const result = rule('user@');
    assert.equal(result.valid, false);
  });

  test('fails for empty string', () => {
    const result = rule('');
    assert.equal(result.valid, false);
  });
});

describe('form-validation domain — matches()', () => {
  const rule = matches('password');

  test('passes when values match', () => {
    const result = rule('secret', { password: 'secret' });
    assert.equal(result.valid, true);
  });

  test('fails when values differ', () => {
    const result = rule('secret', { password: 'different' });
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.matches');
    assert.equal(result.params.field, 'password');
  });

  test('fails when target field is missing', () => {
    const result = rule('secret', {});
    assert.equal(result.valid, false);
  });
});

describe('form-validation domain — custom()', () => {
  test('passes when predicate returns true', () => {
    const rule = custom((v) => v > 0, 'form-validation.positive');
    assert.equal(rule(5).valid, true);
  });

  test('fails when predicate returns false', () => {
    const rule = custom((v) => v > 0, 'form-validation.positive');
    const result = rule(-1);
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.positive');
  });

  test('receives allValues as second argument', () => {
    const rule = custom((v, all) => v !== all?.forbidden, 'form-validation.not_forbidden');
    assert.equal(rule('ok', { forbidden: 'bad' }).valid, true);
    assert.equal(rule('bad', { forbidden: 'bad' }).valid, false);
  });
});

describe('form-validation domain — combineRules()', () => {
  test('short-circuits on first failure', () => {
    const combined = combineRules(required(), minLength(3));
    const result = combined('');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.required');
  });

  test('returns second rule failure when first passes', () => {
    const combined = combineRules(required(), minLength(5));
    const result = combined('ab');
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.min_length');
  });

  test('returns valid when all rules pass', () => {
    const combined = combineRules(required(), minLength(2), maxLength(10));
    const result = combined('hello');
    assert.equal(result.valid, true);
  });

  test('returns valid for empty rule set', () => {
    const combined = combineRules();
    assert.equal(combined('anything').valid, true);
  });
});

describe('form-validation domain — validateField()', () => {
  test('is a convenience wrapper over combineRules', () => {
    const result = validateField('ab', [required(), minLength(3)]);
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.min_length');
  });

  test('passes allValues through', () => {
    const result = validateField('secret', [matches('password')], { password: 'secret' });
    assert.equal(result.valid, true);
  });
});

describe('form-validation domain — validateForm()', () => {
  test('validates all fields, returns errors only for failed', () => {
    const fieldRules = {
      username: [required(), minLength(3)],
      email: [required(), email()],
    };
    const result = validateForm({ username: 'jo', email: 'user@example.com' }, fieldRules);
    assert.equal(result.valid, false);
    assert.ok('username' in result.errors);
    assert.ok(!('email' in result.errors));
    assert.equal(result.errors.username.errorKey, 'form-validation.min_length');
  });

  test('valid is true when all fields pass', () => {
    const fieldRules = {
      name: [required()],
      age: [required()],
    };
    const result = validateForm({ name: 'Alice', age: 30 }, fieldRules);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, {});
  });

  test('does not short-circuit across fields', () => {
    const fieldRules = {
      a: [required()],
      b: [required()],
      c: [required()],
    };
    const result = validateForm({ a: '', b: '', c: '' }, fieldRules);
    assert.equal(result.valid, false);
    assert.equal(Object.keys(result.errors).length, 3);
  });

  test('passes formValues as allValues to rules', () => {
    const fieldRules = {
      confirm: [matches('password')],
    };
    const result = validateForm({ password: 'abc', confirm: 'xyz' }, fieldRules);
    assert.equal(result.valid, false);
    assert.equal(result.errors.confirm.errorKey, 'form-validation.matches');
  });
});

describe('form-validation domain — isFormValid()', () => {
  test('returns true for a valid result', () => {
    assert.equal(isFormValid({ valid: true, errors: {} }), true);
  });

  test('returns false for an invalid result', () => {
    assert.equal(
      isFormValid({
        valid: false,
        errors: { x: { valid: false, errorKey: 'form-validation.required' } },
      }),
      false,
    );
  });
});
