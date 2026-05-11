---
fileId: contextrail-template:.claude:agents:product-planner
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/prd-usm-backlog/SKILL.md
  - .claude/skills/spec-traceability/SKILL.md
  - scripts/checks/product-docs-check.mjs
summary: Route feature intake, clarification, PRD formalization, USM decomposition, design-lane handoff, and backlog slicing through one narrow repository-local planning agent.
owns: The operational intake and normalization path from raw feature request to canonical PRD, USM, design, and backlog artifacts.
boundaries: This file defines a planning and decomposition role only. It must not replace specialist design, implementation, test, or release agents.
invariants: Every new request lands in backlog intake first, technical work may bypass USM, user-facing behavior work routes through persona and workflow USM first, and clarifying questions stay limited to truly blocking unknowns.
risks: Drift here can blur source-of-truth boundaries or let the repo normalize feature requests inconsistently.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Start every feature request at backlog intake, then classify the path. Technical or non-functional work may go straight to PRD; UX, UI, and behavior work must pass through persona and workflow USM before backlog slicing. Route user-facing visual or interaction guidance to the designer lane when implementation would benefit from explicit design handoff.
tests:
  - node scripts/checks/product-docs-check.mjs
  - tests/contract/product-docs-contract.test.mjs
  - tests/integration/design-flow-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - docs/design/README.md
related:
  - .claude/agents/designer.md
  - .claude/agents/repo-architect.md
  - .claude/agents/tech-writer.md
  - .claude/agents/test-guardian.md
---

# product-planner.md
