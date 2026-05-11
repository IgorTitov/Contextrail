---
fileId: contextrail-template:.githooks:README
module: .githooks
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - .githooks/pre-commit
  - .githooks/commit-msg
  - .githooks/post-commit
  - scripts/checks/install-hooks.mjs
summary: Explain the repository-local Git hooks, with explicit guidance that pre-commit mutates and stages deterministic repo updates while post-commit stays intentionally disabled.
owns: The folder-level guide to local Git hook behavior, installation, and operator expectations for this template.
boundaries: This file is a hook index and workflow guide only. It must not duplicate full hook bodies or broader repository policy from .claude/CLAUDE.md.
invariants: The documented hook roster, install command, and mutating-vs-non-mutating behavior stay aligned with the real files and current workflow stance.
risks: Drift here makes hook behavior easy to misread, especially if pre-commit mutations and staging are not stated explicitly.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Use this file to understand the local Git hook surface before changing workflow scripts or assuming pre-commit is validation-only.
tests:
  - node scripts/checks/design-docs-check.mjs
  - node scripts/checks/control-plane-check.mjs
linkedDocs: .claude/CLAUDE.md
related: scripts/checks/install-hooks.mjs
---

# README.md
