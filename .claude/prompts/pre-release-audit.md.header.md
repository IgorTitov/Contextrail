---
fileId: contextrail-template:.claude:prompts:pre-release-audit
module: .claude/prompts
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - scripts/checks/header-check.mjs
  - scripts/checks/readme-check.mjs
  - scripts/checks/architecture-check.mjs
  - scripts/checks/test-gate.mjs
summary: Comprehensive 12-phase pre-release audit prompt for the Contextrail template repository.
owns: The reusable pre-release audit checklist for this repository.
boundaries: Audit only — reports findings but does not fix them.
invariants: Must cover all deterministic script gates and all tracked directories.
risks: Audit scope drift if new modules or apps are added without updating the checklist.
securityPrivacy: No secrets. Audit prompt only.
notesForLLM: This prompt is designed to be copied into a new Claude tab for a full repo audit. Update phase lists when repo structure changes.
linkedDocs: docs/quality-assessment-v0.3.3.md
related: .claude/CLAUDE.md
---

# pre-release-audit.md
