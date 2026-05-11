# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Describe the role of file in this repository.
# @sidecar file.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit careful

Feature: File management

  As a developer using the file module
  I want to detect file types, validate files, and format sizes
  So that that file handling is consistent and safe

  Scenario: Detect MIME type from extension
    Given the file module is loaded
    When the developer checks the MIME type of "photo.png"
    Then the result is "image/png"

  Scenario: Format file size in human-readable form
    Given the file module is loaded
    When the developer formats 1024 bytes
    Then the result is "1 KB"

  Scenario: Generate unique file IDs
    Given the file module is loaded
    When two file IDs are generated
    Then they are different

  Scenario: Validate file against constraints
    Given a maximum file size of 1 MB
    When the developer validates a 500 KB file
    Then validation passes

  Scenario: Reject file exceeding size limit
    Given a maximum file size of 1 MB
    When the developer validates a 2 MB file
    Then validation fails with a size error
