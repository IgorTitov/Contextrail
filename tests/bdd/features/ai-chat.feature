# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of ai-chat in this repository.
# @sidecar ai-chat.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: AI chat conversation

  As a user of the chat module
  I want to send messages and receive responses
  So that I can interact with an AI assistant

  Scenario: Send a message with the echo adapter
    Given the echo chat adapter is active
    When the user sends "Hello, world!"
    Then the response contains "Hello, world!"
    And the response role is "assistant"

  Scenario: Message history tracks conversation
    Given the echo chat adapter is active
    When the user sends "First message"
    And the user sends "Second message"
    Then the message history contains 4 messages

  Scenario: Message history can be cleared
    Given the echo chat adapter is active
    And the user has sent "Some message"
    When the user clears the history
    Then the message history is empty

  Scenario: Message history respects the maximum limit
    Given a message history with max 3 messages
    When 5 messages are added
    Then the history contains exactly 3 messages

  Scenario: Prompt context contains only role and content
    Given the echo chat adapter is active
    And the user has sent "Test message"
    When the prompt context is requested
    Then each entry has only "role" and "content" fields
