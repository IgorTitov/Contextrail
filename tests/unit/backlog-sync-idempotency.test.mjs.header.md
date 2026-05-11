---
fileId: contextrail-template:tests:unit:backlog-sync-idempotency
module: tests/unit
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - node:fs
  - node:os
  - scripts/checks/backlog-sync.mjs
summary: Regression proof for TPL-331 backlog-sync timestamp idempotency — second --check run exits 0 when content is stable.
owns: Proves that renderMarkdown() uses an injected timestamp (payload.generatedAt preserved from JSON) so --check does not falsely report out-of-date on consecutive stable runs.
tests: self
linkedDocs:
  - scripts/checks/backlog-sync.mjs
  - docs/adr/0048-idempotent-ceremony-outputs.md
---

# backlog-sync-idempotency.test.mjs
