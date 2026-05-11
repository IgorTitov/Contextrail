# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of event-bus in this repository.
# @sidecar event-bus.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Event bus publish/subscribe

  As a developer using the event-bus module
  I want to publish and subscribe to events
  So that that modules communicate without direct coupling

  Scenario: Subscribe and receive an event
    Given the event bus is active
    And a handler is subscribed to "user:login"
    When "user:login" is emitted with data
    Then the handler receives the data

  Scenario: Multiple handlers receive the same event
    Given the event bus is active
    And two handlers are subscribed to "order:placed"
    When "order:placed" is emitted
    Then both handlers are called

  Scenario: Unsubscribe stops delivery
    Given the event bus is active
    And a handler is subscribed to "tick"
    When the handler is unsubscribed from "tick"
    And "tick" is emitted
    Then the handler is not called

  Scenario: Clear removes all listeners
    Given the event bus has multiple subscriptions
    When clear is called
    Then no handlers remain

  Scenario: Emitting an unknown event is silent
    Given the event bus is active
    When "unknown:event" is emitted
    Then no error is thrown
