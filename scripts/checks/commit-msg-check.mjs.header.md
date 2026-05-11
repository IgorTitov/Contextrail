---
fileId: contextrail-template:scripts:checks:commit-msg-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/commit-msg-check.mjs <commit-msg-file>"
dependsOn:
  - .githooks/commit-msg
summary: Validate commit message shape (Conventional Commits + work-item ID + length and body rules) so the .githooks/commit-msg hook stays small and the rules are testable.
owns: Pure validateCommitMessage() helper plus the CLI that the commit-msg git hook delegates to.
boundaries: Validation only. Must not rewrite the commit message or invoke any external commands.
invariants: Pure validator stays import-safe so unit tests can call it without side effects. Allowed-types list is the single source of truth for both the script and the docs.
risks: Tightening the rules can retroactively break valid past commits if developers re-run a rebase; relax the rules rather than the hook stance.
securityPrivacy: Reads one local file path only; no network or shell exec.
notesForLLM: Validator is pure. CLI is a thin wrapper. Tests live in tests/unit/commit-msg-check.test.mjs and import validateCommitMessage directly.
tests:
  - tests/unit/commit-msg-check.test.mjs
linkedDocs:
  - .githooks/README.md
  - .githooks/commit-msg
specRefs:
  - TPL-001
---

# commit-msg-check.mjs
