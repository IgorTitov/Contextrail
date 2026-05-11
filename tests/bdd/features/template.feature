# @HEADER
# @version 0.6.5 | 2026-04-28
# @purpose Starter BDD feature demonstrating traceable bootstrap behavior
# @sidecar template.feature.header.md
# @layer tests | @hex _none_ | @ctx _none_
# @public false
# @edit rewrite-ok

Feature: Claude Code template bootstrap

  @TPL-001 @TPL-002 @TPL-003
  Scenario: Bootstrap the project template
    Given the repository contains project-local Claude Code configuration
    When the maintainer installs the git hooks
    Then deterministic validation scripts are available
    And the workflow can enforce traceability and tests before commit
