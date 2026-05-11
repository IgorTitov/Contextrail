---
fileId: contextrail-template:README
module: root
stability: evolving
steward: shared
api: Repository guide
dependsOn:
  - .claude/CLAUDE.md
  - package.json
  - docs/README.md
  - .vscode/readme.md
  - tests/README.md
summary: Top-level onboarding guide for adopters of the Contextrail architecture template.
owns: Top-level bootstrap guide and public entry point for the Contextrail template.
boundaries: This file is an onboarding entry point. It must not duplicate every local rule, skill, or subfolder guide.
invariants: The setup steps, placeholders, and links stay aligned with the actual template structure and current artifact flow.
risks: Drift here confuses adopters and weakens the template's first-run experience.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Use this file as the human starting point for template adoption. Keep it high-signal and aligned with the current repo layout.
tests:
  - tests/integration/repo-workflow.test.mjs
  - scripts/checks/header-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/README.md
  - tests/README.md
related:
  - .vscode/readme.md
  - package.json
---

# README.md
