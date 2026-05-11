# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of onboarding in this repository.
# @sidecar onboarding.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Guided onboarding tour

  As a new user of the application
  I want to be guided through key features with a step-by-step tour
  So that I can learn the interface quickly

  Scenario: Start a tour and see the first step
    Given a tour with steps "Welcome", "Settings", "Dashboard"
    When the tour starts
    Then the user sees step "Welcome"
    And the tour is active

  Scenario: Advance to the next step
    Given a tour with steps "Welcome", "Settings", "Dashboard"
    And the tour is started
    When the user advances to the next step
    Then the user sees step "Settings"

  Scenario: Go back to the previous step
    Given a tour with steps "Welcome", "Settings", "Dashboard"
    And the tour is on step "Settings"
    When the user goes back to the previous step
    Then the user sees step "Welcome"

  Scenario: Cannot go back from the first step
    Given a tour with steps "Welcome", "Settings", "Dashboard"
    And the tour is started
    Then the user cannot go back

  Scenario: Tour ends after the last step
    Given a tour with steps "Welcome", "Settings", "Dashboard"
    And the tour is on step "Dashboard"
    When the user advances to the next step
    Then the tour is not active

  Scenario: End the tour early
    Given a tour with steps "Welcome", "Settings", "Dashboard"
    And the tour is started
    When the user ends the tour
    Then the tour is not active
