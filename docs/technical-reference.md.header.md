---
fileId: contextrail-template:docs:technical-reference
module: docs
stability: evolving
steward: shared
api: Documentation
summary: Document technical-reference for this repository.
owns: Complete API and configuration reference for all template systems (build, test, design, i18n, headers, hooks, scripts).
boundaries: Must not duplicate module-catalog.md per-module API docs. Must not contain narrative rationale — that belongs in whitepaper.md.
invariants: Script names and CLI flags must match actual scripts/ directory. Configuration shapes must match source files.
risks: Script renames or flag changes can make reference stale. Verify against scripts/ when updating.
securityPrivacy: No secrets.
notesForLLM: This is the detailed reference. When a script or config shape changes, update the matching section here. Cross-check against the actual source files before editing.
linkedDocs:
  - docs/whitepaper.md
  - docs/module-catalog.md
  - docs/guides/getting-started.md
related:
  - docs/whitepaper.md
  - docs/module-catalog.md
  - docs/faq.md
---

# technical-reference.md
