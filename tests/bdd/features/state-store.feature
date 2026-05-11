# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of state-store in this repository.
# @sidecar state-store.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Observable state store

  As a developer using the state module
  I want to store, update, and observe application state
  So that UI components can react to state changes

  Scenario: Store returns its initial state
    Given a store initialised with value "hello"
    Then the store state is "hello"

  Scenario: Store updates state with a direct value
    Given a store initialised with value "before"
    When the state is set to "after"
    Then the store state is "after"

  Scenario: Store updates state with an updater function
    Given a store initialised with value 0
    When the state is updated with an increment function
    Then the store state is 1

  Scenario: Subscribers are notified on state change
    Given a store initialised with value "initial"
    And a subscriber is listening
    When the state is set to "changed"
    Then the subscriber was notified with "changed"

  Scenario: Unsubscribed listeners stop receiving updates
    Given a store initialised with value "initial"
    And a subscriber is listening
    When the subscriber unsubscribes
    And the state is set to "silent"
    Then the subscriber was not notified

  Scenario: Subscriber count reflects active listeners
    Given a store initialised with value "test"
    When 3 subscribers are added
    Then the subscriber count is 3
    When 1 subscriber unsubscribes
    Then the subscriber count is 2
