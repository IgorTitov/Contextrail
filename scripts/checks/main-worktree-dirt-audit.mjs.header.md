---
name: main-worktree-dirt-audit.mjs
description: W1 hygiene check — warns on untracked files in main worktree that may be tx-* session residue (Phase 0.5, warn-only)
type: tooling-script
layer: tooling
hex: _none_
ctx: _none_
public: false
edit: careful
owner: W1 / ADR-0021
tests: tests/unit/main-worktree-dirt-audit.test.mjs
seeAlso:
  - scripts/checks/main-worktree-guard.mjs
  - docs/adr/0021-auto-teardown-and-dirt-audit.md
  - docs/rules-registry.md
---

# main-worktree-dirt-audit.mjs

W1 hygiene script. Runs as pre-commit Phase 0.5 (skippable, warn-only).

- Exits 0 silently from tx-* transport worktrees.
- From main worktree: enumerates untracked files in `tests/`, `apps/`,
  `modules/`, `scripts/`, `docs/`, filters out known-OK paths, warns on remainder.
- Always exits 0 — the audit is informational, never blocking.
- `--self-test` runs fixture cases for the exported pure helpers.
