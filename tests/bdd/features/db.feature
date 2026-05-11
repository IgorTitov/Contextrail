# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of db in this repository.
# @sidecar db.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Database abstraction

  The db module provides a portable database abstraction with query builder,
  transactions, and driver injection. Domain logic is pure; adapters handle
  storage.

  Scenario: Create table and insert a row
    Given the memory database adapter is active
    When the user creates a table "items" with columns "name TEXT, qty INTEGER"
    And the user inserts a row with name "Widget" and qty 10
    Then the query "SELECT * FROM items" returns 1 row
    And the first row has name "Widget" and qty 10

  Scenario: Query with WHERE equality filter
    Given the memory database adapter is active
    And the table "products" contains rows:
      | name    | category |
      | Apple   | fruit    |
      | Banana  | fruit    |
      | Carrot  | veggie   |
    When the user queries products WHERE category = "fruit"
    Then the result contains 2 rows

  Scenario: Query builder produces correct SQL
    When the user builds a query on table "users" selecting "name, age" where "age > ?" with param 25 ordered by "name" limited to 5
    Then the built SQL is "SELECT name, age FROM users WHERE age > ? ORDER BY name ASC LIMIT 5"
    And the built params are [25]

  Scenario: Transaction commits on success
    Given the memory database adapter is active
    And the table "accounts" contains rows:
      | owner | balance |
      | Alice | 100     |
      | Bob   | 50      |
    When the user runs a transaction that sets Alice balance to 70 and Bob balance to 80
    Then Alice has balance 70
    And Bob has balance 80

  Scenario: Close clears all data
    Given the memory database adapter is active
    And the table "temp" contains a row with id "x1" and value "data"
    When the user calls close
    Then querying table "temp" returns 0 rows
