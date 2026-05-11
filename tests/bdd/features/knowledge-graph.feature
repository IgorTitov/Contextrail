# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of knowledge-graph in this repository.
# @sidecar knowledge-graph.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: Knowledge graph operations

  As a developer using the knowledge-graph module
  I want to extract entities, detect relationships, and traverse graphs
  So that that structured knowledge is discoverable from unstructured text

  Scenario: Extract entities from text
    Given the regex entity extractor is active
    When the developer extracts entities from "Alice met Bob in Paris"
    Then the result includes recognized entity spans

  Scenario: Detect co-occurrence relationships
    Given the co-occurrence relationship extractor is active
    When the developer detects relationships between entities in a sentence
    Then the result includes at least one relationship

  Scenario: Store and retrieve graph nodes
    Given the memory graph adapter is active
    When the developer adds node "Alice" and node "Bob"
    Then both nodes are retrievable

  Scenario: BFS traversal visits connected nodes
    Given a graph with edges Alice-Bob and Bob-Carol
    When BFS traversal starts from Alice
    Then all three nodes are visited

  Scenario: Find connected components
    Given a graph with two disconnected clusters
    When findConnectedComponents is called
    Then two components are returned
