---
fileId: contextrail-template:scripts:checks:usm-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/usm-check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
  - scripts/checks/_shared.mjs
  - package.json
  - .claude/CLAUDE.md
  - AGENTS.md
  - docs/usm/index.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
  - docs/usm/personas/persona-template.md
  - docs/usm/templates/workflow-template.md
summary: Validate that mandatory persona and workflow USM surfaces exist and that user-facing work can be traced through real USM artifacts.
owns: Deterministic agreement checks for mandatory persona/workflow mapping before user-facing implementation.
boundaries: This file validates USM coverage only. It must not mutate repository state or become a second product-policy source.
invariants: User-facing work keeps real persona and workflow coverage; canonical template names stay stable; the check remains deterministic and local-only.
risks: Drift here can let user-facing work skip persona/workflow mapping while still appearing process-compliant.
securityPrivacy: Local filesystem only; avoid network access and hidden side effects.
notesForLLM: Keep this check narrow and explicit. It should fail on missing real USM coverage, not on stylistic wording differences.
tests:
  - pnpm test:contract
  - pnpm test:integration
linkedDocs:
  - docs/usm/index.md
  - docs/usm/personas/README.md
  - docs/usm/scenarios/README.md
  - .claude/CLAUDE.md
  - AGENTS.md
related:
  - scripts/checks/product-docs-check.mjs
  - scripts/checks/pre-impl-gate.mjs
---

# usm-check.mjs
