---
fileId: contextrail-template:scripts:checks:product-docs-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/product-docs-check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
  - package.json
  - .claude/CLAUDE.md
  - .claude/agents/README.md
  - .claude/skills/README.md
  - docs/README.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
  - docs/backlog/index.md
summary: Validate that PRD, USM, backlog, personas, and intake-routing docs stay aligned with the canonical product-doc process.
owns: Deterministic agreement checks for the template’s PRD-USM-backlog planning layer.
boundaries: This file is a drift detector only. It must not mutate repository state, replace semantic planning review, or become a second policy source.
invariants: Behavior remains deterministic, local-only, and explicit; failures point at disagreement between real repository surfaces.
risks: If this script drifts, intake and source-of-truth rules can silently diverge across docs and agents.
securityPrivacy: Local filesystem only; avoid network access and hidden side effects.
notesForLLM: Keep checks high-signal and source-oriented. Add a new assertion only when two real repo surfaces can drift apart.
tests: tests/contract/product-docs-contract.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - .claude/skills/prd-usm-backlog/SKILL.md
related:
  - scripts/checks/spec-check.mjs
  - scripts/checks/control-plane-check.mjs
  - tests/contract/product-docs-contract.test.mjs
---

# product-docs-check.mjs
