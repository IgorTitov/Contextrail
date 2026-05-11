# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose BDD feature demonstrating user-visible greeting behavior through the hexagonal module.
# @sidecar example-greeter.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit rewrite-ok

Feature: Greeting a user by name

  As a user of the greeter module
  I want to receive a personalised greeting
  So that the application feels welcoming

  Scenario: Greet with the default adapter
    Given the default greeting adapter is active
    When I greet "Alice"
    Then the result should be "Hello, Alice!"

  Scenario: Empty name produces no greeting
    Given the default greeting adapter is active
    When I greet ""
    Then the result should be ""

  Scenario: Greet with a custom adapter
    Given a custom adapter that returns "Howdy, {name}!"
    When I greet "Bob"
    Then the result should be "Howdy, Bob!"
