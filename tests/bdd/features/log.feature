# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of log in this repository.
# @sidecar log.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Structured logging

  As a developer using the log module
  I want to log messages at different severity levels
  So that that application behavior is observable and debuggable

  Scenario: Log at each severity level
    Given a console log adapter is active
    When the developer logs at debug, info, warn, and error levels
    Then all messages are recorded

  Scenario: Minimum level filters lower-priority messages
    Given a console log adapter with minimum level "warn"
    When the developer logs at "info" level
    Then the message is suppressed

  Scenario: No-op adapter discards all output
    Given a no-op log adapter is active
    When the developer logs a message
    Then nothing is recorded and no error occurs

  Scenario: Child logger inherits parent scope
    Given a console log adapter with scope "app"
    When the developer creates a child logger with scope "db"
    Then the child scope is "app:db"

  Scenario: Structured JSON adapter formats as JSON
    Given a structured JSON log adapter is active
    When the developer logs an info message
    Then the output is valid JSON with level and message fields
