# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of scheduler in this repository.
# @sidecar scheduler.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Task scheduling

  As a developer using the scheduler module
  I want to schedule recurring tasks with intervals and limits
  So that that background work runs reliably without manual timers

  Scenario: Schedule a recurring task
    Given the interval scheduler is active
    When the developer schedules a task every 50ms
    Then the task executes multiple times

  Scenario: Cancel a scheduled task
    Given a task is scheduled
    When the developer cancels the schedule
    Then the task stops executing

  Scenario: Max runs auto-completes a schedule
    Given a task is scheduled with maxRuns 3
    When the task has run 3 times
    Then the schedule is automatically completed

  Scenario: List all active schedules
    Given two tasks are scheduled
    When the developer lists schedules
    Then both schedules are returned

  Scenario: Destroy cancels all schedules
    Given multiple tasks are scheduled
    When the developer calls destroy
    Then all schedules are cancelled
