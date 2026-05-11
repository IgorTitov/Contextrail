---
fileId: contextrail-template:scripts:checks:control-plane-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/control-plane-check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
  - package.json
  - .claude/CLAUDE.md
  - .claude/agents/README.md
  - .claude/skills/README.md
  - .claude/hooks/README.md
  - .githooks/README.md
  - .githooks/pre-commit
  - .vscode/settings.json
  - .vscode/tasks.json
  - docs/adr/0002-trunk-based-delivery.md
summary: Validate agreement across canonical control-plane files, script names, task wiring, hook orchestration, delivery-model docs, and proof surfaces.
owns: Deterministic cross-plane agreement checks for the template control plane.
boundaries: This file is a drift detector only. It must not mutate repository state, replace specialist semantic review, or become a second policy source.
invariants: Behavior remains deterministic, local-only, and explicit; failures point at disagreement between real repository surfaces.
risks: If this script drifts, stale workflows and duplicated authority can survive until users hit them manually.
securityPrivacy: Local filesystem only; avoid network access and hidden side effects.
notesForLLM: Keep checks high-signal and source-oriented. Add a new assertion only when two real repo surfaces can drift apart.
tests: tests/integration/control-plane-coherence.test.mjs
linkedDocs:
  - scripts/checks/README.md
  - .claude/CLAUDE.md
  - docs/adr/0002-trunk-based-delivery.md
related:
  - tests/integration/repo-workflow.test.mjs
  - tests/integration/control-plane-coherence.test.mjs
---

# control-plane-check.mjs
