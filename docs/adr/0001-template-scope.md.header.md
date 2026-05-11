---
fileId: contextrail-template:docs:adr:0001-template-scope
module: docs/adr
stability: evolving
steward: shared
api: ADR document
dependsOn:
  - README.md
  - .claude/CLAUDE.md
summary: Record the initial architecture decision about the scope and responsibilities of the standalone Claude Code template.
owns: One ADR that captures the original template-scope decision, its context, and its consequences.
boundaries: This file records a single decision and its rationale. It must not become a general design notebook.
invariants: The ADR continues to document the original template-scope decision even if later ADRs revise or extend it.
risks: If this ADR drifts, future maintainers may misread what the template is and is not supposed to contain.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Treat this ADR as the baseline scope anchor. New scope changes should be recorded in new ADRs, not by mutating history casually.
tests: Manual review when scope-governing decisions change
linkedDocs:
  - docs/adr/README.md
  - README.md
related: .claude/CLAUDE.md
---

# 0001-template-scope.md
