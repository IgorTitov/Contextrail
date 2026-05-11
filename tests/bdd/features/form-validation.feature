# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of form-validation in this repository.
# @sidecar form-validation.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Form validation

  As a user filling out a form
  I want to see clear validation errors before submission
  So that I can correct my input without guessing

  Scenario: Required field rejects empty input
    Given a field with the "required" rule
    When the user leaves the field empty
    Then the field shows error "form-validation.required"

  Scenario: Required field accepts non-empty input
    Given a field with the "required" rule
    When the user enters "hello"
    Then the field is valid

  Scenario: Email field rejects invalid format
    Given a field with the "email" rule
    When the user enters "not-an-email"
    Then the field shows error "form-validation.email"

  Scenario: Email field accepts valid format
    Given a field with the "email" rule
    When the user enters "alice@example.com"
    Then the field is valid

  Scenario: Minimum length rejects short input
    Given a field with a minimum length of 3
    When the user enters "ab"
    Then the field shows error "form-validation.min_length"

  Scenario: Password confirmation must match
    Given a form with fields "password" and "confirmPassword"
    And the "confirmPassword" field has a "matches" rule for "password"
    When the user enters "secret" for "password" and "wrong" for "confirmPassword"
    Then the "confirmPassword" field shows error "form-validation.matches"

  Scenario: Full form validation reports all errors
    Given a form with a required "name" field and an email "contact" field
    When the user submits with name "" and contact "bad"
    Then the form is invalid
    And the form reports errors for "name" and "contact"
