---
fileId: contextrail-template:.claude:MEMORY
module: .claude
stability: evolving
steward: shared
api: Rolling memory log
dependsOn: .claude/CLAUDE.md
summary: Project-local rolling memory of durable decisions, recurring pitfalls, and unresolved questions that should survive chat compaction.
owns: A compact rolling memory of durable repository decisions and unresolved issues worth preserving across chats.
boundaries: This file is short-term operational memory only. It must not become a second spec system, changelog, or backlog.
invariants: Entries stay concise, durable, and worth preserving across chat compaction; outdated noise should be removed rather than accumulated forever.
risks: If this file drifts into stale noise, agents lose the signal it is meant to preserve.
securityPrivacy: Documentation or local-control content only; avoid embedding secrets or credentials.
notesForLLM: Read this file for durable repo memory, not for canonical policy. Keep it compact and decision-focused.
tests: Manual review plus scripts/checks/header-check.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/README.md
related: .claude/settings.json.header.md
---

# MEMORY.md
