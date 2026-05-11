---
fileId: contextrail-template:tests:unit:commit-msg-check
module: tests/unit
stability: evolving
steward: shared
api: "Unit test suite"
dependsOn:
  - scripts/checks/commit-msg-check.mjs
summary: Unit tests for the validateCommitMessage helper that backs the .githooks/commit-msg hook.
owns: Happy-path, failure, and line-ending coverage of the pure validator.
boundaries: Test code only; must not invoke the CLI or shell out to git.
invariants: Validator stays pure and importable. Adding a new rule means adding both a positive and a negative test here.
risks: Stale tests after rule changes lead to broken developer commits.
securityPrivacy: No filesystem or network access.
notesForLLM: Validator is pure — call it directly with raw strings, do not write temp files.
tests:
  - self
linkedDocs:
  - scripts/checks/commit-msg-check.mjs
  - .githooks/commit-msg
specRefs:
  - TPL-001
---

# commit-msg-check.test.mjs
