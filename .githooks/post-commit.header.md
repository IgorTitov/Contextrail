---
fileId: contextrail-template:.githooks:post-commit
module: .githooks
stability: evolving
steward: human
api: Git hook
dependsOn:
  - .githooks/README.md
  - .claude/CLAUDE.md
summary: Reserve the post-commit hook as an intentionally inert placeholder so the repository can keep the slot without enabling hidden automation.
owns: The explicit no-op posture for post-commit behavior in this repository.
boundaries: This file should stay inert until the workflow intentionally changes. It must not quietly accumulate automation.
invariants: Post-commit remains intentionally disabled; any future activation should be an explicit policy decision.
risks: Quietly adding behavior here would violate the repository’s explicit workflow expectations.
securityPrivacy: Local repository control-plane content only; avoid embedding secrets or credentials.
notesForLLM: Keep this hook inert unless the workflow is intentionally redesigned and documented.
tests: Manual review only
linkedDocs:
  - .githooks/README.md
  - .claude/CLAUDE.md
related: .githooks/pre-commit
---

# post-commit
