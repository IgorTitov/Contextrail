# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of realtime in this repository.
# @sidecar realtime.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Realtime transport abstraction

  As a developer using the realtime module
  I want to subscribe to channels and receive messages through a transport-agnostic API
  So that I can switch between WebSocket, SSE, and polling without changing application code

  Scenario: Connection state transitions
    Given a realtime transport manager
    When the transport connects
    Then the connection state is "connected"

  Scenario: Subscribe and receive a message
    Given a connected realtime transport
    When the user subscribes to channel "chat"
    And a message arrives on channel "chat" with data "hello"
    Then the subscriber receives data "hello"

  Scenario: Unsubscribe stops delivery
    Given a connected realtime transport
    And the user is subscribed to channel "updates"
    When the user unsubscribes from channel "updates"
    And a message arrives on channel "updates" with data "missed"
    Then the subscriber receives no messages

  Scenario: Send a message on a channel
    Given a connected realtime transport
    When the user sends data "ping" on channel "heartbeat"
    Then the transport records the outgoing message

  Scenario: Disconnect cleans up
    Given a connected realtime transport
    When the transport disconnects
    Then the connection state is "disconnected"
