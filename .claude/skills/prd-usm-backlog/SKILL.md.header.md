---
fileId: contextrail-template:.claude:skills:prd-usm-backlog:SKILL
module: .claude/skills/prd-usm-backlog
stability: evolving
steward: human
api: Claude skill
dependsOn:
  - .claude/CLAUDE.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/usm/personas/README.md
  - docs/backlog/index.md
  - docs/design/README.md
  - .claude/skills/spec-traceability/SKILL.md
  - scripts/checks/product-docs-check.mjs
summary: Define the canonical intake, classification, persona/workflow, PRD, design-handoff, and backlog method for this template.
owns: The reusable method for turning raw requests into canonical PRD, USM, design, and backlog artifacts.
boundaries: This skill defines orchestration only. It must not replace deterministic trace checks, design skills, implementation skills, or specialist testing prompts.
invariants: Every request enters backlog intake first, technical work may bypass USM, user-facing workflow changes pass through persona and scenario USM first, and source-of-truth boundaries remain clean.
risks: Drift here can cause duplicated authority, oversized backlog items, or inconsistent feature intake.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Classify first. Only ask clarifying questions when the repo cannot safely normalize the request without them. Keep personas in docs/usm/personas and workflow maps in docs/usm/scenarios. Route user-facing visual or interaction guidance to docs/design and the designer lane when needed.
tests:
  - node scripts/checks/product-docs-check.mjs
  - tests/contract/product-docs-contract.test.mjs
  - tests/integration/design-flow-coherence.test.mjs
linkedDocs:
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - docs/design/README.md
related:
  - .claude/skills/spec-traceability/SKILL.md
  - .claude/agents/product-planner.md
  - .claude/agents/designer.md
---

# SKILL.md
