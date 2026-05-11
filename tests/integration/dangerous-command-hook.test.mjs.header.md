---
fileId: contextrail-template:tests:integration:dangerous-command-hook-test
module: tests/integration
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:child_process
  - .claude/hooks/run-dangerous-command-blocker.mjs
summary: Prove that the portable Node Claude hook really denies dangerous commands and sensitive edits.
owns: Behavioral proof that the portable Node hook blocks destructive shell commands and sensitive edits.
boundaries: This file is an integration spec only. Keep it deterministic, local-only, and focused on hook behavior.
invariants: Assertions should exercise the same hook entrypoint wired from .claude/settings.json.
risks: If this test drifts or weakens, the template can again ship a hook that is wired correctly but enforces the wrong behavior.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Prefer direct process-level assertions over mocking so the test covers the real wired entrypoint.
tests: pnpm test:integration
linkedDocs:
  - tests/integration/README.md
  - .claude/hooks/README.md
related:
  - .claude/hooks/run-dangerous-command-blocker.mjs
  - .claude/settings.json
---

# dangerous-command-hook.test.mjs
