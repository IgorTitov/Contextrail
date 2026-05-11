# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of cache in this repository.
# @sidecar cache.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: TTL/LRU caching

  As a developer using the cache module
  I want to store and retrieve values with automatic expiration and eviction
  So that frequently accessed data is served fast without stale entries

  Scenario: Store and retrieve a cached value
    Given the cache adapter is active
    When the user stores key "user:1" with value "Alice"
    Then the cache returns "Alice" for key "user:1"

  Scenario: Cache miss returns undefined
    Given the cache adapter is active
    When the user requests key "nonexistent"
    Then the cache returns undefined

  Scenario: Delete a cached entry
    Given the cache adapter is active
    And the cache contains key "temp" with value "data"
    When the user deletes key "temp"
    Then the cache does not contain key "temp"

  Scenario: TTL expiration removes entry
    Given the cache adapter is active with a 50ms default TTL
    When the user stores key "expiring" with value "gone-soon"
    And 60ms have passed
    Then the cache returns undefined for key "expiring"

  Scenario: LRU eviction when max entries exceeded
    Given the cache adapter is active with max 2 entries
    When the user stores key "a" with value "1"
    And the user stores key "b" with value "2"
    And the user stores key "c" with value "3"
    Then the cache does not contain key "a"
    And the cache returns "3" for key "c"
