---
fileId: contextrail-template:.githooks:commit-msg
module: .githooks
stability: evolving
steward: shared
api: Git hook
dependsOn:
  - git commit-msg hook execution
  - shell regex validation
summary: Validate commit message shape so repository history keeps conventional commits plus the project’s work-item requirement.
owns: Commit-message gatekeeping for conventional-commit format and work-item ID presence.
boundaries: This hook validates commit messages only. It must not mutate commits, rewrite messages, or duplicate pre-commit responsibilities.
invariants: Stays deterministic, non-interactive, and limited to message validation for the first line and required work-item pattern.
risks: Drift here weakens history hygiene or blocks valid commits for the wrong reasons.
securityPrivacy: Local repository control-plane content only; avoid embedding secrets or credentials.
notesForLLM: Keep this hook focused on message validation. Do not add side effects or hidden rewrite behavior.
tests: Manual hook execution through git commit
linkedDocs:
  - .githooks/README.md
  - .claude/CLAUDE.md
related: .githooks/pre-commit
---

# commit-msg
