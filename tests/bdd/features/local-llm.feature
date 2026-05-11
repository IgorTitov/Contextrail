# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of local-llm in this repository.
# @sidecar local-llm.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Local LLM inference

  As a developer using the local-llm module
  I want to load and run language models in the browser
  So that users can get AI responses without sending data to a server

  Scenario: Load a model with progress
    Given the local LLM adapter is active
    When the user loads model "test-model"
    Then the model is loaded
    And the progress callback received at least one update

  Scenario: Send a message after loading
    Given the local LLM adapter is active
    And model "test-model" is loaded
    When the user sends message "Hello"
    Then the adapter returns a non-empty response

  Scenario: Unload a model
    Given the local LLM adapter is active
    And model "test-model" is loaded
    When the user unloads the model
    Then no model is loaded

  Scenario: Send message without loaded model fails
    Given the local LLM adapter is active
    And no model is loaded
    When the user sends message "Hello"
    Then the adapter returns an error

  Scenario: Model cache manager lists cached models
    Given the model cache manager is active
    Then the cache returns a list of cached models
