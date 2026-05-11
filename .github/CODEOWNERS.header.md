---
fileId: contextrail-template:github:CODEOWNERS
module: .github
stability: stable
steward: shared
summary: Assign required reviewers for control-plane and security-sensitive paths.
owns: GitHub CODEOWNERS ruleset for the repository.
boundaries: This file only controls PR review requirements. It does not enforce branch protection or CI gating.
invariants: Every control-plane path must have at least one required reviewer.
risks: If this file drifts, control-plane changes may merge without review.
securityPrivacy: No secrets. Reviewer usernames are public GitHub handles.
notesForLLM: When adding new control-plane paths to the repo, add a matching CODEOWNERS entry here.
linkedDocs:
  - .claude/CLAUDE.md
  - docs/agent-contract/compatibility-contract.json
related:
  - .github/workflows/ci.yml
  - scripts/checks/instruction-integrity-check.mjs
---

# CODEOWNERS
