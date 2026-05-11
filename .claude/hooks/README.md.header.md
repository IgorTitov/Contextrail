---
fileId: contextrail-template:.claude:hooks:README
module: .claude/hooks
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .claude/settings.json.header.md
  - .claude/settings.json
  - .claude/hooks/run-dangerous-command-blocker.mjs
  - .claude/hooks/dangerous-command-blocker.py
  - tests/integration/dangerous-command-hook.test.mjs
summary: Explain the small set of repository-local Claude hook scripts and the constraints they must satisfy.
owns: The folder-level guide to Claude hook scripts referenced by repository settings.
boundaries: This file documents the hook surface only. It must not become a second copy of hook implementation logic or a broad security policy file.
invariants: Hook descriptions should stay aligned with settings.json wiring; hooks remain small, deterministic, auditable, and covered by local proof where practical.
risks: Drift here hides how hook safety is actually enforced or implies hooks that are not wired up.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this file to understand the hook surface and why it exists. Do not infer extra hook behavior that is not wired in settings.
tests:
  - tests/integration/repo-workflow.test.mjs
  - tests/integration/dangerous-command-hook.test.mjs
  - manual hook execution through Claude settings
linkedDocs:
  - .claude/settings.json.header.md
  - .claude/rules/security.md
  - tests/integration/README.md
related:
  - .claude/hooks/run-dangerous-command-blocker.mjs
  - .claude/hooks/dangerous-command-blocker.py
---

# README.md
