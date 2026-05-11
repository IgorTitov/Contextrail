# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of analytics in this repository.
# @sidecar analytics.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Privacy-first analytics

  As a product owner
  I want to track user events only when consent is granted
  So that user privacy is respected and analytics data is trustworthy

  Scenario: Track an event with consent
    Given the analytics adapter is active
    And analytics consent is granted
    When the user triggers event "button_click" with property "label" = "Save"
    Then the event "button_click" is recorded

  Scenario: Identify a user
    Given the analytics adapter is active
    And analytics consent is granted
    When the system identifies user "user-42" with trait "plan" = "pro"
    Then the user identity is set to "user-42"

  Scenario: Track a page view
    Given the analytics adapter is active
    And analytics consent is granted
    When the user views page "Dashboard"
    Then a page event for "Dashboard" is recorded

  Scenario: Reset clears identity and properties
    Given the analytics adapter is active
    And the system has identified user "user-42"
    When the system calls reset
    Then the user identity is cleared

  Scenario: Respect Do Not Track
    Given the browser has Do Not Track enabled
    Then the analytics module reports Do Not Track is active
