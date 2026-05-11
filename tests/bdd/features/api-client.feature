# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of api-client in this repository.
# @sidecar api-client.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: API client HTTP requests

  As a developer using the api-client module
  I want to make HTTP requests with automatic JSON handling
  So that that API integration is simple and consistent

  Scenario: GET request returns parsed JSON
    Given the fetch adapter is active
    When the developer sends a GET request to "/users/1"
    Then the adapter calls fetch with method "GET"

  Scenario: POST request serializes body as JSON
    Given the fetch adapter is active
    When the developer sends a POST request with a JSON body
    Then the adapter serializes the body and sets Content-Type to "application/json"

  Scenario: Base URL is prepended to relative paths
    Given the fetch adapter has base URL "https://api.example.com"
    When the developer sends a GET request to "/users"
    Then the full URL is "https://api.example.com/users"

  Scenario: Custom headers are included in requests
    Given the fetch adapter is active
    And the developer sets header "Authorization" to "Bearer token"
    When the developer sends a GET request
    Then the request includes the "Authorization" header

  Scenario: Non-2xx response throws an error
    Given the fetch adapter is active
    When the server responds with status 404
    Then the adapter throws an ApiError
