# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of feature-seams in this repository.
# @sidecar feature-seams.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Feature seams (Branch by Abstraction)

  As a developer releasing features incrementally
  I want to control which features are active via seams
  So that new behavior can be introduced safely behind a flag

  Scenario: Disabled seam runs the old path
    Given a seam "dark-mode" registered as disabled
    When the system branches on "dark-mode"
    Then the old path executes

  Scenario: Active seam runs the new path
    Given a seam "dark-mode" registered as active
    When the system branches on "dark-mode"
    Then the new path executes

  Scenario: Enable a seam at runtime
    Given a seam "dark-mode" registered as disabled
    When the operator enables "dark-mode"
    Then the seam "dark-mode" is active

  Scenario: Disable a seam at runtime
    Given a seam "dark-mode" registered as active
    When the operator disables "dark-mode"
    Then the seam "dark-mode" is not active

  Scenario: Unknown seam defaults to old path
    Given no seam is registered for "experimental-nav"
    When the system branches on "experimental-nav"
    Then the old path executes

  Scenario: List all registered seams
    Given a seam "dark-mode" registered as active
    And a seam "new-sidebar" registered as disabled
    When the operator lists all seams
    Then the list contains "dark-mode" and "new-sidebar"

  Scenario: Shadow mode runs both paths and returns old result
    Given a seam "new-hash" registered as shadow
    When the system shadow-branches on "new-hash"
    Then both paths execute
    And the old path result is returned

  Scenario: Shadow mode detects divergence
    Given a seam "new-hash" registered as shadow
    When the system shadow-branches on "new-hash" with diverging results
    Then the divergence callback fires

  Scenario: Shadow mode handles new-path failure
    Given a seam "new-hash" registered as shadow
    When the system shadow-branches on "new-hash" and the new path throws
    Then the old path result is returned
    And the error callback fires
