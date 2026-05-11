# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of task in this repository.
# @sidecar task.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Background task processing

  As a developer using the task module
  I want to enqueue CPU-heavy work and track its progress
  So that the main thread stays responsive during long-running operations

  Scenario: Enqueue and complete a task
    Given the task adapter is active
    When the user enqueues a task that returns "done"
    Then the task completes with result "done"

  Scenario: Cancel a running task
    Given the task adapter is active
    When the user enqueues a long-running task
    And the user cancels the task
    Then the task status is "cancelled"

  Scenario: Track task progress
    Given the task adapter is active
    When the user enqueues a task that reports progress
    Then the progress callback receives updates between 0 and 1

  Scenario: Drain waits for all tasks
    Given the task adapter is active
    When the user enqueues 3 tasks
    And the user calls drain
    Then all 3 tasks have completed

  Scenario: Task failure reports error
    Given the task adapter is active
    When the user enqueues a task that throws "oops"
    Then the task result status is "failed"
    And the task result contains error "oops"
