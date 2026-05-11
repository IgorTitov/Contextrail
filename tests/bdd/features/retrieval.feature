# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of retrieval in this repository.
# @sidecar retrieval.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: RAG retrieval pipeline

  As a developer using the retrieval module
  I want to chunk, index, search, and augment prompts with relevant context
  So that that LLM-based answers are grounded in actual documents

  Scenario: Chunk text by character count
    Given a character chunker with chunk size 100
    When the developer chunks a 250-character document
    Then at least 3 chunks are returned

  Scenario: BM25 search returns ranked results
    Given documents are indexed with BM25
    When the developer searches for a term
    Then results are returned sorted by relevance score

  Scenario: Augment prompt with retrieved context
    Given search results with scores
    When the developer augments a prompt
    Then the output includes both the query and the context

  Scenario: Empty search returns no results
    Given an empty BM25 index
    When the developer searches for any term
    Then an empty array is returned

  Scenario: Markdown chunker splits on headings
    Given a markdown chunker
    When the developer chunks a document with multiple headings
    Then each heading starts a new chunk
