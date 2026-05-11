---
fileId: contextrail-template:agents:skills:README
module: .agents/skills
stability: evolving
steward: shared
api: Folder guide
dependsOn:
  - docs/agent-contract/compatibility-contract.json
  - AGENTS.md
summary: Index of generated Codex-compatible skills that mirror the shared repo workflow contract.
owns: The generated index of Codex-compatible skills.
boundaries: This file is an index only. Workflow policy stays in the canonical contract and AGENTS adapter.
invariants: The listed skill folders stay aligned with the canonical skill roster.
risks: Drift here makes Codex skill discovery unreliable and can hide missing generated skill folders.
securityPrivacy: Documentation content only; avoid secrets or credentials.
notesForLLM: Use this file as the Codex skill index. The canonical roster lives in the compatibility contract JSON.
tests:
  - node scripts/agent-contract/check.mjs
  - tests/contract/agent-adapter-consistency.test.mjs
linkedDocs:
  - AGENTS.md
  - docs/agent-contract/README.md
related:
  - .agents/skills/acceptance-validation/SKILL.md
  - .agents/skills/bdd-playwright/SKILL.md
  - .agents/skills/changelog-release/SKILL.md
  - .agents/skills/control-plane-audit/SKILL.md
  - .agents/skills/control-plane-design/SKILL.md
  - .agents/skills/design-delivery/SKILL.md
  - .agents/skills/feature-delivery/SKILL.md
  - .agents/skills/frontend-delivery/SKILL.md
  - .agents/skills/header-sidecar/SKILL.md
  - .agents/skills/hex-boundary/SKILL.md
  - .agents/skills/prd-usm-backlog/SKILL.md
  - .agents/skills/readme-discipline/SKILL.md
  - .agents/skills/repo-nav/SKILL.md
  - .agents/skills/security-audit/SKILL.md
  - .agents/skills/spec-traceability/SKILL.md
  - .agents/skills/tdd/SKILL.md
  - .agents/skills/trunk-bba/SKILL.md
generated: true
---

# README.md
