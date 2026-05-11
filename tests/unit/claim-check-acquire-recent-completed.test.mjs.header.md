---
name: claim-check-acquire-recent-completed.test.mjs
description: Unit tests for the acquire-time Layer 1.5 (recently-completed claim refusal) added in TPL-308 / ADR-0036.
type: test
layer: tests
public: false
edit: careful
specRefsNote: TPL-308 — closes the race window between pre-commit --auto-complete and commit landing on HEAD that produced the Wave Q TPL-306 collision.
relatedAdrs:
  - 0036-acquire-recent-completed-window
  - 0030-commit-msg-recent-completed-claims
---

# claim-check-acquire-recent-completed.test.mjs

Symmetric to the commit-msg-check Layer 1.5 tests (TPL-298 / ADR-0030); applies the same pattern to `claim-check --acquire`.
