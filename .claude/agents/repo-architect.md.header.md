---
fileId: contextrail-template:.claude:agents:repo-architect
module: .claude/agents
stability: evolving
steward: human
api: Claude subagent prompt
dependsOn:
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/rules/development.md
  - .claude/skills/control-plane-design/SKILL.md
  - .claude/skills/trunk-bba/SKILL.md
  - .claude/skills/repo-nav/SKILL.md
  - .claude/skills/hex-boundary/SKILL.md
  - scripts/checks/control-plane-check.mjs
  - scripts/checks/architecture-check.mjs
  - scripts/checks/delivery-flow-check.mjs
  - scripts/checks/claim-check.mjs
  - .claims/README.md
summary: Route repository-shaping work to a narrow architect agent that preserves control-plane coherence, hex architecture, SOLID boundaries, and LLM-friendly code shape.
owns: The operational contract for repository-shaping design review across agents, skills, hooks, scripts, docs, tasks, structural seams, and delivery-model changes.
boundaries: This file defines a narrow architect role only. It must not duplicate the full repository policy, replace specialist agents, or become a generic implementation prompt.
invariants: The agent evaluates fit against current template boundaries, prefers modifying canonical owners over adding duplicates, protects hex and public APIs, and requires concrete file-level artifacts plus proof surfaces.
risks: Drift here can normalize ad hoc growth of agents, skills, hooks, scripts, duplicate policy text, or architecture-hostile patterns that are hard for humans and LLMs to reason about.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Use this agent when a request touches repository structure, workflow, or control-plane surfaces. Return the smallest repository-ready file set, not vague planning.
tests:
  - node scripts/checks/control-plane-check.mjs
  - node scripts/checks/architecture-check.mjs
  - node scripts/checks/delivery-flow-check.mjs
  - tests/integration/control-plane-coherence.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/rules/architecture.md
  - .claude/rules/development.md
  - docs/adr/0002-trunk-based-delivery.md
related:
  - .claude/agents/control-plane-supervisor.md
  - .claude/agents/hex-architect.md
  - .claude/agents/feature-implementer.md
---

# repo-architect.md
