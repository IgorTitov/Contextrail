# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of notifications in this repository.
# @sidecar notifications.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Toast notifications

  As a user of the application
  I want to see toast notifications for important events
  So that I am informed about successes, errors, and general information

  Scenario: Show an info notification
    Given the notification adapter is active
    When the system shows an info notification with message "File saved"
    Then the user sees one active notification
    And the notification message is "File saved"
    And the notification level is "info"

  Scenario: Show a success notification
    Given the notification adapter is active
    When the system shows a success notification with message "Upload complete"
    Then the user sees one active notification
    And the notification level is "success"

  Scenario: Show an error notification
    Given the notification adapter is active
    When the system shows an error notification with message "Connection lost"
    Then the notification does not auto-dismiss

  Scenario: Dismiss a notification
    Given the notification adapter is active
    And the user sees a notification with message "Temporary"
    When the user dismisses the notification
    Then the user sees no active notifications

  Scenario: Multiple notifications stack
    Given the notification adapter is active
    When the system shows an info notification with message "First"
    And the system shows an error notification with message "Second"
    Then the user sees 2 active notifications
