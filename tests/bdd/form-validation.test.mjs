/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of form-validation-test in this repository.
 * @sidecar form-validation.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for form-validation.feature.
 * Proves user-visible form validation behavior through the form-validation module public API.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  required,
  email,
  minLength,
  matches,
  validateField,
  validateForm,
  isFormValid,
} from '../../modules/form-validation/public-api.mjs';

const feature = readFileSync(
  new URL('./features/form-validation.feature', import.meta.url),
  'utf8',
);

describe('Feature: Form validation', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Form validation'));
    assert.ok(feature.includes('Scenario: Required field rejects empty input'));
    assert.ok(feature.includes('Scenario: Required field accepts non-empty input'));
    assert.ok(feature.includes('Scenario: Email field rejects invalid format'));
    assert.ok(feature.includes('Scenario: Email field accepts valid format'));
    assert.ok(feature.includes('Scenario: Minimum length rejects short input'));
    assert.ok(feature.includes('Scenario: Password confirmation must match'));
    assert.ok(feature.includes('Scenario: Full form validation reports all errors'));
  });

  test('Scenario: Required field rejects empty input', () => {
    // Given a field with the "required" rule
    // When the user leaves the field empty
    const result = validateField('', [required()]);

    // Then the field shows error "validation.required"
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.required');
  });

  test('Scenario: Required field accepts non-empty input', () => {
    // Given a field with the "required" rule
    // When the user enters "hello"
    const result = validateField('hello', [required()]);

    // Then the field is valid
    assert.equal(result.valid, true);
  });

  test('Scenario: Email field rejects invalid format', () => {
    // Given a field with the "email" rule
    // When the user enters "not-an-email"
    const result = validateField('not-an-email', [email()]);

    // Then the field shows error "validation.email"
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.email');
  });

  test('Scenario: Email field accepts valid format', () => {
    // Given a field with the "email" rule
    // When the user enters "alice@example.com"
    const result = validateField('alice@example.com', [email()]);

    // Then the field is valid
    assert.equal(result.valid, true);
  });

  test('Scenario: Minimum length rejects short input', () => {
    // Given a field with a minimum length of 3
    // When the user enters "ab"
    const result = validateField('ab', [minLength(3)]);

    // Then the field shows error "validation.min_length"
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.min_length');
  });

  test('Scenario: Password confirmation must match', () => {
    // Given a form with fields "password" and "confirmPassword"
    // And the "confirmPassword" field has a "matches" rule for "password"
    const allValues = { password: 'secret', confirmPassword: 'wrong' };

    // When the user enters "secret" for "password" and "wrong" for "confirmPassword"
    const result = validateField('wrong', [matches('password')], allValues);

    // Then the "confirmPassword" field shows error "validation.matches"
    assert.equal(result.valid, false);
    assert.equal(result.errorKey, 'form-validation.matches');
  });

  test('Scenario: Full form validation reports all errors', () => {
    // Given a form with a required "name" field and an email "contact" field
    const rules = {
      name: [required()],
      contact: [email()],
    };

    // When the user submits with name "" and contact "bad"
    const result = validateForm({ name: '', contact: 'bad' }, rules);

    // Then the form is invalid
    assert.equal(isFormValid(result), false);

    // And the form reports errors for "name" and "contact"
    assert.ok(result.errors.name);
    assert.ok(result.errors.contact);
  });
});
