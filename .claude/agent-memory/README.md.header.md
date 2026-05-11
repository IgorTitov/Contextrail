---
fileId: contextrail-template:claude:agent-memory:README
module: .claude/agent-memory
stability: evolving
steward: shared
api: Documentation
summary: Git-tracking policy and security rules for agent memory files.
owns: Policy for what agent memory is tracked in git and security review requirements.
boundaries: Covers only the .claude/agent-memory/ directory policy. Does not duplicate CLAUDE.md agent routing rules.
invariants: Memory policy must stay consistent with CLAUDE.md memory instructions.
risks: Stale policy if memory tooling changes upstream.
securityPrivacy: No secrets. Describes security review requirements for memory content.
notesForLLM: Consult this when deciding what memory content is safe to commit to git.
related:
  - .claude/CLAUDE.md
---

# README.md
