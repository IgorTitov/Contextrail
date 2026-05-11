---
fileId: contextrail-template:.claude:hooks:run-dangerous-command-blocker
module: .claude/hooks
stability: evolving
steward: shared
api: Claude hook script
dependsOn:
  - Node.js standard library
  - .claude/settings.json
summary: Portable Node entrypoint for the dangerous-command blocker used by Claude PreToolUse hooks; includes local-fs allowlist for git push --force-with-lease (TPL-262).
owns: The portable hook logic that denies obviously destructive Bash commands and edits to sensitive files; allows --force-with-lease to local-filesystem remotes for coa-merge ff-update.
boundaries: This file defines a small executable hook. It must stay auditable and must not gain hidden workflow side effects.
invariants: Hook behavior must remain deterministic, local-only, and safe by default.
risks: Changes here alter enforcement behavior and can silently weaken repository safety or validation.
securityPrivacy: Local filesystem and process execution only; keep behavior deterministic and avoid secrets or network access.
notesForLLM: Preserve deterministic local-only behavior and auditability. Avoid network access and hidden bypass paths.
tests:
  - tests/integration/repo-workflow.test.mjs
  - tests/integration/dangerous-command-hook.test.mjs
  - tests/checks/dangerous-command-blocker.test.mjs
linkedDocs:
  - .claude/settings.json
  - .claude/hooks/README.md
related:
  - .claude/hooks/dangerous-command-blocker.py
  - .claude/rules/security.md
---

# run-dangerous-command-blocker.mjs
