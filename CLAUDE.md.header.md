---
fileId: contextrail-template:root:CLAUDE
module: root
stability: evolving
steward: shared
api: Root pointer
dependsOn:
  - .claude/CLAUDE.md
  - .claude/rules/README.md
summary: Stable root pointer to the canonical repository-local Claude instructions stored under .claude/.
owns: The stable root entry point that points readers to the canonical instructions under .claude/.
boundaries: This file is only a pointer. It must stay short and should not duplicate the canonical instructions.
invariants: The root file remains minimal, stable, and subordinate to .claude/CLAUDE.md.
risks: If this file grows or contradicts the canonical instructions, the repository gains two competing sources of policy.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Keep this file short and pointer-only. Put real policy in .claude/CLAUDE.md.
tests: Manual review during control-plane changes
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/rules/README.md
related: .claude/README.md
---

# CLAUDE.md
