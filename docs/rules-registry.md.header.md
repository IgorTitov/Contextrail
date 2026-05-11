---
version: 0.7.40
date: 2026-04-29
purpose: Canonical narrative registry of every rule the Contextrail template enforces or aspires to enforce, with per-rule whitehack analysis and coverage status.
layer: docs
public: true
edit: careful
linkedDocs:
  - docs/backlog/rule-coverage-gaps.md
  - docs/agent-contract/compatibility-contract.json
  - .claude/CLAUDE.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/adr/0014-per-file-version-semantics.md
  - docs/adr/0015-test-isolation-enforcement.md
  - docs/adr/0016-worktree-lifecycle.md
  - docs/adr/0017-transport-branch-enforcement.md
specRefs:
  - TPL-240
ownership: tech-writer
notes: |
  Living document. Add a registry entry **in the same commit** that
  introduces or modifies a rule. The whitehack analysis is non-optional:
  a rule without an evasion analysis is, by definition, untested for
  bypass paths. Coverage gaps (CG-*) are sized as actionable slices in
  rule-coverage-gaps.md.
---

# rules-registry.md
