---
fileId: contextrail-template:.claude:CLAUDE
module: .claude
stability: evolving
steward: human
api: Repository-local Claude instruction file
dependsOn:
  - .claude/agents/repo-architect.md
  - .claude/agents/control-plane-supervisor.md
  - .claude/agents/product-planner.md
  - .claude/agents/designer.md
  - .claude/agents/feature-implementer.md
  - .claude/agents/frontend-specialist.md
  - .claude/agents/acceptance-tester.md
  - .claude/skills/trunk-bba/SKILL.md
  - .claude/skills/prd-usm-backlog/SKILL.md
  - .claude/skills/design-delivery/SKILL.md
  - .claude/skills/feature-delivery/SKILL.md
  - .claude/skills/frontend-delivery/SKILL.md
  - .claude/skills/acceptance-validation/SKILL.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - docs/design/README.md
  - docs/adr/0002-trunk-based-delivery.md
  - scripts/checks/control-plane-check.mjs
  - scripts/checks/product-docs-check.mjs
  - scripts/checks/design-docs-check.mjs
  - scripts/checks/delivery-flow-check.mjs
summary: Claude-facing adapter to the shared repo-level delivery contract plus Claude-specific workflow routing, headers, tests, architecture, and release notes.
owns: The short Claude-facing adapter to the shared repo-wide contract plus Claude-specific routing notes.
boundaries: This file defines the Claude adapter layer and high-level routing only. Shared cross-tool policy lives in docs/agent-contract/compatibility-contract.json and must not be redefined here.
invariants: Claude-specific adapter instructions live here while the shared cross-tool process contract lives in docs/agent-contract/compatibility-contract.json; sidecars use <file>.header.md only; every new feature request lands in backlog intake first; user-facing behavior work routes through USM before PRD slicing; design docs supplement user-facing work without replacing PRD or USM; automation-facing DOM hooks come from bounded registries instead of scattered hardcoded strings; untouched repo areas are navigated through headers/public APIs/tests first; artifacts flow through .backups/ and mergezip; post-commit stays disabled until intentionally changed.
risks: Drift here can create conflicting agent behavior across the whole repo or waste context on unnecessary deep code reading.
securityPrivacy: Instruction content only; do not place secrets here.
notesForLLM: Keep this file short and authoritative. Put detailed product-doc, design-lane, implementation, and acceptance mechanics in focused agents, skills, docs, and scripts instead of duplicating them here.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/product-docs-check.mjs
  - node scripts/checks/design-docs-check.mjs
  - node scripts/checks/delivery-flow-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
  - tests/integration/design-flow-coherence.test.mjs
  - tests/integration/delivery-flow-coherence.test.mjs
  - tests/contract/product-docs-contract.test.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
  - tests/contract/delivery-agents-contract.test.mjs
linkedDocs:
  - .claude/README.md
  - docs/prd/index.md
  - docs/usm/index.md
  - docs/backlog/index.md
  - docs/design/README.md
  - docs/adr/0002-trunk-based-delivery.md
  - .claude/agents/product-planner.md
  - .claude/agents/designer.md
  - .claude/agents/feature-implementer.md
  - .claude/agents/frontend-specialist.md
  - .claude/agents/acceptance-tester.md
related:
  - scripts/checks/readme-check.mjs
  - scripts/checks/test-gate.mjs
  - scripts/mergezip.mjs
---

# CLAUDE.md
