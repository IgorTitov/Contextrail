# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of api-starter in this repository.
# @sidecar api-starter.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: API starter server

  The api-starter app shell demonstrates hex modules on the server side.
  It exposes a JSON API over HTTP with health checks, greeting endpoint,
  caching, and CORS support.

  Scenario: Health endpoint returns server status
    Given the API server is running in test mode
    When the client sends GET /health
    Then the response status is 200
    And the response body contains status "ok"
    And the response body contains the current mode

  Scenario: Greeting endpoint says hello
    Given the API server is running in test mode
    When the client sends GET /api/greet?name=Alice
    Then the response status is 200
    And the response body message is "Hello, Alice!"
    And the response body cached is false

  Scenario: Greeting uses cache on repeated calls
    Given the API server is running in test mode
    When the client sends GET /api/greet?name=Bob
    And the client sends GET /api/greet?name=Bob again
    Then the second response body cached is true

  Scenario: Unknown routes return 404
    Given the API server is running in test mode
    When the client sends GET /nonexistent
    Then the response status is 404
    And the response body error is "Not found"

  Scenario: CORS headers are present
    Given the API server is running in test mode
    When the client sends GET /health
    Then the response includes Access-Control-Allow-Origin header

  Scenario: OPTIONS preflight returns 204
    Given the API server is running in test mode
    When the client sends OPTIONS /api/greet
    Then the response status is 204
    And the response includes CORS headers
